import type {
  ScoresWidgetInput,
  SportsCatalog,
  SportsCatalogTeam,
  SportsWidgetSettings
} from '@inked/commons';

import type { SportsDataService } from '../sports/index.js';

export class FakeSportsService implements SportsDataService {
  getCatalog(): SportsCatalog {
    return {
      sports: [
        {
          id: 'football',
          name: 'Football',
          competitions: [
            {
              id: 'premier-league',
              sportId: 'football',
              name: 'Premier League',
              supportsTeams: true,
              eventTypes: ['match']
            }
          ]
        }
      ]
    };
  }

  async getTeams(competitionId: string): Promise<SportsCatalogTeam[]> {
    return [
      {
        id: `${competitionId}:arsenal`,
        competitionId,
        name: 'Arsenal',
        abbreviation: 'ARS'
      }
    ];
  }

  async getWidgetInput(
    _settings: SportsWidgetSettings,
    now: Date,
    timezone: string
  ): Promise<ScoresWidgetInput> {
    return {
      timezone,
      events: [
        {
          id: 'fake-match',
          type: 'match',
          sport: 'Football',
          competition: 'Premier League',
          startsAt: now.toISOString(),
          state: 'scheduled',
          source: 'Fake',
          home: 'ARS',
          away: 'LIV'
        }
      ]
    };
  }
}
