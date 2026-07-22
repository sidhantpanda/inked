import type {
  ScoresWidgetInput,
  SportsCatalog,
  SportsCatalogCompetition,
  SportsCatalogTeam,
  SportsEventState,
  SportsEventType,
  SportsWidgetSettings
} from '@inked/commons';

export interface SportsProviderCompetitionRef {
  /** Provider-specific sport/league path, for example `soccer/eng.1`. */
  id: string;
  kind: 'match' | 'racing';
}

export interface SportsCompetitionSource {
  providerId: string;
  ref: SportsProviderCompetitionRef;
}

export interface SportsCompetitionRoute extends SportsCatalogCompetition {
  /** Ordered primary and backup sources. */
  sources: SportsCompetitionSource[];
}

export interface ProviderSportsTeam {
  id: string;
  name: string;
  abbreviation: string;
}

interface ProviderSportsEventBase {
  id: string;
  type: SportsEventType;
  startsAt: string;
  state: SportsEventState;
}

export interface ProviderMatchEvent extends ProviderSportsEventBase {
  type: 'match';
  home: ProviderSportsTeam;
  away: ProviderSportsTeam;
  homeScore?: number;
  awayScore?: number;
}

export interface ProviderSessionEvent extends ProviderSportsEventBase {
  type: Exclude<SportsEventType, 'match'>;
  name: string;
  session: string;
  venue?: string;
}

export type ProviderSportsEvent = ProviderMatchEvent | ProviderSessionEvent;

export interface SportsProviderRequest {
  competition: SportsProviderCompetitionRef;
  from: Date;
  to: Date;
}

/** Add a source by implementing this interface and registering it by id. */
export interface SportsProvider {
  id: string;
  name: string;
  getTeams(competition: SportsProviderCompetitionRef): Promise<ProviderSportsTeam[]>;
  getEvents(request: SportsProviderRequest): Promise<ProviderSportsEvent[]>;
}

export interface SportsDataService {
  getCatalog(): SportsCatalog;
  getTeams(competitionId: string): Promise<SportsCatalogTeam[]>;
  getWidgetInput(
    settings: SportsWidgetSettings,
    now: Date,
    timezone: string
  ): Promise<ScoresWidgetInput>;
}
