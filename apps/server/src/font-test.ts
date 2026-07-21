import { createCanvas } from '@napi-rs/canvas';
import { Jimp } from 'jimp';

import { DISPLAY_HEIGHT, DISPLAY_WIDTH } from '@inked/commons';

import type { RenderFormat } from './render.js';
import { INKED_FONT_FAMILIES } from './fonts.js';

export const FONT_TEST_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 22, 28] as const;

const COLUMNS = 3;
const ROWS = 4;
const MARGIN = 16;

/** Renders the exact high-contrast calibration image sent to Photo Painter. */
export async function renderFontTest(format: RenderFormat = 'png'): Promise<Buffer> {
  const canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
  const ctx = canvas.getContext('2d');
  const gridWidth = DISPLAY_WIDTH - MARGIN * 2;
  const gridHeight = DISPLAY_HEIGHT - MARGIN * 2;
  const cellWidth = gridWidth / COLUMNS;
  const cellHeight = gridHeight / ROWS;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);
  ctx.strokeStyle = '#202420';
  ctx.lineWidth = 1;

  FONT_TEST_SIZES.forEach((fontSize, index) => {
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const x = MARGIN + column * cellWidth;
    const y = MARGIN + row * cellHeight;

    ctx.strokeRect(x + 0.5, y + 0.5, cellWidth, cellHeight);
    ctx.fillStyle = '#111411';
    ctx.font = `400 ${fontSize}px "${INKED_FONT_FAMILIES.sans}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Size ${fontSize}`, x + cellWidth / 2, y + cellHeight / 2);
  });

  const png = canvas.toBuffer('image/png');
  if (format === 'png') return png;
  return (await Jimp.read(png)).getBuffer('image/bmp');
}
