import type { SKRSContext2D } from '@napi-rs/canvas';

import { text, WIDGET_TYPOGRAPHY } from './text.js';
import type { Palette, Rect } from './types.js';

export function drawCard(ctx: SKRSContext2D, rect: Rect, fill: string, stroke: string) {
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 11);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawEmptySlot(ctx: SKRSContext2D, rect: Rect, slotLabel: string, palette: Palette) {
  ctx.save();
  ctx.setLineDash([5, 5]);
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 11);
  ctx.strokeStyle = palette.line;
  ctx.stroke();
  ctx.restore();
  text(ctx, slotLabel, rect.x + 16, rect.y + 30, 14, 600, palette.muted);
}

export function label(ctx: SKRSContext2D, rect: Rect, value: string, palette: Palette) {
  text(ctx, value, rect.x + 18, rect.y + 31, 14, 800, palette.muted, 'left', {
    letterSpacing: 14 * WIDGET_TYPOGRAPHY.labelLetterSpacingEm
  });
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(rect.x + rect.width - 22, rect.y + 25, 5, 0, Math.PI * 2);
  ctx.fill();
}

export function accentBar(ctx: SKRSContext2D, rect: Rect, palette: Palette) {
  ctx.fillStyle = palette.accent;
  ctx.fillRect(rect.x, rect.y + rect.height - 5, rect.width, 5);
}

export function line(
  ctx: SKRSContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function formatDate(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(date);
}
