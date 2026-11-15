import type { SportsFollow } from '@inked/commons';

import type { ProviderSportsEvent, SportsCompetitionRoute } from './types.js';

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Inked's stable team id, derived from the team name so provider ids never leak. */
export function teamId(competitionId: string, name: string): string {
  return `${competitionId}:${slug(name)}`;
}

/** True when a panel's follows for this competition include the event. */
export function matchesFollows(
  event: ProviderSportsEvent,
  follows: SportsFollow[],
  route: SportsCompetitionRoute
): boolean {
  return follows.some((follow) => {
    const eventTypes = follow.eventTypes.length > 0 ? follow.eventTypes : route.eventTypes;
    if (!eventTypes.includes(event.type)) return false;
    if (follow.kind === 'competition') return true;
    if (event.type !== 'match') return false;
    return (
      teamId(route.id, event.home.name) === follow.teamId ||
      teamId(route.id, event.away.name) === follow.teamId
    );
  });
}
