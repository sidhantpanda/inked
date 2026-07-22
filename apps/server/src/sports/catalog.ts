import type { SportsCatalog, SportsCatalogSport } from '@inked/commons';

import type { SportsCompetitionRoute } from './types.js';

const espn = (id: string, kind: 'match' | 'racing' = 'match') => [
  { providerId: 'espn', ref: { id, kind } }
];

/**
 * Inked owns these stable ids. Provider ids live only in `sources`, so adding
 * a backup or changing a primary does not invalidate saved widget settings.
 */
export const SPORTS_COMPETITIONS: SportsCompetitionRoute[] = [
  {
    id: 'premier-league',
    sportId: 'football',
    name: 'Premier League',
    supportsTeams: true,
    eventTypes: ['match'],
    sources: espn('soccer/eng.1')
  },
  {
    id: 'formula-1',
    sportId: 'motorsport',
    name: 'Formula 1',
    supportsTeams: false,
    eventTypes: ['practice', 'qualifying', 'sprint', 'race'],
    sources: espn('racing/f1', 'racing')
  },
  {
    id: 'nfl',
    sportId: 'american-football',
    name: 'NFL',
    supportsTeams: true,
    eventTypes: ['match'],
    sources: espn('football/nfl')
  },
  {
    id: 'nba',
    sportId: 'basketball',
    name: 'NBA',
    supportsTeams: true,
    eventTypes: ['match'],
    sources: espn('basketball/nba')
  },
  {
    id: 'mlb',
    sportId: 'baseball',
    name: 'MLB',
    supportsTeams: true,
    eventTypes: ['match'],
    sources: espn('baseball/mlb')
  },
  {
    id: 'nhl',
    sportId: 'ice-hockey',
    name: 'NHL',
    supportsTeams: true,
    eventTypes: ['match'],
    sources: espn('hockey/nhl')
  }
];

const SPORT_NAMES: Record<string, string> = {
  football: 'Football',
  motorsport: 'Motorsport',
  'american-football': 'American football',
  basketball: 'Basketball',
  baseball: 'Baseball',
  'ice-hockey': 'Ice hockey'
};

export function buildSportsCatalog(routes = SPORTS_COMPETITIONS): SportsCatalog {
  const sports = new Map<string, SportsCatalogSport>();
  for (const { sources: _sources, ...competition } of routes) {
    const sport = sports.get(competition.sportId) ?? {
      id: competition.sportId,
      name: SPORT_NAMES[competition.sportId] ?? competition.sportId,
      competitions: []
    };
    sport.competitions.push(competition);
    sports.set(sport.id, sport);
  }
  return { sports: [...sports.values()] };
}
