import type { SKRSContext2D } from '@napi-rs/canvas';
import { formatSportsEventTiming, type SportsEventGroup } from '@inked/commons';

import { clippedText, text } from '../../text.js';
import type { Palette, Rect } from '../../types.js';
import { drawSportsSessionGroup } from './session-group.js';

export function drawSportsEventCell(
  ctx: SKRSContext2D,
  rect: Rect,
  group: SportsEventGroup,
  timezone: string,
  palette: Palette
) {
  if (group.type === 'sessions') {
    drawSportsSessionGroup(ctx, rect, group, timezone, palette);
    return;
  }
  const event = group.event;
  const timing = formatSportsEventTiming(event, timezone);
  const x = rect.x + 18;
  const right = rect.x + rect.width - 18;
  const width = Math.max(30, rect.width - 36);
  const compact = rect.height < 96;
  const primaryTimingY = rect.y + rect.height - (timing.secondary ? 27 : 11);
  const secondaryTimingY = rect.y + rect.height - 9;

  if (compact) {
    const timingReserve = 82;
    const teamWidth = Math.max(30, width - timingReserve);
    const veryCompact = rect.height < 70;
    const firstTeamY = rect.y + (veryCompact ? 20 : 24);
    const secondTeamY = rect.y + (veryCompact ? 42 : 51);
    const home = `${event.home}${event.homeScore === undefined ? '' : ` ${event.homeScore}`}`;
    const away = `${event.away}${event.awayScore === undefined ? '' : ` ${event.awayScore}`}`;
    clippedText(ctx, home, x, firstTeamY, teamWidth, 16, 700, palette.ink);
    clippedText(ctx, away, x, secondTeamY, teamWidth, 16, 700, palette.ink);
    text(
      ctx,
      timing.primary,
      right,
      firstTeamY,
      14,
      800,
      event.state === 'live' ? palette.accent : palette.ink,
      'right'
    );
    if (timing.secondary)
      text(ctx, timing.secondary, right, secondTeamY, 14, 600, palette.muted, 'right');
    return;
  }
  clippedText(ctx, event.competition, x, rect.y + 17, width, 14, 700, palette.muted);
  const firstTeamY = rect.y + 47;
  const secondTeamY = firstTeamY + 25;
  clippedText(ctx, event.home, x, firstTeamY, width - 30, 18, 700, palette.ink);
  clippedText(ctx, event.away, x, secondTeamY, width - 30, 18, 700, palette.ink);
  if (event.homeScore !== undefined)
    text(ctx, String(event.homeScore), right, firstTeamY, 18, 800, palette.ink, 'right');
  if (event.awayScore !== undefined)
    text(ctx, String(event.awayScore), right, secondTeamY, 18, 800, palette.ink, 'right');
  const timingColor = event.state === 'live' ? palette.accent : palette.ink;
  text(ctx, timing.primary, x, primaryTimingY, 14, 800, timingColor);
  if (timing.secondary) {
    text(ctx, timing.secondary, x, secondaryTimingY, 14, 600, palette.muted);
  }
}
