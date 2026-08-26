import type { CatalogGroup, CatalogSubgroup, Family } from './types';

/** Subgrupos pertencentes a um grupo PDM. */
export function filterSubgroupsForGroup(subgroups: CatalogSubgroup[], groupId: string) {
  if (!groupId) return [];
  return subgroups.filter((sg) => sg.groupId === groupId || sg.group?.id === groupId);
}

/** Famílias pertencentes a um subgrupo PDM. */
export function filterFamiliesForSubgroup(families: Family[], subgroupId: string) {
  if (!subgroupId) return [];
  return families.filter((f) => f.subgroupId === subgroupId);
}

/** Grupo derivado da família selecionada (ITM-11). */
export function filterGroupsForFamily(groups: CatalogGroup[], family: Family | undefined) {
  if (!family?.groupId) return [];
  return groups.filter((g) => g.id === family.groupId);
}

/** Subgrupo derivado da família selecionada (ITM-11). */
export function filterSubgroupsForFamily(subgroups: CatalogSubgroup[], family: Family | undefined) {
  if (!family?.subgroupId) return [];
  return subgroups.filter((sg) => sg.id === family.subgroupId);
}

/** Resolve família pelo código de 6 dígitos e retorna trilha PDM completa. */
export function resolveFamilyByCode(families: Family[], code: string) {
  const normalized = code.replace(/\D/g, '');
  if (normalized.length !== 6) return null;
  return families.find((f) => f.code === normalized) ?? null;
}

/** Rótulo hierárquico Grupo › Subgrupo › Família. */
export function pdmTrailLabel(family: Family | undefined) {
  if (!family) return '';
  const parts = [
    family.groupCode ? `${family.groupCode} — ${family.groupName}` : family.groupName,
    family.subgroupCode ? `${family.subgroupCode} — ${family.subgroupName}` : family.subgroupName,
    `${family.code} — ${family.name}`,
  ].filter(Boolean);
  return parts.join(' › ');
}
