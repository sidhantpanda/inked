import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { Jimp } from 'jimp';
import {
  DISPLAY_GAP,
  DISPLAY_HEIGHT,
  DISPLAY_PADDING,
  DISPLAY_WIDTH,
  getLayout,
  type DashboardConfig,
  type DashboardData,
  type DashboardTheme,
  type LayoutSlot,
  type WidgetId,
  type WidgetInput,
  type WidgetInputMap,
  type WidgetLayoutVariant,
  type WidgetSize
} from '@inked/commons';

import { ensureMeteocons } from './meteocons.js';
import { getPalette } from './render/palette.js';
import { drawCard, drawEmptySlot, roundRect } from './render/primitives.js';
import type { CanvasWidgetRenderer, Palette, Rect } from './render/types.js';
import { drawCalendar } from './render/widgets/calendar/index.js';
import { drawDate } from './render/widgets/date/index.js';
import { drawMessage } from './render/widgets/message/index.js';
import { drawScores } from './render/widgets/sports/index.js';
import { drawStocks } from './render/widgets/stocks/index.js';
import { drawWeather } from './render/widgets/weather/index.js';

export { ensureMeteocons } from './meteocons.js';
export { WIDGET_TYPOGRAPHY } from './render/text.js';

export type RenderFormat = 'png' | 'bmp';

export interface DashboardRenderAssets {
  png: Buffer;
  bmp: Buffer;
}

type CanvasWidgetRendererRegistry = {
  [K in WidgetId]: CanvasWidgetRenderer<K>;
};

/** Adding a WidgetId requires a native renderer with its exact input type. */
export const WIDGET_RENDERERS = {
  clock: drawDate,
  weather: drawWeather,
  calendar: drawCalendar,
  scores: drawScores,
  stocks: drawStocks,
  message: drawMessage
} satisfies CanvasWidgetRendererRegistry;

/** One resolved widget input per assigned slot id. */
export type ResolvedSlotInputs = Record<string, WidgetInput>;

export async function renderDashboard(
  config: DashboardConfig,
  slots: ResolvedSlotInputs,
  format: RenderFormat = 'png'
): Promise<Buffer> {
  const assets = await renderDashboardAssets(config, slots);
  return assets[format];
}

/**
 * Produces both transport formats from one canvas. The studio previews `png`
 * while PhotoPainter receives the matching `bmp`, so both formats contain the
 * same pixels.
 */
export async function renderDashboardAssets(
  config: DashboardConfig,
  slots: ResolvedSlotInputs
): Promise<DashboardRenderAssets> {
  await ensureMeteocons();
  const layout = getLayout(config.layoutId);
  const palette = getPalette(config.theme);
  const canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = palette.page;
  ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

  for (const slot of layout.slots) {
    const assignment = config.assignments.find((candidate) => candidate.slotId === slot.id);
    const rect = getSlotRect(layout.columns, layout.rows, slot);
    const input = assignment ? slots[assignment.slotId] : undefined;
    if (!assignment || !input) {
      drawEmptySlot(ctx, rect, slot.label, palette);
      continue;
    }
    renderWidget(ctx, assignment.widgetId, slot.size, rect, input, palette);
  }

  const png = canvas.toBuffer('image/png');
  const bmp = await (await Jimp.read(png)).getBuffer('image/bmp');
  return { png, bmp };
}

export function renderWidgetPreview(
  widgetId: WidgetId,
  variant: WidgetLayoutVariant,
  data: DashboardData,
  theme: DashboardTheme
): Buffer {
  const palette = getPalette(theme);
  const canvas = createCanvas(variant.width, variant.height);
  const ctx = canvas.getContext('2d');
  const rect: Rect = { x: 0, y: 0, width: variant.width, height: variant.height };

  ctx.fillStyle = palette.page;
  ctx.fillRect(0, 0, variant.width, variant.height);
  renderWidget(ctx, widgetId, variant.size, rect, data[widgetId], palette);
  return canvas.toBuffer('image/png');
}

function getSlotRect(columns: number, rows: number, slot: LayoutSlot): Rect {
  const columnWidth = (DISPLAY_WIDTH - DISPLAY_PADDING * 2 - DISPLAY_GAP * (columns - 1)) / columns;
  const rowHeight = (DISPLAY_HEIGHT - DISPLAY_PADDING * 2 - DISPLAY_GAP * (rows - 1)) / rows;
  return {
    x: DISPLAY_PADDING + (slot.column - 1) * (columnWidth + DISPLAY_GAP),
    y: DISPLAY_PADDING + (slot.row - 1) * (rowHeight + DISPLAY_GAP),
    width: columnWidth * slot.columnSpan + DISPLAY_GAP * (slot.columnSpan - 1),
    height: rowHeight * slot.rowSpan + DISPLAY_GAP * (slot.rowSpan - 1)
  };
}

function renderWidget<K extends WidgetId>(
  ctx: SKRSContext2D,
  widgetId: K,
  size: WidgetSize,
  rect: Rect,
  input: WidgetInputMap[K],
  palette: Palette
) {
  const localRect: Rect = { x: 0, y: 0, width: rect.width, height: rect.height };
  ctx.save();
  ctx.translate(rect.x, rect.y);
  drawCard(ctx, localRect, widgetId === 'weather' ? palette.cardAlt : palette.card, palette.line);
  roundRect(ctx, 0, 0, localRect.width, localRect.height, 11);
  ctx.clip();
  const renderer = WIDGET_RENDERERS[widgetId] as CanvasWidgetRenderer<K>;
  renderer(ctx, localRect, size, input, palette);
  ctx.restore();
}
