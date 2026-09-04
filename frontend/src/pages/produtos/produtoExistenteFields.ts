import { formatNcmDisplay } from '../../lib/ncm';
import type {
  CatalogGroup,
  CatalogSubgroup,
  CostCenter,
  MeasureUnit,
  ProductBase,
} from '../../lib/types';

/**
 * Espelho editável do produto da base. Todo campo é string para o diff
 * "original × solicitado" ser textual e direto.
 */
export type ExistingItemValues = {
  descriptionShort: string;
  descriptionLong: string;
  unifiedCode: string;
  legacyCode: string;
  ncmCode: string;
  subgroupId: string;
  groupId: string;
  source: string;
  measureUnitId: string;
  costCenterId: string;
  law116: string;
  productLink: string;
  itemObservation: string;
  physicalLocation: string;
  assetTag: string;
  acquisitionValue: string;
  acquisitionDate: string;
  usefulLifeMonths: string;
  depreciationRate: string;
  supplierDocument: string;
  invoiceNumber: string;
};

export type ExistingItemField = keyof ExistingItemValues;

export type FieldOption = { value: string; label: string };

export type FieldSectionId = 'identificacao' | 'classificacao' | 'complemento' | 'ativo';

export type FieldDef = {
  key: ExistingItemField;
  label: string;
  kind: 'text' | 'textarea' | 'select' | 'number' | 'date';
  section: FieldSectionId;
  /** Caixa alta forçada (ITM-01). */
  uppercase?: boolean;
  options?: FieldOption[];
  hint?: string;
  /** Campo derivado do catálogo — não vai no payload, só dirige o cascade. */
  virtual?: boolean;
};

export const FIELD_SECTIONS: { id: FieldSectionId; title: string }[] = [
  { id: 'identificacao', title: 'Identificação do item' },
  { id: 'classificacao', title: 'Classificação e apoio' },
  { id: 'complemento', title: 'Complemento' },
  { id: 'ativo', title: 'Dados de ativo fixo' },
];

const SOURCE_OPTIONS: FieldOption[] = [
  { value: 'NATIONAL', label: 'Nacional' },
  { value: 'FOREIGN', label: 'Estrangeiro' },
];

/** Converte valor numérico/decimal vindo da API em string de formulário. */
function numText(value: unknown): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : String(value);
}

/** Monta o espelho inicial do formulário a partir do produto da base. */
export function valuesFromProduct(product: ProductBase): ExistingItemValues {
  return {
    descriptionShort: product.descriptionShort ?? '',
    descriptionLong: product.descriptionLong ?? '',
    unifiedCode: product.unifiedCode ?? '',
    legacyCode: product.legacyCode ?? '',
    ncmCode: product.ncmCode?.trim() ?? '',
    subgroupId: product.group?.subgroupId ?? product.group?.subgroup?.id ?? '',
    groupId: product.groupId ?? product.group?.id ?? '',
    source: product.source ?? 'NATIONAL',
    measureUnitId: product.measureUnitId ?? product.measureUnit?.id ?? '',
    costCenterId: product.costCenterId ?? product.costCenter?.id ?? '',
    law116: product.law116 ?? '',
    productLink: product.productLink ?? '',
    itemObservation: product.notes ?? '',
    physicalLocation: product.physicalLocation ?? '',
    assetTag: product.assetTag ?? '',
    acquisitionValue: numText(product.acquisitionValue),
    acquisitionDate: product.acquisitionDate
      ? String(product.acquisitionDate).slice(0, 10)
      : '',
    usefulLifeMonths: numText(product.usefulLifeMonths),
    depreciationRate: numText(product.depreciationRate),
    supplierDocument: product.supplierDocument ?? '',
    invoiceNumber: product.invoiceNumber ?? '',
  };
}

/**
 * Campos exibidos no formulário do item existente.
 * Ativo fixo e consumo não compartilham o mesmo conjunto.
 */
