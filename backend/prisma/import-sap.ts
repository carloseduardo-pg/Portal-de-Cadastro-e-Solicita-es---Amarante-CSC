/**
 * Importador da base oficial SAP B1 → products + hierarquia Família→Subgrupo→Grupo.
 *
 * Uso: `npm run import:sap` (idempotente — upsert por sap_code / nome natural).
 * Relatório: `base-sap/relatorio-importacao.md`
 */
import { ItemKind, PrismaClient, ProductSource } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { formatNcmDisplay, normalizeNcmCode } from '../src/common/ncm';

const prisma = new PrismaClient();

const ROOT = path.resolve(__dirname, '../..');
const XLSX_PATH = path.join(ROOT, 'base-sap/itens/Base de itens SAP B1.xlsx');
const REPORT_PATH = path.join(ROOT, 'base-sap/relatorio-importacao.md');
const NCM_MISSING_REPORT_PATH = path.join(ROOT, 'base-sap/ncm-missing-active.md');

const QUARANTINE = 'NAO CLASSIFICADO';
const VALID_UM = new Set(['UN', 'KG', 'MT', 'M3', 'LT']);

type SheetKind = 'uso_consumo' | 'ativo_fixo';

type RawRow = {
  sheet: SheetKind;
  sapCode: string;
  description: string;
  stockItem: string | null;
  legacyRaw: unknown;
  ncmRaw: unknown;
  groupName: string;
  subgroupName: string;
  familyName: string;
  active: boolean;
  umRaw: string | null;
  lotRaw: string | null;
};

type NormRow = {
  sheet: SheetKind;
  sapCode: string;
  description: string;
  legacyCode: string | null;
  ncmCode: string | null;
  ncmWasCorrupt: boolean;
  ncmRawDisplay: string;
  familyOriginal: string;
  subgroupOriginal: string;
  groupOriginal: string;
  familyResolved: string;
  subgroupResolved: string;
  groupResolved: string;
  active: boolean;
  fixedAsset: boolean;
  itemKind: ItemKind;
  measureUnitCode: string | null;
  quarantine: boolean;
  swappedA5: boolean;
  umManual: boolean;
  groupIsItens: boolean;
};

type AmbiguityHit = {
  sapCode: string;
  sheet: SheetKind;
  kind: 'subgroup_family' | 'group_subgroup';
  name: string;
  originalParent: string;
  resolvedParent: string;
  dominantCount: number;
  outlierCount: number;
};

function upper(s: string): string {
  return s.trim().toUpperCase();
}

/** Códigos internos estáveis por árvore (consumo FAM/SUB/GRP · AF AFF/AFS/AFG). */
function buildHierarchyCodes(
  rows: NormRow[],
  prefixes: { family: string; subgroup: string; group: string },
): {
  familyCode: Map<string, string>;
  subgroupCode: Map<string, string>;
  groupCode: Map<string, string>;
} {
  const familyNames = [...new Set(rows.map((r) => r.familyResolved))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
  const familyCode = new Map<string, string>();
  familyNames.forEach((name, i) => {
    familyCode.set(name, `${prefixes.family}${String(i + 1).padStart(2, '0')}`);
  });

  const subgroupCode = new Map<string, string>();
  const groupCode = new Map<string, string>();

  for (const fam of familyNames) {
    const famSeq = familyCode.get(fam)!.replace(/\D/g, '');
    const subs = [
      ...new Set(rows.filter((r) => r.familyResolved === fam).map((r) => r.subgroupResolved)),
    ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    subs.forEach((sub, si) => {
      const sgCode = `${prefixes.subgroup}${famSeq}${String(si + 1).padStart(2, '0')}`;
      subgroupCode.set(`${fam}||${sub}`, sgCode);
      const groups = [
        ...new Set(
          rows
            .filter((r) => r.familyResolved === fam && r.subgroupResolved === sub)
            .map((r) => r.groupResolved),
        ),
      ].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      groups.forEach((grp, gi) => {
        groupCode.set(
          `${fam}||${sub}||${grp}`,
          `${prefixes.group}${famSeq}${String(si + 1).padStart(2, '0')}${String(gi + 1).padStart(2, '0')}`,
        );
      });
    });
  }

  return { familyCode, subgroupCode, groupCode };
}

/** A2 — float legado → texto sem decimal. */
function normalizeLegacy(raw: unknown): string | null {
  if (raw === null || raw === undefined || String(raw).trim() === '') return null;
  if (typeof raw === 'number') {
    if (Number.isInteger(raw)) return String(raw);
    const asInt = Math.round(raw);
    if (Math.abs(raw - asInt) < 1e-9) return String(asInt);
    return String(raw);
  }
  const s = String(raw).trim();
  if (/^\d+\.0+$/.test(s)) return s.replace(/\.0+$/, '');
  return s;
}

/**
 * A1 — NCM corrompido pelo Excel (data) → 8 dígitos sem pontuação.
 * Ex.: 3209-10-10 00:00:00 → 32091010
 */
function normalizeNcm(raw: unknown): { ncm: string | null; corrupt: boolean; display: string } {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { ncm: null, corrupt: false, display: '' };
  }

  let corrupt = false;
  if (raw instanceof Date) corrupt = true;
  else {
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(s)) corrupt = true;
  }

  const ncm = normalizeNcmCode(raw);
  return {
    ncm,
    corrupt: corrupt && ncm != null,
    display: raw instanceof Date ? raw.toISOString() : String(raw),
  };
}

