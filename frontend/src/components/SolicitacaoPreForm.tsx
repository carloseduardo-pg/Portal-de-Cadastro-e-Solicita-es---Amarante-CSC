import { useMemo, useState } from 'react';
import { SearchableSelect } from './SearchableSelect';
import { ConfirmDialog } from './ConfirmDialog';
import { FormField } from './FormField';
import { HotelMultiSelect } from './HotelMultiSelect';
import type { Family, Hotel } from '../lib/types';
import './SolicitacaoPreForm.css';

type Props = {
  hotels: Hotel[];
  families: Family[];
  hotelIds: string[];
  familyId: string;
  familyLocked?: boolean;
  hotelError?: string;
  familyError?: string;
  readOnly?: boolean;
  onHotelChange: (ids: string[]) => void;
  onFamilyChange: (familyId: string) => void;
  onClearHotelError?: () => void;
  onClearFamilyError?: () => void;
};

function familyLabel(f: Family) {
  return `${f.code} — ${f.name}`;
}

/**
 * Pré-formulário da solicitação — unidades + família do lote (ITM-11).
 */
export function SolicitacaoPreForm({
  hotels,
  families,
  hotelIds,
  familyId,
  familyLocked = false,
  hotelError,
  familyError,
  readOnly = false,
  onHotelChange,
  onFamilyChange,
  onClearHotelError,
  onClearFamilyError,
}: Props) {
  const [pendingFamilyId, setPendingFamilyId] = useState<string | null>(null);

  const sortedFamilies = useMemo(
    () =>
      [...families].sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
        a.code.localeCompare(b.code),
      ),
    [families],
  );

  const familyOptions = useMemo(
    () =>
      sortedFamilies.map((f) => ({
        id: f.id,
        label: familyLabel(f),
        searchText: `${f.code} ${f.name}`,
      })),
    [sortedFamilies],
  );

  const selectedFamily = families.find((f) => f.id === familyId);

  function applyFamily(nextId: string) {
    if (!nextId) return;
    onFamilyChange(nextId);
    onClearFamilyError?.();
  }

  function requestFamilyChange(nextId: string) {
    if (readOnly || !nextId || nextId === familyId) return;
    if (familyLocked && familyId) {
      setPendingFamilyId(nextId);
      return;
    }
    applyFamily(nextId);
  }

  function confirmFamilyChange() {
    if (!pendingFamilyId) return;
    applyFamily(pendingFamilyId);
    setPendingFamilyId(null);
  }

  return (
    <article className={`solicitacao-pre-form${readOnly ? ' solicitacao-pre-form--readonly' : ''}`}>
      <header className="solicitacao-pre-form-header">
        <h2>Classificação da solicitação</h2>
        <p>
          {readOnly ? (
            <>
              <strong>ITM-11:</strong> unidades e família desta solicitação (somente visualização).
            </>
          ) : (
            <>
              <strong>ITM-11:</strong> selecione as unidades e a família desta solicitação. Depois adicione
              quantos itens precisar. Cada item terá seu próprio grupo e subgrupo na etapa seguinte.
            </>
          )}
        </p>
      </header>

      <div className="solicitacao-pre-form-body">
        <HotelMultiSelect
          hotels={hotels}
          selectedIds={hotelIds}
          error={hotelError}
          readOnly={readOnly}
          onChange={(ids) => {
            onHotelChange(ids);
            onClearHotelError?.();
          }}
        />

        <FormField
          label="Código / Nome da família"
          required
          error={familyError}
          hint={readOnly ? undefined : `${sortedFamilies.length} família(s) no catálogo.`}
          className="pre-form-family-select"
        >
          {readOnly ? (
            <select value={familyId} disabled>
              <option value={familyId}>{selectedFamily ? familyLabel(selectedFamily) : '—'}</option>
            </select>
          ) : (
            <SearchableSelect
              label=""
              options={familyOptions}
              value={familyId}
              onChange={requestFamilyChange}
              placeholder="Digite código ou nome da família…"
              emptyLabel="Selecione a família…"
            />
          )}
        </FormField>

        {selectedFamily ? (
          <p className="pre-form-family-selected">
            Família selecionada: <strong>{familyLabel(selectedFamily)}</strong>
          </p>
        ) : null}

        {!readOnly && familyLocked && familyId ? (
          <p className="family-lock-note">
            Família definida para esta solicitação. Para trocar, confirme — os itens atuais serão descartados.
          </p>
        ) : null}
      </div>

      {!readOnly ? (
        <ConfirmDialog
          open={pendingFamilyId !== null}
          title="Trocar família da solicitação"
          message="Alterar a família descarta todos os itens já preenchidos nesta solicitação. Deseja continuar?"
          confirmLabel="Trocar família"
          onConfirm={confirmFamilyChange}
          onCancel={() => setPendingFamilyId(null)}
        />
      ) : null}
    </article>
  );
}
