import type {
  ScoresWidgetInput,
  SportsCatalog,
  SportsCatalogTeam,
  SportsFollow,
  SportsWidgetSettings
} from '@inked/commons';

import { SportsCache } from './cache.js';
import { buildSportsCatalog, SPORTS_COMPETITIONS } from './catalog.js';
import { orderSportsEvents, toWidgetEvent } from './events.js';
import { SourceFallback } from './fallback.js';
import { matchesFollows, teamId } from './follows.js';
import { createSportsProviders } from './providers.js';
import type { SportsCompetitionRoute, SportsDataService, SportsProvider } from './types.js';

const TEAM_CACHE_MS = 24 * 60 * 60 * 1000;
const EVENT_CACHE_MS = 15 * 60 * 1000;

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class DefaultSportsService implements SportsDataService {
  private readonly catalog: SportsCatalog;
  private readonly sources: SourceFallback;

  constructor(
    private readonly routes: SportsCompetitionRoute[] = SPORTS_COMPETITIONS,
    providers: SportsProvider[] = createSportsProviders(),
    private readonly cache = new SportsCache()
  ) {
    this.sources = new SourceFallback(providers);
    this.catalog = buildSportsCatalog(routes);
  }

  getCatalog(): SportsCatalog {
    return this.catalog;
  }

  async getTeams(competitionId: string): Promise<SportsCatalogTeam[]> {
    const route = this.routes.find((candidate) => candidate.id === competitionId);
    if (!route) throw new Error(`Unknown sports competition: ${competitionId}`);
    if (!route.supportsTeams) return [];
    const { value } = await this.sources.load(route, (source, candidate) =>
      this.cache.getOrLoad(`teams:${source.providerId}:${source.ref.id}`, TEAM_CACHE_MS, () =>
        candidate.getTeams(source.ref)
      )
    );
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
          const { provider, value } = await this.sources.load(route, (source, candidate) =>
            this.cache.getOrLoad(
              `events:${source.providerId}:${source.ref.id}:${dateKey(from)}:${dateKey(to)}`,
              EVENT_CACHE_MS,
              () => candidate.getEvents({ competition: source.ref, from, to })
            )
          );
          const sportName =
            this.catalog.sports.find((sport) => sport.id === route.sportId)?.name ?? route.sportId;
          return value
            .filter((event) => matchesFollows(event, follows, route))
            .map((event) => toWidgetEvent(event, route, provider, sportName));
        } catch {
          return [];
        }
      })
    );

    return { events: orderSportsEvents(batches.flat()), timezone };
  }
}

export function createDefaultSportsService(): DefaultSportsService {
  return new DefaultSportsService(SPORTS_COMPETITIONS, createSportsProviders());
}
