/**
 * Importa catálogo real Amarante (centros de custo + família/subgrupo/grupo).
 *
 * Arquivo fonte:
 * `base-sap/Centros de custo_Grupos de produto.xlsx`
 *
 * Uso:
 * `npm run import:catalog-real`
 */
import { ItemKind, PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

const ROOT = path.resolve(__dirname, '../..');
const XLSX_PATH = path.join(ROOT, 'base-sap/Centros de custo_Grupos de produto.xlsx');

type GroupSheetRow = {
  rawCode: string;
  groupName: string;
  subgroupName: string;
  familyName: string;
};

type CostCenterSheetRow = {
  code: string;
  name: string;
};

function upper(value: unknown) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function numericLikeCode(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  const text = String(value).trim();
  if (!text) return '';
  return text.replace(/\.0+$/, '');
}

function normalizeGroupRows(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['Grupos de produto'];
  if (!sheet) throw new Error('Aba "Grupos de produto" não encontrada.');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });

  const unique = new Map<string, GroupSheetRow>();
  for (const row of rows) {
    const rawCode = numericLikeCode(row['Cód do grupo'] ?? row['Cod do grupo']);
    const groupName = upper(row['Grupo de itens']);
    const subgroupName = upper(row.Subgrupo);
    const familyName = upper(row.Família ?? row.Familia);
    if (!rawCode || !groupName || !familyName) continue;
    const subgroupResolved = subgroupName || 'NAO CLASSIFICADO';
    const key = `${familyName}||${subgroupResolved}||${groupName}||${rawCode}`;
    if (!unique.has(key)) {
      unique.set(key, {
        rawCode,
        groupName,
        subgroupName: subgroupResolved,
        familyName,
      });
    }
  }
  return [...unique.values()];
}

function normalizeCostCenterRows(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets['Centros de custo'];
  if (!sheet) throw new Error('Aba "Centros de custo" não encontrada.');
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  const unique = new Map<string, CostCenterSheetRow>();
  for (const row of rows) {
    const code = numericLikeCode(row['Código do centro'] ?? row['Codigo do centro']);
    const name = upper(row['Nome do centro']);
    if (!code || !name) continue;
    unique.set(code, { code, name });
  }
  return [...unique.values()];
}

async function nextCode(prefix: string, used: Set<string>) {
  let seq = 1;
  while (used.has(`${prefix}${String(seq).padStart(3, '0')}`)) seq += 1;
  const value = `${prefix}${String(seq).padStart(3, '0')}`;
  used.add(value);
  return value;
}

