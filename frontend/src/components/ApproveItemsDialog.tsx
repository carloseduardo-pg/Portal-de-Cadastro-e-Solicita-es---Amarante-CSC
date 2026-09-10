import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import { formatNcmDisplay } from '../lib/ncm';
import type { RequestItem } from '../lib/types';
import './ApproveItemsDialog.css';

export type ApproveDialogItem = Pick<
  RequestItem,
  'id' | 'descriptionShort' | 'ncmCode'
> & {
  /** NCM já escolhido na tela (sugestão/outro). */
  resolvedNcm?: string | null;
};

export type ApproveItemsConfirmPayload = {
  approvedItemIds: string[];
  /** Itens rejeitados a clonar em nova solicitação do solicitante (rascunho). */
  returnRejectedItemIds?: string[];
};

type Props = {
  open: boolean;
  items: ApproveDialogItem[];
  stageComment: string;
  busy?: boolean;
  /** Bloqueio não exige confirmação de NCM (ITM-09 não se aplica). */
  skipNcmConfirmation?: boolean;
  /** Itens com NCM ausente em `ncm_codes` após tentativa de aprovação. */
  ncmErrorItems?: { id: string; description: string; ncm: string }[];
  onClose: () => void;
  onConfirm: (payload: ApproveItemsConfirmPayload) => void;
};

/**
 * Popup de finalização no Aprovador - Administrativo (INCLUSÃO com 2+ itens).
 * Seleção parcial: aprovados → base; não selecionados → rejeitados.
 * Opcional: devolver alguns rejeitados em nova solicitação (rascunho) ao solicitante.
 */
