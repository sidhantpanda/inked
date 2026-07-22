import type {
  ScoresWidgetInput,
  SportsMatchEvent,
  SportsPreviewPresetId,
  SportsSessionEvent
} from '@inked/commons';

interface MatchPreset {
  sport: string;
  competition: string;
  teams: [home: string, away: string][];
  liveScore: [home: number, away: number];
}

type MatchPreviewPresetId = Exclude<SportsPreviewPresetId, 'motorsport'>;

const MATCH_DATA: Record<MatchPreviewPresetId, MatchPreset> = {
  football: {
    sport: 'Football',
    competition: 'Premier League',
    teams: [
      ['ARS', 'LIV'],
      ['MCI', 'CHE'],
      ['NEW', 'MUN'],
      ['TOT', 'AVL']
    ],
    liveScore: [2, 1]
  },
  basketball: {
    sport: 'Basketball',
    competition: 'NBA',
    teams: [
      ['NYK', 'BOS'],
      ['LAL', 'GSW'],
      ['DEN', 'OKC'],
      ['MIL', 'MIA']
    ],
    liveScore: [98, 94]
  },
  'american-football': {
    sport: 'American football',
    competition: 'NFL',
    teams: [
      ['KC', 'BUF'],
      ['SF', 'DAL'],
      ['GB', 'DET'],
      ['PHI', 'BAL']
    ],
    liveScore: [21, 17]
  },
  baseball: {
    sport: 'Baseball',
    competition: 'MLB',
    teams: [
      ['NYY', 'BOS'],
      ['LAD', 'SD'],
      ['CHC', 'STL'],
      ['HOU', 'SEA']
    ],
    liveScore: [4, 3]
  },
  'ice-hockey': {
    sport: 'Ice hockey',
    competition: 'NHL',
    teams: [
      ['TOR', 'MTL'],
      ['EDM', 'VAN'],
      ['NYR', 'BOS'],
      ['COL', 'VGK']
    ],
    liveScore: [3, 2]
  }
};

function at(now: Date, hours: number): string {
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function matchInput(
  presetId: MatchPreviewPresetId,
  now: Date,
  timezone: string
): ScoresWidgetInput {
  const preset = MATCH_DATA[presetId];
  const offsets = [-1, 25, 50, 74];
  const events: SportsMatchEvent[] = preset.teams.map(([home, away], index) => ({
    id: `preview-${presetId}-${index}`,
    type: 'match',
    sport: preset.sport,
    competition: preset.competition,
    startsAt: at(now, offsets[index] ?? 0),
    state: index === 0 ? 'live' : 'scheduled',
    source: 'Preview',
    home,
    away,
    ...(index === 0 ? { homeScore: preset.liveScore[0], awayScore: preset.liveScore[1] } : {})
  }));
  return { events, timezone };
}

function motorsportInput(now: Date, timezone: string): ScoresWidgetInput {
  const weekends = [
    ['Belgian Grand Prix', 'Circuit de Spa-Francorchamps', 48],
    ['Dutch Grand Prix', 'Circuit Zandvoort', 216],
    ['Italian Grand Prix', 'Monza', 384],
    ['Singapore Grand Prix', 'Marina Bay', 552]
  ] as const;
  const events: SportsSessionEvent[] = weekends.flatMap(([name, venue, start], index) => [
    {
      id: `preview-f1-${index}-qualifying`,
      type: 'qualifying',
      sport: 'Motorsport',
      competition: 'Formula 1',
      startsAt: at(now, start),
      state: 'scheduled',
      source: 'Preview',
      name,
      session: 'Qualifying',
      venue
    },
    {
      id: `preview-f1-${index}-race`,
      type: 'race',
      sport: 'Motorsport',
      competition: 'Formula 1',
      startsAt: at(now, start + 24),
      state: 'scheduled',
      source: 'Preview',
      name,
      session: 'Race',
      venue
    }
  ]);
  return { events, timezone };
}

export function createSportsPreviewInput(
  presetId: SportsPreviewPresetId,
  now = new Date(),
  timezone = 'Europe/Amsterdam'
): ScoresWidgetInput {
  return presetId === 'motorsport'
    ? motorsportInput(now, timezone)
    : matchInput(presetId, now, timezone);
}
