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

/** @deprecated Preferir filterSubgroupsForFamily — mantido para chamadas legadas. */
export function filterSubgroupsForGroup(subgroups: CatalogSubgroup[], _groupId: string) {
  return subgroups;
}

/** @deprecated Preferir filterGroupsForSubgroup. */
export function filterGroupsForFamily(groups: CatalogGroup[], family: Family | undefined) {
  if (!family?.id) return [];
  return groups.filter((g) => g.familyId === family.id);
}

/** @deprecated Códigos 6 dígitos Semplice — SAP usa texto. */
export function resolveFamilyByCode(families: Family[], code: string) {
  const normalized = code.replace(/\D/g, '');
  if (normalized.length !== 6) return null;
  return families.find((f) => f.code === normalized) ?? null;
}

/** Rótulo hierárquico Família › Subgrupo › Grupo. */
export function pdmTrailLabel(family: Family | undefined) {
  if (!family) return '';
  return `${family.code} — ${family.name}`;
}
