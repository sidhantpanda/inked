import { createHash } from 'node:crypto';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(import.meta.dirname, '../../../.env') });
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import {
  DEFAULT_WIDGET_SETTINGS,
  LAYOUTS,
  MIN_WIDGET_FONT_SIZE,
  WIDGETS,
  WIDGET_HAS_SETTINGS,
  WIDGET_IDS,
  WIDGET_LAYOUT_VARIANTS,
  WIDGET_PREVIEW_DIMENSIONS,
  WIDGET_SIZE_DEFINITIONS,
  buildDashboardRefreshPlan,
  createDefaultDashboard,
  parseDashboardConfig,
  type DashboardConfig
} from '@inked/commons';

import { MemoryDashboardConfigStore, type DashboardConfigStore } from './config-store.js';
import { DemoDashboardDataProvider, type DashboardDataProvider } from './data.js';
import { renderFontTest } from './font-test.js';
import { PhotoPainterClient, type PhotoPainter } from './photo-painter.js';
import { OpenMeteoWeatherService, type WeatherService } from './widget-data/index.js';
import {
  ensureMeteocons,
  renderDashboard,
  renderDashboardAssets,
  renderWidgetPreview,
  type RenderFormat
} from './render.js';

const PREVIEW_CACHE_LIMIT = 20;

interface PaintRequestBody {
  config?: DashboardConfig;
  renderToken?: string;
}

