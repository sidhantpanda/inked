import { describe, expect, it, vi } from 'vitest';

import { route } from '../testing/sports-fixtures.js';
import { DefaultSportsService } from './service.js';
import type { SportsCompetitionRoute } from './types.js';

describe('sports provider service: sport scope', () => {
  it('never fetches follows from another sport configured on the same widget', async () => {
    const footballEvents = vi.fn(async () => [
      {
        id: 'football-match',
        type: 'match' as const,
        startsAt: '2026-07-22T18:00:00.000Z',
        state: 'scheduled' as const,
        home: { id: 'a', name: 'Alpha FC', abbreviation: 'ALP' },
        away: { id: 'b', name: 'Beta FC', abbreviation: 'BET' }
      }
    ]);
    const racingEvents = vi.fn(async () => [
      {
        id: 'race',
        type: 'race' as const,
        startsAt: '2026-07-23T18:00:00.000Z',
        state: 'scheduled' as const,
        name: 'Test Grand Prix',
        session: 'Race'
      }
    ]);
    const footballRoute: SportsCompetitionRoute = {
      ...route,
      sources: [{ providerId: 'football-provider', ref: { id: 'football', kind: 'match' } }]
    };
    const racingRoute: SportsCompetitionRoute = {
      id: 'test-racing',
      sportId: 'motorsport',
      name: 'Test Racing',
      supportsTeams: false,
      eventTypes: ['race'],
      sources: [{ providerId: 'racing-provider', ref: { id: 'racing', kind: 'racing' } }]
    };
    const service = new DefaultSportsService(
      [footballRoute, racingRoute],
      [
        {
          id: 'football-provider',
          name: 'Football provider',
          getTeams: async () => [],
          getEvents: footballEvents
        },
        {
          id: 'racing-provider',
          name: 'Racing provider',
          getTeams: async () => [],
          getEvents: racingEvents
        }
      ]
    );

    const input = await service.getWidgetInput(
      {
        sportId: 'football',
        follows: [
          {
            kind: 'competition',
            sportId: 'football',
            competitionId: footballRoute.id,
            eventTypes: ['match']
          },
          {
            kind: 'competition',
            sportId: 'motorsport',
            competitionId: racingRoute.id,
            eventTypes: ['race']
          }
        ],
        horizonDays: 30
      },
      new Date('2026-07-21T12:00:00.000Z'),
      'Europe/Amsterdam'
    );

    expect(input.events.map((event) => event.id)).toEqual(['football-provider:football-match']);
    expect(footballEvents).toHaveBeenCalledOnce();
    expect(racingEvents).not.toHaveBeenCalled();
  });
});
