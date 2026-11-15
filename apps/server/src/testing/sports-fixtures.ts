import type { SportsCompetitionRoute } from '../sports/types.js';

/** A two-source competition: `primary` first, `backup` as fallback. */
export const route: SportsCompetitionRoute = {
  id: 'test-league',
  sportId: 'football',
  name: 'Test League',
  supportsTeams: true,
  eventTypes: ['match'],
  sources: [
    { providerId: 'primary', ref: { id: 'primary/test', kind: 'match' } },
    { providerId: 'backup', ref: { id: 'backup/test', kind: 'match' } }
  ]
};
