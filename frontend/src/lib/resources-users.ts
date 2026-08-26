import { apiFetch } from './api';
import type { PageResult } from './types';

export type User = {
  id: string;
  name: string;
  email: string;
  active: boolean;
};

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const usersApi = {
  list: (opts?: { search?: string; page?: number; pageSize?: number }) =>
    apiFetch<PageResult<User>>(
      `/users${qs({ search: opts?.search, page: opts?.page ?? 1, pageSize: opts?.pageSize ?? 20 })}`,
    ),
};
