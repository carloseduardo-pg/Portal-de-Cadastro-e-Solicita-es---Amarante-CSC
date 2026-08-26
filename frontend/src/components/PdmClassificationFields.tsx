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
 * Classificação PDM por item — Grupo → Subgrupo → Família (estilo Semplice).
 * Códigos derivados são somente leitura.
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
  const filteredSubgroups = value.groupId
    ? subgroups.filter((sg) => sg.groupId === value.groupId || sg.group?.id === value.groupId)
    : [];

  const filteredFamilies = value.subgroupId
    ? families.filter((f) => f.subgroupId === value.subgroupId)
    : [];

  const selectedGroup = groups.find((g) => g.id === value.groupId);
  const selectedSubgroup = subgroups.find((sg) => sg.id === value.subgroupId);
  const selectedFamily = families.find((f) => f.id === value.familyId);
  const familyLocked = Boolean(lockedFamilyId);

  function handleGroupChange(groupId: string) {
    onChange({ groupId, subgroupId: '', familyId: familyLocked ? lockedFamilyId! : '' });
    onClearError?.('groupId');
    onClearError?.('subgroupId');
    onClearError?.('familyId');
  }

  function handleSubgroupChange(subgroupId: string) {
    onChange({ subgroupId, familyId: familyLocked ? lockedFamilyId! : '' });
    onClearError?.('subgroupId');
    onClearError?.('familyId');
  }

  function handleFamilyChange(familyId: string) {
    const fam = families.find((f) => f.id === familyId);
    if (fam) {
      onChange({
        familyId,
        groupId: fam.groupId ?? value.groupId,
        subgroupId: fam.subgroupId ?? value.subgroupId,
      });
    } else {
      onChange({ familyId });
    }
    onClearError?.('familyId');
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
          label="Família produto"
          required
          error={errors?.familyId}
          errorPosition="below"
          variant="semplice"
          className="pdm-span-4"
        >
          <select
            value={value.familyId}
            onChange={(e) => handleFamilyChange(e.target.value)}
            disabled={!value.subgroupId || familyLocked}
          >
            <option value="">
              {value.subgroupId ? 'Selecione a família…' : 'Selecione o subgrupo primeiro'}
            </option>
            {(familyLocked
              ? families.filter((f) => f.id === lockedFamilyId)
              : filteredFamilies
            ).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Código da família" className="pdm-span-4">
          <input readOnly value={selectedFamily?.code ?? ''} placeholder="—" className="pdm-readonly" />
        </FormField>

        <FormField
          label="Grupo produto"
          required
          error={errors?.groupId}
          errorPosition="below"
          variant="semplice"
          className="pdm-span-3"
        >
          <select
            value={value.groupId}
            onChange={(e) => handleGroupChange(e.target.value)}
            disabled={familyLocked}
          >
            <option value="">Selecione o grupo…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Código do grupo" className="pdm-span-3">
          <input readOnly value={selectedGroup?.code ?? ''} placeholder="—" className="pdm-readonly" />
        </FormField>

        <FormField
          label="SubGrupo produto"
          required
          error={errors?.subgroupId}
          errorPosition="below"
          variant="semplice"
          className="pdm-span-3"
        >
          <select
            value={value.subgroupId}
            onChange={(e) => handleSubgroupChange(e.target.value)}
            disabled={!value.groupId || familyLocked}
          >
            <option value="">
              {value.groupId ? 'Selecione o subgrupo…' : 'Selecione o grupo primeiro'}
            </option>
            {filteredSubgroups.map((sg) => (
              <option key={sg.id} value={sg.id}>
                {sg.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Código do SubGrupo" className="pdm-span-3">
          <input readOnly value={selectedSubgroup?.code ?? ''} placeholder="—" className="pdm-readonly" />
        </FormField>
      </div>

      {familyLocked ? (
        <p className="pdm-lock-note">
          <strong>ITM-11:</strong> a família deste lote já foi definida por outro item. Grupo e subgrupo
          seguem a classificação da família escolhida.
        </p>
      ) : null}
    </div>
  );
}
