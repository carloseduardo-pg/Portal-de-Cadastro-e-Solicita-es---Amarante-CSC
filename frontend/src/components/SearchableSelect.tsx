import { useMemo, useState } from 'react';
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      (o.searchText ?? o.label).toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <label className={`searchable-select${disabled ? ' searchable-select--disabled' : ''}`}>
      <span className="searchable-select-label">{label}</span>
      {hint ? <span className="searchable-select-hint">{hint}</span> : null}
      <input
        type="search"
        className="searchable-select-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={selected ? selected.label : placeholder}
        disabled={disabled}
        aria-label={`Buscar ${label}`}
      />
      <select
        className="searchable-select-native"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery('');
        }}
        aria-label={label}
      >
        <option value="">{emptyLabel}</option>
        {filtered.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <span className="form-field-error">{error}</span> : null}
    </label>
  );
}
