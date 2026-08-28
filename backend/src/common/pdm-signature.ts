/**
 * Normaliza descrição para assinatura PDM (anti-duplicidade CONSUMPTION).
 * Regra: sem acento, CAIXA ALTA, remove pontuação, colapsa espaços.
 * Deve permanecer alinhada a `fn_pdm_signature` no PostgreSQL.
 */
export function buildPdmSignature(description: string): string {
  return description
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[\p{P}\p{S}]+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
