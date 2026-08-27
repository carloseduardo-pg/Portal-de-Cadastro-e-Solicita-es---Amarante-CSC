import { RequestType } from '@prisma/client';

/** Solicitação sobre produto já existente na base (alteração ou bloqueio). */
export function isExistingProductRequestType(type: RequestType): boolean {
  return (
    type === RequestType.ALTERACAO ||
    type === RequestType.BLOQUEIO_PARCIAL ||
    type === RequestType.BLOQUEIO_TOTAL
  );
}

/** Solicitação de bloqueio na base. */
export function isBlockRequestType(type: RequestType): boolean {
  return type === RequestType.BLOQUEIO_PARCIAL || type === RequestType.BLOQUEIO_TOTAL;
}
