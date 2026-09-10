import type { CatalogGroup, CatalogSubgroup, Family } from './types';

/**
 * Subgrupos pertencentes a uma família SAP.
 * Mantido para telas que ainda filtram por família (ex.: Parametrizações / detalhes).
 */
export function filterSubgroupsForFamily(subgroups: CatalogSubgroup[], familyId: string) {
  if (!familyId) return [];
  return subgroups.filter((sg) => sg.familyId === familyId || sg.family?.id === familyId);
}

/** Grupos de itens pertencentes a um subgrupo SAP (cascata do lote). */
export function filterGroupsForSubgroup(groups: CatalogGroup[], subgroupId: string) {
  if (!subgroupId) return [];
  return groups.filter((g) => g.subgroupId === subgroupId);
}

/** Resolve subgrupo no catálogo carregado. */
export function findSubgroupById(subgroups: CatalogSubgroup[], subgroupId: string) {
  return subgroups.find((sg) => sg.id === subgroupId);
}

/** Defaults de classificação a partir do subgrupo do lote (grupo só se único). */
export function classificationFromSubgroup(
  subgroupId: string,
  groups: CatalogGroup[],
): { groupId: string; subgroupId: string } {
  if (!subgroupId) return { groupId: '', subgroupId: '' };
  const under = filterGroupsForSubgroup(groups, subgroupId);
  return {
    subgroupId,
    groupId: under.length === 1 ? under[0].id : '',
  };
}

/** Rótulo hierárquico Família › Subgrupo › Grupo. */
export function hierarchyTrailLabel(parts: {
  family?: Pick<Family, 'code' | 'name'> | null;
  subgroup?: Pick<CatalogSubgroup, 'code' | 'name'> | null;
  group?: Pick<CatalogGroup, 'code' | 'name'> | null;
}) {
  return [parts.family, parts.subgroup, parts.group]
    .filter(Boolean)
    .map((p) => `${p!.code} — ${p!.name}`)
    .join(' › ');
}
