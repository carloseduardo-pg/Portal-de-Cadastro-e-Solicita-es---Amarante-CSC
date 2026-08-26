import type { FormEvent, ReactNode } from 'react';

type FilterBarProps = {
  children: ReactNode;
  onSubmit: (event: FormEvent) => void;
  onClear?: () => void;
  actions?: ReactNode;
};

/**
 * Standard filter toolbar for paginated resource lists.
 * Layout: fields on the left, actions (Limpar / Filtrar / Novo) on the right.
 */
export function FilterBar({
  children,
  onSubmit,
  onClear,
  actions,
}: FilterBarProps) {
  return (
    <form className="filter-bar" onSubmit={onSubmit}>
      <div className="filter-bar__fields">
        <span className="filter-bar__label">Filtrar por:</span>
        {children}
      </div>
      <div className="filter-bar__actions">
        {onClear ? (
          <button type="button" className="btn btn-outline" onClick={onClear}>
            Limpar
          </button>
        ) : null}
        <button type="submit" className="btn btn-outline">
          Filtrar
        </button>
        {actions ? (
          <>
            <span className="filter-bar__divider" aria-hidden />
            {actions}
          </>
        ) : null}
      </div>
    </form>
  );
}
