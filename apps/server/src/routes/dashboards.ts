import type { FastifyInstance } from 'fastify';
import {
  buildDashboardRefreshPlan,
  createDefaultDashboard,
  type DashboardConfig,
  parseDashboardConfig,
  WIDGETS
} from '@inked/commons';

import type { AppServices } from './context.js';

/** Compositions: the active one with its refresh plan, plus listing, creating, switching, deleting, and saving. */
export function registerDashboardsRoutes(
  app: FastifyInstance,
  { store, dataProvider }: AppServices
) {
  app.get('/api/dashboard', async () => {
    const config = await store.get();
    return {
      config,
      data: await dataProvider.getData(),
      refreshPlan: buildDashboardRefreshPlan(config, WIDGETS)
    };
  });

  app.get('/api/dashboards', async () => ({ dashboards: await store.list() }));

  app.post('/api/dashboards', async (request, reply) => {
    try {
      const base =
        request.body && typeof request.body === 'object'
          ? (request.body as Partial<DashboardConfig>)
          : {};
      const template = createDefaultDashboard();
      const config = parseDashboardConfig({
        ...template,
        ...base,
        id: `dashboard-${Date.now().toString(36)}`,
        name: typeof base.name === 'string' && base.name.trim() ? base.name : 'New composition'
      });
      const saved = await store.set(config);
      return reply.code(201).send({ config: saved, dashboards: await store.list() });
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  app.post<{ Params: { id: string } }>('/api/dashboards/:id/activate', async (request, reply) => {
    try {
      const config = await store.activate(request.params.id);
      return { config, refreshPlan: buildDashboardRefreshPlan(config, WIDGETS) };
    } catch (error) {
      return reply.code(404).send({ error: (error as Error).message });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/dashboards/:id', async (request, reply) => {
    try {
      const config = await store.remove(request.params.id);
      return { config, dashboards: await store.list() };
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  app.get('/api/refresh-plan', async () => buildDashboardRefreshPlan(await store.get(), WIDGETS));

  app.put('/api/dashboard', async (request, reply) => {
    try {
      const config = await store.set(parseDashboardConfig(request.body));
      return { config, refreshPlan: buildDashboardRefreshPlan(config, WIDGETS) };
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });
}
