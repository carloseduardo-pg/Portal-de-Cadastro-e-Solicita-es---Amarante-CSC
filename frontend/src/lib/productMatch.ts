/** Match exato (100%) — bloqueia inclusão duplicada na base. */
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
