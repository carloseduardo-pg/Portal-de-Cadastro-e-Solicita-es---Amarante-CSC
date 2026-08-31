import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import type { RequestItem } from '../lib/types';
import './ReclassifyRequestDialog.css';

export type ReclassifyDirection = 'fixed-asset' | 'consumption';

type Props = {
  open: boolean;
  direction: ReclassifyDirection;
  items: Pick<RequestItem, 'id' | 'descriptionShort'>[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    justification: string;
    itemIds: string[];
    returnToApprover?: boolean;
  }) => void;
};

/**
 * Modal de reclassificação Aprovador ↔ Imobilizado.
 * Seleção parcial divide o lote: itens marcados seguem o novo kind numa solicitação filha.
 */
export function ReclassifyRequestDialog({
  open,
  direction,
  items,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const [justification, setJustification] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [returnToApprover, setReturnToApprover] = useState(true);

  useEffect(() => {
    if (!open) return;
    setJustification('');
    setSelectedIds(allIds);
    setReturnToApprover(true);
  }, [open, allIds]);

  const allSelected =
    selectedIds.length === allIds.length &&
    allIds.every((id) => selectedIds.includes(id));
  const isPartial = selectedIds.length > 0 && !allSelected;
  const title =
    direction === 'fixed-asset'
      ? 'Reclassificar como Ativo Fixo'
      : 'Reclassificar como Uso e Consumo';

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? allIds : []);
  }

  function handleConfirm() {
    const trimmed = justification.trim();
    if (!trimmed) {
      alert('Informe a justificativa da reclassificação.');
      return;
    }
    if (!selectedIds.length) {
      alert('Selecione ao menos um item.');
      return;
    }
    onConfirm({
      justification: trimmed,
      itemIds: selectedIds,
      ...(direction === 'fixed-asset' ? { returnToApprover } : {}),
    });
  }

  return (
    <Modal
      open={open}
      title={title}
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
            disabled={busy || !selectedIds.length || !justification.trim()}
            onClick={handleConfirm}
          >
            {isPartial ? 'Dividir lote e reclassificar' : 'Confirmar reclassificação'}
          </button>
        </>
      }
    >
      <div className="reclassify-dialog">
        <label className="form-field">
          <span>Justificativa</span>
          <textarea
            rows={3}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Explique o motivo da reclassificação"
            disabled={busy}
          />
        </label>

        <fieldset className="reclassify-dialog__items" disabled={busy}>
          <legend>Quais itens serão reclassificados?</legend>
          <label className="reclassify-dialog__all">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleAll(e.target.checked)}
            />
            Selecionar todos ({items.length})
          </label>
          <ul>
            {items.map((it) => (
              <li key={it.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(it.id)}
                    onChange={() => toggleItem(it.id)}
                  />
                  {it.descriptionShort}
                </label>
              </li>
            ))}
          </ul>
          {isPartial ? (
            <p className="reclassify-dialog__warn" role="status">
              {direction === 'fixed-asset'
                ? `Lote misto: ${selectedIds.length} item(ns) de ativo fixo vão para uma nova solicitação no Aprovador - Imobilizado; os ${items.length - selectedIds.length} restante(s) de consumo ficam nesta solicitação (Aprovador - Administrativo). As duas ficam vinculadas.`
                : `Lote misto: ${selectedIds.length} item(ns) de uso e consumo vão para uma nova solicitação no Aprovador - Administrativo; os ${items.length - selectedIds.length} restante(s) de ativo fixo ficam no Aprovador - Imobilizado. As duas ficam vinculadas.`}
            </p>
          ) : null}
        </fieldset>

        {direction === 'fixed-asset' ? (
          <fieldset className="reclassify-dialog__return" disabled={busy}>
            <legend>Após a análise do Aprovador - Imobilizado</legend>
            <label>
              <input
                type="radio"
                name="returnToApprover"
                checked={returnToApprover === true}
                onChange={() => setReturnToApprover(true)}
              />
              Após a análise do Aprovador - Imobilizado, a solicitação volta para o Aprovador -
              Administrativo
            </label>
            <label>
              <input
                type="radio"
                name="returnToApprover"
                checked={returnToApprover === false}
                onChange={() => setReturnToApprover(false)}
              />
              O Aprovador - Imobilizado conclui sozinho
            </label>
          </fieldset>
        ) : null}
      </div>
    </Modal>
  );
}
