import { useEffect, useState } from 'react';
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
  /** Texto do diálogo ao confirmar gravação (timeline). */
  saveConfirmTitle?: string;
  saveConfirmMessage?: string;
  /** Persistência assíncrona (API + timeline). Se omitido, só atualiza via onChange. */
  onPersist?: (value: string) => void | Promise<void>;
  onChange: (value: string) => void;
  onClearError?: () => void;
};

function normalize(value: string, uppercase: boolean) {
  return uppercase ? toFormUppercase(value) : value;
}

/**
 * Campo de texto da solicitação — edição via lápis + confirmação salvar/descartar.
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
  saveConfirmTitle = 'Salvar alteração',
  saveConfirmMessage = 'Deseja salvar esta alteração? Ela será registrada na timeline do rascunho.',
  onPersist,
  onChange,
  onClearError,
}: Props) {
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  function confirmEditAction() {
    setDraft(value);
    setEditing(true);
    setConfirmEdit(false);
  }

  function requestSave() {
    const next = normalize(draft, uppercase);
    if (next.trim() === value.trim()) {
      setEditing(false);
      return;
    }
    setConfirmSave(true);
  }

  async function commitSave() {
    const next = normalize(draft, uppercase);
    setConfirmSave(false);
    setSaving(true);
    try {
      if (onPersist) {
        await onPersist(next);
      } else {
        onChange(next);
      }
      onClearError?.();
      setEditing(false);
    } catch {
      /* quem persiste deve alertar o usuário */
    } finally {
      setSaving(false);
    }
  }

  function discardEdit() {
    setDraft(value);
    setEditing(false);
    setConfirmDiscard(false);
  }

  function handleDraftChange(next: string) {
    setDraft(normalize(next, uppercase));
  }

  async function handleEmptyChange(next: string) {
    const normalized = normalize(next, uppercase);
    if (onPersist && normalized.trim() && !value.trim()) {
      try {
        await onPersist(normalized);
        onClearError?.();
      } catch {
        /* ignore */
      }
      return;
    }
    onChange(normalized);
    onClearError?.();
  }

  const inputClass = [
    'solicitacao-resumo-input',
    uppercase ? 'input-uppercase' : '',
    'request-desc-input',
  ]
    .filter(Boolean)
    .join(' ');

  if (!value.trim() && !editing && !readOnly) {
    return (
      <>
        {multiline ? (
          <textarea
            className={inputClass}
            rows={3}
            value={value}
            onChange={(e) => void handleEmptyChange(e.target.value)}
            placeholder={emptyPlaceholder}
          />
        ) : (
          <input
            className={inputClass}
            value={value}
            onChange={(e) => void handleEmptyChange(e.target.value)}
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
              disabled={saving}
              placeholder={emptyPlaceholder}
            />
          ) : (
            <input
              className={inputClass}
              value={draft}
              onChange={(e) => handleDraftChange(e.target.value)}
              autoFocus
              disabled={saving}
              placeholder={emptyPlaceholder}
            />
          )}
          <div className="request-desc-edit-actions">
            <button
              type="button"
              className="request-desc-icon-btn request-desc-icon-btn--save"
              aria-label="Salvar alteração"
              disabled={saving}
              onClick={requestSave}
            >
              <Icon name="check" size={18} />
            </button>
            <button
              type="button"
              className="request-desc-icon-btn request-desc-icon-btn--cancel"
              aria-label="Descartar alteração"
              disabled={saving}
              onClick={() => setConfirmDiscard(true)}
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

      <ConfirmDialog
        open={confirmSave}
        title={saveConfirmTitle}
        message={saveConfirmMessage}
        confirmLabel="Salvar"
        cancelLabel="Continuar editando"
        onConfirm={() => void commitSave()}
        onCancel={() => setConfirmSave(false)}
      />

      <ConfirmDialog
        open={confirmDiscard}
        title="Descartar alterações"
        message="Deseja descartar as alterações e manter o texto anterior?"
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={discardEdit}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}
