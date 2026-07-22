import { describe, expect, it, vi } from 'vitest';

import { DefaultSportsService } from './service.js';
import type { SportsCompetitionRoute, SportsProvider } from './types.js';

const route: SportsCompetitionRoute = {
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

describe('sports provider service', () => {
  it('falls back by competition and caches repeated widget requests', async () => {
    const primaryEvents = vi.fn(async () => {
      throw new Error('source unavailable');
    });
    const backupEvents = vi.fn(async () => [
      {
        id: 'match-1',
        type: 'match' as const,
        startsAt: '2026-07-22T18:00:00.000Z',
        state: 'scheduled' as const,
        home: { id: 'a', name: 'Alpha FC', abbreviation: 'ALP' },
        away: { id: 'b', name: 'Beta FC', abbreviation: 'BET' }
      }
    ]);
    const providers: SportsProvider[] = [
      {
        id: 'primary',
        name: 'Primary',
        getTeams: async () => [],
        getEvents: primaryEvents
      },
      {
        id: 'backup',
        name: 'Backup',
        getTeams: async () => [],
        getEvents: backupEvents
      }
    ];
    const service = new DefaultSportsService([route], providers);
    const settings = {
      sportId: 'football',
      follows: [
        {
          kind: 'competition' as const,
          sportId: 'football',
          competitionId: 'test-league',
          eventTypes: ['match' as const]
        }
      ],
      horizonDays: 30 as const
    };
    const now = new Date('2026-07-21T12:00:00.000Z');

    const first = await service.getWidgetInput(settings, now, 'Europe/Amsterdam');
    const second = await service.getWidgetInput(settings, now, 'Europe/Amsterdam');

    expect(first.events[0]).toMatchObject({
      id: 'backup:match-1',
      competition: 'Test League',
      source: 'Backup',
      home: 'ALP',
      away: 'BET'
    });
    expect(second).toEqual(first);
    expect(primaryEvents).toHaveBeenCalledTimes(1);
    expect(backupEvents).toHaveBeenCalledTimes(1);
  });

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
