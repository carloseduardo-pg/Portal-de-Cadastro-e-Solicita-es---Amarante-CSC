import { useEffect, useMemo, useState } from 'react';
import './SearchableSelect.css';

export type SearchableOption = {
  id: string;
  label: string;
  searchText?: string;
};

type SearchableSelectProps = {
  label: string;
  options: SearchableOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  emptyLabel?: string;
};

/**
 * Select com busca digitável — filtra opções em tempo real.
 * Sempre mantém a opção selecionada na lista (evita select nativo inválido).
 */
export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Digite para filtrar…',
  disabled = false,
  error,
  hint,
  emptyLabel = 'Nenhuma opção',
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.id === value);

  /** Limpa filtro quando o valor controlado muda (ex.: troca de grupo). */
  useEffect(() => {
    setQuery('');
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? options
      : options.filter((o) => (o.searchText ?? o.label).toLowerCase().includes(q));

    if (value && selected && !base.some((o) => o.id === value)) {
      return [selected, ...base];
    }
    return base;
  }, [options, query, value, selected]);

  return (
    <div className={`searchable-select${disabled ? ' searchable-select--disabled' : ''}`}>
      {label ? <span className="searchable-select-label">{label}</span> : null}
      {hint ? <span className="searchable-select-hint">{hint}</span> : null}
      <input
        type="search"
        className="searchable-select-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={selected ? selected.label : placeholder}
        disabled={disabled}
        aria-label={label ? `Buscar ${label}` : placeholder}
      />
      <select
        className="searchable-select-native"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery('');
        }}
        aria-label={label || placeholder}
      >
        <option value="">{emptyLabel}</option>
        {filtered.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <span className="form-field-error">{error}</span> : null}
    </div>
  );
}
