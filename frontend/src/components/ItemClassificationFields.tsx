import { useMemo } from 'react';
import { FormField } from './FormField';
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
    if (familyContext?.groupId) return filterGroupsForFamily(groups, familyContext);
    return groups;
  }, [groups, familyContext]);

  const visibleSubgroups = useMemo(() => {
    if (!value.groupId) return [];
    return filterSubgroupsForGroup(subgroups, value.groupId);
  }, [subgroups, value.groupId]);

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
        <select
          value={value.groupId}
          disabled={readOnly}
          onChange={(e) => handleGroupChange(e.target.value)}
        >
          <option value="">Selecione o grupo…</option>
          {visibleGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.code} — {g.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="SubGrupo produto"
        required
        error={errors?.subgroupId}
        errorPosition="below"
        variant="semplice"
        className="pdm-span-4"
      >
        <select
          value={value.subgroupId}
          onChange={(e) => handleSubgroupChange(e.target.value)}
          disabled={readOnly || !value.groupId}
        >
          <option value="">
            {value.groupId ? 'Selecione o subgrupo…' : 'Selecione o grupo primeiro'}
          </option>
          {visibleSubgroups.map((sg) => (
            <option key={sg.id} value={sg.id}>
              {sg.code} — {sg.name}
            </option>
          ))}
        </select>
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
