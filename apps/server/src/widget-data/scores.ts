import type { ScoresWidgetInput } from '@inked/commons';

import type { WidgetDataFetchContext } from './types.js';

/** Replace this demo body with the production sports data integration. */
export async function fetchScoresWidgetInput(
  _context: WidgetDataFetchContext
): Promise<ScoresWidgetInput> {
  return {
    games: [
      {
        id: 'nld-jpn',
        competition: 'World Cup · Group D',
        home: 'NED',
        away: 'JPN',
        homeScore: 2,
        awayScore: 1,
        status: '67′',
        live: true
      },
      {
        id: 'arg-mar',
        competition: 'World Cup · Group B',
        home: 'ARG',
        away: 'MAR',
        homeScore: 0,
        awayScore: 0,
        status: '20:00',
        live: false
      },
      {
        id: 'usa-kor',
        competition: 'World Cup · Group F',
        home: 'USA',
        away: 'KOR',
        homeScore: 0,
        awayScore: 0,
        status: 'Tomorrow',
        live: false
      },
      {
        id: 'bra-nor',
        competition: 'World Cup · Group A',
        home: 'BRA',
        away: 'NOR',
        homeScore: 0,
        awayScore: 0,
        status: 'Thu',
        live: false
      }
    ]
  };
}
