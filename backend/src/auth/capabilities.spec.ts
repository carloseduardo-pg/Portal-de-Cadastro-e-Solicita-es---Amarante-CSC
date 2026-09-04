import { UserRole } from '@prisma/client';
import { capabilitiesForRole, hasCapability } from './capabilities';

describe('capabilities', () => {
  it('gives ADMIN every capability', () => {
    expect(hasCapability(UserRole.ADMIN, 'users.manage')).toBe(true);
    expect(hasCapability(UserRole.ADMIN, 'products.request.approve.imobilizado')).toBe(
      true,
    );
    expect(hasCapability(UserRole.ADMIN, 'suppliers.module')).toBe(true);
  });

  it('lets SOLICITANTE create but not approve', () => {
    expect(hasCapability(UserRole.SOLICITANTE, 'products.request.create')).toBe(true);
    expect(hasCapability(UserRole.SOLICITANTE, 'products.request.approve.admin')).toBe(
      false,
    );
    expect(hasCapability(UserRole.SOLICITANTE, 'users.manage')).toBe(false);
  });

  it('splits administrative and fixed-asset approvers', () => {
    expect(hasCapability(UserRole.APROVADOR, 'products.request.approve.admin')).toBe(
      true,
    );
    expect(
      hasCapability(UserRole.APROVADOR, 'products.request.approve.imobilizado'),
    ).toBe(false);
    expect(
      hasCapability(UserRole.APROVADOR_IMOBILIZADO, 'products.request.approve.imobilizado'),
    ).toBe(true);
    expect(
      hasCapability(UserRole.APROVADOR_IMOBILIZADO, 'products.request.approve.admin'),
    ).toBe(false);
  });

  it('keeps COMPLIANCE out of products', () => {
    expect(hasCapability(UserRole.COMPLIANCE, 'suppliers.module')).toBe(true);
    expect(hasCapability(UserRole.COMPLIANCE, 'products.module')).toBe(false);
    expect(capabilitiesForRole(UserRole.COMPLIANCE)).toEqual(['suppliers.module']);
  });
});
