import { mapActiveViewers, presenceCutoff, REQUEST_PRESENCE_TTL_MS } from './request-presence';

describe('request-presence', () => {
  it('cuts off viewers older than the TTL', () => {
    const now = new Date('2026-09-04T16:00:00.000Z');
    expect(presenceCutoff(now).toISOString()).toBe(
      new Date(now.getTime() - REQUEST_PRESENCE_TTL_MS).toISOString(),
    );
  });

  it('maps Prisma rows to public viewers', () => {
    const lastSeenAt = new Date('2026-09-04T16:00:00.000Z');
    expect(
      mapActiveViewers([
        { user: { id: 'u1', name: 'Erika Fouchard' }, lastSeenAt },
      ]),
    ).toEqual([{ id: 'u1', name: 'Erika Fouchard', lastSeenAt }]);
  });
});
