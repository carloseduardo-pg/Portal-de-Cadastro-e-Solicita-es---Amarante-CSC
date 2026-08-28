/** Match exato (100%) — bloqueia inclusão duplicada na base (consumo). */
export function isExactProductMatch(
  similarity: number,
  query: string,
  descriptionShort: string,
): boolean {
  if (similarity >= 0.999) return true;
  return query.trim().toUpperCase() === descriptionShort.trim().toUpperCase();
}

/** Verifica se algum resultado da busca é match exato com a query. */
export function hasExactProductMatch(
  results: { similarity: number; descriptionShort: string }[],
  query: string,
): boolean {
  const q = query.trim();
  if (!q) return false;
  return results.some((r) => isExactProductMatch(r.similarity, q, r.descriptionShort));
}

/** Primeiro resultado com match 100% (para distinguir ativo vs bloqueado). */
export function findExactProductMatch<
  T extends { similarity: number; descriptionShort: string },
>(results: T[], query: string): T | null {
  const q = query.trim();
  if (!q) return null;
  return results.find((r) => isExactProductMatch(r.similarity, q, r.descriptionShort)) ?? null;
}

/**
 * Mensagem da trava CONSUMPTION.
 * Inativo ou blockState ≠ NONE → item bloqueado (furo do BLOQUEIO_TOTAL).
 */
export function exactDuplicateMessage(match: {
  active?: boolean;
  blockState?: string | null;
} | null): string {
  if (!match) {
    return 'Produto já existe na base unificada (match 100%). Use Alteração ou Bloqueio.';
  }
  const blocked =
    match.active === false ||
    (match.blockState != null && match.blockState !== 'NONE');
  if (blocked) {
    return 'Existe um item idêntico bloqueado na base.';
  }
  return 'Produto já existe na base unificada (match 100%). Use Alteração ou Bloqueio.';
}

/** Conta resultados com descrição exatamente igual à query (client-side). */
export function countExactDescriptionMatches(
  results: { descriptionShort: string }[],
  query: string,
): number {
  const q = query.trim().toUpperCase();
  if (!q) return 0;
  return results.filter((r) => r.descriptionShort.trim().toUpperCase() === q).length;
}
