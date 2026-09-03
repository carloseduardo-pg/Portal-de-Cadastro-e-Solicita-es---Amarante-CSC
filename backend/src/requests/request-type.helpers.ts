import { ProductBlockState, RequestType } from '@prisma/client';

/** Solicitação sobre produto já existente na base (alteração ou bloqueio). */
export function isExistingProductRequestType(type: RequestType): boolean {
  return type === RequestType.ALTERACAO || isBlockRequestType(type);
}

/** Solicitação de bloqueio na base (tipo unificado + histórico parcial/total). */
export function isBlockRequestType(type: RequestType): boolean {
  return (
    type === RequestType.BLOQUEIO ||
    type === RequestType.BLOQUEIO_PARCIAL ||
    type === RequestType.BLOQUEIO_TOTAL
  );
}

/** Escopo do bloqueio pedido: requisição e/ou compras. */
export type BlockScopeFlags = {
  blockRequisition: boolean;
  blockPurchase: boolean;
};

/**
 * Escopo efetivo de uma solicitação de bloqueio.
 * Tipos históricos (`BLOQUEIO_PARCIAL` / `BLOQUEIO_TOTAL`) não gravavam canal —
 * total cobre os dois; parcial cai em requisição.
 */
export function blockScopeOf(request: {
  type: RequestType;
  blockRequisition?: boolean;
  blockPurchase?: boolean;
}): BlockScopeFlags {
  if (request.blockRequisition || request.blockPurchase) {
    return {
      blockRequisition: Boolean(request.blockRequisition),
      blockPurchase: Boolean(request.blockPurchase),
    };
  }
  if (request.type === RequestType.BLOQUEIO_TOTAL) {
    return { blockRequisition: true, blockPurchase: true };
  }
  if (request.type === RequestType.BLOQUEIO_PARCIAL) {
    return { blockRequisition: true, blockPurchase: false };
  }
  return { blockRequisition: false, blockPurchase: false };
}

/** Ambos os canais ⇒ total; apenas um ⇒ parcial; nenhum ⇒ sem bloqueio. */
export function blockStateFromScope(scope: BlockScopeFlags): ProductBlockState {
  if (scope.blockRequisition && scope.blockPurchase) {
    return ProductBlockState.TOTAL;
  }
  if (scope.blockRequisition || scope.blockPurchase) {
    return ProductBlockState.PARTIAL;
  }
  return ProductBlockState.NONE;
}

/** Rótulo de negócio do escopo — usado em mensagens e timeline. */
export function blockScopeLabel(scope: BlockScopeFlags): string {
  if (scope.blockRequisition && scope.blockPurchase) {
    return 'Requisição e compras (total)';
  }
  if (scope.blockRequisition) return 'Requisição (parcial)';
  if (scope.blockPurchase) return 'Compras (parcial)';
  return 'Sem escopo definido';
}
