import type { ScoresWidgetInput, SportsEvent, SportsWidgetSettings } from '@inked/commons';

import type { WidgetDataFetchContext } from './types.js';

/** Replace this demo body with the production sports data integration. */
export async function fetchScoresWidgetInput(
  context: WidgetDataFetchContext,
  settings: SportsWidgetSettings
): Promise<ScoresWidgetInput> {
  if (context.sports) return context.sports.getWidgetInput(settings, context.now, context.timezone);
  const events: SportsEvent[] = [
    {
      id: 'nld-jpn',
      type: 'match',
      sport: 'Football',
      competition: 'World Cup · Group D',
      startsAt: context.now.toISOString(),
      state: 'live',
      source: 'Demo',
      home: 'NED',
      away: 'JPN',
      homeScore: 2,
      awayScore: 1
    },
    {
      id: 'arg-mar',
      type: 'match',
      sport: 'Football',
      competition: 'World Cup · Group B',
      startsAt: new Date(context.now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      state: 'scheduled',
      source: 'Demo',
      home: 'ARG',
      away: 'MAR'
    },
    {
      id: 'f1-race',
      type: 'race',
      sport: 'Motorsport',
      competition: 'Formula 1',
      startsAt: new Date(context.now.getTime() + 26 * 60 * 60 * 1000).toISOString(),
      state: 'scheduled',
      source: 'Demo',
      name: 'British GP',
      session: 'Race',
      venue: 'Silverstone'
    },
    {
      id: 'bra-nor',
      type: 'match',
      sport: 'Football',
      competition: 'World Cup · Group A',
      startsAt: new Date(context.now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
      state: 'scheduled',
      source: 'Demo',
      home: 'BRA',
      away: 'NOR'
    },
    {
      id: 'esp-usa',
      type: 'match',
      sport: 'Football',
      competition: 'World Cup · Group C',
      startsAt: new Date(context.now.getTime() + 72 * 60 * 60 * 1000).toISOString(),
      state: 'scheduled',
      source: 'Demo',
      home: 'ESP',
      away: 'USA'
    }
  ];
  const sportName: Record<string, string> = {
    football: 'Football',
    motorsport: 'Motorsport'
  };
  return {
    timezone: context.timezone,
    events: events.filter((event) => event.sport === sportName[settings.sportId])
  };
}
