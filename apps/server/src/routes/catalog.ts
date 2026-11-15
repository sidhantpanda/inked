import type { FastifyInstance } from 'fastify';
import {
  DEFAULT_WIDGET_SETTINGS,
  isSportsPreviewPresetId,
  LAYOUTS,
  MIN_WIDGET_FONT_SIZE,
  WIDGET_HAS_SETTINGS,
  WIDGET_IDS,
  WIDGET_LAYOUT_VARIANTS,
  WIDGET_PREVIEW_DIMENSIONS,
  WIDGET_SIZE_DEFINITIONS,
  WIDGETS
} from '@inked/commons';

import { renderWidgetPreview } from '../render.js';
import { createSportsPreviewInput } from '../widget-data/sports-preview.js';
import type { AppServices } from './context.js';

/** Health, the shared layout and widget catalog, and native widget gallery previews. */
export function registerCatalogRoutes(app: FastifyInstance, { store, dataProvider }: AppServices) {
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

  app.get<{
    Params: { widgetId: string; variantId: string };
    Querystring: { preset?: string };
  }>('/api/widgets/:widgetId/:variantId/preview', async (request, reply) => {
    const widgetId = WIDGET_IDS.find((candidate) => candidate === request.params.widgetId);
    const variant = WIDGET_LAYOUT_VARIANTS.find(
      (candidate) => candidate.id === request.params.variantId
    );
    if (!widgetId || !variant) {
      return reply.code(404).send({ error: 'Unknown widget preview.' });
    }
    if (
      widgetId === 'scores' &&
      request.query.preset !== undefined &&
      !isSportsPreviewPresetId(request.query.preset)
    ) {
      return reply.code(404).send({ error: 'Unknown sports preview preset.' });
    }

    const config = await store.get();
    const data = await dataProvider.getData();
    const previewData =
      widgetId === 'scores' && isSportsPreviewPresetId(request.query.preset)
        ? {
            ...data,
            scores: createSportsPreviewInput(request.query.preset, new Date(), data.scores.timezone)
          }
        : data;
    const image = renderWidgetPreview(widgetId, variant, previewData, config.theme);
    return reply.header('cache-control', 'no-store').type('image/png').send(image);
  });
}
