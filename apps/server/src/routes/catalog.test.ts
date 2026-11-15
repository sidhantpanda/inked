import { describe, expect, it } from 'vitest';
import {
  SPORTS_PREVIEW_PRESETS,
  WIDGET_IDS,
  WIDGET_LAYOUT_VARIANTS,
  WIDGET_PREVIEW_DIMENSIONS
} from '@inked/commons';

import { type CatalogResponse, testApp } from '../testing/test-app.js';

describe('Catalog API', () => {
  it('returns the shared layout and widget catalog', async () => {
    const app = await testApp();
    const response = await app.inject({ method: 'GET', url: '/api/catalog' });
    const catalog = response.json<CatalogResponse>();
    expect(response.statusCode).toBe(200);
    expect(catalog.layouts).toHaveLength(10);
    expect(catalog.widgets).toHaveLength(6);
    expect(Object.keys(catalog.widgetSizes)).toEqual(['small', 'wide', 'tall', 'large', 'full']);
    expect(catalog.widgetPreviewDimensions).toEqual(WIDGET_PREVIEW_DIMENSIONS);
    expect(catalog.widgetLayoutVariants).toEqual(WIDGET_LAYOUT_VARIANTS);
    expect(catalog.minimumWidgetFontSize).toBe(14);
    expect(catalog.widgets[0]?.variants.small).toBeDefined();
    expect(catalog.widgets[0]?.variants.full).toBeDefined();
    expect(catalog.widgets[0]?.refresh.reason).not.toBe('');
    await app.close();
  });

  it('renders every widget in every layout-derived geometry at its native dimensions', async () => {
    const app = await testApp();

    for (const widgetId of WIDGET_IDS) {
      for (const variant of WIDGET_LAYOUT_VARIANTS) {
        const response = await app.inject({
          method: 'GET',
          url: `/api/widgets/${widgetId}/${variant.id}/preview`
        });
        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('image/png');
        expect(response.headers['cache-control']).toBe('no-store');
        expect(response.rawPayload.readUInt32BE(16)).toBe(variant.width);
        expect(response.rawPayload.readUInt32BE(20)).toBe(variant.height);
      }
    }

    const missing = await app.inject({
      method: 'GET',
      url: '/api/widgets/not-a-widget/small-186x220/preview'
    });
    expect(missing.statusCode).toBe(404);
    const missingVariant = await app.inject({
      method: 'GET',
      url: '/api/widgets/weather/wide-999x999/preview'
    });
    expect(missingVariant.statusCode).toBe(404);
    await app.close();
  }, 30_000);

  it('renders each configured sports gallery preset', async () => {
    const app = await testApp();
    const variant = WIDGET_LAYOUT_VARIANTS.find((candidate) => candidate.size === 'tall')!;

    for (const preset of SPORTS_PREVIEW_PRESETS) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/widgets/scores/${variant.id}/preview?preset=${preset.id}`
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('image/png');
      expect(response.rawPayload.readUInt32BE(16)).toBe(variant.width);
      expect(response.rawPayload.readUInt32BE(20)).toBe(variant.height);
    }

    const missing = await app.inject({
      method: 'GET',
      url: `/api/widgets/scores/${variant.id}/preview?preset=quidditch`
    });
    expect(missing.statusCode).toBe(404);
    await app.close();
  });
});
