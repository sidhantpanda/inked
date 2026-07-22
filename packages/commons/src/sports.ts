import type { SportsEvent, SportsMatchEvent, SportsSessionEvent } from './types.js';

type SportsEventTiming = Pick<SportsEvent, 'startsAt' | 'state'>;

export const SPORTS_PREVIEW_PRESETS = [
  { id: 'football', name: 'Premier League', sport: 'Football' },
  { id: 'motorsport', name: 'Formula 1', sport: 'Motorsport' },
  { id: 'basketball', name: 'NBA', sport: 'Basketball' },
  { id: 'american-football', name: 'NFL', sport: 'American football' },
  { id: 'baseball', name: 'MLB', sport: 'Baseball' },
  { id: 'ice-hockey', name: 'NHL', sport: 'Ice hockey' }
] as const;

export type SportsPreviewPresetId = (typeof SPORTS_PREVIEW_PRESETS)[number]['id'];

export function isSportsPreviewPresetId(value: unknown): value is SportsPreviewPresetId {
  return SPORTS_PREVIEW_PRESETS.some((preset) => preset.id === value);
}

export interface FormattedSportsEventTiming {
  primary: string;
  secondary?: string;
}

export type SportsEventGroup =
  | { id: string; type: 'match'; event: SportsMatchEvent }
  | {
      id: string;
      type: 'sessions';
      sport: string;
      competition: string;
      name: string;
      venue?: string;
      sessions: SportsSessionEvent[];
    };

/** Groups sessions from the same race weekend while leaving matches independent. */
export function groupSportsEvents(events: SportsEvent[]): SportsEventGroup[] {
  const groups: SportsEventGroup[] = [];
  const sessionsByEvent = new Map<string, Extract<SportsEventGroup, { type: 'sessions' }>>();
  for (const event of events) {
    if (event.type === 'match') {
      groups.push({ id: event.id, type: 'match', event });
      continue;
    }
    const key = `${event.sport}\u0000${event.competition}\u0000${event.name}\u0000${event.venue ?? ''}`;
    const existing = sessionsByEvent.get(key);
    if (existing) {
      existing.sessions.push(event);
      continue;
    }
    const group: Extract<SportsEventGroup, { type: 'sessions' }> = {
      id: `sessions:${event.id}`,
      type: 'sessions',
      sport: event.sport,
      competition: event.competition,
      name: event.name,
      ...(event.venue ? { venue: event.venue } : {}),
      sessions: [event]
    };
    sessionsByEvent.set(key, group);
    groups.push(group);
  }
  return groups;
}

/** Conventional short label for narrow motorsport session rows. */
export function formatCompactSportsSession(session: string): string {
  const normalized = session.trim().toLowerCase();
  if (normalized === 'qualifying') return 'Quali';
  if (normalized === 'sprint qualifying') return 'Sprint Q';
  const practice = /^practice\s*(\d+)$/u.exec(normalized);
  if (practice?.[1]) return `FP${practice[1]}`;
  return session;
}

/** Compact, timezone-aware timing used by both Sports renderers. */
export function formatSportsEventTiming(
  event: SportsEventTiming,
  timezone: string
): FormattedSportsEventTiming {
  const instant = new Date(event.startsAt);
  if (Number.isNaN(instant.getTime())) return { primary: 'TBA' };
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: timezone
  }).format(instant);
  if (event.state === 'live') return { primary: 'LIVE', secondary: date };
  if (event.state === 'finished') return { primary: 'FT', secondary: date };
  if (event.state === 'postponed') return { primary: 'PPD', secondary: date };
  if (event.state === 'cancelled') return { primary: 'OFF', secondary: date };
  const weekday = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    timeZone: timezone
  }).format(instant);
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  }).format(instant);
  return { primary: `${weekday} ${time}`, secondary: date };
}
