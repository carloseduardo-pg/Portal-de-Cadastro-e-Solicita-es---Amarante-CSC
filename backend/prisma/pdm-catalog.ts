/**
 * Atributos PDM de **demonstração** (pendência P3).
 *
 * A base SAP B1 oficial NÃO traz atributos por família. Este catálogo existe só para
 * exercitar o formulário até a Amarante entregar a lista real.
 *
 * Chave = nome exato da família SAP (reconciliação por nome). Famílias sem entrada
 * usam FALLBACK_ATTRS.
 *
 * Hierarquia e produtos: `npm run import:sap` — não semear aqui.
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

/**
 * DEMO / P3 — atributos por nome de família SAP.
 * Substituir pela lista oficial Amarante quando disponível.
 */
export const PDM_ATTRS_BY_FAMILY: Record<string, PdmAttributeDef[]> = {
  ALIMENTOS: [
    { name: 'TIPO', required: true, examples: ['IN NATURA', 'PROCESSADO', 'CONGELADO'] },
    ATTR.conservacao,
    ATTR.embalagem,
    ATTR.pesoVol,
    ATTR.marca,
  ],
  BEBIDAS: [
    { name: 'TIPO', required: true, examples: ['AGUA', 'REFRIGERANTE', 'SUCO', 'CERVEJA'] },
    { name: 'COM GAS', required: false, examples: ['SIM', 'NAO'] },
    ATTR.embalagem,
    ATTR.pesoVol,
    ATTR.marca,
  ],
  UNIFORMES: [
    { name: 'PECA', required: true, examples: ['CAMISA', 'CALCA', 'AVENTAL', 'BONE'] },
    { name: 'TAMANHO', required: true, examples: ['P', 'M', 'G', 'GG', 'XG'] },
    { name: 'COR', required: true, examples: ['BRANCO', 'PRETO', 'AZUL'] },
    ATTR.marca,
  ],
  'MATERIAL DE LIMPEZA': [
    { name: 'TIPO', required: true, examples: ['DETERGENTE', 'DESINFETANTE', 'SABAO'] },
    ATTR.embalagem,
    ATTR.pesoVol,
    ATTR.marca,
  ],
  'MATERIAL DE ESCRITORIO': [
    { name: 'TIPO', required: true, examples: ['BLOCO', 'CANETA', 'PASTA', 'ENVELOPE'] },
    { name: 'FORMATO', required: false, examples: ['A4', 'A5', 'OFICIO'] },
    ATTR.marca,
  ],
};

const FALLBACK_ATTRS: PdmAttributeDef[] = [
  { name: 'TIPO', required: true, examples: ['PADRAO', 'ESPECIAL'] },
  ATTR.embalagem,
  ATTR.pesoVol,
  ATTR.marca,
];

/**
 * Atributos de protótipo para uma família SAP (por nome).
 * Pendência P3 — não é dado oficial.
 */
export function pdmAttributesForFamily(familyName: string): PdmAttributeDef[] {
  const key = familyName.trim().toUpperCase();
  return PDM_ATTRS_BY_FAMILY[key] ?? FALLBACK_ATTRS;
}
