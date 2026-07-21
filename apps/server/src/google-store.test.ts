import { describe, expect, it } from 'vitest';

import { openInkedDatabase } from './db.js';
import { SqliteGoogleAccountStore } from './google-store.js';

const account = {
  id: 'user-1',
  email: 'a@example.com',
  refreshToken: 'refresh-1',
  accessToken: 'access-1',
  accessTokenExpiry: '2026-07-21T10:00:00.000Z',
  scope: 'calendar.readonly'
};

describe('SqliteGoogleAccountStore', () => {
  it('upserts, reads, refreshes tokens, and removes accounts', async () => {
    const store = new SqliteGoogleAccountStore(openInkedDatabase(':memory:'));

    await store.upsert(account);
    expect(await store.list()).toHaveLength(1);
    expect(await store.get('user-1')).toMatchObject({ email: 'a@example.com' });

    await store.updateTokens('user-1', 'access-2', '2026-07-21T11:00:00.000Z');
    expect((await store.get('user-1'))?.accessToken).toBe('access-2');

    // Upsert keeps the same row (same id).
    await store.upsert({ ...account, email: 'renamed@example.com' });
    expect(await store.list()).toHaveLength(1);
    expect((await store.get('user-1'))?.email).toBe('renamed@example.com');

    await store.remove('user-1');
    expect(await store.list()).toHaveLength(0);
  });
});
