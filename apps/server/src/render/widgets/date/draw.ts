import type { SKRSContext2D } from '@napi-rs/canvas';
import type { DateWidgetInput, WidgetSize } from '@inked/commons';

import { accentBar, formatDate, label, roundRect } from '../../primitives.js';
import { fittedText, text, WIDGET_TYPOGRAPHY } from '../../text.js';
import type { Palette, Rect } from '../../types.js';

export function drawDate(
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: DateWidgetInput,
  palette: Palette
) {
  const date = new Date(input.now);
  const weekday = formatDate(date, input.timezone, { weekday: 'long' });
  const dayNumber = formatDate(date, input.timezone, { day: 'numeric' });
  const monthYear = formatDate(date, input.timezone, { month: 'long', year: 'numeric' });
  const compact = rect.height < 150 || size === 'small' || size === 'wide';
  const short = rect.height < 130;
  const dayFontSize = short ? 38 : compact ? 48 : 78;
  label(ctx, rect, 'DATE', palette);

  text(
    ctx,
    dayNumber,
    rect.x + 18,
    rect.y + (compact ? 82 : 121),
    dayFontSize,
    400,
    palette.ink,
    'left',
    {
      family: 'serif',
      letterSpacing: dayFontSize * WIDGET_TYPOGRAPHY.dateLetterSpacingEm
    }
  );
  const copyX = rect.x + 18 + ctx.measureText(dayNumber).width + Math.max(10, rect.width * 0.04);
  fittedText(
    ctx,
    weekday,
    copyX,
    rect.y + (short ? 60 : compact ? 63 : 79),
    rect.x + rect.width - 18 - copyX,
    compact ? 16 : 18,
    700,
    palette.ink
  );
  if (size !== 'small')
    text(ctx, monthYear, copyX, rect.y + (compact ? 84 : 103), 14, 400, palette.muted);

  if (!compact && (size === 'tall' || size === 'large' || size === 'full')) {
    drawWeekStrip(ctx, rect, date, input.timezone, palette);
  }
  accentBar(ctx, rect, palette);
}

function drawWeekStrip(
  ctx: SKRSContext2D,
  rect: Rect,
  date: Date,
  timeZone: string,
  palette: Palette
) {
  const shortWeekday = formatDate(date, timeZone, { weekday: 'short' });
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(shortWeekday);
  const mondayOffset = -((weekdayIndex + 6) % 7);
  const left = rect.x + 18;
  const width = rect.width - 36;
  const cellWidth = width / 7;
  const top = rect.y + rect.height - 59;

  for (let index = 0; index < 7; index += 1) {
    const value = new Date(date.getTime() + (mondayOffset + index) * 86_400_000);
    const x = left + index * cellWidth;
    const current = index === -mondayOffset;
    if (current) {
      roundRect(ctx, x + 2, top, cellWidth - 4, 39, 5);
      ctx.fillStyle = palette.accent;
      ctx.fill();
    }
    text(
      ctx,
      formatDate(value, timeZone, { weekday: 'narrow' }),
      x + cellWidth / 2,
      top + 13,
      14,
      700,
      current ? palette.accentInk : palette.muted,
      'center'
    );
    text(
      ctx,
      formatDate(value, timeZone, { day: 'numeric' }),
      x + cellWidth / 2,
      top + 34,
      14,
      700,
      current ? palette.accentInk : palette.ink,
      'center'
    );
  }
}
