import { useMemo, useRef, useState } from 'react';
import { FormField } from './FormField';
import { Icon } from './Icon';
import './ItemCompletionSection.css';

export type ItemAttachmentDraft = {
  id: string;
  fileName: string;
  type: string;
  description: string;
  uploadedAt: string;
};

export type ItemCompletionValue = {
  productLink: string;
  productLinks: string[];
  descriptionLong: string;
  itemObservation: string;
  attachments: ItemAttachmentDraft[];
};

export type ItemCompletionErrors = {
  descriptionLong?: string;
};

type Props = {
  value: ItemCompletionValue;
  errors?: ItemCompletionErrors;
  readOnly?: boolean;
  onChange?: (patch: Partial<ItemCompletionValue>) => void;
  onClearError?: (key: keyof ItemCompletionErrors) => void;
};

const IMAGE_TYPES = [
  { value: 'FOTO', label: 'Foto do produto' },
  { value: 'EMBALAGEM', label: 'Embalagem' },
  { value: 'ROTULO', label: 'Rótulo / label' },
  { value: 'OUTRO', label: 'Outro' },
];

/**
 * Etapa final do item — imagens, link, descrição longa e observação (estilo Semplice).
 */
export function ItemCompletionSection({
  value,
  errors,
  readOnly = false,
  onChange,
  onClearError,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingType, setPendingType] = useState('FOTO');
  const [pendingDescription, setPendingDescription] = useState('');

  const sortedAttachments = useMemo(
    () => [...value.attachments].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [value.attachments],
  );

  function handleAddFile(file: File | undefined) {
    if (readOnly || !file) return;
    const entry: ItemAttachmentDraft = {
      id: crypto.randomUUID(),
      fileName: file.name,
      type: pendingType,
      description: pendingDescription.trim() || file.name,
      uploadedAt: new Date().toISOString(),
    };
    onChange?.({
      attachments: [...value.attachments, entry],
    });
    setPendingDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeAttachment(id: string) {
    if (readOnly) return;
    onChange?.({ attachments: value.attachments.filter((a) => a.id !== id) });
  }

  return (
    <div className="item-completion">
      <section className="item-completion-block">
        <header className="item-completion-block-header">
          <h3>Imagens do produto</h3>
        </header>
        <div className="item-completion-block-body">
          {!readOnly ? (
            <div className="item-completion-upload-row">
              <button
                type="button"
                className="item-completion-file-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="archive" size={16} />
                Selecionar imagem
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="item-completion-file-input"
                onChange={(e) => handleAddFile(e.target.files?.[0])}
              />
              <label className="item-completion-inline-label">
                Tipo
                <select value={pendingType} onChange={(e) => setPendingType(e.target.value)}>
                  {IMAGE_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="item-completion-inline-label item-completion-grow">
                Descrição da imagem
                <input
                  value={pendingDescription}
                  onChange={(e) => setPendingDescription(e.target.value)}
                  placeholder="Ex.: Foto frontal da embalagem"
                />
              </label>
              <button
                type="button"
                className="btn btn-primary item-completion-add-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Adicionar arquivo
              </button>
            </div>
          ) : null}

          <div className="item-completion-table-wrap">
            <table className="item-completion-table">
              <thead>
                <tr>
                  <th>Baixar</th>
                  <th>Nome</th>
                  <th>Enviado por</th>
                  <th>Descrição da imagem</th>
                  <th>Data de upload</th>
                  {!readOnly ? <th>Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {sortedAttachments.length ? (
                  sortedAttachments.map((row) => (
                    <tr key={row.id}>
                      <td>—</td>
                      <td>{row.fileName}</td>
                      <td>Solicitante</td>
                      <td>{row.description}</td>
                      <td>{new Date(row.uploadedAt).toLocaleString('pt-BR')}</td>
                      {!readOnly ? (
                        <td>
                          <button
                            type="button"
                            className="item-completion-remove-btn"
                            onClick={() => removeAttachment(row.id)}
                          >
                            Remover
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={readOnly ? 5 : 6} className="item-completion-empty">
                      <Icon name="file-alert" size={18} />
                      Sem dados disponíveis
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {!readOnly ? (
            <p className="item-completion-note">
              Anexos ficam registrados nesta solicitação (protótipo — persistência de arquivo em evolução).
            </p>
          ) : null}
        </div>
      </section>

      <section className="item-completion-block">
        <header className="item-completion-block-header">
          <h3>Links do produto</h3>
        </header>
        <div className="item-completion-block-body">
          {(value.productLinks.length ? value.productLinks : ['']).map((link, index) => (
            <FormField
              key={index}
              label={index === 0 ? 'Link do produto' : `Link adicional ${index + 1}`}
              hint={readOnly ? undefined : 'Informe URLs do produto (site, catálogo, etc.).'}
            >
              <div className="item-link-row">
                <input
                  type="url"
                  value={link}
                  readOnly={readOnly}
                  onChange={(e) => {
                    const next = [...(value.productLinks.length ? value.productLinks : [''])];
                    next[index] = e.target.value;
                    onChange?.({
                      productLinks: next.filter(Boolean),
                      productLink: next[0] ?? '',
                    });
                  }}
                  placeholder="https://"
                />
                {!readOnly && index > 0 ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      const next = value.productLinks.filter((_, i) => i !== index);
                      onChange?.({ productLinks: next, productLink: next[0] ?? '' });
                    }}
                  >
                    Remover
                  </button>
                ) : null}
              </div>
            </FormField>
          ))}
          {!readOnly ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                onChange?.({
                  productLinks: [...value.productLinks, ''],
                  productLink: value.productLink,
                })
              }
            >
              Adicionar outro link
            </button>
          ) : null}
        </div>
      </section>

      <section className="item-completion-block">
        <header className="item-completion-block-header">
          <h3>Descrição longa do produto</h3>
        </header>
        <div className="item-completion-block-body">
          <FormField
            label="Descrição longa do produto"
            required
            error={errors?.descriptionLong}
            hint={readOnly ? undefined : 'Descreva o produto de forma detalhada.'}
          >
            <textarea
              className="input-uppercase"
              rows={4}
              value={value.descriptionLong}
              readOnly={readOnly}
              onChange={(e) => {
                onChange?.({ descriptionLong: e.target.value });
                onClearError?.('descriptionLong');
              }}
            />
          </FormField>
        </div>
      </section>

      <section className="item-completion-block">
        <header className="item-completion-block-header">
          <h3>Observação</h3>
        </header>
        <div className="item-completion-block-body">
          <FormField
            label="Observação"
            hint={
              readOnly
                ? undefined
                : 'Escreva uma observação sobre a conclusão desta etapa antes de prosseguir.'
            }
          >
            <textarea
              rows={3}
              value={value.itemObservation}
              readOnly={readOnly}
              onChange={(e) => onChange?.({ itemObservation: e.target.value })}
            />
          </FormField>
        </div>
      </section>
    </div>
  );
}
