import type { CatalogGroup, CatalogSubgroup, Family } from './types';

/** Item mínimo para agrupamento visual em pastas (dentro da família do lote). */
export type PdmFolderItem = {
  descriptionShort: string;
  groupId: string;
  subgroupId: string;
  familyId: string;
};

export type PdmGroupFolder = {
  key: string;
  group: CatalogGroup | null;
  itemIndexes: number[];
};

export type PdmSubgroupFolder = {
  key: string;
  subgroup: CatalogSubgroup | null;
  groups: PdmGroupFolder[];
};

/**
 * Agrupa índices por Subgrupo → Grupo (SAP), dentro da família do lote.
 */
export function buildPdmFolderTree(
  items: PdmFolderItem[],
  groups: CatalogGroup[],
  subgroups: CatalogSubgroup[],
): PdmSubgroupFolder[] {
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const subgroupMap = new Map(subgroups.map((sg) => [sg.id, sg]));

  const buckets = new Map<string, Map<string, number[]>>();

  items.forEach((item, index) => {
    const sKey = item.subgroupId || '_none';
    const gKey = item.groupId || '_none';
    if (!buckets.has(sKey)) buckets.set(sKey, new Map());
    const gMap = buckets.get(sKey)!;
    if (!gMap.has(gKey)) gMap.set(gKey, []);
    gMap.get(gKey)!.push(index);
  });

  const result: PdmSubgroupFolder[] = [];

  for (const [sKey, gMap] of buckets) {
    const subgroup = sKey === '_none' ? null : subgroupMap.get(sKey) ?? null;
    const groupFolders: PdmGroupFolder[] = [];

    for (const [gKey, indexes] of gMap) {
      const group = gKey === '_none' ? null : groupMap.get(gKey) ?? null;
      groupFolders.push({
        key: `${sKey}:${gKey}`,
        group,
        itemIndexes: indexes,
      });
    }

    groupFolders.sort((a, b) => {
      const ac = a.group?.code ?? 'ZZZ';
      const bc = b.group?.code ?? 'ZZZ';
      return ac.localeCompare(bc);
    });

    result.push({ key: sKey, subgroup, groups: groupFolders });
  }

  result.sort((a, b) => {
    const ac = a.subgroup?.code ?? 'ZZZ';
    const bc = b.subgroup?.code ?? 'ZZZ';
    return ac.localeCompare(bc);
  });

  return result;
}

/** Resolve família a partir do catálogo carregado. */
export function findFamilyById(families: Family[], familyId: string) {
  return families.find((f) => f.id === familyId);
}

/** Família do lote não determina subgrupo/grupo (N caminhos sob a mesma família SAP). */
export function classificationFromFamily(fam: Family | undefined) {
  if (!fam) return { groupId: '', subgroupId: '', familyId: '' };
  return {
    groupId: '',
    subgroupId: '',
    familyId: fam.id,
  };
}
