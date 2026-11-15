import { createHash } from 'node:crypto';

import type { FastifyInstance } from 'fastify';
import { type DashboardConfig, parseDashboardConfig } from '@inked/commons';

import { renderFontTest } from '../font-test.js';
import { renderDashboard, renderDashboardAssets, type RenderFormat } from '../render.js';
import type { AppServices } from './context.js';

interface PaintRequestBody {
  config?: DashboardConfig;
  renderToken?: string;
}

/** Rendering the display as PNG or BMP, exact previews, and painting the PhotoPainter. */
export function registerRenderingRoutes(
  app: FastifyInstance,
  { store, dataProvider, photoPainter, previews }: AppServices
) {
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
      const renderToken = previews.remember(assets.bmp);
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
      const bmp = previews.get(request.params.renderToken);
      if (!bmp) return reply.code(404).send({ error: 'Preview expired. Render it again.' });
      return reply.header('cache-control', 'no-store').type('image/bmp').send(bmp);
    }
  );

  app.post<{ Body: DashboardConfig | PaintRequestBody }>('/api/paint', async (request, reply) => {
    try {
      const body = request.body as PaintRequestBody | undefined;
      let bmp: Buffer;
      if (body?.renderToken) {
        const previewBmp = previews.get(body.renderToken);
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
}
