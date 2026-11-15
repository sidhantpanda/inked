import { describe, expect, it } from 'vitest';

import { route } from '../testing/sports-fixtures.js';
import { DefaultSportsService } from './service.js';
import type { SportsProvider } from './types.js';

describe('sports provider service: teams', () => {
  it('uses stable Inked team ids and filters a widget to selected teams', async () => {
    const provider: SportsProvider = {
      id: 'backup',
      name: 'Backup',
      getTeams: async () => [
        { id: 'upstream-a', name: 'Alpha FC', abbreviation: 'ALP' },
        { id: 'upstream-b', name: 'Beta FC', abbreviation: 'BET' }
      ],
      getEvents: async () => [
        {
          id: 'alpha-beta',
          type: 'match',
          startsAt: '2026-07-22T18:00:00.000Z',
          state: 'scheduled',
          home: { id: 'upstream-a', name: 'Alpha FC', abbreviation: 'ALP' },
          away: { id: 'upstream-b', name: 'Beta FC', abbreviation: 'BET' }
        },
        {
          id: 'gamma-delta',
          type: 'match',
          startsAt: '2026-07-23T18:00:00.000Z',
          state: 'scheduled',
          home: { id: 'upstream-c', name: 'Gamma FC', abbreviation: 'GAM' },
          away: { id: 'upstream-d', name: 'Delta FC', abbreviation: 'DEL' }
        }
      ]
    };
    const backupOnly = { ...route, sources: [route.sources[1]!] };
    const service = new DefaultSportsService([backupOnly], [provider]);
    const teams = await service.getTeams(route.id);
    expect(teams[0]?.id).toBe('test-league:alpha-fc');

    const input = await service.getWidgetInput(
      {
        sportId: 'football',
        follows: [
          {
            kind: 'team',
            sportId: 'football',
            competitionId: route.id,
            teamId: 'test-league:alpha-fc',
            eventTypes: ['match']
          }
        ],
        horizonDays: 7
      },
      new Date('2026-07-21T12:00:00.000Z'),
      'Europe/Amsterdam'
    );

    expect(input.events.map((event) => event.id)).toEqual(['backup:alpha-beta']);
  });
});
