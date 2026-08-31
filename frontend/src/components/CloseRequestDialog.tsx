import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { CLOSE_REASON_OPTIONS } from '../lib/closeReasons';
import './CloseRequestDialog.css';
import './FormField.css';

export type CloseRequestActor = 'solicitante' | 'aprovador';

type Props = {
  open: boolean;
  actor: CloseRequestActor;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (payload: { reasonCode: string; observation: string }) => void;
};

/**
 * Encerrar solicitação sem gravar na base.
 * Solicitante: motivo opcional. Aprovador: motivo + observação obrigatórios.
 */
export function CloseRequestDialog({
  open,
  actor,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const [reasonCode, setReasonCode] = useState('');
  const [observation, setObservation] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReasonCode('');
    setObservation('');
    setConfirmed(false);
  }, [open]);

  const isApprover = actor === 'aprovador';
  const title =
    isApprover ? 'Encerrar solicitação (aprovador)' : 'Encerrar solicitação';

  function handleConfirm() {
    if (!confirmed) {
      alert('Confirme que deseja encerrar permanentemente esta solicitação.');
      return;
    }
    if (isApprover && !reasonCode) {
      alert('Selecione o motivo do encerramento.');
      return;
    }
    if (isApprover && !observation.trim()) {
      alert('A observação do encerramento é obrigatória para o aprovador.');
      return;
    }
    onConfirm({
      reasonCode,
      observation: observation.trim(),
    });
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      wide
      footer={
        <>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={busy}
            onClick={handleConfirm}
          >
            Confirmar encerramento
          </button>
        </>
      }
    >
      <div className="close-request-dialog">
        <p className="close-request-dialog__alert" role="alert">
          Após encerrada, esta solicitação <strong>não poderá ser reaberta</strong>. Se ainda
          precisar do cadastro, será necessário abrir uma <strong>nova solicitação</strong>.
        </p>

        <label className="form-field">
          <span>
            Motivo do encerramento
            {isApprover ? ' *' : ' (opcional)'}
          </span>
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            disabled={busy}
            required={isApprover}
          >
            <option value="">
              {isApprover ? 'Selecione um motivo…' : 'Nenhum (opcional)'}
            </option>
            {CLOSE_REASON_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>
            Observação
            {isApprover ? ' *' : ' (opcional)'}
          </span>
          <textarea
            rows={4}
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            disabled={busy}
            placeholder={
              isApprover
                ? 'Obrigatório — explique por que a solicitação não deve prosseguir.'
                : 'Opcional — detalhe o motivo, se quiser.'
            }
          />
          {isApprover ? (
            <span className="form-field-hint">
              Mesmo com um motivo selecionado acima, a observação continua obrigatória.
            </span>
          ) : null}
        </label>

        <label className="close-request-dialog__confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={busy}
          />
          <span>
            Confirmo que desejo encerrar esta solicitação e entendo que ela não poderá ser
            reaberta.
          </span>
        </label>
      </div>
    </Modal>
  );
}
