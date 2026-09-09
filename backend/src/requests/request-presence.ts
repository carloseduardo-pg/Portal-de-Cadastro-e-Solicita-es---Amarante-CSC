/** Janela em que um heartbeat ainda conta como “visualizando”. */
export const REQUEST_PRESENCE_TTL_MS = 45_000;

export type RequestViewerPublic = {
  id: string;
  name: string;
  lastSeenAt: Date;
  joinedAt?: Date;
};

/** Limite inferior de lastSeenAt para considerar o viewer ativo. */
export function presenceCutoff(now = new Date()): Date {
  return new Date(now.getTime() - REQUEST_PRESENCE_TTL_MS);
}

/** Converte linhas Prisma de presença no payload público. */
export function mapActiveViewers(
  rows: {
    user: { id: string; name: string };
    lastSeenAt: Date;
    joinedAt?: Date;
  }[],
): RequestViewerPublic[] {
  return rows.map((row) => ({
    id: row.user.id,
    name: row.user.name,
    lastSeenAt: row.lastSeenAt,
    ...(row.joinedAt ? { joinedAt: row.joinedAt } : {}),
  }));
}

/**
 * Editor = quem chegou primeiro entre os ativos (menor joinedAt).
 * Empate: menor userId.
 */
export function resolvePresenceEditor(
  rows: {
    user: { id: string; name: string };
    lastSeenAt: Date;
    joinedAt: Date;
  }[],
): RequestViewerPublic | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const byJoin = a.joinedAt.getTime() - b.joinedAt.getTime();
    if (byJoin !== 0) return byJoin;
    return a.user.id.localeCompare(b.user.id);
  });
  const first = sorted[0];
  return {
    id: first.user.id,
    name: first.user.name,
    lastSeenAt: first.lastSeenAt,
    joinedAt: first.joinedAt,
  };
}
