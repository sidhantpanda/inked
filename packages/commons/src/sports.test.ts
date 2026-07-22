import { describe, expect, it } from 'vitest';

import {
  formatCompactSportsSession,
  formatSportsEventTiming,
  groupSportsEvents
} from './sports.js';

describe('sports event status formatting', () => {
  it('includes the local date and time for scheduled events', () => {
    expect(
      formatSportsEventTiming(
        { startsAt: '2026-08-21T19:00:00.000Z', state: 'scheduled' },
        'Europe/Amsterdam'
      )
    ).toEqual({ primary: 'Fri 21:00', secondary: '21 Aug' });
  });

  it('keeps the date visible for live and completed events', () => {
    expect(
      formatSportsEventTiming(
        { startsAt: '2026-08-21T19:00:00.000Z', state: 'live' },
        'Europe/Amsterdam'
      )
    ).toEqual({ primary: 'LIVE', secondary: '21 Aug' });
    expect(
      formatSportsEventTiming(
        { startsAt: '2026-08-21T19:00:00.000Z', state: 'finished' },
        'Europe/Amsterdam'
      )
    ).toEqual({ primary: 'FT', secondary: '21 Aug' });
  });

  it('groups sessions from the same race weekend into one display event', () => {
    const common = {
      sport: 'Motorsport',
      competition: 'Formula 1',
      name: 'Hungarian GP',
      venue: 'Hungaroring',
      state: 'scheduled' as const,
      source: 'ESPN'
    };
    const groups = groupSportsEvents([
      {
        ...common,
        id: 'qualifying',
        type: 'qualifying',
        session: 'Qualifying',
        startsAt: '2026-07-25T14:00:00.000Z'
      },
      {
        ...common,
        id: 'race',
        type: 'race',
        session: 'Race',
        startsAt: '2026-07-26T13:00:00.000Z'
      }
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      type: 'sessions',
      name: 'Hungarian GP',
      sessions: [{ session: 'Qualifying' }, { session: 'Race' }]
    });
  });

  it('uses familiar compact motorsport session labels', () => {
    expect(formatCompactSportsSession('Qualifying')).toBe('Quali');
    expect(formatCompactSportsSession('Sprint qualifying')).toBe('Sprint Q');
    expect(formatCompactSportsSession('Practice 2')).toBe('FP2');
  });
});
