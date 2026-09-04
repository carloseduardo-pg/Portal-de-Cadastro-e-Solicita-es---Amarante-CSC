import { UserRole } from '@prisma/client';

/** Ações estáveis do portal — não gravar no banco. */
export const CAPABILITIES = [
  'products.module',
  'products.request.create',
  'products.request.approve.admin',
  'products.request.approve.imobilizado',
  'products.request.return',
  'products.request.close',
  'catalog.params',
  'users.manage',
  'suppliers.module',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ALL_CAPABILITIES = [...CAPABILITIES];

const ROLE_CAPABILITIES: Record<UserRole, readonly Capability[]> = {
  [UserRole.ADMIN]: ALL_CAPABILITIES,
  [UserRole.SOLICITANTE]: [
    'products.module',
    'products.request.create',
    'products.request.close',
  ],
  [UserRole.APROVADOR]: [
    'products.module',
    'products.request.approve.admin',
    'products.request.return',
    'products.request.close',
    'catalog.params',
  ],
  [UserRole.APROVADOR_IMOBILIZADO]: [
    'products.module',
    'products.request.approve.imobilizado',
    'products.request.return',
    'products.request.close',
    'catalog.params',
  ],
  [UserRole.COMPLIANCE]: ['suppliers.module'],
};

export function capabilitiesForRole(role: UserRole): Capability[] {
  return [...(ROLE_CAPABILITIES[role] ?? [])];
}

export function hasCapability(role: UserRole | undefined, cap: Capability): boolean {
  if (!role) return false;
  return capabilitiesForRole(role).includes(cap);
}

export function hasAnyCapability(
  role: UserRole | undefined,
  caps: readonly Capability[],
): boolean {
  return caps.some((cap) => hasCapability(role, cap));
}
