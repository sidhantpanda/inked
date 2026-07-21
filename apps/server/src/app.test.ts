import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  WIDGET_IDS,
  WIDGET_LAYOUT_VARIANTS,
  WIDGET_PREVIEW_DIMENSIONS,
  createDefaultDashboard,
  defaultAssignments,
  type DashboardRefreshPlan,
  type LayoutDefinition,
  type PaintResponse,
  type WidgetDefinition,
  type WidgetLayoutVariant,
  type WidgetPreviewDimensions,
  type WidgetSize,
  type WidgetSizeDefinition
} from '@inked/commons';

import { buildApp } from './app.js';
import { MemoryDashboardConfigStore } from './config-store.js';
import { DemoDashboardDataProvider } from './data.js';

interface CatalogResponse {
  layouts: LayoutDefinition[];
  widgets: WidgetDefinition[];
  widgetSizes: Record<WidgetSize, WidgetSizeDefinition>;
  widgetPreviewDimensions: Record<WidgetSize, WidgetPreviewDimensions>;
  widgetLayoutVariants: WidgetLayoutVariant[];
  minimumWidgetFontSize: number;
}

function testApp() {
  return buildApp({
    store: new MemoryDashboardConfigStore(),
    dataProvider: new DemoDashboardDataProvider(),
    photoPainter: {
      endpoint: 'https://example.test/paint',
      paint: vi.fn(async () => ({ message: 'accepted' }))
    }
  });
}

describe('Inked API', () => {
  it('returns the shared layout and widget catalog', async () => {
    const app = await testApp();
    const response = await app.inject({ method: 'GET', url: '/api/catalog' });
    const catalog = response.json<CatalogResponse>();
    expect(response.statusCode).toBe(200);
    expect(catalog.layouts).toHaveLength(10);
    expect(catalog.widgets).toHaveLength(5);
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
    expect(plan).toMatchObject({ intervalMinutes: 5, label: 'Every 5 min' });
    expect(plan.widgets.find((widget) => widget.widgetId === 'scores')).toMatchObject({
      widgetId: 'scores',
      label: '5 min',
      intervalMinutes: 5,
      policy: { mode: 'interval', everyMinutes: 5 }
    });
    await app.close();
  });

  it('renders an 800x480 BMP', async () => {
    const app = await testApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/render?format=bmp',
      payload: createDefaultDashboard()
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/bmp');
    expect(response.rawPayload.subarray(0, 2).toString('ascii')).toBe('BM');
    expect(response.rawPayload.readInt32LE(18)).toBe(800);
    expect(Math.abs(response.rawPayload.readInt32LE(22))).toBe(480);
    await app.close();
  });

  it('renders and paints the font calibration BMP', async () => {
    const paint = vi.fn(async (image: Buffer | Uint8Array, filename?: string) => {
      expect(Buffer.from(image).subarray(0, 2).toString('ascii')).toBe('BM');
      expect(filename).toBe('inked-font-test.bmp');
      return { message: 'font test accepted' };
    });
    const app = await buildApp({
      store: new MemoryDashboardConfigStore(),
      dataProvider: new DemoDashboardDataProvider(),
      photoPainter: { endpoint: 'https://example.test/paint', paint }
    });

    const renderResponse = await app.inject({
      method: 'GET',
      url: '/api/font-test/render?format=bmp'
    });
    expect(renderResponse.statusCode).toBe(200);
    expect(renderResponse.headers['content-type']).toContain('image/bmp');
    expect(renderResponse.rawPayload.readInt32LE(18)).toBe(800);
    expect(Math.abs(renderResponse.rawPayload.readInt32LE(22))).toBe(480);

    const paintResponse = await app.inject({ method: 'POST', url: '/api/font-test/paint' });
    expect(paintResponse.statusCode).toBe(200);
    expect(paintResponse.json<PaintResponse>().message).toBe('font test accepted');
    expect(paint).toHaveBeenCalledOnce();
    await app.close();
  });

  it('sends the generated BMP to Photo Painter only on explicit paint', async () => {
    const paint = vi.fn(async (image: Buffer | Uint8Array) => {
      expect(Buffer.from(image).subarray(0, 2).toString('ascii')).toBe('BM');
      return { message: 'accepted' };
    });
    const app = await buildApp({
      store: new MemoryDashboardConfigStore(),
      dataProvider: new DemoDashboardDataProvider(),
      photoPainter: { endpoint: 'https://example.test/paint', paint }
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/paint',
      payload: createDefaultDashboard()
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<PaintResponse>().message).toBe('accepted');
    expect(paint).toHaveBeenCalledOnce();
    await app.close();
  });

  it('paints the exact Command split BMP revision shown in the studio preview', async () => {
    let paintedBmp: Buffer | undefined;
    const paint = vi.fn(async (image: Buffer | Uint8Array) => {
      paintedBmp = Buffer.from(image);
      return { message: 'accepted' };
    });
    const app = await buildApp({
      store: new MemoryDashboardConfigStore(),
      dataProvider: new DemoDashboardDataProvider(),
      photoPainter: { endpoint: 'https://example.test/paint', paint }
    });
    const config = {
      ...createDefaultDashboard(),
      layoutId: 'command-five',
      assignments: defaultAssignments('command-five')
    };

    const previewResponse = await app.inject({
      method: 'POST',
      url: '/api/preview',
      payload: config
    });
    const renderTokenHeader = previewResponse.headers['x-inked-render-token'];
    expect(previewResponse.statusCode).toBe(200);
    expect(previewResponse.headers['content-type']).toContain('image/png');
    expect(previewResponse.rawPayload.readUInt32BE(16)).toBe(800);
    expect(previewResponse.rawPayload.readUInt32BE(20)).toBe(480);
    expect(renderTokenHeader).toMatch(/^[a-f0-9]{64}$/);
    if (typeof renderTokenHeader !== 'string') throw new Error('Missing render token');
    const renderToken = renderTokenHeader;

    const bmpResponse = await app.inject({
      method: 'GET',
      url: `/api/preview/${renderToken}/bmp`
    });
    expect(bmpResponse.statusCode).toBe(200);
    expect(createHash('sha256').update(bmpResponse.rawPayload).digest('hex')).toBe(renderToken);

    const paintResponse = await app.inject({
      method: 'POST',
      url: '/api/paint',
      payload: { renderToken }
    });
    expect(paintResponse.statusCode).toBe(200);
    expect(paintResponse.json<PaintResponse>().hash).toBe(renderToken);
    expect(paintedBmp).toEqual(bmpResponse.rawPayload);
    await app.close();
  }, 15_000);

  it('refuses to paint a preview revision that is no longer available', async () => {
    const paint = vi.fn(async () => ({ message: 'accepted' }));
    const app = await buildApp({
      store: new MemoryDashboardConfigStore(),
      dataProvider: new DemoDashboardDataProvider(),
      photoPainter: { endpoint: 'https://example.test/paint', paint }
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/paint',
      payload: { renderToken: 'missing-preview' }
    });

    expect(response.statusCode).toBe(409);
    expect(paint).not.toHaveBeenCalled();
    await app.close();
  });
});
