import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';
import { createDefaultDashboard, defaultAssignments, type PaintResponse } from '@inked/commons';

import { buildApp } from '../app.js';
import { MemoryDashboardConfigStore } from '../config-store.js';
import { DemoDashboardDataProvider } from '../data.js';
import { FakeWeatherService } from '../testing/fake-weather.js';
import { testApp } from '../testing/test-app.js';

describe('Rendering API', () => {
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
      dataProvider: new DemoDashboardDataProvider(new FakeWeatherService()),
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
      dataProvider: new DemoDashboardDataProvider(new FakeWeatherService()),
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
      dataProvider: new DemoDashboardDataProvider(new FakeWeatherService()),
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
      dataProvider: new DemoDashboardDataProvider(new FakeWeatherService()),
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