export function ApproveItemsDialog({
  open,
  items,
  stageComment,
  busy = false,
  skipNcmConfirmation = false,
  ncmErrorItems = [],
  onClose,
  onConfirm,
}: Props) {
  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const allIdsRef = useRef(allIds);
  allIdsRef.current = allIds;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [returnAsDraft, setReturnAsDraft] = useState(false);
  const [returnIds, setReturnIds] = useState<string[]>([]);

  /** Só reinicia seleção na abertura do modal (false → true), não quando `items` muda por re-render do pai. */
  useEffect(() => {
    if (!open) return;
    setSelectedIds(allIdsRef.current);
    setReturnAsDraft(false);
    setReturnIds([]);
  }, [open]);

  const ncmErrorIdSet = useMemo(
    () => new Set(ncmErrorItems.map((x) => x.id)),
    [ncmErrorItems],
  );

  const allSelected =
    selectedIds.length === allIds.length &&
    allIds.every((id) => selectedIds.includes(id));
  const isPartial = selectedIds.length > 0 && !allSelected;
  const rejectedItems = useMemo(
    () => items.filter((it) => !selectedIds.includes(it.id)),
    [items, selectedIds],
  );
  const rejectedCount = rejectedItems.length;

  /** Mantém returnIds alinhados à seleção: limpa se não há parcial; remove ids que voltaram a ser aprovados. */
  useEffect(() => {
    if (!isPartial) {
      setReturnAsDraft(false);
      setReturnIds([]);
      return;
    }
    setReturnIds((prev) => prev.filter((id) => !selectedIds.includes(id)));
  }, [isPartial, selectedIds]);

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? allIds : []);
  }

  function toggleReturnItem(id: string) {
    setReturnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleConfirm() {
    if (!selectedIds.length) {
      alert('Selecione ao menos um item para aprovar.');
      return;
    }
    if (!skipNcmConfirmation) {
      for (const id of selectedIds) {
        const it = items.find((x) => x.id === id);
        const ncm = it?.resolvedNcm?.trim() || it?.ncmCode?.trim();
        if (!ncm) {
          alert(
            `ITM-09: confirme o NCM do item aprovado "${it?.descriptionShort ?? id}" antes de finalizar.`,
          );
          return;
        }
      }
    }
    if (isPartial && returnAsDraft) {
      if (!returnIds.length) {
        alert(
          'Selecione ao menos um item rejeitado para devolver em nova solicitação, ou desmarque a opção.',
        );
        return;
      }
      for (const id of returnIds) {
        if (selectedIds.includes(id)) {
          alert('Só é possível devolver itens que não foram aprovados.');
          return;
        }
      }
    }
    onConfirm({
      approvedItemIds: selectedIds,
      returnRejectedItemIds:
        isPartial && returnAsDraft && returnIds.length ? returnIds : undefined,
    });
  }

  return (
    <Modal
      open={open}
      title="Finalizar e enviar à base"
      onClose={busy ? () => undefined : onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !selectedIds.length}
            onClick={handleConfirm}
          >
            {isPartial
              ? `Aprovar ${selectedIds.length} e rejeitar ${rejectedCount}`
              : `Aprovar todos (${items.length})`}
          </button>
        </>
      }
    >
      <div className="approve-items-dialog">
        {ncmErrorItems.length ? (
          <p className="approve-items-dialog__ncm-error" role="alert">
            NCM não localizado na base de NCMs do portal em{' '}
            <strong>
              {ncmErrorItems.length} item{ncmErrorItems.length === 1 ? '' : 's'}
            </strong>
            . Feche o diálogo, corrija o NCM destacado e tente novamente.
          </p>
        ) : null}
        <p className="approve-items-dialog__mode" role="status">
          {isPartial ? (
            <>
              Tipo: <strong>Aprovação parcial</strong> — {selectedIds.length} de {items.length}{' '}
              item(ns) vão à base; {rejectedCount} será(ão) rejeitado(s). A solicitação encerra.
            </>
          ) : (
            <>
              Tipo: <strong>Aprovação total</strong> — todos os {items.length} itens vão à base.
            </>
          )}
        </p>

        <fieldset className="approve-items-dialog__items" disabled={busy}>
          <legend>Quais itens aprovar?</legend>
          <div className="approve-items-dialog__actions">
            <button type="button" className="btn btn-ghost" onClick={() => toggleAll(true)}>
              Selecionar todos
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => toggleAll(false)}>
              Limpar
            </button>
          </div>
          <label className="approve-items-dialog__all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            Selecionar todos ({items.length})
          </label>
          <ul>
            {items.map((it) => {
              const ncm = it.resolvedNcm?.trim() || it.ncmCode?.trim();
              const checked = selectedIds.includes(it.id);
              const hasNcmError = ncmErrorIdSet.has(it.id);
              const errorNcm = ncmErrorItems.find((x) => x.id === it.id)?.ncm;
              return (
                <li
                  key={it.id}
                  className={hasNcmError ? 'approve-items-dialog__item--error' : undefined}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(it.id)}
                    />
                    <span className="approve-items-dialog__item-body">
                      <strong>{it.descriptionShort}</strong>
                      <span className="approve-items-dialog__ncm">
                        NCM:{' '}
                        {ncm ? (
                          formatNcmDisplay(ncm)
                        ) : (
                          <em className="approve-items-dialog__ncm-missing">não confirmado</em>
                        )}
                        {checked && !ncm ? ' (obrigatório para aprovar)' : null}
                      </span>
                      {hasNcmError ? (
                        <span className="approve-items-dialog__ncm-error-detail">
                          NCM não localizado na base de NCMs do portal
                          {errorNcm ? ` (${errorNcm})` : ''}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {isPartial ? (
            <p className="approve-items-dialog__warn" role="status">
              Os {rejectedCount} item(ns) não selecionado(s) serão rejeitados nesta ação e não
              entrarão na base. Não será possível reabrir essa rejeição depois.
            </p>
          ) : null}
        </fieldset>

        {isPartial ? (
          <fieldset className="approve-items-dialog__return" disabled={busy}>
            <legend>Devolver ao solicitante?</legend>
            <label className="approve-items-dialog__return-flag">
              <input
                type="checkbox"
                checked={returnAsDraft}
                onChange={(e) => {
                  const on = e.target.checked;
                  setReturnAsDraft(on);
                  if (!on) setReturnIds([]);
                }}
              />
              <span>
                Deseja devolver algum dos itens rejeitados ao solicitante em uma{' '}
                <strong>nova solicitação</strong> (rascunho), com novo ID, para ele avaliar?
              </span>
            </label>
            {returnAsDraft ? (
              <>
                <p className="approve-items-dialog__return-hint">
                  Selecione quais dos itens rejeitados vão para a nova solicitação. Os demais
                  rejeitados permanecem só nesta aprovação (sem nova solicitação).
                </p>
                <ul>
                  {rejectedItems.map((it) => (
                    <li key={it.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={returnIds.includes(it.id)}
                          onChange={() => toggleReturnItem(it.id)}
                        />
                        <span className="approve-items-dialog__item-body">
                          <strong>{it.descriptionShort}</strong>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </fieldset>
        ) : null}

        {stageComment.trim() ? (
          <div className="approve-items-dialog__comment">
            <p className="approve-items-dialog__comment-label">Observação da etapa</p>
            <p>{stageComment.trim()}</p>
          </div>
        ) : (
          <p className="approve-items-dialog__warn">
            Preencha a observação da etapa na tela antes de confirmar.
          </p>
        )}
      </div>
    </Modal>
  );
}
