import './ConfirmDialog.css';

type Props = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
};

/**
 * Popup de alerta (um botão) — informa o usuário sem pedir confirmação.
 */
export function AlertDialog({
  open,
  title = 'Atenção',
  message,
  confirmLabel = 'Entendi',
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" role="presentation" onClick={onClose}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="alert-title" className="confirm-title">
          {title}
        </h2>
        <p className="confirm-message" style={{ whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
