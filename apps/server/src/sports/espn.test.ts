import { describe, expect, it, vi } from 'vitest';

import { EspnSportsProvider } from './espn.js';

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

describe('ESPN sports provider', () => {
  it('normalizes teams and matches without leaking ESPN ids into settings', async () => {
    const request = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('/teams')) {
        return response({
          sports: [
            {
              leagues: [
                {
                  teams: [
                    {
                      team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS' }
                    }
                  ]
                }
              ]
            }
          ]
        });
      }
      return response({
        events: [
          {
            id: '401',
            date: '2026-08-21T19:00:00Z',
            status: { type: { state: 'pre', completed: false } },
            competitions: [
              {
                date: '2026-08-21T19:00:00Z',
                status: { type: { state: 'pre', completed: false } },
                competitors: [
                  {
                    homeAway: 'home',
                    team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS' }
                  },
                  {
                    homeAway: 'away',
                    team: { id: '364', displayName: 'Liverpool', abbreviation: 'LIV' }
                  }
                ]
              }
            ]
          }
        ]
      });
    });
    const provider = new EspnSportsProvider(request);
    const competition = { id: 'soccer/eng.1', kind: 'match' as const };

    expect(await provider.getTeams(competition)).toEqual([
      { id: '359', name: 'Arsenal', abbreviation: 'ARS' }
    ]);
    expect(
      await provider.getEvents({
        competition,
        from: new Date('2026-08-20T00:00:00Z'),
        to: new Date('2026-08-22T00:00:00Z')
      })
    ).toEqual([
      {
        id: '401',
        type: 'match',
        startsAt: '2026-08-21T19:00:00Z',
        state: 'scheduled',
        home: { id: '359', name: 'Arsenal', abbreviation: 'ARS' },
        away: { id: '364', name: 'Liverpool', abbreviation: 'LIV' }
      }
    ]);
  });

  it('expands an F1 weekend into selectable sessions', async () => {
    const request = vi.fn(async () =>
      response({
        events: [
          {
            id: '600',
            shortName: 'Hungarian GP',
            circuit: { fullName: 'Hungaroring' },
            competitions: [
              {
                id: 'fp1',
                date: '2026-07-24T11:30Z',
                type: { abbreviation: 'FP1' },
                status: { type: { state: 'pre' } }
              },
              {
                id: 'qual',
                date: '2026-07-25T14:00Z',
                type: { abbreviation: 'Qual' },
                status: { type: { state: 'pre' } }
              },
              {
                id: 'race',
                date: '2026-07-26T13:00Z',
                type: { abbreviation: 'Race' },
                status: { type: { state: 'pre' } }
              }
            ]
          }
        ]
      })
    );
    const provider = new EspnSportsProvider(request);
    const events = await provider.getEvents({
      competition: { id: 'racing/f1', kind: 'racing' },
      from: new Date('2026-07-21T00:00:00Z'),
      to: new Date('2026-07-28T00:00:00Z')
    });

    expect(events.map((event) => event.type)).toEqual(['practice', 'qualifying', 'race']);
    expect(events[2]).toMatchObject({
      name: 'Hungarian GP',
      session: 'Race',
      venue: 'Hungaroring'
    });
  });
});
