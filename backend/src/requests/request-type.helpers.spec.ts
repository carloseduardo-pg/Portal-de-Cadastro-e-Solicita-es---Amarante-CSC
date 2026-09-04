import { ProductBlockState, RequestType } from '@prisma/client';
import {
  blockScopeLabel,
  blockScopeOf,
  blockStateFromScope,
  isBlockRequestType,
  isExistingProductRequestType,
} from './request-type.helpers';

describe('request-type helpers — bloqueio unificado', () => {
  it('reconhece o tipo unificado e os históricos como bloqueio', () => {
    expect(isBlockRequestType(RequestType.BLOQUEIO)).toBe(true);
    expect(isBlockRequestType(RequestType.BLOQUEIO_PARCIAL)).toBe(true);
    expect(isBlockRequestType(RequestType.BLOQUEIO_TOTAL)).toBe(true);
    expect(isBlockRequestType(RequestType.ALTERACAO)).toBe(false);
    expect(isBlockRequestType(RequestType.INCLUSAO)).toBe(false);
  });

  it('trata alteração e bloqueio como pedidos sobre produto existente', () => {
    expect(isExistingProductRequestType(RequestType.ALTERACAO)).toBe(true);
    expect(isExistingProductRequestType(RequestType.BLOQUEIO)).toBe(true);
    expect(isExistingProductRequestType(RequestType.INCLUSAO)).toBe(false);
  });

  it('deriva parcial de uma flag e total das duas', () => {
    expect(
      blockStateFromScope({ blockRequisition: true, blockPurchase: false }),
    ).toBe(ProductBlockState.PARTIAL);
    expect(
      blockStateFromScope({ blockRequisition: false, blockPurchase: true }),
    ).toBe(ProductBlockState.PARTIAL);
    expect(
      blockStateFromScope({ blockRequisition: true, blockPurchase: true }),
    ).toBe(ProductBlockState.TOTAL);
    expect(
      blockStateFromScope({ blockRequisition: false, blockPurchase: false }),
    ).toBe(ProductBlockState.NONE);
  });

  it('usa as flags gravadas quando existem', () => {
    expect(
      blockScopeOf({
        type: RequestType.BLOQUEIO,
        blockRequisition: false,
        blockPurchase: true,
      }),
    ).toEqual({ blockRequisition: false, blockPurchase: true });
  });

  it('reconstrói o escopo de registros anteriores ao tipo unificado', () => {
    expect(blockScopeOf({ type: RequestType.BLOQUEIO_TOTAL })).toEqual({
      blockRequisition: true,
      blockPurchase: true,
    });
    expect(blockScopeOf({ type: RequestType.BLOQUEIO_PARCIAL })).toEqual({
      blockRequisition: true,
      blockPurchase: false,
    });
    expect(blockScopeOf({ type: RequestType.ALTERACAO })).toEqual({
      blockRequisition: false,
      blockPurchase: false,
    });
  });

  it('rotula o escopo para timeline e mensagens', () => {
    expect(
      blockScopeLabel({ blockRequisition: true, blockPurchase: true }),
    ).toBe('Requisição e compras (total)');
    expect(
      blockScopeLabel({ blockRequisition: true, blockPurchase: false }),
    ).toBe('Requisição (parcial)');
    expect(
      blockScopeLabel({ blockRequisition: false, blockPurchase: true }),
    ).toBe('Compras (parcial)');
  });
});
