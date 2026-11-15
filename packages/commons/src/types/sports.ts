export const SPORTS_EVENT_TYPES = ['match', 'practice', 'qualifying', 'sprint', 'race'] as const;

export type SportsEventType = (typeof SPORTS_EVENT_TYPES)[number];

/** A league/series or one team that a single Sports panel follows. */
export type SportsFollow =
  | {
      kind: 'competition';
      sportId: string;
      competitionId: string;
      /** Motorsport panels can choose race-only or include other sessions. */
      eventTypes: SportsEventType[];
    }
  | {
      kind: 'team';
      sportId: string;
      competitionId: string;
      teamId: string;
      eventTypes: SportsEventType[];
    };

export interface SportsWidgetSettings {
  /** A Sports panel is scoped to exactly one sport category. */
  sportId: string;
  follows: SportsFollow[];
  horizonDays: 7 | 30 | 90;
}

/** Provider-neutral catalog returned by the server for the Sports picker. */
export interface SportsCatalog {
  sports: SportsCatalogSport[];
}

export interface SportsCatalogSport {
  id: string;
  name: string;
  competitions: SportsCatalogCompetition[];
}

export interface SportsCatalogCompetition {
  id: string;
  sportId: string;
  name: string;
  supportsTeams: boolean;
  eventTypes: SportsEventType[];
}

export interface SportsCatalogTeam {
  id: string;
  competitionId: string;
  name: string;
  abbreviation: string;
}

export type SportsEventState = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

interface SportsEventBase {
  id: string;
  type: SportsEventType;
  sport: string;
  competition: string;
  startsAt: string;
  state: SportsEventState;
  source: string;
}

export interface SportsMatchEvent extends SportsEventBase {
  type: 'match';
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
}

export interface SportsSessionEvent extends SportsEventBase {
  type: Exclude<SportsEventType, 'match'>;
  name: string;
  session: string;
  venue?: string;
}

export type SportsEvent = SportsMatchEvent | SportsSessionEvent;

export interface ScoresWidgetInput {
  events: SportsEvent[];
  timezone: string;
}
