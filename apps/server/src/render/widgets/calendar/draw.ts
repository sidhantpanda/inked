import type { SKRSContext2D } from '@napi-rs/canvas';
import type { CalendarWidgetInput, WidgetSize } from '@inked/commons';

import { label, line } from '../../primitives.js';
import { clippedText, setTextStyle, text } from '../../text.js';
import type { Palette, Rect } from '../../types.js';

export function drawCalendar(
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: CalendarWidgetInput,
  palette: Palette
) {
  label(ctx, rect, 'UP NEXT', palette);
  const maxItems =
    size === 'small' ? 1 : size === 'wide' ? 2 : size === 'tall' ? 3 : size === 'large' ? 4 : 5;
  const contentTop = rect.y + 44;
  const contentBottom = rect.y + rect.height - 12;
  const rowHeight = Math.min(62, (contentBottom - contentTop) / maxItems);
  if (input.events.length === 0) {
    text(ctx, 'No upcoming events', rect.x + 18, contentTop + 18, 14, 600, palette.muted);
    return;
  }
  const visible = input.events.slice(0, maxItems);
  // Show the date under the time only where the row is tall enough for a
  // second line — dense variants keep a single line.
  const showSecondaryLine = rowHeight >= 50;
  // Reserve a time column as wide as the widest time (and date, when shown) so
  // day-prefixed times like "Sat 16:00" never overlap the event title.
  setTextStyle(ctx, 14, 700);
  const timeColumnWidth = Math.min(
    rect.width * 0.42,
    visible.reduce((widest, event) => {
      const dateWidth = showSecondaryLine && event.date ? ctx.measureText(event.date).width : 0;
      return Math.max(widest, ctx.measureText(event.time).width, dateWidth);
    }, 0)
  );
  const timeWidth = Math.ceil(timeColumnWidth) + 4;
  const titleX = rect.x + 18 + Math.ceil(timeColumnWidth) + 12;
  const titleWidth = Math.max(20, rect.x + rect.width - 18 - titleX);
  visible.forEach((event, index) => {
    const rowTop = contentTop + index * rowHeight;
    const baseline = rowTop + Math.min(22, rowHeight * 0.7);
    if (index > 0) {
      line(ctx, rect.x + 18, rowTop, rect.x + rect.width - 18, rowTop, palette.line);
    }
    clippedText(ctx, event.time, rect.x + 18, baseline, timeWidth, 14, 700, palette.muted);
    if (showSecondaryLine && event.date) {
      clippedText(ctx, event.date, rect.x + 18, baseline + 18, timeWidth, 14, 500, palette.muted);
    }
    clippedText(ctx, event.title, titleX, baseline, titleWidth, 16, 700, palette.ink);
    if (event.tag && rect.width > 300 && rowHeight >= 50) {
      clippedText(ctx, event.tag, titleX, baseline + 21, titleWidth, 14, 500, palette.muted);
    }
  });
}