function cell(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (k in row && row[k] !== undefined) return row[k];
  }
  return undefined;
}

function loadSheet(workbook: XLSX.WorkBook, sheetName: string, kind: SheetKind): RawRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Aba não encontrada: ${sheetName}`);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  const out: RawRow[] = [];
  for (const row of rows) {
    const sapCode = String(cell(row, 'Nº do item', 'N° do item', 'No do item') ?? '').trim();
    if (!sapCode) continue;
    out.push({
      sheet: kind,
      sapCode,
      description: String(cell(row, 'Descrição do item', 'Descricao do item') ?? ''),
      stockItem: cell(row, 'Item de estoque') != null ? String(cell(row, 'Item de estoque')) : null,
      legacyRaw: cell(row, 'Código Legado', 'Codigo Legado'),
      ncmRaw: cell(row, 'Código NCM', 'Codigo NCM'),
      groupName: String(cell(row, 'Grupo de itens') ?? ''),
      subgroupName: String(cell(row, 'Subgrupo') ?? ''),
      familyName: String(cell(row, 'Família', 'Familia') ?? ''),
      active: !['não', 'nao', 'n', 'false', '0'].includes(
        String(cell(row, 'Ativo') ?? 'Sim').trim().toLowerCase(),
      ),
      umRaw:
        cell(row, 'Unidade de medida de estoque') != null
          ? String(cell(row, 'Unidade de medida de estoque'))
          : null,
      lotRaw: cell(row, 'Lote') != null ? String(cell(row, 'Lote')) : null,
    });
  }
  return out;
}

function normalizeRow(raw: RawRow): NormRow {
  let family = upper(raw.familyName || '');
  let subgroup = upper(raw.subgroupName || '');
  let group = upper(raw.groupName || '');
  let swappedA5 = false;

  // A5 — família/subgrupo trocados
  if (family === 'MATERIAL ADESIVO E VEDACAO' && subgroup === 'MANUTENCAO E OBRAS') {
    family = 'MANUTENCAO E OBRAS';
    subgroup = 'MATERIAL ADESIVO E VEDACAO';
    swappedA5 = true;
  }

  const quarantine = !family || !subgroup;
  if (quarantine) {
    family = QUARANTINE;
    subgroup = QUARANTINE;
    if (!group) group = QUARANTINE;
  }

  const ncm = normalizeNcm(raw.ncmRaw);
  const umTrim = raw.umRaw ? upper(raw.umRaw) : null;
  const umManual = umTrim === 'MANUAL';
  const isAf = raw.sheet === 'ativo_fixo';
  // FIXED_ASSET: sem UM. CONSUMPTION: Manual → UN (CHECK exige UM; A6 sinaliza no relatório).
  let measureUnitCode: string | null = null;
  if (!isAf) {
    if (umManual) measureUnitCode = 'UN';
    else if (umTrim && VALID_UM.has(umTrim)) measureUnitCode = umTrim;
    else measureUnitCode = 'UN';
  }

  return {
    sheet: raw.sheet,
    sapCode: upper(raw.sapCode),
    description: upper(raw.description),
    legacyCode: normalizeLegacy(raw.legacyRaw),
    ncmCode: ncm.ncm,
    ncmWasCorrupt: ncm.corrupt,
    ncmRawDisplay: ncm.display,
    familyOriginal: upper(raw.familyName || '') || '(vazio)',
    subgroupOriginal: upper(raw.subgroupName || '') || '(vazio)',
    groupOriginal: upper(raw.groupName || '') || '(vazio)',
    familyResolved: family,
    subgroupResolved: subgroup,
    groupResolved: group || QUARANTINE,
    active: raw.active,
    fixedAsset: isAf,
    itemKind: isAf ? ItemKind.FIXED_ASSET : ItemKind.CONSUMPTION,
    measureUnitCode,
    quarantine,
    swappedA5,
    umManual,
    groupIsItens: group === 'ITENS',
  };
}

/** Conta pais e escolhe o dominante. */
function dominantParent(counts: Map<string, Map<string, number>>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [child, parents] of counts) {
    let best = '';
    let bestN = -1;
    for (const [parent, n] of parents) {
      if (n > bestN || (n === bestN && parent.localeCompare(best) < 0)) {
        best = parent;
        bestN = n;
      }
    }
    out.set(child, best);
  }
  return out;
}

function parentCounts(
  rows: NormRow[],
  childOf: (r: NormRow) => string,
  parentOf: (r: NormRow) => string,
): Map<string, Map<string, number>> {
  const m = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const child = childOf(r);
    const parent = parentOf(r);
    if (!child || child === QUARANTINE) continue;
    if (!m.has(child)) m.set(child, new Map());
    const pm = m.get(child)!;
    pm.set(parent, (pm.get(parent) ?? 0) + 1);
  }
  return m;
}

function applyDominantBranch(rows: NormRow[]): { rows: NormRow[]; hits: AmbiguityHit[] } {
  const subFamCounts = parentCounts(
    rows,
    (r) => r.subgroupResolved,
    (r) => r.familyResolved,
  );
  const grpSubCounts = parentCounts(
    rows,
    (r) => r.groupResolved,
    (r) => r.subgroupResolved,
  );
  const domFam = dominantParent(subFamCounts);
  const domSub = dominantParent(grpSubCounts);
  const hits: AmbiguityHit[] = [];

  const resolved = rows.map((r) => {
    const next = { ...r };
    if (r.subgroupResolved !== QUARANTINE && domFam.has(r.subgroupResolved)) {
      const fam = domFam.get(r.subgroupResolved)!;
      if (fam !== r.familyResolved) {
        const parents = subFamCounts.get(r.subgroupResolved)!;
        hits.push({
          sapCode: r.sapCode,
          sheet: r.sheet,
          kind: 'subgroup_family',
          name: r.subgroupResolved,
          originalParent: r.familyResolved,
          resolvedParent: fam,
          dominantCount: parents.get(fam) ?? 0,
          outlierCount: parents.get(r.familyResolved) ?? 0,
        });
        next.familyResolved = fam;
      }
    }
    if (r.groupResolved !== QUARANTINE && domSub.has(r.groupResolved)) {
      const sub = domSub.get(r.groupResolved)!;
      if (sub !== r.subgroupResolved) {
        const parents = grpSubCounts.get(r.groupResolved)!;
        hits.push({
          sapCode: r.sapCode,
          sheet: r.sheet,
          kind: 'group_subgroup',
          name: r.groupResolved,
          originalParent: r.subgroupResolved,
          resolvedParent: sub,
          dominantCount: parents.get(sub) ?? 0,
          outlierCount: parents.get(r.subgroupResolved) ?? 0,
        });
        next.subgroupResolved = sub;
        // família do subgrupo dominante
        if (domFam.has(sub)) next.familyResolved = domFam.get(sub)!;
      }
    }
    return next;
  });

  return { rows: resolved, hits };
}

async function upsertFamily(name: string, code: string, itemKind: ItemKind) {
  const byKey = await prisma.family.findUnique({
    where: { name_itemKind: { name, itemKind } },
  });
  if (byKey) {
    if (byKey.code === code) {
      return prisma.family.update({ where: { id: byKey.id }, data: { active: true } });
    }
    const codeHolder = await prisma.family.findUnique({ where: { code } });
    if (codeHolder && codeHolder.id !== byKey.id) {
      await prisma.family.update({
        where: { id: codeHolder.id },
        data: { code: `TMP_${codeHolder.id.replace(/-/g, '').slice(0, 12)}` },
      });
    }
    return prisma.family.update({
      where: { id: byKey.id },
      data: { code, active: true },
    });
  }

  const codeHolder = await prisma.family.findUnique({ where: { code } });
  if (codeHolder) {
    // Código legado de outra família: libera e cria a linha correta (name+kind).
    await prisma.family.update({
      where: { id: codeHolder.id },
      data: { code: `TMP_${codeHolder.id.replace(/-/g, '').slice(0, 12)}` },
    });
  }
  return prisma.family.create({
    data: { name, code, itemKind, active: true },
  });
}

async function upsertSubgroup(familyId: string, name: string, code: string) {
  const byKey = await prisma.subgroup.findUnique({
    where: { familyId_name: { familyId, name } },
  });
  if (byKey) {
    if (byKey.code === code) {
      return prisma.subgroup.update({ where: { id: byKey.id }, data: { active: true } });
    }
    const codeHolder = await prisma.subgroup.findUnique({ where: { code } });
    if (codeHolder && codeHolder.id !== byKey.id) {
      await prisma.subgroup.update({
        where: { id: codeHolder.id },
        data: { code: `TMP_${codeHolder.id.replace(/-/g, '').slice(0, 12)}` },
      });
    }
    return prisma.subgroup.update({
      where: { id: byKey.id },
      data: { code, active: true },
    });
  }
  const codeHolder = await prisma.subgroup.findUnique({ where: { code } });
  if (codeHolder) {
    await prisma.subgroup.update({
      where: { id: codeHolder.id },
      data: { code: `TMP_${codeHolder.id.replace(/-/g, '').slice(0, 12)}` },
    });
  }
  return prisma.subgroup.create({
    data: { familyId, name, code, active: true },
  });
}

async function upsertGroup(subgroupId: string, name: string, code: string) {
  const byKey = await prisma.group.findUnique({
    where: { subgroupId_name: { subgroupId, name } },
  });
  if (byKey) {
    if (byKey.code === code) {
      return prisma.group.update({ where: { id: byKey.id }, data: { active: true } });
    }
    const codeHolder = await prisma.group.findUnique({ where: { code } });
    if (codeHolder && codeHolder.id !== byKey.id) {
      await prisma.group.update({
        where: { id: codeHolder.id },
        data: { code: `TMP_${codeHolder.id.replace(/-/g, '').slice(0, 12)}` },
      });
    }
    return prisma.group.update({
      where: { id: byKey.id },
      data: { code, active: true },
    });
  }
  const codeHolder = await prisma.group.findUnique({ where: { code } });
  if (codeHolder) {
    await prisma.group.update({
      where: { id: codeHolder.id },
      data: { code: `TMP_${codeHolder.id.replace(/-/g, '').slice(0, 12)}` },
    });
  }
  return prisma.group.create({
    data: { subgroupId, name, code, active: true },
  });
}

function dupDescriptions(rows: NormRow[], activeOnly: boolean): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const r of rows) {
    if (activeOnly && !r.active) continue;
    const d = r.description;
    if (!d) continue;
    if (!m.has(d)) m.set(d, []);
    m.get(d)!.push(r.sapCode);
  }
  for (const [k, v] of [...m.entries()]) {
    if (v.length < 2) m.delete(k);
  }
  return m;
}

function mdEscape(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function buildReport(opts: {
  ucRead: number;
  afRead: number;
  ucImported: number;
  afImported: number;
  ucQuarantine: number;
  afQuarantine: number;
  created: number;
  updated: number;
  rows: NormRow[];
  hits: AmbiguityHit[];
  tree: { family: string; subgroups: { name: string; groups: { name: string; count: number }[]; count: number }[]; count: number }[];
  crossSheet: string[];
  subFamAmbiguity: Map<string, Map<string, number>>;
  grpSubAmbiguity: Map<string, Map<string, number>>;
}): string {
  const lines: string[] = [];
  const now = new Date().toISOString();
  lines.push('# Relatório de importação — Base SAP B1');
  lines.push('');
  lines.push(`Gerado em ${now} por \`npm run import:sap\`.`);
  lines.push('');
  lines.push('## Contagem por aba');
  lines.push('');
  lines.push('| Aba | Lidos | Importados | Quarentena |');
  lines.push('|-----|------:|-----------:|-----------:|');
  lines.push(
    `| Uso e consumo | ${opts.ucRead} | ${opts.ucImported} | ${opts.ucQuarantine} |`,
  );
  lines.push(`| Ativo Fixo | ${opts.afRead} | ${opts.afImported} | ${opts.afQuarantine} |`);
  lines.push(
    `| **Total** | **${opts.ucRead + opts.afRead}** | **${opts.ucImported + opts.afImported}** | **${opts.ucQuarantine + opts.afQuarantine}** |`,
  );
  lines.push('');
  lines.push(`Upsert nesta execução: **${opts.created}** criados · **${opts.updated}** atualizados.`);
  lines.push('');
  lines.push('## Árvore final (após ramo dominante + correções)');
  lines.push('');
  for (const fam of opts.tree) {
    lines.push(`### ${fam.family} (${fam.count} itens)`);
    for (const sg of fam.subgroups) {
      lines.push(`- **${sg.name}** (${sg.count})`);
      for (const g of sg.groups) {
        lines.push(`  - ${g.name} (${g.count})`);
      }
    }
    lines.push('');
  }

  // A1
  const a1 = opts.rows.filter((r) => r.ncmWasCorrupt);
  lines.push('## A1 — NCM corrompido pelo Excel');
  lines.push('');
  lines.push(
    `${a1.length} itens reconstruídos (AAAA-MM-DD → 8 dígitos sem pontuação). Persistidos sem pontuação.`,
  );
  lines.push('');
  lines.push('| Item | Aba | Bruto | NCM gravado |');
  lines.push('|------|-----|-------|-------------|');
  for (const r of a1) {
    lines.push(
      `| ${r.sapCode} | ${r.sheet} | ${mdEscape(r.ncmRawDisplay)} | ${r.ncmCode ?? ''} |`,
    );
  }
  lines.push('');

  // A2
  lines.push('## A2 — Código legado como float');
  lines.push('');
  lines.push(
    'Convertido para texto sem decimal. **Não é chave única** (duplicados existem nas duas abas).',
  );
  lines.push('');

  // A3
  lines.push('## A3 — Hierarquia ambígua (resolvida pelo ramo dominante)');
  lines.push('');
  lines.push('### Subgrupos em mais de uma família');
  lines.push('');
  for (const [sub, parents] of [...opts.subFamAmbiguity.entries()].sort()) {
    if (parents.size < 2) continue;
    const parts = [...parents.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([p, n]) => `${p} (${n})`)
      .join(' vs ');
    lines.push(`- **${sub}**: ${parts}`);
  }
  lines.push('');
  lines.push('### Grupos em mais de um subgrupo');
  lines.push('');
  lines.push(
    'Destaque (volume relevante nos dois lados):',
  );
  lines.push('');
  lines.push(
    '- **COMPONENTES ELETRICOS**: ELETRICO (dominante) vs PECAS DE REPOSICAO',
  );
  lines.push(
    '- **UTENSILIOS DE LIMPEZA**: UTENS. DE LIMPEZA (dominante) vs PRODUTOS DE LIMPEZA',
  );
  lines.push('');
  for (const [grp, parents] of [...opts.grpSubAmbiguity.entries()].sort()) {
    if (parents.size < 2) continue;
    const parts = [...parents.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([p, n]) => `${p} (${n})`)
      .join(' vs ');
    lines.push(`- **${grp}**: ${parts}`);
  }
  lines.push('');
  lines.push('### Exceções item a item (outliers levados ao ramo dominante)');
  lines.push('');
  lines.push(
    '| Item | Tipo | Nome | Pai original | Pai aplicado | Dominante (n) | Outlier (n) |',
  );
  lines.push('|------|------|------|--------------|--------------|--------------:|------------:|');
  for (const h of opts.hits) {
    lines.push(
      `| ${h.sapCode} | ${h.kind} | ${mdEscape(h.name)} | ${mdEscape(h.originalParent)} | ${mdEscape(h.resolvedParent)} | ${h.dominantCount} | ${h.outlierCount} |`,
    );
  }
  lines.push('');

  // A4
  const a4 = opts.rows.filter((r) => r.quarantine);
  lines.push('## A4 — Itens sem subgrupo ou família (quarentena)');
  lines.push('');
  lines.push(
    `Importados sob família/subgrupo **${QUARANTINE}**. Total: ${a4.length}.`,
  );
  lines.push('');
  lines.push('| Item | Aba | Família original | Subgrupo original | Grupo original |');
  lines.push('|------|-----|------------------|-------------------|----------------|');
  for (const r of a4) {
    lines.push(
      `| ${r.sapCode} | ${r.sheet} | ${mdEscape(r.familyOriginal)} | ${mdEscape(r.subgroupOriginal)} | ${mdEscape(r.groupOriginal)} |`,
    );
  }
  lines.push('');

  // A5
  const a5 = opts.rows.filter((r) => r.swappedA5);
  lines.push('## A5 — Família e subgrupo trocados');
  lines.push('');
  lines.push(
    'Corrigido: família MATERIAL ADESIVO E VEDACAO + subgrupo MANUTENCAO E OBRAS → invertido.',
  );
  lines.push('');
  for (const r of a5) {
    lines.push(
      `- ${r.sapCode}: aplicado Família=${r.familyResolved} / Subgrupo=${r.subgroupResolved} / Grupo=${r.groupResolved}`,
    );
  }
  lines.push('');

  // A6
  const a6 = opts.rows.filter((r) => r.umManual);
  lines.push('## A6 — Unidade de medida "Manual"');
  lines.push('');
  lines.push(
    `${a6.length} itens CONSUMPTION com UM "Manual" na planilha: gravados como **UN** (ItemKind exige UM em consumo). Ativo fixo continua sem UM.`,
  );
  lines.push('');
  lines.push('| Item | Descrição |');
  lines.push('|------|-----------|');
  for (const r of a6) {
    lines.push(`| ${r.sapCode} | ${mdEscape(r.description)} |`);
  }
  lines.push('');

  // A7
  const a7 = opts.rows.filter((r) => r.groupIsItens);
  lines.push('## A7 — Grupo chamado "Itens"');
  lines.push('');
  lines.push(
    `Placeholder em PECAS DE REPOSICAO. Importado como está. Itens: ${a7.length}.`,
  );
  lines.push('');
  for (const r of a7) {
    lines.push(`- ${r.sapCode} — ${r.description}`);
  }
  lines.push('');

  // A8
  lines.push('## A8 — EQUIPAMENTOS DE INFORMATICA vs EQUIP INFORMATICA E TELEFONIA');
  lines.push('');
  lines.push(
    'Dois grupos distintos mantidos **sem unificação**. Suspeita de serem o mesmo conceito — decisão da Amarante.',
  );
  const gA = opts.rows.filter((r) => r.groupResolved === 'EQUIPAMENTOS DE INFORMATICA');
  const gB = opts.rows.filter((r) => r.groupResolved === 'EQUIP INFORMATICA E TELEFONIA');
  lines.push(`- EQUIPAMENTOS DE INFORMATICA: ${gA.length} itens`);
  lines.push(`- EQUIP INFORMATICA E TELEFONIA: ${gB.length} itens`);
  lines.push('');

  // Duplicates
  const uc = opts.rows.filter((r) => r.sheet === 'uso_consumo');
  const af = opts.rows.filter((r) => r.sheet === 'ativo_fixo');
  const dupUc = dupDescriptions(uc, true);
  const dupAf = dupDescriptions(af, true);
  lines.push('## Descrições duplicadas entre itens ATIVOS');
  lines.push('');
  lines.push('### Uso e consumo — duplicatas de verdade');
  lines.push('');
  lines.push(
    `${dupUc.size} descrições distintas repetidas (${[...dupUc.values()].reduce((a, b) => a + b.length, 0)} itens).`,
  );
  lines.push('');
  for (const [desc, codes] of [...dupUc.entries()].sort()) {
    lines.push(`- **${mdEscape(desc)}** (${codes.length}): ${codes.join(', ')}`);
  }
  lines.push('');
  lines.push('### Ativo Fixo — NÃO são duplicatas de tipo');
  lines.push('');
  lines.push(
    `${dupAf.size} descrições repetidas (${[...dupAf.values()].reduce((a, b) => a + b.length, 0)} itens). Cada linha é um bem patrimonial (instância), não um tipo de produto.`,
  );
  lines.push('');
  for (const [desc, codes] of [...dupAf.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`- **${mdEscape(desc)}** (${codes.length}): ${codes.join(', ')}`);
  }
  lines.push('');

  // Cross sheet
  lines.push('## Descrições presentes nas DUAS abas');
  lines.push('');
  lines.push(`${opts.crossSheet.length} descrições.`);
  lines.push('');
  for (const d of opts.crossSheet) {
    lines.push(`- ${mdEscape(d)}`);
  }
  lines.push('');
  lines.push('## Passivo fiscal — itens ATIVOS sem NCM');
  lines.push('');
  lines.push(
    'Análise oficial da base: **225** itens ativos sem NCM (passivo fiscal). Lista abaixo gerada a partir desta carga, **por família**, para a Amarante priorizar classificação.',
  );
  lines.push('');
  const missingByFamily = new Map<string, { sap: string; desc: string; kind: string }[]>();
  for (const r of opts.rows) {
    if (!r.active || r.ncmCode) continue;
    const list = missingByFamily.get(r.familyResolved) ?? [];
    list.push({
      sap: r.sapCode,
      desc: r.description,
      kind: r.itemKind === ItemKind.FIXED_ASSET ? 'AF' : 'UC',
    });
    missingByFamily.set(r.familyResolved, list);
  }
  const missingTotal = [...missingByFamily.values()].reduce((a, b) => a + b.length, 0);
  lines.push(`**Total nesta carga:** ${missingTotal} itens ativos sem NCM · ${missingByFamily.size} famílias.`);
  lines.push('');
  for (const [fam, items] of [...missingByFamily.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`### ${mdEscape(fam)} (${items.length})`);
    lines.push('');
    for (const it of items.sort((a, b) => a.sap.localeCompare(b.sap))) {
      lines.push(`- \`${it.sap}\` [${it.kind}] ${mdEscape(it.desc)}`);
    }
    lines.push('');
  }

  // also write dedicated report for Amarante
  const missingLines: string[] = [
    '# Passivo fiscal — itens ativos sem NCM',
    '',
    'Relatório para a Amarante priorizar classificação fiscal.',
    '',
    `Gerado em ${now}. Total: **${missingTotal}** (análise oficial citava 225).`,
    '',
  ];
  for (const [fam, items] of [...missingByFamily.entries()].sort((a, b) => b[1].length - a[1].length)) {
    missingLines.push(`## ${fam} (${items.length})`, '');
    for (const it of items.sort((a, b) => a.sap.localeCompare(b.sap))) {
      missingLines.push(`- \`${it.sap}\` [${it.kind}] ${it.desc}`);
    }
    missingLines.push('');
  }
  fs.writeFileSync(NCM_MISSING_REPORT_PATH, missingLines.join('\n'), 'utf8');

  lines.push('## Notas');
  lines.push('');
  lines.push(
    '- NCM canônico = 8 dígitos em `ncm_codes` (FK). Bootstrap SAP_USAGE; import Receita: `npm run import:ncm-receita`.',
  );
  lines.push(
    '- `ncm_confirmed_by` preenchido com o admin do portal no import para satisfazer o CHECK ITM-09. Não substitui confirmação humana no fluxo de novas solicitações.',
  );
  lines.push(
    '- Número de patrimônio, valor de aquisição e depreciação **não** estão na planilha e **não** foram inventados.',
  );
  lines.push('');

  return lines.join('\n');
}

