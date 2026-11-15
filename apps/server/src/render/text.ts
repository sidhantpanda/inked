import type { SKRSContext2D } from '@napi-rs/canvas';
import { MIN_WIDGET_FONT_SIZE } from '@inked/commons';

import { INKED_FONT_FAMILIES } from '../fonts.js';
import type { TextOptions } from './types.js';

/** Mirrors the font stacks used by the original React widget components. */
export const WIDGET_TYPOGRAPHY = {
  sans: `"${INKED_FONT_FAMILIES.sans}"`,
  serif: `"${INKED_FONT_FAMILIES.serif}"`,
  labelLetterSpacingEm: 0.1,
  dateLetterSpacingEm: -0.07,
  messageLetterSpacingEm: -0.035,
  weatherLetterSpacingEm: -0.06
} as const;

export function text(
  ctx: SKRSContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  align: CanvasTextAlign = 'left',
  options: TextOptions = {}
) {
  const fontSize = Math.max(size, MIN_WIDGET_FONT_SIZE);
  setTextStyle(ctx, fontSize, weight, options);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

export function clippedText(
  ctx: SKRSContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: number,
  color: string,
  options: TextOptions = {}
) {
  const fontSize = Math.max(size, MIN_WIDGET_FONT_SIZE);
  setTextStyle(ctx, fontSize, weight, options);
  let result = value;
  while (result.length > 1 && ctx.measureText(result).width > maxWidth)
    result = `${result.slice(0, -2)}…`;
  text(ctx, result, x, y, fontSize, weight, color, 'left', options);
}

export function fittedText(
  ctx: SKRSContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  preferredSize: number,
  weight: number,
  color: string,
  options: TextOptions = {}
) {
  let fontSize = Math.max(preferredSize, MIN_WIDGET_FONT_SIZE);
  setTextStyle(ctx, fontSize, weight, options);
  while (fontSize > MIN_WIDGET_FONT_SIZE && ctx.measureText(value).width > maxWidth) {
    fontSize -= 1;
    setTextStyle(ctx, fontSize, weight, options);
  }
  clippedText(ctx, value, x, y, maxWidth, fontSize, weight, color, options);
}

export function wrapText(
  ctx: SKRSContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: number,
  color: string,
  maxLines: number,
  options: TextOptions = {}
) {
  const fontSize = Math.max(size, MIN_WIDGET_FONT_SIZE);
  setTextStyle(ctx, fontSize, weight, options);
  const lines = wrappedLines(ctx, value, maxWidth);
  const visibleLines = lines.slice(0, maxLines);
  const truncated = lines.length > maxLines;

  visibleLines.forEach((lineValue, index) => {
    const displayedValue =
      truncated && index === visibleLines.length - 1 ? `${lineValue}…` : lineValue;
    clippedText(
      ctx,
      displayedValue,
      x,
      y + index * fontSize * 0.98,
      maxWidth,
      fontSize,
      weight,
      color,
      options
    );
  });
}

export function wrappedLines(ctx: SKRSContext2D, value: string, maxWidth: number) {
  const words = value.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function setTextStyle(
  ctx: SKRSContext2D,
  size: number,
  weight: number,
  options: TextOptions = {}
) {
  ctx.font = `${weight} ${size}px ${WIDGET_TYPOGRAPHY[options.family ?? 'sans']}`;
  ctx.letterSpacing = `${options.letterSpacing ?? 0}px`;
}

export function textWidth(ctx: SKRSContext2D, value: string, size: number, weight: number) {
  setTextStyle(ctx, Math.max(size, MIN_WIDGET_FONT_SIZE), weight);
  return ctx.measureText(value).width;
}