export interface BuildAppOptions {
  store?: DashboardConfigStore;
  dataProvider?: DashboardDataProvider;
  photoPainter?: PhotoPainter;
  weatherService?: WeatherService;
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 1_000_000 });
  const store = options.store ?? new MemoryDashboardConfigStore();
  const weatherService = options.weatherService ?? new OpenMeteoWeatherService();
  const dataProvider = options.dataProvider ?? new DemoDashboardDataProvider(weatherService);
  const photoPainter = options.photoPainter ?? new PhotoPainterClient();
  const previewBmps = new Map<string, Buffer>();
  await ensureMeteocons();
  await app.register(cors, { origin: true });

  function rememberPreview(bmp: Buffer) {
    const token = createHash('sha256').update(bmp).digest('hex');
    previewBmps.delete(token);
    previewBmps.set(token, bmp);
    while (previewBmps.size > PREVIEW_CACHE_LIMIT) {
      const oldestToken = previewBmps.keys().next().value;
      if (oldestToken) previewBmps.delete(oldestToken);
    }
    return token;
  }

  app.get('/health', async () => ({ status: 'ok' }));
  app.get('/api/catalog', async () => ({
    layouts: LAYOUTS,
    widgets: WIDGETS,
    widgetSizes: WIDGET_SIZE_DEFINITIONS,
    widgetPreviewDimensions: WIDGET_PREVIEW_DIMENSIONS,
    widgetLayoutVariants: WIDGET_LAYOUT_VARIANTS,
    widgetHasSettings: WIDGET_HAS_SETTINGS,
    defaultWidgetSettings: DEFAULT_WIDGET_SETTINGS,
    minimumWidgetFontSize: MIN_WIDGET_FONT_SIZE
  }));

  app.get('/api/dashboard', async () => {
    const config = await store.get();
    return {
      config,
      data: await dataProvider.getData(),
      refreshPlan: buildDashboardRefreshPlan(config, WIDGETS)
    };
  });

  app.get<{ Querystring: { q?: string; count?: string } }>(
    '/api/geocode',
    async (request, reply) => {
      const query = (request.query.q ?? '').trim();
      if (!query) return { results: [] };
      const count = Math.min(Math.max(Number(request.query.count) || 6, 1), 10);
      try {
        const results = await weatherService.geocode(query, count);
        return { results };
      } catch (error) {
        request.log.error(error);
        return reply.code(502).send({ error: 'Could not reach the geocoding service.' });
      }
    }
  );

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

  app.get<{ Params: { widgetId: string; variantId: string } }>(
    '/api/widgets/:widgetId/:variantId/preview',
    async (request, reply) => {
      const widgetId = WIDGET_IDS.find((candidate) => candidate === request.params.widgetId);
      const variant = WIDGET_LAYOUT_VARIANTS.find(
        (candidate) => candidate.id === request.params.variantId
      );
      if (!widgetId || !variant) {
        return reply.code(404).send({ error: 'Unknown widget preview.' });
      }

      const config = await store.get();
      const image = renderWidgetPreview(
        widgetId,
        variant,
        await dataProvider.getData(),
        config.theme
      );
      return reply.header('cache-control', 'no-store').type('image/png').send(image);
    }
  );

  app.get<{ Querystring: { format?: RenderFormat } }>(
    '/api/font-test/render',
    async (request, reply) => {
      const format = request.query.format === 'bmp' ? 'bmp' : 'png';
      const image = await renderFontTest(format);
      return reply.type(format === 'bmp' ? 'image/bmp' : 'image/png').send(image);
    }
  );

  app.post('/api/font-test/paint', async (request, reply) => {
    try {
      const bmp = await renderFontTest('bmp');
      const response = await photoPainter.paint(bmp, 'inked-font-test.bmp');
      return {
        bytes: bmp.length,
        hash: createHash('sha256').update(bmp).digest('hex'),
        ...response
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  app.put('/api/dashboard', async (request, reply) => {
    try {
      const config = await store.set(parseDashboardConfig(request.body));
      return { config, refreshPlan: buildDashboardRefreshPlan(config, WIDGETS) };
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  app.post<{ Querystring: { format?: RenderFormat }; Body: DashboardConfig }>(
    '/api/render',
    async (request, reply) => {
      try {
        const format = request.query.format === 'bmp' ? 'bmp' : 'png';
        const config = parseDashboardConfig(request.body ?? (await store.get()));
        const slots = await dataProvider.resolveSlots(config);
        const image = await renderDashboard(config, slots, format);
        return reply.type(format === 'bmp' ? 'image/bmp' : 'image/png').send(image);
      } catch (error) {
        return reply.code(400).send({ error: (error as Error).message });
      }
    }
  );

  app.post<{ Body: DashboardConfig }>('/api/preview', async (request, reply) => {
    try {
      const config = parseDashboardConfig(request.body ?? (await store.get()));
      const slots = await dataProvider.resolveSlots(config);
      const assets = await renderDashboardAssets(config, slots);
      const renderToken = rememberPreview(assets.bmp);
      return reply
        .header('cache-control', 'no-store')
        .header('x-inked-render-token', renderToken)
        .type('image/png')
        .send(assets.png);
    } catch (error) {
      return reply.code(400).send({ error: (error as Error).message });
    }
  });

  app.get<{ Params: { renderToken: string } }>(
    '/api/preview/:renderToken/bmp',
    async (request, reply) => {
      const bmp = previewBmps.get(request.params.renderToken);
      if (!bmp) return reply.code(404).send({ error: 'Preview expired. Render it again.' });
      return reply.header('cache-control', 'no-store').type('image/bmp').send(bmp);
    }
  );

  app.post<{ Body: DashboardConfig | PaintRequestBody }>('/api/paint', async (request, reply) => {
    try {
      const body = request.body as PaintRequestBody | undefined;
      let bmp: Buffer;
      if (body?.renderToken) {
        const previewBmp = previewBmps.get(body.renderToken);
        if (!previewBmp) {
          return reply.code(409).send({ error: 'Preview expired. Wait for it to render again.' });
        }
        bmp = previewBmp;
      } else {
        const configInput = body?.config ?? request.body ?? (await store.get());
        const config = parseDashboardConfig(configInput);
        const slots = await dataProvider.resolveSlots(config);
        bmp = await renderDashboard(config, slots, 'bmp');
      }
      const response = await photoPainter.paint(bmp);
      return {
        bytes: bmp.length,
        hash: createHash('sha256').update(bmp).digest('hex'),
        ...response
      };
    } catch (error) {
      request.log.error(error);
      return reply.code(502).send({ error: (error as Error).message });
    }
  });

  return app;
}
