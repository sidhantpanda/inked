import type {
  ScoresWidgetInput,
  SportsCatalog,
  SportsCatalogTeam,
  SportsEvent,
  SportsFollow,
  SportsWidgetSettings
} from '@inked/commons';

import { SportsCache } from './cache.js';
import { buildSportsCatalog, SPORTS_COMPETITIONS } from './catalog.js';
import { createSportsProviders } from './providers.js';
import type {
  ProviderSportsEvent,
  SportsCompetitionRoute,
  SportsDataService,
  SportsProvider
} from './types.js';

const TEAM_CACHE_MS = 24 * 60 * 60 * 1000;
const EVENT_CACHE_MS = 15 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 60 * 1000;

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function teamId(competitionId: string, name: string): string {
  return `${competitionId}:${slug(name)}`;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function statePriority(event: SportsEvent): number {
  if (event.state === 'live') return 0;
  if (event.state === 'scheduled') return 1;
  if (event.state === 'postponed') return 2;
  return 3;
}

export class DefaultSportsService implements SportsDataService {
  private readonly providerMap: Map<string, SportsProvider>;
  private readonly catalog: SportsCatalog;
  private readonly unavailableUntil = new Map<string, number>();

  constructor(
    private readonly routes: SportsCompetitionRoute[] = SPORTS_COMPETITIONS,
    providers: SportsProvider[] = createSportsProviders(),
    private readonly cache = new SportsCache()
  ) {
    this.providerMap = new Map(providers.map((provider) => [provider.id, provider]));
    this.catalog = buildSportsCatalog(routes);
  }

  getCatalog(): SportsCatalog {
    return this.catalog;
  }

  async getTeams(competitionId: string): Promise<SportsCatalogTeam[]> {
    const route = this.routes.find((candidate) => candidate.id === competitionId);
    if (!route) throw new Error(`Unknown sports competition: ${competitionId}`);
    if (!route.supportsTeams) return [];
    const { provider, value } = await this.withFallback(route, (source, candidate) =>
      this.cache.getOrLoad(`teams:${source.providerId}:${source.ref.id}`, TEAM_CACHE_MS, () =>
        candidate.getTeams(source.ref)
      )
    );
    void provider;
    return value.map((team) => ({
      id: teamId(route.id, team.name),
      competitionId: route.id,
      name: team.name,
      abbreviation: team.abbreviation
    }));
  }

  async getWidgetInput(
    settings: SportsWidgetSettings,
    now: Date,
    timezone: string
  ): Promise<ScoresWidgetInput> {
    const from = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + settings.horizonDays * 24 * 60 * 60 * 1000);
    const followsByCompetition = new Map<string, SportsFollow[]>();
    for (const follow of settings.follows.filter(
      (candidate) => candidate.sportId === settings.sportId
    )) {
      followsByCompetition.set(follow.competitionId, [
        ...(followsByCompetition.get(follow.competitionId) ?? []),
        follow
      ]);
    }
    const batches = await Promise.all(
      [...followsByCompetition].map(async ([competitionId, follows]) => {
        const route = this.routes.find((candidate) => candidate.id === competitionId);
        if (route?.sportId !== settings.sportId) return [];
        try {
          const { provider, value } = await this.withFallback(route, (source, candidate) =>
            this.cache.getOrLoad(
              `events:${source.providerId}:${source.ref.id}:${dateKey(from)}:${dateKey(to)}`,
              EVENT_CACHE_MS,
              () => candidate.getEvents({ competition: source.ref, from, to })
            )
          );
          return value
            .filter((event) => this.matchesFollows(event, follows, route))
            .map((event) => this.toWidgetEvent(event, route, provider));
        } catch {
          return [];
        }
      })
    );

    const deduplicated = new Map<string, SportsEvent>();
    for (const event of batches.flat()) deduplicated.set(event.id, event);
    const events = [...deduplicated.values()].sort((left, right) => {
      const priority = statePriority(left) - statePriority(right);
      return priority || left.startsAt.localeCompare(right.startsAt);
    });
    return { events, timezone };
  }

  private matchesFollows(
    event: ProviderSportsEvent,
    follows: SportsFollow[],
    route: SportsCompetitionRoute
  ): boolean {
    return follows.some((follow) => {
      const eventTypes = follow.eventTypes.length > 0 ? follow.eventTypes : route.eventTypes;
      if (!eventTypes.includes(event.type)) return false;
      if (follow.kind === 'competition') return true;
      if (event.type !== 'match') return false;
      return (
        teamId(route.id, event.home.name) === follow.teamId ||
        teamId(route.id, event.away.name) === follow.teamId
      );
    });
  }

  private toWidgetEvent(
    event: ProviderSportsEvent,
    route: SportsCompetitionRoute,
    provider: SportsProvider
  ): SportsEvent {
    const common = {
      id: `${provider.id}:${event.id}`,
      sport: this.catalog.sports.find((sport) => sport.id === route.sportId)?.name ?? route.sportId,
      competition: route.name,
      startsAt: event.startsAt,
      state: event.state,
      source: provider.name
    };
    if (event.type === 'match') {
      return {
        ...common,
        type: 'match',
        home: event.home.abbreviation || event.home.name,
        away: event.away.abbreviation || event.away.name,
        ...(event.homeScore !== undefined ? { homeScore: event.homeScore } : {}),
        ...(event.awayScore !== undefined ? { awayScore: event.awayScore } : {})
      };
    }
    return {
      ...common,
      type: event.type,
      name: event.name,
      session: event.session,
      ...(event.venue ? { venue: event.venue } : {})
    };
  }

  private async withFallback<T>(
    route: SportsCompetitionRoute,
    load: (
      source: SportsCompetitionRoute['sources'][number],
      provider: SportsProvider
    ) => Promise<T>
  ): Promise<{ provider: SportsProvider; value: T }> {
    const failures: string[] = [];
    for (const source of route.sources) {
      const sourceKey = `${route.id}:${source.providerId}`;
      if ((this.unavailableUntil.get(sourceKey) ?? 0) > Date.now()) {
        failures.push(`${source.providerId}: cooling down`);
        continue;
      }
      const provider = this.providerMap.get(source.providerId);
      if (!provider) {
        failures.push(`${source.providerId}: not registered`);
        continue;
      }
      try {
        const value = await load(source, provider);
        this.unavailableUntil.delete(sourceKey);
        return { provider, value };
      } catch (error) {
        this.unavailableUntil.set(sourceKey, Date.now() + FAILURE_COOLDOWN_MS);
        failures.push(`${provider.name}: ${(error as Error).message}`);
      }
    }
    throw new Error(`No sports source available for ${route.name} (${failures.join('; ')}).`);
  }
}

export function createDefaultSportsService(): DefaultSportsService {
  return new DefaultSportsService(SPORTS_COMPETITIONS, createSportsProviders());
}
