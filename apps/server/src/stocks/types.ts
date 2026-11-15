import type { StockQuote, StockQuoteResult, StockRange, StockSearchResult } from '@inked/commons';

/** A normalized quote as returned by one provider, before Inked tags its source. */
export type ProviderStockQuote = Omit<StockQuote, 'source' | 'state'>;

/**
 * Thrown when a provider answers but does not know the symbol. The service
 * tries the next provider without cooling this one down, because the provider
 * itself is healthy.
 */
export class StockSymbolNotFoundError extends Error {
  constructor(symbol: string, provider: string) {
    super(`${provider} has no data for ${symbol}`);
    this.name = 'StockSymbolNotFoundError';
  }
}

/** Add a source by implementing this interface and registering it in providers.ts. */
export interface StocksProvider {
  id: string;
  name: string;
  getQuote(symbol: string, range: StockRange): Promise<ProviderStockQuote>;
  /** Optional; the service asks providers in order until one can search. */
  search?(query: string, limit: number): Promise<StockSearchResult[]>;
}

export interface StocksDataService {
  search(query: string, limit?: number): Promise<StockSearchResult[]>;
  getQuotes(symbols: string[], range: StockRange): Promise<StockQuoteResult[]>;
}
