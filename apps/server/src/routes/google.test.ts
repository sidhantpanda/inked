import { describe, expect, it } from 'vitest';

import { testApp } from '../testing/test-app.js';

describe('Google API', () => {
  it('exposes Google account and calendar management', async () => {
    const app = await testApp();

    const status = await app.inject({ method: 'GET', url: '/api/google/status' });
    expect(status.json<{ configured: boolean }>().configured).toBe(true);

    const accounts = await app.inject({ method: 'GET', url: '/api/google/accounts' });
    const accountList = accounts.json<{ accounts: { id: string; email: string }[] }>().accounts;
    expect(accountList[0]).toMatchObject({ id: 'acc-1', email: 'home@example.com' });

    const calendars = await app.inject({
      method: 'GET',
      url: '/api/google/accounts/acc-1/calendars'
    });
    const calendarList = calendars.json<{ calendars: { id: string; primary: boolean }[] }>()
      .calendars;
    expect(calendarList.find((calendar) => calendar.primary)?.id).toBe('primary');

    const removed = await app.inject({ method: 'DELETE', url: '/api/google/accounts/acc-1' });
    expect(removed.json<{ accounts: unknown[] }>().accounts).toHaveLength(0);
    await app.close();
  });
});
