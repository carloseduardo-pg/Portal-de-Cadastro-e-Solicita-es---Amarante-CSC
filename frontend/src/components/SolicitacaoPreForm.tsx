import { useMemo, useState } from 'react';
import { SearchableSelect } from './SearchableSelect';
import { ConfirmDialog } from './ConfirmDialog';
import { FormField } from './FormField';
import { HotelMultiSelect } from './HotelMultiSelect';
import type { CatalogSubgroup, Family, Hotel } from '../lib/types';
import './SolicitacaoPreForm.css';

type Props = {
  hotels: Hotel[];
  /** Catálogo de subgrupos (já traz `family` embutido). */
  subgroups: CatalogSubgroup[];
  hotelIds: string[];
  subgroupId: string;
  fixedAsset?: boolean;
  /** Trocar o subgrupo com itens preenchidos exige confirmação. */
  subgroupLocked?: boolean;
  hotelError?: string;
  subgroupError?: string;
  readOnly?: boolean;
  /** Quando true, oculta o seletor de tipo (solicitante não decide AF/UC). */
  hideKind?: boolean;
  /** Quando true, bloqueia só o tipo de item (uso/consumo × AF). */
  kindReadOnly?: boolean;
  /** Quando true, bloqueia só as unidades. */
  hotelsReadOnly?: boolean;
  onHotelChange: (ids: string[]) => void;
  onSubgroupChange: (subgroupId: string) => void;
  onFixedAssetChange?: (fixedAsset: boolean) => void;
  onClearHotelError?: () => void;
  onClearSubgroupError?: () => void;
};

function subgroupLabel(sg: CatalogSubgroup) {
  return `${sg.code} — ${sg.name}`;
}

function familyLabel(f: Pick<Family, 'code' | 'name'>) {
  return `${f.code} — ${f.name}`;
}

/** Flag de tipo — amarelo UC, azul imobilizado. */
function kindBadge(
  itemKind?: 'CONSUMPTION' | 'FIXED_ASSET',
): { label: string; tone: 'yellow' | 'blue' } {
  if (itemKind === 'FIXED_ASSET') {
    return { label: 'Imobilizado', tone: 'blue' };
  }
  return { label: 'Uso e consumo', tone: 'yellow' };
}

/**
 * Pré-formulário da solicitação — unidades + subgrupo do lote (ITM-11).
 * Família é exibida como informação derivada (somente leitura).
 */
export function SolicitacaoPreForm({
  hotels,
  subgroups,
  hotelIds,
  subgroupId,
  fixedAsset = false,
  subgroupLocked = false,
  hotelError,
  subgroupError,
  readOnly = false,
  hideKind = false,
  kindReadOnly,
  hotelsReadOnly,
  onHotelChange,
  onSubgroupChange,
  onFixedAssetChange,
  onClearHotelError,
  onClearSubgroupError,
}: Props) {
  const [pendingSubgroupId, setPendingSubgroupId] = useState<string | null>(null);
  const kindDisabled = kindReadOnly ?? readOnly;
  const hotelsDisabled = hotelsReadOnly ?? readOnly;

  const sortedSubgroups = useMemo(
    () =>
      [...subgroups].sort(
        (a, b) =>
          a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
          a.code.localeCompare(b.code),
      ),
    [subgroups],
  );

  const subgroupOptions = useMemo(
    () =>
      sortedSubgroups.map((sg) => {
        const kind = sg.itemKind ?? sg.family?.itemKind;
        return {
          id: sg.id,
          label: subgroupLabel(sg),
          searchText: `${sg.code} ${sg.name} ${sg.family?.code ?? ''} ${sg.family?.name ?? ''} ${kind === 'FIXED_ASSET' ? 'imobilizado ativo fixo' : 'uso consumo'}`,
          badge: kindBadge(kind),
        };
      }),
    [sortedSubgroups],
  );

  const selectedSubgroup = subgroups.find((sg) => sg.id === subgroupId);
  const derivedFamily = selectedSubgroup?.family;

  function applySubgroup(nextId: string) {
    if (!nextId) return;
    onSubgroupChange(nextId);
    onClearSubgroupError?.();
  }

  function requestSubgroupChange(nextId: string) {
    if (readOnly || !nextId || nextId === subgroupId) return;
    if (subgroupLocked && subgroupId) {
      setPendingSubgroupId(nextId);
      return;
    }
    applySubgroup(nextId);
  }

  function confirmSubgroupChange() {
    if (!pendingSubgroupId) return;
    applySubgroup(pendingSubgroupId);
    setPendingSubgroupId(null);
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
              <strong>ITM-11:</strong> unidades e subgrupo desta solicitação (somente visualização).
            </>
          ) : hideKind ? (
            <>
              <strong>ITM-11:</strong> selecione as unidades e o subgrupo. Só será possível pedir
              itens deste subgrupo nesta solicitação. O destino do fluxo (Administrativo ou
              Imobilizado) segue o tipo da família do subgrupo.
            </>
          ) : (
            <>
              <strong>ITM-11:</strong> selecione as unidades e o subgrupo desta solicitação. Só será
              possível pedir itens deste subgrupo nesta solicitação. Cada item terá seu próprio
              grupo na etapa seguinte.
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
          label="Código / Nome do subgrupo"
          required
          error={subgroupError}
          hint={readOnly ? undefined : `${sortedSubgroups.length} subgrupo(s) no catálogo.`}
          className="pre-form-family-select"
        >
          {readOnly ? (
            <select value={subgroupId} disabled>
              <option value={subgroupId}>
                {selectedSubgroup ? subgroupLabel(selectedSubgroup) : '—'}
              </option>
            </select>
          ) : (
            <SearchableSelect
              label=""
              options={subgroupOptions}
              value={subgroupId}
              onChange={requestSubgroupChange}
              placeholder="Digite código ou nome do subgrupo…"
              emptyLabel="Selecione o subgrupo…"
            />
          )}
        </FormField>

        {selectedSubgroup && derivedFamily ? (
          <p className="pre-form-family-selected">
            Família (derivada): <strong>{familyLabel(derivedFamily)}</strong>{' '}
            <span
              className={`searchable-select-badge searchable-select-badge--${kindBadge(derivedFamily.itemKind ?? selectedSubgroup.itemKind).tone}`}
            >
              {kindBadge(derivedFamily.itemKind ?? selectedSubgroup.itemKind).label}
            </span>
            <br />
            Subgrupo: <strong>{subgroupLabel(selectedSubgroup)}</strong>
          </p>
        ) : selectedSubgroup ? (
          <p className="pre-form-family-selected">
            Subgrupo: <strong>{subgroupLabel(selectedSubgroup)}</strong>
          </p>
        ) : null}

        {!readOnly && subgroupLocked && subgroupId ? (
          <p className="family-lock-note">
            Subgrupo definido para esta solicitação. Para trocar, confirme — os itens atuais serão
            descartados.
          </p>
        ) : null}
      </div>

      {!readOnly ? (
        <ConfirmDialog
          open={pendingSubgroupId !== null}
          title="Trocar subgrupo da solicitação"
          message="Alterar o subgrupo descarta todos os itens já preenchidos nesta solicitação. Deseja continuar?"
          confirmLabel="Trocar subgrupo"
          onConfirm={confirmSubgroupChange}
          onCancel={() => setPendingSubgroupId(null)}
        />
      ) : null}
    </article>
  );
}
