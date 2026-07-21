import { describe, expect, it } from 'vitest';

import { createDefaultDashboard } from '@inked/commons';

import { MemoryDashboardConfigStore } from './config-store.js';

describe('MemoryDashboardConfigStore', () => {
  it('seeds a single active default dashboard', async () => {
    const store = new MemoryDashboardConfigStore();
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.active).toBe(true);
    expect((await store.get()).id).toBe(list[0]?.id);
  });

  it('upserts compositions and switches the active one', async () => {
    const store = new MemoryDashboardConfigStore();
    const second = await store.set({
      ...createDefaultDashboard(),
      id: 'second',
      name: 'Studio wall'
    });

    expect(second.name).toBe('Studio wall');
    expect((await store.get()).id).toBe('second');
    expect(await store.list()).toHaveLength(2);

    const activated = await store.activate('home-display');
    expect(activated.id).toBe('home-display');
    expect((await store.get()).id).toBe('home-display');
  });

  it('refuses to delete the last composition and reassigns active on delete', async () => {
    const store = new MemoryDashboardConfigStore();
    await store.set({ ...createDefaultDashboard(), id: 'second', name: 'Second' });

    // 'second' is active after set; deleting it should fall back to the other.
    const remaining = await store.remove('second');
    expect(remaining.id).toBe('home-display');
    expect(await store.list()).toHaveLength(1);

    await expect(store.remove('home-display')).rejects.toThrow('only dashboard');
    await expect(store.activate('missing')).rejects.toThrow('Unknown dashboard');
  });
});
