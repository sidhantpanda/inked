import { describe, expect, it } from 'vitest';

import { createDefaultDashboard } from '@inked/commons';

import { openInkedDatabase } from './db.js';
import { SqliteDashboardConfigStore } from './sqlite-store.js';

describe('SqliteDashboardConfigStore', () => {
  it('seeds, persists, and switches compositions in SQLite', async () => {
    const store = new SqliteDashboardConfigStore(openInkedDatabase(':memory:'));

    const seeded = await store.list();
    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.active).toBe(true);

    await store.set({
      ...createDefaultDashboard(),
      id: 'wall',
      name: 'Studio wall',
      assignments: [
        { slotId: 'feature', widgetId: 'weather', settings: { location: 'Porto' } } as never
      ]
    });

    expect((await store.get()).id).toBe('wall');
    const stored = await store.getById('wall');
    expect(stored?.assignments[0]).toMatchObject({
      widgetId: 'weather',
      settings: { location: 'Porto' }
    });

    await store.activate('home-display');
    expect((await store.get()).id).toBe('home-display');

    await store.remove('wall');
    expect(await store.list()).toHaveLength(1);
    await expect(store.remove('home-display')).rejects.toThrow('only dashboard');
  });
});
