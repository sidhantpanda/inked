import { describe, expect, it } from 'vitest';
import { createDefaultDashboard, type DashboardRefreshPlan } from '@inked/commons';

import { testApp } from '../testing/test-app.js';

describe('Dashboards API', () => {
  it('manages multiple saved compositions', async () => {
    const app = await testApp();

    const initial = (await app.inject({ method: 'GET', url: '/api/dashboards' })).json<{
      dashboards: { id: string; active: boolean }[];
    }>();
    expect(initial.dashboards).toHaveLength(1);

    const created = await app.inject({
      method: 'POST',
      url: '/api/dashboards',
      payload: { name: 'Studio wall' }
    });
    expect(created.statusCode).toBe(201);
    const createdBody = created.json<{
      config: { id: string; name: string };
      dashboards: { id: string; active: boolean }[];
    }>();
    expect(createdBody.config.name).toBe('Studio wall');
    expect(createdBody.dashboards).toHaveLength(2);
    expect(createdBody.dashboards.find((item) => item.active)?.id).toBe(createdBody.config.id);

    const activate = await app.inject({
      method: 'POST',
      url: '/api/dashboards/home-display/activate'
    });
    expect(activate.statusCode).toBe(200);
    expect(activate.json<{ config: { id: string } }>().config.id).toBe('home-display');

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/dashboards/${createdBody.config.id}`
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json<{ dashboards: unknown[] }>().dashboards).toHaveLength(1);

    const missing = await app.inject({
      method: 'POST',
      url: '/api/dashboards/nope/activate'
    });
    expect(missing.statusCode).toBe(404);
    await app.close();
  });

  it('persists per-slot widget settings through save and render', async () => {
    const app = await testApp();
    const config = {
      ...createDefaultDashboard(),
      layoutId: 'quad',
      assignments: [
        { slotId: 'north-west', widgetId: 'weather', settings: { location: 'Kyoto' } },
        { slotId: 'north-east', widgetId: 'weather', settings: { location: 'Oslo' } }
      ]
    };
    const saved = await app.inject({ method: 'PUT', url: '/api/dashboard', payload: config });
    expect(saved.statusCode).toBe(200);
    const savedConfig = saved.json<{
      config: { assignments: { slotId: string; settings: { location: string } }[] };
    }>().config;
    expect(
      savedConfig.assignments.find((item) => item.slotId === 'north-west')?.settings.location
    ).toBe('Kyoto');

    const render = await app.inject({
      method: 'POST',
      url: '/api/render?format=png',
      payload: config
    });
    expect(render.statusCode).toBe(200);
    expect(render.rawPayload.readUInt32BE(16)).toBe(800);
    await app.close();
  });

  it('exposes the saved dashboard refresh plan', async () => {
    const app = await testApp();
    const response = await app.inject({ method: 'GET', url: '/api/refresh-plan' });
    expect(response.statusCode).toBe(200);
    const plan = response.json<DashboardRefreshPlan>();
    expect(plan).toMatchObject({ intervalMinutes: 15, label: 'Every 15 min' });
    expect(plan.widgets.find((widget) => widget.widgetId === 'scores')).toMatchObject({
      widgetId: 'scores',
      label: '15 min',
      intervalMinutes: 15,
      policy: { mode: 'interval', everyMinutes: 15 }
    });
    await app.close();
  });
});
