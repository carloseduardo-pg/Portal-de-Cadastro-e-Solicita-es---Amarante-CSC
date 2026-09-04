import type { AuthUser } from './api';

export type Capability =
  | 'products.module'
  | 'products.request.create'
  | 'products.request.approve.admin'
  | 'products.request.approve.imobilizado'
  | 'products.request.return'
  | 'products.request.close'
  | 'catalog.params'
  | 'users.manage'
  | 'suppliers.module';

export const USER_ROLE_LABELS: Record<AuthUser['role'], string> = {
  ADMIN: 'Administrador',
  SOLICITANTE: 'Solicitante',
  APROVADOR: 'Aprovador - Administrativo',
  APROVADOR_IMOBILIZADO: 'Aprovador - Imobilizado',
  COMPLIANCE: 'Compliance',
};

export function hasCap(
  user: AuthUser | null | undefined,
  cap: Capability,
): boolean {
  if (!user) return false;
  if (user.capabilities?.length) {
    return user.capabilities.includes(cap);
  }
  return user.role === 'ADMIN';
}

export function hasAnyCap(
  user: AuthUser | null | undefined,
  caps: readonly Capability[],
): boolean {
  return caps.some((cap) => hasCap(user, cap));
}
