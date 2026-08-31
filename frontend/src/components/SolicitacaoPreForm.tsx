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
  fixedAsset?: boolean;
  familyLocked?: boolean;
  hotelError?: string;
  familyError?: string;
  readOnly?: boolean;
  /** Quando true, oculta o seletor de tipo (solicitante não decide AF/UC). */
  hideKind?: boolean;
  /** Quando true, bloqueia só o tipo de item (uso/consumo × AF). */
  kindReadOnly?: boolean;
  /** Quando true, bloqueia só as unidades. */
  hotelsReadOnly?: boolean;
  onHotelChange: (ids: string[]) => void;
  onFamilyChange: (familyId: string) => void;
  onFixedAssetChange?: (fixedAsset: boolean) => void;
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
  fixedAsset = false,
  familyLocked = false,
  hotelError,
  familyError,
  readOnly = false,
  hideKind = false,
  kindReadOnly,
  hotelsReadOnly,
  onHotelChange,
  onFamilyChange,
  onFixedAssetChange,
  onClearHotelError,
  onClearFamilyError,
}: Props) {
  const [pendingFamilyId, setPendingFamilyId] = useState<string | null>(null);
  const kindDisabled = kindReadOnly ?? readOnly;
  const hotelsDisabled = hotelsReadOnly ?? readOnly;

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

  function setKind(nextFixed: boolean) {
    if (kindDisabled || nextFixed === fixedAsset) return;
    onFixedAssetChange?.(nextFixed);
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
          ) : hideKind ? (
            <>
              <strong>ITM-11:</strong> selecione as unidades e a família. A classificação final
              (uso e consumo ou ativo fixo) é feita pelo aprovador - imobilizado.
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
        {hideKind ? null : (
        <FormField
          label="Tipo de item"
          required
          hint={
            fixedAsset
              ? 'Ativo fixo: famílias patrimoniais — tratativa exclusiva do aprovador - imobilizado.'
              : 'Uso e consumo: famílias de estoque/consumo — após o imobilizado, segue ao administrativo.'
          }
        >
          <div
            className="item-kind-segment"
            role="radiogroup"
            aria-label="Tipo de item"
            aria-disabled={kindDisabled}
          >
            <button
              type="button"
              role="radio"
              aria-checked={!fixedAsset}
              disabled={kindDisabled}
              className={`item-kind-segment__btn${!fixedAsset ? ' item-kind-segment__btn--active' : ''}`}
              onClick={() => setKind(false)}
            >
              Uso e consumo
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={fixedAsset}
              disabled={kindDisabled}
              className={`item-kind-segment__btn${fixedAsset ? ' item-kind-segment__btn--active' : ''}`}
              onClick={() => setKind(true)}
            >
              Ativo fixo
            </button>
          </div>
        </FormField>
        )}

        <HotelMultiSelect
          hotels={hotels}
          selectedIds={hotelIds}
          error={hotelError}
          readOnly={hotelsDisabled}
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
