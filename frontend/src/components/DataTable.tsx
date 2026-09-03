import type { ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Quando true e `onSort` é informado, o cabeçalho fica clicável. */
  sortable?: boolean;
};

type DataTableSort = {
  key: string;
  dir: 'asc' | 'desc';
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  selectedRowKey?: string;
  onRowClick?: (row: T) => void;
  sort?: DataTableSort;
  onSort?: (key: string) => void;
};

/** Responsive data table used by Amarante listing pages. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'Nenhum registro encontrado.',
  selectedRowKey,
  onRowClick,
  sort,
  onSort,
}: DataTableProps<T>) {
  return (
    <div className="card data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const sortable = Boolean(column.sortable && onSort);
              const active = sort?.key === column.key;
              const ariaSort = !sortable
                ? undefined
                : active
                  ? sort.dir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
              return (
                <th
                  key={column.key}
                  className={sortable ? 'data-table-th--sortable' : undefined}
                  aria-sort={ariaSort}
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="data-table-sort"
                      onClick={() => onSort?.(column.key)}
                    >
                      <span>{column.header}</span>
                      <span
                        className={`data-table-sort-caret${active ? ` data-table-sort-caret--${sort.dir}` : ''}`}
                        aria-hidden
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              const selected = selectedRowKey === key;
              return (
                <tr
                  key={key}
                  className={[
                    onRowClick ? 'data-table-row--clickable' : '',
                    selected ? 'data-table-row--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((column) => (
                    <td key={column.key}>{column.render(row)}</td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
