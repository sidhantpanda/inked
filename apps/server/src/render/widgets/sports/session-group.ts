import type { SKRSContext2D } from '@napi-rs/canvas';
import {
  formatCompactSportsSession,
  formatSportsEventTiming,
  type SportsEventGroup
} from '@inked/commons';

import { line } from '../../primitives.js';
import { clippedText, fittedText, text, wrapText } from '../../text.js';
import type { Palette, Rect } from '../../types.js';

export function drawSportsSessionGroup(
  ctx: SKRSContext2D,
  rect: Rect,
  group: Extract<SportsEventGroup, { type: 'sessions' }>,
  timezone: string,
  palette: Palette
) {
  const x = rect.x + 18;
  const right = rect.x + rect.width - 18;
  const width = Math.max(30, rect.width - 36);
  const compact = rect.height < 96;
  const veryCompact = rect.height < 70;
  if (veryCompact) {
    fittedText(ctx, group.name, x, rect.y + 18, width, 17, 700, palette.ink);
    const session = group.sessions[0];
    if (session) {
      const timing = formatSportsEventTiming(session, timezone);
      const remaining = group.sessions.length - 1;
      const label = `${formatCompactSportsSession(session.session)}${remaining > 0 ? ` +${remaining}` : ''}`;
      clippedText(
        ctx,
        label.toUpperCase(),
        x,
        rect.y + 41,
        Math.max(30, width - 86),
        14,
        800,
        palette.ink
      );
      text(
        ctx,
        timing.primary,
        right,
        rect.y + 41,
        14,
        800,
        session.state === 'live' ? palette.accent : palette.ink,
        'right'
      );
    }
    return;
  }
  if (compact) fittedText(ctx, group.name, x, rect.y + 18, width, 17, 700, palette.ink);
  else wrapText(ctx, group.name, x, rect.y + 18, width, 16, 700, palette.ink, 2);

  const showVenue = !compact && rect.height >= 145 && Boolean(group.venue);
  if (showVenue && group.venue)
    clippedText(ctx, group.venue, x, rect.y + 54, width, 14, 600, palette.muted);
  const rowsTop = rect.y + (compact ? 26 : showVenue ? 66 : 45);
  const availableHeight = rect.y + rect.height - 5 - rowsTop;
  const capacity = compact ? 1 : rect.height >= 185 ? 4 : rect.height >= 140 ? 3 : 2;
  const hasMore = group.sessions.length > capacity;
  const showMoreRow = hasMore && !compact;
  const visibleCount =
    showMoreRow && capacity > 1 ? capacity - 1 : Math.min(capacity, group.sessions.length);
  const rowCount = visibleCount + (showMoreRow ? 1 : 0);
  const rowHeight = availableHeight / Math.max(rowCount, 1);

  group.sessions.slice(0, visibleCount).forEach((session, index) => {
    const rowTop = rowsTop + index * rowHeight;
    if (index > 0) line(ctx, x, rowTop, right, rowTop, palette.line);
    const timing = formatSportsEventTiming(session, timezone);
    const remaining = compact ? group.sessions.length - 1 : 0;
    const label = `${
      rect.width < 220 ? formatCompactSportsSession(session.session) : session.session
    }${remaining > 0 ? ` +${remaining}` : ''}`;
    clippedText(
      ctx,
      label.toUpperCase(),
      x,
      rowTop + 18,
      Math.max(30, width - 88),
      14,
      800,
      palette.ink
    );
    text(
      ctx,
      timing.primary,
      right,
      rowTop + 16,
      14,
      800,
      session.state === 'live' ? palette.accent : palette.ink,
      'right'
    );
    if (timing.secondary)
      text(ctx, timing.secondary, right, rowTop + 33, 14, 600, palette.muted, 'right');
  });

  if (showMoreRow) {
    const rowTop = rowsTop + visibleCount * rowHeight;
    if (visibleCount > 0) line(ctx, x, rowTop, right, rowTop, palette.line);
    const remaining = group.sessions.length - visibleCount;
    text(
      ctx,
      `+${remaining} more ${remaining === 1 ? 'session' : 'sessions'}`,
      x,
      rowTop + Math.min(22, rowHeight - 5),
      14,
      700,
      palette.muted
    );
  }
}
