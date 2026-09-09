import {
  mapActiveViewers,
  presenceCutoff,
  REQUEST_PRESENCE_TTL_MS,
  resolvePresenceEditor,
} from './request-presence';

describe('request-presence', () => {
  it('cuts off viewers older than the TTL', () => {
    const now = new Date('2026-09-04T16:00:00.000Z');
    expect(presenceCutoff(now).toISOString()).toBe(
      new Date(now.getTime() - REQUEST_PRESENCE_TTL_MS).toISOString(),
    );
  });

  it('maps Prisma rows to public viewers', () => {
    const lastSeenAt = new Date('2026-09-04T16:00:00.000Z');
    const joinedAt = new Date('2026-09-04T15:59:00.000Z');
    expect(
      mapActiveViewers([
        { user: { id: 'u1', name: 'Erika Fouchard' }, lastSeenAt, joinedAt },
      ]),
    ).toEqual([{ id: 'u1', name: 'Erika Fouchard', lastSeenAt, joinedAt }]);
  });

  it('picks the earliest joinedAt as editor', () => {
    const early = new Date('2026-09-04T15:00:00.000Z');
    const late = new Date('2026-09-04T15:01:00.000Z');
    const editor = resolvePresenceEditor([
      {
        user: { id: 'admin', name: 'Administrador CSC' },
        lastSeenAt: late,
        joinedAt: late,
      },
      {
        user: { id: 'erika', name: 'Erika Fouchard' },
        lastSeenAt: late,
        joinedAt: early,
      },
    ]);
    expect(editor?.id).toBe('erika');
    expect(editor?.name).toBe('Erika Fouchard');
  });
});