async function main() {
  console.log('==> Import catálogo real (Amarante)');
  const workbook = XLSX.readFile(XLSX_PATH, { cellDates: true });
  const groupRows = normalizeGroupRows(workbook);
  const costCenterRows = normalizeCostCenterRows(workbook);

  const existingFamilies = await prisma.family.findMany({
    select: { id: true, name: true, itemKind: true, code: true },
  });
  const existingSubgroups = await prisma.subgroup.findMany({
    select: { id: true, familyId: true, name: true, code: true },
  });
  const existingGroups = await prisma.group.findMany({
    select: { id: true, subgroupId: true, name: true, code: true },
  });
  const usedFamilyCodes = new Set(existingFamilies.map((r) => r.code));
  const usedSubgroupCodes = new Set(existingSubgroups.map((r) => r.code));
  const usedGroupCodes = new Set(existingGroups.map((r) => r.code));

  const familyByKey = new Map(
    existingFamilies.map((f) => [`${f.itemKind}||${upper(f.name)}`, { id: f.id, code: f.code }]),
  );
  const subgroupByKey = new Map(
    existingSubgroups.map((s) => [`${s.familyId}||${upper(s.name)}`, { id: s.id, code: s.code }]),
  );
  const groupByKey = new Map(
    existingGroups.map((g) => [`${g.subgroupId}||${upper(g.name)}`, { id: g.id, code: g.code }]),
  );

  let createdFamilies = 0;
  let createdSubgroups = 0;
  let createdGroups = 0;
  let updatedGroups = 0;

  for (const row of groupRows) {
    const explicitAf = row.familyName === 'IMOBILIZADO';
    const itemKind = explicitAf ? ItemKind.FIXED_ASSET : ItemKind.CONSUMPTION;
    const familyKey = `${itemKind}||${row.familyName}`;
    let family = familyByKey.get(familyKey);
    if (!family) {
      const code = await nextCode(itemKind === ItemKind.FIXED_ASSET ? 'AFR' : 'FAMR', usedFamilyCodes);
      const created = await prisma.family.create({
        data: {
          name: row.familyName,
          itemKind,
          code,
          active: true,
        },
      });
      family = { id: created.id, code: created.code };
      familyByKey.set(familyKey, family);
      createdFamilies += 1;
    } else {
      await prisma.family.update({ where: { id: family.id }, data: { active: true } });
    }

    const subgroupKey = `${family.id}||${row.subgroupName}`;
    let subgroup = subgroupByKey.get(subgroupKey);
    if (!subgroup) {
      const code = await nextCode(itemKind === ItemKind.FIXED_ASSET ? 'AFSR' : 'SUBR', usedSubgroupCodes);
      const created = await prisma.subgroup.create({
        data: {
          familyId: family.id,
          name: row.subgroupName,
          code,
          active: true,
        },
      });
      subgroup = { id: created.id, code: created.code };
      subgroupByKey.set(subgroupKey, subgroup);
      createdSubgroups += 1;
    } else {
      await prisma.subgroup.update({ where: { id: subgroup.id }, data: { active: true } });
    }

    const groupKey = `${subgroup.id}||${row.groupName}`;
    let group = groupByKey.get(groupKey);
    if (!group) {
      const code = await nextCode(itemKind === ItemKind.FIXED_ASSET ? 'AFGR' : 'GRPR', usedGroupCodes);
      const created = await prisma.group.create({
        data: {
          subgroupId: subgroup.id,
          name: row.groupName,
          code,
          catalogCode: row.rawCode,
          active: true,
        },
      });
      group = { id: created.id, code: created.code };
      groupByKey.set(groupKey, group);
      createdGroups += 1;
    } else {
      await prisma.group.update({
        where: { id: group.id },
        data: {
          active: true,
          catalogCode: row.rawCode,
        },
      });
      updatedGroups += 1;
    }
  }

  const hotels = await prisma.hotel.findMany({
    where: { active: true },
    select: { id: true },
  });
  let upsertedCenters = 0;
  for (const center of costCenterRows) {
    for (const hotel of hotels) {
      await prisma.costCenter.upsert({
        where: { hotelId_code: { hotelId: hotel.id, code: center.code } },
        update: { name: center.name, active: true },
        create: {
          hotelId: hotel.id,
          code: center.code,
          name: center.name,
          active: true,
        },
      });
      upsertedCenters += 1;
    }
  }

  /** Remove stubs/legado que não estão na planilha (ex.: A&B do seed antigo). */
  const sheetCodes = costCenterRows.map((c) => c.code);
  const obsolete = await prisma.costCenter.findMany({
    where: { code: { notIn: sheetCodes } },
    select: { id: true, code: true },
  });
  if (obsolete.length) {
    const obsoleteIds = obsolete.map((c) => c.id);
    await prisma.productHotel.updateMany({
      where: { costCenterId: { in: obsoleteIds } },
      data: { costCenterId: null },
    });
    await prisma.requestItem.updateMany({
      where: { costCenterId: { in: obsoleteIds } },
      data: { costCenterId: null },
    });
    await prisma.product.updateMany({
      where: { costCenterId: { in: obsoleteIds } },
      data: { costCenterId: null },
    });
    await prisma.costCenter.deleteMany({ where: { id: { in: obsoleteIds } } });
  }
  const obsoleteCodes = [...new Set(obsolete.map((c) => c.code))];

  console.log(
    `OK  catálogo: famílias +${createdFamilies}, subgrupos +${createdSubgroups}, grupos +${createdGroups} (${updatedGroups} atualizados)`,
  );
  console.log(
    `    centros de custo: ${costCenterRows.length} códigos replicados em ${hotels.length} hotéis (${upsertedCenters} upserts)`,
  );
  if (obsoleteCodes.length) {
    console.log(`    removidos fora da planilha: ${obsoleteCodes.join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

