import type { CatalogGroup, CatalogSubgroup, Family } from './types';

/** Subgrupos pertencentes a uma família SAP. */
export function filterSubgroupsForFamily(subgroups: CatalogSubgroup[], familyId: string) {
  if (!familyId) return [];
  return subgroups.filter((sg) => sg.familyId === familyId || sg.family?.id === familyId);
}

/** Grupos de itens pertencentes a um subgrupo SAP. */
export function filterGroupsForSubgroup(groups: CatalogGroup[], subgroupId: string) {
  if (!subgroupId) return [];
  return groups.filter((g) => g.subgroupId === subgroupId);
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
