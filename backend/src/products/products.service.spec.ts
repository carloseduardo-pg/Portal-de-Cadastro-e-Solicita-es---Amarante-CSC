import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProductsService,
  isProtectedBaseProduct,
  resolveProductBaseOrder,
} from './products.service';

/**
 * Junta o SQL de uma chamada `$queryRaw`: o template externo mais os
 * fragmentos `Prisma.sql` que chegam como valores interpolados.
 */
function flattenSql(args: unknown): string {
  if (typeof args === 'string') return args;
  if (Array.isArray(args)) return args.map(flattenSql).join(' ');
  if (args && typeof args === 'object' && 'strings' in args) {
    return flattenSql((args as { strings: unknown }).strings);
  }
  return '';
}

describe('ProductsService', () => {
  let service: ProductsService;
  const prisma = {
    product: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    requestItem: {
      updateMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  it('throws when a product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('orders the base by createdAt when requested', () => {
    expect(resolveProductBaseOrder('createdAt', 'desc')).toEqual([
      { createdAt: 'desc' },
      { id: 'asc' },
    ]);
  });

  it('treats SAP-coded products as original base', () => {
    expect(isProtectedBaseProduct({ sapCode: 'UC000223' })).toBe(true);
    expect(isProtectedBaseProduct({ sapCode: null })).toBe(false);
  });

  it('rejects portal product deletion for non-admin', async () => {
    await expect(
      service.removePortalProduct('p1', UserRole.SOLICITANTE),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
  });

  it('rejects deletion of original SAP products', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'p1',
      sapCode: 'UC000001',
      descriptionShort: 'ITEM SAP',
    });

    await expect(
      service.removePortalProduct('p1', UserRole.ADMIN),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });

  it('skips the query for terms too short to be a code', async () => {
    await expect(service.search({ q: 'A' })).resolves.toMatchObject({
      data: [],
      total: 0,
    });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('accepts two-character terms so short codes are searchable', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { count: BigInt(0) },
    ]);

    await service.search({ q: '11' });

    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it('restricts the search to active products when asked (bloqueio)', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { count: BigInt(0) },
    ]);

    await service.search({ q: 'AGUA', activeOnly: true });

    expect(flattenSql(prisma.$queryRaw.mock.calls[0])).toContain(
      'p.active = true',
    );
  });

  it('deletes portal products and unlinks request items', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'p1',
      sapCode: null,
      descriptionShort: 'ITEM TESTE',
    });
    prisma.requestItem.updateMany.mockResolvedValue({ count: 1 });
    prisma.product.delete.mockResolvedValue({ id: 'p1' });

    await expect(
      service.removePortalProduct('p1', UserRole.ADMIN),
    ).resolves.toEqual({ ok: true });
    expect(prisma.requestItem.updateMany).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      data: { productId: null },
    });
    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });
});
