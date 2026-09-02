import { useEffect, useMemo, useState } from 'react';
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

type Props = {
  open: boolean;
  items: ApproveDialogItem[];
  stageComment: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: { approvedItemIds: string[] }) => void;
};

/**
 * Popup de finalização no Aprovador - Administrativo (INCLUSÃO com 2+ itens).
 * Seleção parcial: aprovados → base; não selecionados → rejeitados na mesma ação.
 */
export function ApproveItemsDialog({
  open,
  items,
  stageComment,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(allIds);
  }, [open, allIds]);

  const allSelected =
    selectedIds.length === allIds.length &&
    allIds.every((id) => selectedIds.includes(id));
  const isPartial = selectedIds.length > 0 && !allSelected;
  const rejectedCount = items.length - selectedIds.length;

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? allIds : []);
  }

  function handleConfirm() {
    if (!selectedIds.length) {
      alert('Selecione ao menos um item para aprovar.');
      return;
    }
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
    onConfirm({ approvedItemIds: selectedIds });
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
              return (
                <li key={it.id}>
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
