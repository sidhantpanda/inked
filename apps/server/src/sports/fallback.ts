import type { SportsCompetitionRoute, SportsProvider } from './types.js';

const FAILURE_COOLDOWN_MS = 60 * 1000;

/**
 * Tries a competition's sources in priority order, skipping registered-but-failing
 * sources for a cooldown so one outage doesn't slow every request.
 */
export class SourceFallback {
  private readonly providerMap: Map<string, SportsProvider>;
  private readonly unavailableUntil = new Map<string, number>();

  constructor(providers: SportsProvider[]) {
    this.providerMap = new Map(providers.map((provider) => [provider.id, provider]));
  }

  async load<T>(
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
