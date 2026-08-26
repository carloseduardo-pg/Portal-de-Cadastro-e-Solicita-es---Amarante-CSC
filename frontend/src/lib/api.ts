/** Em dev usa proxy Vite (`/api`); em prod ou override via VITE_API_URL. */
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api');

async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      'Não foi possível conectar à API. Verifique se o backend está rodando (`npm run dev` na raiz).',
    );
  }
}

/** Perfil público do usuário autenticado (sem token). */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SOLICITANTE' | 'APROVADOR' | 'COMPLIANCE';
};

/**
 * Cliente HTTP Portal Amarante: sempre `credentials: 'include'` (cookies JWT).
 * Em 401 (exceto login/refresh), tenta refresh e repete a chamada uma vez.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetchApi(path, options);

  if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    const refreshed = await fetchApi('/auth/refresh', { method: 'POST' });
    if (refreshed.ok) {
      const retry = await fetchApi(path, options);
      if (!retry.ok) {
        const err = await retry.json().catch(() => ({}));
        throw new Error(err.message || 'Falha na requisição');
      }
      return retry.json() as Promise<T>;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = Array.isArray(err.message)
      ? err.message.join(', ')
      : err.message || 'Falha na requisição';
    throw new Error(msg);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/** POST /auth/login — cookies setados pelo browser. */
export function loginRequest(email: string, password: string) {
  return apiFetch<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logoutRequest() {
  return apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' });
}

export function meRequest() {
  return apiFetch<AuthUser>('/auth/me');
}
