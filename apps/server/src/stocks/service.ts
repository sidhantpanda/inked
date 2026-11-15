import {
  normalizeStockSymbols,
  type StockQuoteResult,
  type StockRange,
  type StockSearchResult
} from '@inked/commons';

import { TtlCache } from '../ttl-cache.js';
import { createStocksProviders } from './providers.js';
import {
  StockSymbolNotFoundError,
  type ProviderStockQuote,
  type StocksDataService,
  type StocksProvider
} from './types.js';

/** Free quotes are ~15 minutes delayed; a short TTL still absorbs studio edits. */
const QUOTE_CACHE_MS = 5 * 60 * 1000;
const SEARCH_CACHE_MS = 60 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 60 * 1000;

export class DefaultStocksService implements StocksDataService {
  private readonly unavailableUntil = new Map<string, number>();

  constructor(
    private readonly providers: StocksProvider[] = createStocksProviders(),
    private readonly cache = new TtlCache()
  ) {}

  async search(query: string, limit = 8): Promise<StockSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const failures: string[] = [];
    for (const provider of this.providers) {
      if (!provider.search || this.coolingDown(provider)) continue;
      try {
        const results = await this.cache.getOrLoad(
          `search:${provider.id}:${trimmed.toLowerCase()}:${limit}`,
          SEARCH_CACHE_MS,
          () => provider.search!(trimmed, limit)
        );
        this.unavailableUntil.delete(provider.id);
        return results;
      } catch (error) {
        this.markFailed(provider);
        failures.push(`${provider.name}: ${(error as Error).message}`);
      }
    }
    if (failures.length > 0) throw new Error(`Stock search failed (${failures.join('; ')}).`);
    return [];
  }

  /** Quotes every symbol independently, so one bad ticker never blanks the panel. */
  async getQuotes(symbols: string[], range: StockRange): Promise<StockQuoteResult[]> {
    return Promise.all(
      normalizeStockSymbols(symbols).map(async (symbol): Promise<StockQuoteResult> => {
        try {
          const { provider, quote } = await this.quoteWithFallback(symbol, range);
          return { ...quote, state: 'ok', source: provider.name };
        } catch {
          return { state: 'unavailable', symbol };
        }
      })
    );
  }

  private async quoteWithFallback(
    symbol: string,
    range: StockRange
  ): Promise<{ provider: StocksProvider; quote: ProviderStockQuote }> {
    const failures: string[] = [];
    for (const provider of this.providers) {
      if (this.coolingDown(provider)) {
        failures.push(`${provider.name}: cooling down`);
        continue;
      }
      try {
        const quote = await this.cache.getOrLoad(
          `quote:${provider.id}:${symbol}:${range}`,
          QUOTE_CACHE_MS,
          () => provider.getQuote(symbol, range)
        );
        this.unavailableUntil.delete(provider.id);
        return { provider, quote };
      } catch (error) {
        // An unknown ticker says nothing about the provider's health.
        if (!(error instanceof StockSymbolNotFoundError)) this.markFailed(provider);
        failures.push(`${provider.name}: ${(error as Error).message}`);
      }
    }
    throw new Error(`No stock source available for ${symbol} (${failures.join('; ')}).`);
  }

  private coolingDown(provider: StocksProvider): boolean {
    return (this.unavailableUntil.get(provider.id) ?? 0) > Date.now();
  }

  private markFailed(provider: StocksProvider) {
    this.unavailableUntil.set(provider.id, Date.now() + FAILURE_COOLDOWN_MS);
  }
}

export function createDefaultStocksService(): DefaultStocksService {
  return new DefaultStocksService(createStocksProviders());
}
