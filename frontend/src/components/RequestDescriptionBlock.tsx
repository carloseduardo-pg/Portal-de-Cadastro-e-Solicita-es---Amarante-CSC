import { useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { toFormUppercase } from '../lib/formText';
import './RequestDescriptionBlock.css';

type Props = {
  value: string;
  error?: string;
  readOnly?: boolean;
  /** Aplica caixa alta ao salvar/editar (descrição do produto). */
  uppercase?: boolean;
  /** Usa textarea na edição (observação). */
  multiline?: boolean;
  emptyPlaceholder?: string;
  editAriaLabel?: string;
  confirmTitle?: string;
  confirmMessage?: string;
  onChange: (value: string) => void;
  onClearError?: () => void;
};

function normalize(value: string, uppercase: boolean) {
  return uppercase ? toFormUppercase(value) : value;
}

/**
 * Campo de texto da solicitação — bloqueado após definido; edição via lápis + confirmação.
 */
export function RequestDescriptionBlock({
  value,
  error,
  readOnly = false,
  uppercase = true,
  multiline = false,
  emptyPlaceholder = 'Produto que você pretende cadastrar',
  editAriaLabel = 'Alterar descrição da solicitação',
  confirmTitle = 'Alterar descrição da solicitação',
  confirmMessage = 'Deseja alterar a descrição da solicitação? Essa informação identifica o pedido na etapa de busca.',
  onChange,
  onClearError,
}: Props) {
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function confirmEditAction() {
    setDraft(value);
    setEditing(true);
    setConfirmEdit(false);
  }

  function saveEdit() {
    onChange(normalize(draft, uppercase));
    onClearError?.();
    setEditing(false);
  }

  function cancelEdit() {
    setDraft(value);
    setEditing(false);
  }

  function handleDraftChange(next: string) {
    setDraft(normalize(next, uppercase));
  }

  function handleEmptyChange(next: string) {
    onChange(normalize(next, uppercase));
    onClearError?.();
  }

  const inputClass = [
    'solicitacao-resumo-input',
    uppercase ? 'input-uppercase' : '',
    'request-desc-input',
  ]
    .filter(Boolean)
    .join(' ');

  if (!value.trim()) {
    return (
      <>
        {multiline ? (
          <textarea
            className={inputClass}
            rows={3}
            value={value}
            onChange={(e) => handleEmptyChange(e.target.value)}
            placeholder={emptyPlaceholder}
          />
        ) : (
          <input
            className={inputClass}
            value={value}
            onChange={(e) => handleEmptyChange(e.target.value)}
            placeholder={emptyPlaceholder}
          />
        )}
        {error ? (
          <p className="form-field-error" role="alert">
            {error}
          </p>
        ) : null}
      </>
    );
  }

  if (readOnly) {
    return <p className="request-desc-text">{value || '—'}</p>;
  }

  return (
    <>
      {!editing ? (
        <div className="request-desc-locked">
          <p className="request-desc-text">{value || '—'}</p>
          {value.trim() ? (
            <button
              type="button"
              className="request-desc-edit-btn"
              aria-label={editAriaLabel}
              onClick={() => setConfirmEdit(true)}
            >
              <Icon name="pencil" size={18} />
            </button>
          ) : null}
        </div>
      ) : (
        <div className={`request-desc-editing${multiline ? ' request-desc-editing--multiline' : ''}`}>
          {multiline ? (
            <textarea
              className={inputClass}
              rows={3}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              autoFocus
              placeholder={emptyPlaceholder}
            />
          ) : (
            <input
              className={inputClass}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              autoFocus
              placeholder={emptyPlaceholder}
            />
          )}
          <div className="request-desc-edit-actions">
            <button
              type="button"
              className="request-desc-icon-btn request-desc-icon-btn--save"
              aria-label="Confirmar alteração"
              onClick={saveEdit}
            >
              <Icon name="check" size={18} />
            </button>
            <button
              type="button"
              className="request-desc-icon-btn request-desc-icon-btn--cancel"
              aria-label="Cancelar alteração"
              onClick={cancelEdit}
            >
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="form-field-error" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirmEdit}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel="Sim, alterar"
        onConfirm={confirmEditAction}
        onCancel={() => setConfirmEdit(false)}
      />
    </>
  );
}