export function buildFieldDefs(opts: {
  fixedAsset: boolean;
  subgroups: CatalogSubgroup[];
  groups: CatalogGroup[];
  measureUnits: MeasureUnit[];
  costCenters: CostCenter[];
  subgroupId: string;
  /** ITM-11: o lote fica na família do item, então só ela oferece subgrupos. */
  familyId?: string;
}): FieldDef[] {
  const subgroupOptions = opts.subgroups
    .filter((s) => !opts.familyId || s.familyId === opts.familyId)
    .map((s) => ({
      value: s.id,
      label: `${s.code} — ${s.name}`,
    }));
  const groupOptions = opts.groups
    .filter((g) => !opts.subgroupId || g.subgroupId === opts.subgroupId)
    .map((g) => ({ value: g.id, label: `${g.code} — ${g.name}` }));
  const measureUnitOptions = opts.measureUnits.map((m) => ({
    value: m.id,
    label: `${m.code} — ${m.name}`,
  }));
  const costCenterOptions = opts.costCenters.map((c) => ({
    value: c.id,
    label: `${c.code} — ${c.name}`,
  }));

  const defs: FieldDef[] = [
    {
      key: 'descriptionShort',
      label: 'Descrição curta',
      kind: 'text',
      section: 'identificacao',
      uppercase: true,
    },
    {
      key: 'descriptionLong',
      label: 'Descrição longa',
      kind: 'textarea',
      section: 'identificacao',
      uppercase: true,
    },
    {
      key: 'unifiedCode',
      label: 'Código unificado',
      kind: 'text',
      section: 'identificacao',
      uppercase: true,
    },
    {
      key: 'legacyCode',
      label: 'Código legado',
      kind: 'text',
      section: 'identificacao',
      uppercase: true,
    },
    {
      key: 'ncmCode',
      label: 'Código NCM',
      kind: 'text',
      section: 'identificacao',
      hint: 'ITM-09: sugestão do solicitante — a confirmação continua sendo do aprovador.',
    },
    {
      key: 'subgroupId',
      label: 'Subgrupo',
      kind: 'select',
      section: 'classificacao',
      options: subgroupOptions,
      virtual: true,
    },
    {
      key: 'groupId',
      label: 'Grupo de itens (folha SAP)',
      kind: 'select',
      section: 'classificacao',
      options: groupOptions,
    },
    {
      key: 'source',
      label: 'Fonte do produto',
      kind: 'select',
      section: 'classificacao',
      options: SOURCE_OPTIONS,
    },
    {
      key: 'costCenterId',
      label: 'Centro de custo',
      kind: 'select',
      section: 'classificacao',
      options: costCenterOptions,
    },
  ];

  if (!opts.fixedAsset) {
    defs.push(
      {
        key: 'measureUnitId',
        label: 'Unidade de medida',
        kind: 'select',
        section: 'classificacao',
        options: measureUnitOptions,
      },
      {
        key: 'law116',
        label: 'Lei 116',
        kind: 'text',
        section: 'classificacao',
        uppercase: true,
      },
    );
  }

  defs.push(
    {
      key: 'productLink',
      label: 'Link do produto',
      kind: 'text',
      section: 'complemento',
    },
    {
      key: 'itemObservation',
      label: 'Observação do item',
      kind: 'textarea',
      section: 'complemento',
    },
  );

  if (opts.fixedAsset) {
    defs.push(
      {
        key: 'physicalLocation',
        label: 'Localização física',
        kind: 'text',
        section: 'ativo',
        uppercase: true,
      },
      {
        key: 'assetTag',
        label: 'Número de patrimônio',
        kind: 'text',
        section: 'ativo',
        uppercase: true,
      },
      {
        key: 'acquisitionValue',
        label: 'Valor de aquisição',
        kind: 'number',
        section: 'ativo',
      },
      {
        key: 'acquisitionDate',
        label: 'Data de aquisição',
        kind: 'date',
        section: 'ativo',
      },
      {
        key: 'usefulLifeMonths',
        label: 'Vida útil (meses)',
        kind: 'number',
        section: 'ativo',
      },
      {
        key: 'depreciationRate',
        label: 'Taxa de depreciação',
        kind: 'number',
        section: 'ativo',
      },
      {
        key: 'supplierDocument',
        label: 'Documento do fornecedor',
        kind: 'text',
        section: 'ativo',
      },
      {
        key: 'invoiceNumber',
        label: 'Nota fiscal',
        kind: 'text',
        section: 'ativo',
        uppercase: true,
      },
    );
  }

  return defs;
}

/** NCM só existe como dígitos — pontuação digitada não conta como alteração. */
function ncmDigits(value: string) {
  return value.replace(/\D/g, '');
}

/** Texto exibido no modo leitura e no resumo de alterações. */
export function displayValue(def: FieldDef, value: string): string {
  if (!value) return '—';
  if (def.key === 'ncmCode') return formatNcmDisplay(ncmDigits(value)) || value;
  if (def.options) {
    return def.options.find((o) => o.value === value)?.label ?? value;
  }
  return value;
}

/** Campos alterados em relação ao cadastro da base. */
export function diffFields(
  defs: FieldDef[],
  baseline: ExistingItemValues,
  values: ExistingItemValues,
): FieldDef[] {
  return defs.filter((def) => {
    const before = baseline[def.key] ?? '';
    const after = values[def.key] ?? '';
    if (def.key === 'ncmCode') return ncmDigits(before) !== ncmDigits(after);
    return before.trim() !== after.trim();
  });
}
