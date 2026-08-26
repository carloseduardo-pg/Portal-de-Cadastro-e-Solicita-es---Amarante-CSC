import type { ReactNode } from 'react';
import { Icon } from './Icon';
import './FormField.css';

type Props = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  /** Mensagem de erro (posição configurável). */
  error?: string;
  /** `above` = acima do label; `below` = abaixo do campo (estilo Semplice). */
  errorPosition?: 'above' | 'below';
  /** `semplice` = borda inferior vermelha + ícone de alerta. */
  variant?: 'default' | 'semplice';
  hint?: string;
  className?: string;
  children: ReactNode;
};

/** Campo de formulário com validação visual inline. */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  errorPosition = 'above',
  variant = 'default',
  hint,
  className,
  children,
}: Props) {
  const invalid = Boolean(error);
  const classes = [
    'form-field',
    invalid ? 'form-field--invalid' : '',
    variant === 'semplice' ? 'form-field--semplice' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const errorEl = error ? (
    <p className="form-field-error" role="alert">
      {error}
    </p>
  ) : null;

  return (
    <div className={classes}>
      {errorPosition === 'above' ? errorEl : null}
      <label htmlFor={htmlFor}>
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="form-field-control">
        {children}
        {invalid && variant === 'semplice' ? (
          <span className="form-field-alert-icon" aria-hidden>
            <Icon name="file-alert" size={18} />
          </span>
        ) : null}
      </div>
      {errorPosition === 'below' ? errorEl : null}
      {hint ? <span className="form-field-hint">{hint}</span> : null}
    </div>
  );
}
