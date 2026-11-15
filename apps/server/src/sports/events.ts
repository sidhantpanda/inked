import type { SportsEvent } from '@inked/commons';

import type { ProviderSportsEvent, SportsCompetitionRoute, SportsProvider } from './types.js';

/** Maps a provider event into the provider-neutral widget event. */
export function toWidgetEvent(
  event: ProviderSportsEvent,
  route: SportsCompetitionRoute,
  provider: SportsProvider,
  sportName: string
): SportsEvent {
  const common = {
    id: `${provider.id}:${event.id}`,
    sport: sportName,
    competition: route.name,
    startsAt: event.startsAt,
    state: event.state,
    source: provider.name
  };
  if (event.type === 'match') {
    return {
      ...common,
      type: 'match',
      home: event.home.abbreviation || event.home.name,
      away: event.away.abbreviation || event.away.name,
      ...(event.homeScore !== undefined ? { homeScore: event.homeScore } : {}),
      ...(event.awayScore !== undefined ? { awayScore: event.awayScore } : {})
    };
  }
  return {
    ...common,
    type: event.type,
    name: event.name,
    session: event.session,
    ...(event.venue ? { venue: event.venue } : {})
  };
}

function statePriority(event: SportsEvent): number {
  if (event.state === 'live') return 0;
  if (event.state === 'scheduled') return 1;
  if (event.state === 'postponed') return 2;
  return 3;
}

/** De-duplicates by id, then orders live, scheduled, postponed, and the rest by start time. */
export function orderSportsEvents(events: SportsEvent[]): SportsEvent[] {
  const deduplicated = new Map<string, SportsEvent>();
  for (const event of events) deduplicated.set(event.id, event);
  return [...deduplicated.values()].sort((left, right) => {
    const priority = statePriority(left) - statePriority(right);
    return priority || left.startsAt.localeCompare(right.startsAt);
  });
}