async function main() {
  console.log('==> Import SAP B1');
  if (!fs.existsSync(XLSX_PATH)) {
    throw new Error(`Arquivo não encontrado: ${XLSX_PATH}`);
  }

  const admin = await prisma.user.findUnique({ where: { email: 'admin@amarante.local' } });
  if (!admin) {
    throw new Error(
      'Usuário admin@amarante.local não encontrado. Rode o seed antes do import (`npm run seed`).',
    );
  }

  const umDefs: { code: string; name: string }[] = [
    { code: 'UN', name: 'Unidade' },
    { code: 'KG', name: 'Quilograma' },
    { code: 'MT', name: 'Metro' },
    { code: 'M3', name: 'Metro cúbico' },
    { code: 'LT', name: 'Litro' },
  ];
  const umByCode: Record<string, string> = {};
  for (const u of umDefs) {
    const row = await prisma.measureUnit.upsert({
      where: { code: u.code },
      update: { name: u.name, active: true },
      create: { code: u.code, name: u.name, active: true },
    });
    umByCode[u.code] = row.id;
  }

  const workbook = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const rawUc = loadSheet(workbook, 'Uso e consumo', 'uso_consumo');
  const rawAf = loadSheet(workbook, 'Ativo Fixo', 'ativo_fixo');
  console.log(`    Lidos: UC=${rawUc.length} AF=${rawAf.length}`);

  let normalized = [...rawUc, ...rawAf].map(normalizeRow);

  // Ambiguidades e ramo dominante **por aba** (árvores não se misturam)
  const ucOnly = normalized.filter((r) => r.sheet === 'uso_consumo');
  const afOnly = normalized.filter((r) => r.sheet === 'ativo_fixo');

  const subFamAmbiguity = parentCounts(
    ucOnly,
    (r) => r.subgroupResolved,
    (r) => r.familyResolved,
  );
  const grpSubAmbiguity = parentCounts(
    ucOnly,
    (r) => r.groupResolved,
    (r) => r.subgroupResolved,
  );

  const ucResolved = applyDominantBranch(ucOnly);
  const afResolved = applyDominantBranch(afOnly);
  normalized = [...ucResolved.rows, ...afResolved.rows];
  const hits = [...ucResolved.hits, ...afResolved.hits];

  const codesUc = buildHierarchyCodes(ucResolved.rows, {
    family: 'FAM',
    subgroup: 'SUB',
    group: 'GRP',
  });
  const codesAf = buildHierarchyCodes(afResolved.rows, {
    family: 'AFF',
    subgroup: 'AFS',
    group: 'AFG',
  });

  const familyCache = new Map<string, string>();
  const subgroupCache = new Map<string, string>();
  const groupCache = new Map<string, string>();

  async function resolvePath(
    family: string,
    subgroup: string,
    group: string,
    itemKind: ItemKind,
  ) {
    const codes = itemKind === ItemKind.FIXED_ASSET ? codesAf : codesUc;
    const famKey = `${itemKind}||${family}`;
    if (!familyCache.has(famKey)) {
      const code = codes.familyCode.get(family)!;
      familyCache.set(famKey, (await upsertFamily(family, code, itemKind)).id);
    }
    const familyId = familyCache.get(famKey)!;
    const sgKey = `${itemKind}||${family}||${subgroup}`;
    if (!subgroupCache.has(sgKey)) {
      const code = codes.subgroupCode.get(`${family}||${subgroup}`)!;
      subgroupCache.set(sgKey, (await upsertSubgroup(familyId, subgroup, code)).id);
    }
    const subgroupId = subgroupCache.get(sgKey)!;
    const gKey = `${itemKind}||${family}||${subgroup}||${group}`;
    if (!groupCache.has(gKey)) {
      const code = codes.groupCode.get(`${family}||${subgroup}||${group}`)!;
      groupCache.set(gKey, (await upsertGroup(subgroupId, group, code)).id);
    }
    return { groupId: groupCache.get(gKey)! };
  }

  let created = 0;
  let updated = 0;
  const ncmAt = new Date();

  // Bootstrap ncm_codes com NCMs em uso (FK obrigatória antes do upsert de products)
  const distinctNcms = [...new Set(normalized.map((r) => r.ncmCode).filter(Boolean))] as string[];
  for (const code of distinctNcms) {
    await prisma.ncmCode.upsert({
      where: { code },
      create: {
        code,
        description: formatNcmDisplay(code),
        active: true,
        source: 'SAP_USAGE',
      },
      update: {},
    });
  }

  for (const r of normalized) {
    const pathIds = await resolvePath(
      r.familyResolved,
      r.subgroupResolved,
      r.groupResolved,
      r.itemKind,
    );
    const existing = await prisma.product.findUnique({ where: { sapCode: r.sapCode } });
    const data = {
      descriptionShort: r.description,
      groupId: pathIds.groupId,
      measureUnitId: r.measureUnitCode ? umByCode[r.measureUnitCode] ?? null : null,
      itemKind: r.itemKind,
      source: ProductSource.NATIONAL,
      fixedAsset: r.fixedAsset,
      legacyCode: r.legacyCode,
      sapCode: r.sapCode,
      ncmCode: r.ncmCode,
      ncmConfirmedById: r.ncmCode ? admin.id : null,
      ncmConfirmedAt: r.ncmCode ? ncmAt : null,
      active: r.active,
    };
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.product.create({ data });
      created += 1;
    }
  }

  // Tree for report from resolved rows
  type G = { name: string; count: number };
  type S = { name: string; groups: Map<string, G>; count: number };
  type F = { name: string; subgroups: Map<string, S>; count: number };
  const treeMap = new Map<string, F>();
  for (const r of normalized) {
    if (!treeMap.has(r.familyResolved)) {
      treeMap.set(r.familyResolved, { name: r.familyResolved, subgroups: new Map(), count: 0 });
    }
    const fam = treeMap.get(r.familyResolved)!;
    fam.count += 1;
    if (!fam.subgroups.has(r.subgroupResolved)) {
      fam.subgroups.set(r.subgroupResolved, {
        name: r.subgroupResolved,
        groups: new Map(),
        count: 0,
      });
    }
    const sg = fam.subgroups.get(r.subgroupResolved)!;
    sg.count += 1;
    if (!sg.groups.has(r.groupResolved)) {
      sg.groups.set(r.groupResolved, { name: r.groupResolved, count: 0 });
    }
    sg.groups.get(r.groupResolved)!.count += 1;
  }
  const tree = [...treeMap.values()]
    .sort((a, b) => b.count - a.count)
    .map((f) => ({
      family: f.name,
      count: f.count,
      subgroups: [...f.subgroups.values()]
        .sort((a, b) => b.count - a.count)
        .map((s) => ({
          name: s.name,
          count: s.count,
          groups: [...s.groups.values()].sort((a, b) => b.count - a.count),
        })),
    }));

  const ucRows = normalized.filter((r) => r.sheet === 'uso_consumo');
  const afRows = normalized.filter((r) => r.sheet === 'ativo_fixo');
  const ucDesc = new Set(ucRows.map((r) => r.description).filter(Boolean));
  const afDesc = new Set(afRows.map((r) => r.description).filter(Boolean));
  const crossSheet = [...ucDesc].filter((d) => afDesc.has(d)).sort();

  const report = buildReport({
    ucRead: rawUc.length,
    afRead: rawAf.length,
    ucImported: ucRows.length,
    afImported: afRows.length,
    ucQuarantine: ucRows.filter((r) => r.quarantine).length,
    afQuarantine: afRows.filter((r) => r.quarantine).length,
    created,
    updated,
    rows: normalized,
    hits,
    tree,
    crossSheet,
    subFamAmbiguity,
    grpSubAmbiguity,
  });
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, report, 'utf8');

  const sapCount = await prisma.product.count({ where: { sapCode: { not: null } } });

  // Desativa nós de hierarquia não tocados neste import (órfãos TMP / árvores antigas).
  const usedFamilyIds = [...familyCache.values()];
  const usedSubgroupIds = [...subgroupCache.values()];
  const usedGroupIds = [...groupCache.values()];
  await prisma.family.updateMany({
    where: { id: { notIn: usedFamilyIds }, active: true },
    data: { active: false },
  });
  await prisma.subgroup.updateMany({
    where: { id: { notIn: usedSubgroupIds }, active: true },
    data: { active: false },
  });
  await prisma.group.updateMany({
    where: { id: { notIn: usedGroupIds }, active: true },
    data: { active: false },
  });

  console.log(`OK  criados=${created} atualizados=${updated} produtos_com_sap_code=${sapCount}`);
  console.log(`    Relatório: ${REPORT_PATH}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
