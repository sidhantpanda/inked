import type { SKRSContext2D } from '@napi-rs/canvas';
import { groupSportsEvents, type ScoresWidgetInput, type WidgetSize } from '@inked/commons';

import { label, line } from '../../primitives.js';
import { clippedText } from '../../text.js';
import type { Palette, Rect } from '../../types.js';
import { drawSportsEventCell } from './event-cell.js';

export function drawScores(
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: ScoresWidgetInput,
  palette: Palette
) {
  label(ctx, rect, 'SPORTS', palette);
  const narrow = rect.width < 300;
  const short = rect.height < 260;
  const fullWidth = size === 'full' && rect.width >= 650;
  const limit =
    size === 'small' ? 1 : narrow ? (rect.height < 240 ? 2 : 3) : fullWidth ? 4 : short ? 2 : 4;
  const groups = groupSportsEvents(input.events).slice(0, limit);
  if (groups.length === 0) {
    clippedText(
      ctx,
      'No upcoming events',
      rect.x + 18,
      rect.y + 77,
      rect.width - 36,
      16,
      600,
      palette.muted
    );
    return;
  }
  const contentTop = rect.y + 48;
  const contentHeight = rect.y + rect.height - 12 - contentTop;
  const columns = groups.length === 1 ? 1 : fullWidth ? Math.min(4, groups.length) : narrow ? 1 : 2;
  const rows = Math.ceil(groups.length / columns);
  const rowHeight = contentHeight / rows;
  const columnWidth = rect.width / columns;
  groups.forEach((group, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const spanLastRow =
      columns === 2 && groups.length % 2 === 1 && index === groups.length - 1 && size !== 'wide';
    const cell = {
      x: spanLastRow ? rect.x : rect.x + column * columnWidth,
      y: contentTop + row * rowHeight,
      width: spanLastRow ? rect.width : columnWidth,
      height: rowHeight
    };
    if (row > 0 && column === 0) {
      line(ctx, rect.x + 18, cell.y, rect.x + rect.width - 18, cell.y, palette.line);
    }
    if (column > 0) {
      line(ctx, cell.x, cell.y, cell.x, cell.y + cell.height, palette.line);
    }
    drawSportsEventCell(ctx, cell, group, input.timezone, palette);
  });
}
