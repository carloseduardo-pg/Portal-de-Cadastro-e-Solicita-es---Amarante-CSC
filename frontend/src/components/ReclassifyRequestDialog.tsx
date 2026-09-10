import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { SearchableSelect } from './SearchableSelect';
import type { CatalogSubgroup, RequestItem } from '../lib/types';
import './ReclassifyRequestDialog.css';

export type ReclassifyDirection = 'fixed-asset' | 'consumption';

type Props = {
  open: boolean;
  direction: ReclassifyDirection;
  items: Pick<RequestItem, 'id' | 'descriptionShort'>[];
  /** Subgrupos do kind de destino (AF ou UC). */
  subgroups: CatalogSubgroup[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    justification: string;
    itemIds: string[];
    targetSubgroupId: string;
  }) => void;
};

/**
 * Modal de reclassificação Aprovador ↔ Imobilizado.
 * Exige subgrupo do destino (ITM-11 / FLX-01). Família é derivada no backend.
 */
export function ReclassifyRequestDialog({
  open,
  direction,
  items,
  subgroups,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const [justification, setJustification] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetSubgroupId, setTargetSubgroupId] = useState('');

  useEffect(() => {
    if (!open) return;
    setJustification('');
    setSelectedIds(allIds);
    setTargetSubgroupId('');
  }, [open, allIds, direction]);

  const title =
    direction === 'fixed-asset'
      ? 'Reclassificar como Ativo Fixo'
      : 'Reclassificar como Uso e Consumo';

  const subgroupLabel =
    direction === 'fixed-asset'
      ? 'Subgrupo de ativo fixo (destino)'
      : 'Subgrupo de uso e consumo (destino)';

  const subgroupOptions = useMemo(
    () =>
      [...subgroups]
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
            a.code.localeCompare(b.code),
        )
        .map((sg) => ({
          id: sg.id,
          label: `${sg.code} — ${sg.name}${sg.family ? ` (${sg.family.code} — ${sg.family.name})` : ''}`,
          searchText: `${sg.code} ${sg.name} ${sg.family?.code ?? ''} ${sg.family?.name ?? ''}`,
        })),
    [subgroups],
  );

  const allSelected = selectedIds.length === allIds.length && allIds.length > 0;
  const isPartial = selectedIds.length > 0 && selectedIds.length < allIds.length;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? allIds : []);
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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
    if (!targetSubgroupId) {
      alert(
        direction === 'fixed-asset'
          ? 'Selecione o subgrupo de ativo fixo para encaminhar.'
          : 'Selecione o subgrupo de uso e consumo para encaminhar.',
      );
      return;
    }
    onConfirm({
      justification: trimmed,
      itemIds: selectedIds,
      targetSubgroupId,
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
            disabled={
              busy || !selectedIds.length || !justification.trim() || !targetSubgroupId
            }
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

        <div className="form-field">
          <SearchableSelect
            label={subgroupLabel}
            options={subgroupOptions}
            value={targetSubgroupId}
            onChange={setTargetSubgroupId}
            placeholder="Digite código ou nome do subgrupo…"
            emptyLabel="Selecione o subgrupo de destino…"
            disabled={busy}
          />
          <p className="reclassify-dialog__hint">
            Sugestão para o setor destino — a família é derivada do subgrupo; eles podem alterar
            depois.
          </p>
        </div>

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
      </div>
    </Modal>
  );
}
