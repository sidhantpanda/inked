import { beforeAll, describe, expect, it } from 'vitest';
import { Jimp } from 'jimp';

import {
  LAYOUTS,
  WIDGET_LAYOUT_VARIANTS,
  createAssignment,
  createDefaultDashboard,
  defaultAssignments
} from '@inked/commons';

import { DemoDashboardDataProvider } from './data.js';
import {
  WIDGET_TYPOGRAPHY,
  ensureMeteocons,
  renderDashboard,
  renderDashboardAssets,
  renderWidgetPreview
} from './render.js';
import { FakeWeatherService } from './testing/fake-weather.js';

describe('dashboard layout rendering', () => {
  const dataProvider = new DemoDashboardDataProvider(new FakeWeatherService());

  // Weather icons must be loaded so the sync gallery preview matches the async
  // dashboard render in the pixel-equivalence test below.
  beforeAll(async () => {
    await ensureMeteocons();
  });

  it('uses the same bundled font aliases as the React widgets', () => {
    expect(WIDGET_TYPOGRAPHY.sans).toBe('"Inked Sans"');
    expect(WIDGET_TYPOGRAPHY.serif).toBe('"Inked Serif"');
    expect(WIDGET_TYPOGRAPHY.dateLetterSpacingEm).toBe(-0.07);
    expect(WIDGET_TYPOGRAPHY.messageLetterSpacingEm).toBe(-0.035);
  });

  it.each(LAYOUTS)('renders $name to an 800x480 PNG', async (layout) => {
    const config = {
      ...createDefaultDashboard(),
      layoutId: layout.id,
      assignments: defaultAssignments(layout.id)
    };
    const png = await renderDashboard(config, await dataProvider.resolveSlots(config), 'png');

    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(800);
    expect(png.readUInt32BE(20)).toBe(480);
  });

  it('keeps a date-only dashboard byte-stable throughout the same day', async () => {
    const config = {
      ...createDefaultDashboard(),
      layoutId: 'broadcast',
      assignments: [
        createAssignment('headline', 'clock'),
        createAssignment('lower-left', 'clock'),
        createAssignment('lower-right', 'clock')
      ]
    };
    const morning = await dataProvider.resolveSlots(config, new Date('2026-07-14T08:00:00.000Z'));
    const evening = await dataProvider.resolveSlots(config, new Date('2026-07-14T20:00:00.000Z'));

    expect(await renderDashboard(config, morning, 'png')).toEqual(
      await renderDashboard(config, evening, 'png')
    );
  });

  it('provides enough data for the largest widget variants', async () => {
    const data = await dataProvider.getData(new Date('2026-07-14T12:00:00.000Z'));

    expect(data.weather.forecast).toHaveLength(7);
    expect(data.calendar.events).toHaveLength(5);
    expect(data.scores.events).toHaveLength(4);
  });

  it('keeps every preview PNG pixel identical to its PhotoPainter BMP counterpart', async () => {
    const config = {
      ...createDefaultDashboard(),
      layoutId: 'command-five',
      assignments: defaultAssignments('command-five')
    };
    const assets = await renderDashboardAssets(config, await dataProvider.resolveSlots(config));
    const [preview, painter] = await Promise.all([Jimp.read(assets.png), Jimp.read(assets.bmp)]);

    expect(painter.width).toBe(preview.width);
    expect(painter.height).toBe(preview.height);
    expect(painter.bitmap.data).toEqual(preview.bitmap.data);
  }, 15_000);

  it('renders a composed Bento weather rail pixel-equivalent to its gallery preview', async () => {
    const config = {
      ...createDefaultDashboard(),
      layoutId: 'bento-eight',
      assignments: [createAssignment('bento-tall-1', 'weather')]
    };
    const data = await dataProvider.getData();
    const variant = WIDGET_LAYOUT_VARIANTS.find((candidate) => candidate.id === 'tall-186x220');
    if (!variant) throw new Error('Missing Bento tall widget variant');

    const [dashboard, gallery] = await Promise.all([
      Jimp.read(await renderDashboard(config, await dataProvider.resolveSlots(config), 'png')),
      Jimp.read(renderWidgetPreview('weather', variant, data, config.theme))
    ]);
    const composedSlot = dashboard.clone().crop({ x: 404, y: 16, w: 186, h: 220 });
    let differingPixels = 0;
    let maxChannelDelta = 0;
    for (let offset = 0; offset < composedSlot.bitmap.data.length; offset += 4) {
      const channelDelta = Math.max(
        Math.abs(composedSlot.bitmap.data[offset]! - gallery.bitmap.data[offset]!),
        Math.abs(composedSlot.bitmap.data[offset + 1]! - gallery.bitmap.data[offset + 1]!),
        Math.abs(composedSlot.bitmap.data[offset + 2]! - gallery.bitmap.data[offset + 2]!)
      );
      if (channelDelta > 0) differingPixels += 1;
      maxChannelDelta = Math.max(maxChannelDelta, channelDelta);
    }

    expect(differingPixels).toBeLessThan(20);
    expect(maxChannelDelta).toBeLessThanOrEqual(8);
  });
});
