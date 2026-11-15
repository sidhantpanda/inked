import type { SKRSContext2D } from '@napi-rs/canvas';

import { getMeteocon } from '../../../meteocons.js';
import type { Palette } from '../../types.js';

/** Draws a bundled Meteocons icon centered at (cx, cy). Returns false if absent. */
export function drawWeatherIcon(
  ctx: SKRSContext2D,
  name: string,
  cx: number,
  cy: number,
  size: number
): boolean {
  const image = getMeteocon(name);
  if (!image || size < 8) return false;
  ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size);
  return true;
}

export function drawWeatherGlyph(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  radius: number,
  palette: Palette
) {
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.72, Math.PI, Math.PI * 2);
  ctx.arc(x + radius * 0.7, y, radius * 0.55, Math.PI, Math.PI * 2);
  ctx.moveTo(x - radius * 0.7, y);
  ctx.lineTo(x + radius * 1.25, y);
  ctx.stroke();
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(x + radius * 0.85, y - radius * 0.8, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
}
