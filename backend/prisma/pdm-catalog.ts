/**
 * Atributos PDM de **demonstração** (pendência P3).
 *
 * A base SAP B1 oficial NÃO traz atributos por subgrupo. Este catálogo existe só para
 * exercitar o formulário até a Amarante entregar a lista real por subgrupo.
 *
 * Hierarquia e produtos: `npm run import:sap` — não semear aqui.
 * Seed: apaga e recria `product_attributes` por subgrupo (não duplica família → todos os filhos).
 */
export type PdmAttributeDef = {
  name: string;
  required: boolean;
  examples: string[];
};

const ATTR = {
  marca: {
    name: 'MARCA',
    required: false,
    examples: ['SEARA', 'SADIA', 'NESTLE', 'UNILEVER'],
  },
  conservacao: {
    name: 'CONSERVACAO',
    required: true,
    examples: ['CONGELADO', 'RESFRIADO', 'FRESCO', 'AMBIENTE'],
  },
  embalagem: {
    name: 'EMBALAGEM',
    required: true,
    examples: ['PCT', 'CX', 'BDJ', 'GALAO', 'FARDO'],
  },
  embalagemBebida: {
    name: 'EMBALAGEM',
    required: true,
    examples: ['GARRAFA PET', 'GARRAFA VIDRO', 'LATA', 'TETRA PAK', 'GALAO', 'SACHE'],
  },
  pesoVol: {
    name: 'PESO / VOLUME',
    required: true,
    examples: ['500 G', '1 KG', '5 KG', '500 ML', '1 L'],
  },
  origem: {
    name: 'ORIGEM / PROCEDENCIA',
    required: false,
    examples: ['NACIONAL', 'IMPORTADO', 'REGIONAL'],
  },
} as const satisfies Record<string, PdmAttributeDef>;

/** Templates reutilizáveis (demo). */
const TEMPLATE_ALIMENTOS: PdmAttributeDef[] = [
  { name: 'TIPO', required: true, examples: ['IN NATURA', 'PROCESSADO', 'CONGELADO'] },
  ATTR.conservacao,
  ATTR.embalagem,
  ATTR.pesoVol,
  ATTR.marca,
];

const TEMPLATE_BEBIDAS: PdmAttributeDef[] = [
  { name: 'TIPO', required: true, examples: ['AGUA', 'REFRIGERANTE', 'SUCO', 'CERVEJA'] },
  { name: 'COM GAS', required: false, examples: ['SIM', 'NAO'] },
  ATTR.embalagemBebida,
  ATTR.pesoVol,
  ATTR.marca,
];

const TEMPLATE_UNIFORMES: PdmAttributeDef[] = [
  { name: 'PECA', required: true, examples: ['CAMISA', 'CALCA', 'AVENTAL', 'BONE'] },
  { name: 'TAMANHO', required: true, examples: ['P', 'M', 'G', 'GG', 'XG'] },
  { name: 'COR', required: true, examples: ['BRANCO', 'PRETO', 'AZUL'] },
  ATTR.marca,
];

const TEMPLATE_LIMPEZA: PdmAttributeDef[] = [
  { name: 'TIPO', required: true, examples: ['DETERGENTE', 'DESINFETANTE', 'SABAO'] },
  ATTR.embalagem,
  ATTR.pesoVol,
  ATTR.marca,
];

const TEMPLATE_ESCRITORIO: PdmAttributeDef[] = [
  { name: 'TIPO', required: true, examples: ['BLOCO', 'CANETA', 'PASTA', 'ENVELOPE'] },
  { name: 'FORMATO', required: false, examples: ['A4', 'A5', 'OFICIO'] },
  ATTR.marca,
];

const FALLBACK_ATTRS: PdmAttributeDef[] = [
  { name: 'TIPO', required: true, examples: ['PADRAO', 'ESPECIAL'] },
  ATTR.embalagem,
  ATTR.pesoVol,
  ATTR.marca,
];

/**
 * Overrides explícitos por nome de subgrupo (demo / P3).
 * Subgrupos sem entrada usam rotação de templates (garante listas distintas na mesma família).
 */
export const PDM_ATTRS_BY_SUBGROUP: Record<string, PdmAttributeDef[]> = {
  ALIMENTOS: TEMPLATE_ALIMENTOS,
  BEBIDAS: TEMPLATE_BEBIDAS,
  UNIFORMES: TEMPLATE_UNIFORMES,
  'MATERIAL DE LIMPEZA': TEMPLATE_LIMPEZA,
  'MATERIAL DE ESCRITORIO': TEMPLATE_ESCRITORIO,
};

const DEMO_TEMPLATES: PdmAttributeDef[][] = [
  TEMPLATE_ALIMENTOS,
  TEMPLATE_BEBIDAS,
  TEMPLATE_UNIFORMES,
  TEMPLATE_LIMPEZA,
  TEMPLATE_ESCRITORIO,
  FALLBACK_ATTRS,
];

/**
 * Atributos de protótipo para um subgrupo (por nome).
 * `siblingIndex` — posição entre irmãos da mesma família (seed) para listas distintas.
 * Pendência P3 — não é dado oficial. Lista oficial Amarante substituirá isto.
 */
export function pdmAttributesForSubgroup(
  subgroupName: string,
  _familyName?: string,
  siblingIndex = 0,
): PdmAttributeDef[] {
  const key = subgroupName.trim().toUpperCase();
  if (PDM_ATTRS_BY_SUBGROUP[key]) return PDM_ATTRS_BY_SUBGROUP[key];
  return DEMO_TEMPLATES[siblingIndex % DEMO_TEMPLATES.length] ?? FALLBACK_ATTRS;
}
