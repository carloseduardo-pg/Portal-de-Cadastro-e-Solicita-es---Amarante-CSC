import { useEffect, useMemo, useRef } from 'react';
import { FormField } from './FormField';
import { SearchableSelect } from './SearchableSelect';
import { filterGroupsForSubgroup } from '../lib/pdmCascade';
import type { CatalogGroup } from '../lib/types';
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
  /** Subgrupo do lote (ITM-11) — o item só escolhe o grupo dentro deste subgrupo. */
  lotSubgroupId: string;
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
 * Classificação SAP por item — só Grupo (folha), com subgrupo do lote fixo no cabeçalho.
 */
export function ItemClassificationFields({
  value,
  groups,
  lotSubgroupId,
  errors,
  hideTitle,
  readOnly = false,
  onChange,
  onClearError,
}: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const visibleGroups = useMemo(() => {
    if (!lotSubgroupId) return [];
    return [...filterGroupsForSubgroup(groups, lotSubgroupId)].sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
        a.code.localeCompare(b.code),
    );
  }, [groups, lotSubgroupId]);

  /** Se o subgrupo do lote tiver um único grupo, pré-seleciona. */
  useEffect(() => {
    if (readOnly || !lotSubgroupId || !onChangeRef.current) return;
    if (visibleGroups.length !== 1) return;
    const only = visibleGroups[0];
    if (value.groupId === only.id && value.subgroupId === lotSubgroupId) return;
    onChangeRef.current({ groupId: only.id, subgroupId: lotSubgroupId });
  }, [lotSubgroupId, visibleGroups, value.groupId, value.subgroupId, readOnly]);

  const groupOptions = useMemo(
    () =>
      visibleGroups.map((g) => ({
        id: g.id,
        label: `${g.code} — ${g.name}`,
        searchText: `${g.code} ${g.name}`,
      })),
    [visibleGroups],
  );

  function handleGroupChange(groupId: string) {
    if (readOnly) return;
    onChange?.({ groupId, subgroupId: lotSubgroupId });
    onClearError?.('groupId');
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
        label="Grupo de itens"
        required
        error={errors?.groupId}
        errorPosition="below"
        variant="semplice"
        className="pdm-span-8"
        hint={
          lotSubgroupId
            ? undefined
            : 'Selecione o subgrupo da solicitação no pré-formulário.'
        }
      >
        {readOnly ? (
          <select value={value.groupId} disabled>
            <option value={value.groupId}>
              {groupOptions.find((o) => o.id === value.groupId)?.label ?? '—'}
            </option>
          </select>
        ) : (
          <SearchableSelect
            key={`group-${lotSubgroupId || 'none'}`}
            label=""
            options={groupOptions}
            value={value.groupId}
            onChange={handleGroupChange}
            disabled={!lotSubgroupId}
            placeholder={
              lotSubgroupId
                ? 'Digite código ou nome do grupo…'
                : 'Selecione o subgrupo da solicitação primeiro'
            }
            emptyLabel={
              lotSubgroupId
                ? 'Selecione o grupo…'
                : 'Selecione o subgrupo da solicitação primeiro'
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
