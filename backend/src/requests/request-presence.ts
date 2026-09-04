/** Janela em que um heartbeat ainda conta como “visualizando”. */
export const REQUEST_PRESENCE_TTL_MS = 45_000;

export type RequestViewerPublic = {
  id: string;
  name: string;
  lastSeenAt: Date;
};

/** Limite inferior de lastSeenAt para considerar o viewer ativo. */
export function presenceCutoff(now = new Date()): Date {
  return new Date(now.getTime() - REQUEST_PRESENCE_TTL_MS);
}

/** Converte linhas Prisma de presença no payload público. */
export function mapActiveViewers(
  rows: { user: { id: string; name: string }; lastSeenAt: Date }[],
): RequestViewerPublic[] {
  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name,
    lastSeenAt: row.lastSeenAt,
  }));
}
