/** Parâmetros de paginação já normalizados (page ≥ 1, pageSize ≤ 100). */
export type PageParams = {
  page: number;
  pageSize: number;
};

/** Envelope padrão das listagens REST Amarante. */
export type PageResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

/**
 * Normaliza `page`/`pageSize` de query string.
 * Limita pageSize a 100 para evitar listagens acidentais de tabela inteira.
 */
export function parsePage(page?: string, pageSize?: string): PageParams {
  const p = Math.max(1, Number(page) || DEFAULT_PAGE);
  const size = Math.min(
    MAX_SIZE,
    Math.max(1, Number(pageSize) || DEFAULT_SIZE),
  );
  return { page: p, pageSize: size };
}

/** Monta o envelope `{ data, total, page, pageSize, totalPages }`. */
export function pageResult<T>(
  data: T[],
  total: number,
  params: PageParams,
): PageResult<T> {
  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

/** Converte PageParams em `{ skip, take }` do Prisma. */
export function skipTake(params: PageParams) {
  return {
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  };
}
