import { Prisma } from '@prisma/client';

/** Máximo de dígitos do código interno (sem zeros à esquerda). */
export const REQUEST_CODE_MAX_DIGITS = 10;

/**
 * Formata o código da solicitação: só dígitos, crescente, sem padding.
 * Ex.: 1, 2, 17, 100001 — nunca "000001".
 */
export function formatRequestCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('Sequência do código da solicitação inválida.');
  }
  const code = String(sequence);
  if (code.length > REQUEST_CODE_MAX_DIGITS) {
    throw new Error(
      `Código da solicitação excedeu o máximo de ${REQUEST_CODE_MAX_DIGITS} dígitos.`,
    );
  }
  return code;
}

/**
 * Próximo código interno da solicitação (número crescente gerado pelo sistema).
 */
export async function allocateRequestCode(db: {
  $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>;
}): Promise<string> {
  const rows = await db.$queryRaw<Array<{ n: bigint }>>(
    Prisma.sql`SELECT nextval('request_code_seq') AS n`,
  );
  const sequence = Number(rows[0]?.n ?? 0);
  return formatRequestCode(sequence);
}
