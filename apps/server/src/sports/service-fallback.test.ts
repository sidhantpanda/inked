import { describe, expect, it, vi } from 'vitest';

import { route } from '../testing/sports-fixtures.js';
import { DefaultSportsService } from './service.js';
import type { SportsProvider } from './types.js';

describe('sports provider service: sources', () => {
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
});
