import type { ProductAttribute } from './types';

/** Sentinel no select — libera input de texto livre. */
export const PDM_ATTR_OTHER = '__OUTRO__';

/** Atributos com lista fechada (sem “Outro”) no protótipo PDM. */
const CLOSED_ATTR_NAMES = new Set([
  'COM GAS',
  'TAMANHO',
  'CONSERVACAO',
  'EMBALAGEM',
  'TIPO',
  'PECA',
  'COR',
  'FORMATO',
  'ORIGEM / PROCEDENCIA',
]);

export type PdmAttributeInputMode = 'text' | 'select' | 'select_other';

/**
 * Decide o controle de UI a partir do nome e dos examples do atributo demo.
 * Sem schema de tipo — heurística até a lista oficial Amarante.
 */
export function pdmAttributeInputMode(attr: ProductAttribute): PdmAttributeInputMode {
  const options = (attr.examples ?? []).map((e) => e.trim()).filter(Boolean);
  if (options.length < 2) return 'text';

  const name = attr.name.trim().toUpperCase();
  const onlySimNao =
    options.length === 2 &&
    options.every((o) => {
      const u = o.toUpperCase().replace('Ã', 'A');
      return u === 'SIM' || u === 'NAO';
    });

  if (onlySimNao || CLOSED_ATTR_NAMES.has(name)) return 'select';
  return 'select_other';
}

/** Opções de select (examples), normalizadas em CAIXA ALTA. */
export function pdmAttributeOptions(attr: ProductAttribute): string[] {
  return (attr.examples ?? [])
    .map((e) => e.trim().toUpperCase())
    .filter(Boolean);
}
