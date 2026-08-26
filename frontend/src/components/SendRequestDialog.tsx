import './ConfirmDialog.css';

type Props = {
  open: boolean;
  title: string;
  message: string;
  cancelLabel?: string;
  draftLabel?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onDraft: () => void;
  onConfirm: () => void;
};

/**
 * Confirmação de envio com 3 ações: cancelar, rascunho (solicitante) ou enviar ao aprovador.
 */
export function SendRequestDialog({
  open,
  title,
  message,
  cancelLabel = 'Cancelar',
  draftLabel = 'Salvar como rascunho',
  confirmLabel = 'Enviar ao aprovador',
  onCancel,
  onDraft,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog confirm-dialog--wide"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="send-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="send-confirm-title" className="confirm-title">
          {title}
        </h2>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions confirm-actions--triple">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-outline" onClick={onDraft}>
            {draftLabel}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
