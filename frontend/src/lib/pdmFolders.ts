import type { CatalogGroup, CatalogSubgroup, Family } from './types';

/** Item mínimo para agrupamento visual em pastas PDM. */
export type PdmFolderItem = {
  descriptionShort: string;
  groupId: string;
  subgroupId: string;
  familyId: string;
};

export type PdmSubgroupFolder = {
  key: string;
  group: CatalogGroup | null;
  subgroup: CatalogSubgroup | null;
  itemIndexes: number[];
};

export type PdmGroupFolder = {
  key: string;
  group: CatalogGroup | null;
  subgroups: PdmSubgroupFolder[];
};

/**
 * Agrupa índices de itens por grupo e subgrupo PDM (pastas aninhadas).
 * Itens sem classificação vão para pasta "Sem classificação".
 */
export function buildPdmFolderTree(
  items: PdmFolderItem[],
  groups: CatalogGroup[],
  subgroups: CatalogSubgroup[],
): PdmGroupFolder[] {
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const subgroupMap = new Map(subgroups.map((sg) => [sg.id, sg]));

  const buckets = new Map<string, Map<string, number[]>>();

  items.forEach((item, index) => {
    const gKey = item.groupId || '_none';
    const sKey = item.subgroupId || '_none';
    if (!buckets.has(gKey)) buckets.set(gKey, new Map());
    const sgMap = buckets.get(gKey)!;
    if (!sgMap.has(sKey)) sgMap.set(sKey, []);
    sgMap.get(sKey)!.push(index);
  });

  const result: PdmGroupFolder[] = [];

  for (const [gKey, sgMap] of buckets) {
    const group = gKey === '_none' ? null : groupMap.get(gKey) ?? null;
    const subgroupFolders: PdmSubgroupFolder[] = [];

    for (const [sKey, indexes] of sgMap) {
      const subgroup = sKey === '_none' ? null : subgroupMap.get(sKey) ?? null;
      subgroupFolders.push({
        key: `${gKey}:${sKey}`,
        group,
        subgroup,
        itemIndexes: indexes,
      });
    }

    subgroupFolders.sort((a, b) => {
      const ac = a.subgroup?.code ?? '999';
      const bc = b.subgroup?.code ?? '999';
      return ac.localeCompare(bc);
    });

    result.push({ key: gKey, group, subgroups: subgroupFolders });
  }

  result.sort((a, b) => {
    const ac = a.group?.code ?? '999';
    const bc = b.group?.code ?? '999';
    return ac.localeCompare(bc);
  });

  return result;
}

/** Resolve família a partir do catálogo carregado. */
export function findFamilyById(families: Family[], familyId: string) {
  return families.find((f) => f.id === familyId);
}

/** Preenche group/subgroup a partir da família selecionada. */
export function classificationFromFamily(fam: Family | undefined) {
  if (!fam) return { groupId: '', subgroupId: '', familyId: '' };
  return {
    groupId: fam.groupId ?? '',
    subgroupId: fam.subgroupId ?? '',
    familyId: fam.id,
  };
}
