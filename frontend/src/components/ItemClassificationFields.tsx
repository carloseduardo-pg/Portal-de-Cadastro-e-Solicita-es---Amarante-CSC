import { useMemo } from 'react';
import { FormField } from './FormField';
import { SearchableSelect } from './SearchableSelect';
import { filterGroupsForSubgroup, filterSubgroupsForFamily } from '../lib/pdmCascade';
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
  /** Família do lote (ITM-11) — restringe subgrupos. */
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
 * Classificação SAP por item — cascata Subgrupo → Grupo (folha), com família do lote fixa.
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
  const visibleSubgroups = useMemo(() => {
    const list = familyContext?.id
      ? filterSubgroupsForFamily(subgroups, familyContext.id)
      : subgroups;
    return [...list].sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
        a.code.localeCompare(b.code),
    );
  }, [subgroups, familyContext]);

  const visibleGroups = useMemo(() => {
    if (!value.subgroupId) return [];
    return [...filterGroupsForSubgroup(groups, value.subgroupId)].sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
        a.code.localeCompare(b.code),
    );
  }, [groups, value.subgroupId]);

  const subgroupOptions = useMemo(
    () =>
      visibleSubgroups.map((sg) => ({
        id: sg.id,
        label: `${sg.code} — ${sg.name}`,
        searchText: `${sg.code} ${sg.name}`,
      })),
    [visibleSubgroups],
  );

  const groupOptions = useMemo(
    () =>
      visibleGroups.map((g) => ({
        id: g.id,
        label: `${g.code} — ${g.name}`,
        searchText: `${g.code} ${g.name}`,
      })),
    [visibleGroups],
  );

  function handleSubgroupChange(subgroupId: string) {
    if (readOnly) return;
    const patch: Partial<ItemClassificationValue> = { subgroupId, groupId: '' };
    if (subgroupId) {
      const under = filterGroupsForSubgroup(groups, subgroupId);
      if (under.length === 1) patch.groupId = under[0].id;
    }
    onChange?.(patch);
    onClearError?.('subgroupId');
    onClearError?.('groupId');
  }

  function handleGroupChange(groupId: string) {
    if (readOnly) return;
    onChange?.({ groupId });
    onClearError?.('groupId');
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
        label="Subgrupo"
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
            key={`subgroup-${familyContext?.id ?? 'all'}`}
            label=""
            options={subgroupOptions}
            value={value.subgroupId}
            onChange={handleSubgroupChange}
            placeholder="Digite código ou nome do subgrupo…"
            emptyLabel="Selecione o subgrupo…"
          />
        )}
      </FormField>

      <FormField
        label="Grupo de itens"
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
            key={`group-${value.subgroupId || 'none'}`}
            label=""
            options={groupOptions}
            value={value.groupId}
            onChange={handleGroupChange}
            disabled={!value.subgroupId}
            placeholder={
              value.subgroupId
                ? 'Digite código ou nome do grupo…'
                : 'Selecione o subgrupo primeiro'
            }
            emptyLabel={
              value.subgroupId ? 'Selecione o grupo…' : 'Selecione o subgrupo primeiro'
            }
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
