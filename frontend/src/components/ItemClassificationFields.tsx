import { useMemo } from 'react';
import { FormField } from './FormField';
import { SearchableSelect } from './SearchableSelect';
import { filterGroupsForFamily, filterSubgroupsForGroup } from '../lib/pdmCascade';
import type { CatalogGroup, CatalogSubgroup, Family } from '../lib/types';
import './PdmClassificationFields.css';

export type ItemClassificationValue = {
  groupId: string;
  subgroupId: string;
  source: 'NATIONAL' | 'FOREIGN';
};

export type ItemClassificationErrors = {
  groupId?: string;
  subgroupId?: string;
};

type Props = {
  value: ItemClassificationValue;
  groups: CatalogGroup[];
  subgroups: CatalogSubgroup[];
  /** Família do lote (ITM-11) — restringe opções de grupo compatíveis. */
  familyContext?: Family | null;
  errors?: ItemClassificationErrors;
  hideTitle?: boolean;
  readOnly?: boolean;
  onChange?: (patch: Partial<ItemClassificationValue>) => void;
  onClearError?: (key: keyof ItemClassificationErrors) => void;
};

const SOURCE_OPTIONS: { value: ItemClassificationValue['source']; label: string }[] = [
  { value: 'NATIONAL', label: '0 — Nacional, exceto as indicadas nos códigos 3 a 5' },
  { value: 'FOREIGN', label: '1 — Estrangeira — importação direta' },
];

/**
 * Classificação PDM por item — cascata Grupo → Subgrupo (matrioska).
 */
export function ItemClassificationFields({
  value,
  groups,
  subgroups,
  familyContext,
  errors,
  hideTitle,
  readOnly = false,
  onChange,
  onClearError,
}: Props) {
  const visibleGroups = useMemo(() => {
    const list = familyContext?.groupId
      ? filterGroupsForFamily(groups, familyContext)
      : groups;
    return [...list].sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
        a.code.localeCompare(b.code),
    );
  }, [groups, familyContext]);

  const visibleSubgroups = useMemo(() => {
    if (!value.groupId) return [];
    return [...filterSubgroupsForGroup(subgroups, value.groupId)].sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
        a.code.localeCompare(b.code),
    );
  }, [subgroups, value.groupId]);

  const groupOptions = useMemo(
    () =>
      visibleGroups.map((g) => ({
        id: g.id,
        label: `${g.code} — ${g.name}`,
        searchText: `${g.code} ${g.name}`,
      })),
    [visibleGroups],
  );

  const subgroupOptions = useMemo(
    () =>
      visibleSubgroups.map((sg) => ({
        id: sg.id,
        label: `${sg.code} — ${sg.name}`,
        searchText: `${sg.code} ${sg.name}`,
      })),
    [visibleSubgroups],
  );

  function handleGroupChange(groupId: string) {
    if (readOnly) return;
    const patch: Partial<ItemClassificationValue> = { groupId, subgroupId: '' };

    if (groupId) {
      const underGroup = filterSubgroupsForGroup(subgroups, groupId);
      if (underGroup.length === 1) {
        patch.subgroupId = underGroup[0].id;
      } else if (
        familyContext?.subgroupId &&
        groupId === familyContext.groupId &&
        underGroup.some((sg) => sg.id === familyContext.subgroupId)
      ) {
        patch.subgroupId = familyContext.subgroupId;
      }
    }

    onChange?.(patch);
    onClearError?.('groupId');
    onClearError?.('subgroupId');
  }

  function handleSubgroupChange(subgroupId: string) {
    if (readOnly) return;
    onChange?.({ subgroupId });
    onClearError?.('subgroupId');
  }

  const gridContent = (
    <>
      <FormField label="Fonte do produto" required className="pdm-span-4">
        <select
          value={value.source}
          disabled={readOnly}
          onChange={(e) =>
            onChange?.({ source: e.target.value as ItemClassificationValue['source'] })
          }
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Grupo produto"
        required
        error={errors?.groupId}
        errorPosition="below"
        variant="semplice"
        className="pdm-span-4"
      >
        {readOnly ? (
          <select value={value.groupId} disabled>
            <option value={value.groupId}>
              {groupOptions.find((o) => o.id === value.groupId)?.label ?? '—'}
            </option>
          </select>
        ) : (
          <SearchableSelect
            label=""
            options={groupOptions}
            value={value.groupId}
            onChange={handleGroupChange}
            placeholder="Digite código ou nome do grupo…"
            emptyLabel="Selecione o grupo…"
          />
        )}
      </FormField>

      <FormField
        label="SubGrupo produto"
        required
        error={errors?.subgroupId}
        errorPosition="below"
        variant="semplice"
        className="pdm-span-4"
      >
        {readOnly ? (
          <select value={value.subgroupId} disabled>
            <option value={value.subgroupId}>
              {subgroupOptions.find((o) => o.id === value.subgroupId)?.label ?? '—'}
            </option>
          </select>
        ) : (
          <SearchableSelect
            label=""
            options={subgroupOptions}
            value={value.subgroupId}
            onChange={handleSubgroupChange}
            disabled={!value.groupId}
            placeholder={
              value.groupId ? 'Digite código ou nome do subgrupo…' : 'Selecione o grupo primeiro'
            }
            emptyLabel={value.groupId ? 'Selecione o subgrupo…' : 'Selecione o grupo primeiro'}
          />
        )}
      </FormField>
    </>
  );

  return hideTitle ? (
    <div className="pdm-classification-grid">{gridContent}</div>
  ) : (
    <div className="pdm-classification">
      <p className="form-section-title">Classificação do item</p>
      <div className="pdm-classification-grid">{gridContent}</div>
    </div>
  );
}
