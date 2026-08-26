/** Controles de paginação padronizados (Design System Amarante / padrao-aplicacoes). */
export function PaginationBar({
  page,
  pageSize,
  total,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="pagination">
      <span>
        {total} registro{total === 1 ? '' : 's'} — página {page}
        {totalPages > 1 ? ` de ${totalPages}` : ''}
      </span>
      <button
        type="button"
        className="btn btn-outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <button
        type="button"
        className="btn btn-outline"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </div>
  );
}
