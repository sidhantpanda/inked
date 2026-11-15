import type { SKRSContext2D } from '@napi-rs/canvas';
import { formatStockPercent, stockDirection, stockDirectionGlyph } from '@inked/commons';

import { clippedText, text, textWidth } from '../../text.js';
import type { Palette, Rect } from '../../types.js';

export function stockColor(change: number, palette: Palette) {
  const direction = stockDirection(change);
  return direction === 'up' ? palette.up : direction === 'down' ? palette.down : palette.muted;
}

export function stockPercentLabel(change: number, percent: number) {
  return `${stockDirectionGlyph(change)} ${formatStockPercent(percent)}`;
}

export function drawUnavailableStock(
  ctx: SKRSContext2D,
  row: Rect,
  symbol: string,
  palette: Palette
) {
  const baseline = row.y + Math.min(row.height / 2 + 6, 24);
  const x = row.x + 18;
  const right = row.x + row.width - 18;
  const symbolWidth = Math.min(textWidth(ctx, symbol, 16, 800), (right - x) * 0.55);
  clippedText(ctx, symbol, x, baseline, symbolWidth + 1, 16, 800, palette.ink);
  text(ctx, 'No data', right, baseline, 14, 600, palette.muted, 'right');
}
