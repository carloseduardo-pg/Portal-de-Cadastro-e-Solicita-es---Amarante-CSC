import { FormField } from './FormField';
import type { CatalogGroup, CatalogSubgroup, Family } from '../lib/types';
import './PdmClassificationFields.css';

export type PdmClassificationValue = {
  groupId: string;
  subgroupId: string;
  familyId: string;
  source: 'NATIONAL' | 'FOREIGN';
};

export type PdmClassificationErrors = {
  groupId?: string;
  subgroupId?: string;
  familyId?: string;
};

type Props = {
  value: PdmClassificationValue;
  groups: CatalogGroup[];
  subgroups: CatalogSubgroup[];
  families: Family[];
  errors?: PdmClassificationErrors;
  /** ITM-11: família já definida por outro item — família fica travada. */
  lockedFamilyId?: string;
  onChange: (patch: Partial<PdmClassificationValue>) => void;
  onClearError?: (key: keyof PdmClassificationErrors) => void;
};

const SOURCE_OPTIONS: { value: PdmClassificationValue['source']; label: string }[] = [
  { value: 'NATIONAL', label: '0 — Nacional, exceto as indicadas nos códigos 3 a 5' },
  { value: 'FOREIGN', label: '1 — Estrangeira — importação direta' },
];

/**
 * Classificação SAP — Família → Subgrupo → Grupo de itens.
 */
export function PdmClassificationFields({
  value,
  groups,
  subgroups,
  families,
  errors,
  lockedFamilyId,
  onChange,
  onClearError,
}: Props) {
  const filteredSubgroups = value.familyId
    ? subgroups.filter((sg) => sg.familyId === value.familyId || sg.family?.id === value.familyId)
    : [];

  const filteredGroups = value.subgroupId
    ? groups.filter((g) => g.subgroupId === value.subgroupId)
    : [];

  const selectedFamily = families.find((f) => f.id === value.familyId);
  const selectedSubgroup = subgroups.find((sg) => sg.id === value.subgroupId);
  const selectedGroup = groups.find((g) => g.id === value.groupId);
  const familyLocked = Boolean(lockedFamilyId);

  function handleFamilyChange(familyId: string) {
    if (familyLocked) return;
    onChange({ familyId, subgroupId: '', groupId: '' });
    onClearError?.('familyId');
    onClearError?.('subgroupId');
    onClearError?.('groupId');
  }

  function handleSubgroupChange(subgroupId: string) {
    onChange({ subgroupId, groupId: '' });
    onClearError?.('subgroupId');
    onClearError?.('groupId');
  }

  function handleGroupChange(groupId: string) {
    onChange({ groupId });
    onClearError?.('groupId');
  }

  return (
    <div className="pdm-classification">
      <p className="form-section-title">Classificação do produto</p>
      <div className="pdm-classification-grid">
        <FormField label="Fonte do produto" required className="pdm-span-4">
          <select
            value={value.source}
            onChange={(e) => onChange({ source: e.target.value as PdmClassificationValue['source'] })}
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Família"
          required
          error={errors?.familyId}
          className="pdm-span-4"
        >
          <select
            value={value.familyId}
            disabled={familyLocked}
            onChange={(e) => handleFamilyChange(e.target.value)}
          >
            <option value="">Selecione a família…</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>
          {selectedFamily && familyLocked ? (
            <span className="pdm-hint">Família do lote (ITM-11)</span>
          ) : null}
        </FormField>

        <FormField
          label="Subgrupo"
          required
          error={errors?.subgroupId}
          className="pdm-span-4"
        >
          <select
            value={value.subgroupId}
            disabled={!value.familyId}
            onChange={(e) => handleSubgroupChange(e.target.value)}
          >
            <option value="">
              {value.familyId ? 'Selecione o subgrupo…' : 'Selecione a família primeiro'}
            </option>
            {filteredSubgroups.map((sg) => (
              <option key={sg.id} value={sg.id}>
                {sg.code} — {sg.name}
              </option>
            ))}
          </select>
          {selectedSubgroup ? (
            <span className="pdm-hint">{selectedSubgroup.name}</span>
          ) : null}
        </FormField>

        <FormField
          label="Grupo de itens"
          required
          error={errors?.groupId}
          className="pdm-span-4"
        >
          <select
            value={value.groupId}
            disabled={!value.subgroupId}
            onChange={(e) => handleGroupChange(e.target.value)}
          >
            <option value="">
              {value.subgroupId ? 'Selecione o grupo…' : 'Selecione o subgrupo primeiro'}
            </option>
            {filteredGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.code} — {g.name}
              </option>
            ))}
          </select>
          {selectedGroup ? <span className="pdm-hint">{selectedGroup.name}</span> : null}
        </FormField>
      </div>
    </div>
  );
}
