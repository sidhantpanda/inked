import type { StockQuoteResult, StockRange, StockSearchResult } from '@inked/commons';

import type { StocksDataService } from '../stocks/index.js';
import { demoStockQuote } from '../widget-data/stocks.js';

/** Deterministic, offline StocksDataService for tests. `ZZZZ` is always unavailable. */
export class FakeStocksService implements StocksDataService {
  async search(query: string, limit = 8): Promise<StockSearchResult[]> {
    const symbol = query.trim().toUpperCase();
    if (!symbol) return [];
    return [{ symbol, name: `${symbol} Inc.`, exchange: 'NASDAQ', type: 'Equity' }].slice(0, limit);
  }

  async getQuotes(symbols: string[], range: StockRange): Promise<StockQuoteResult[]> {
    const now = new Date('2026-11-13T21:00:00.000Z');
    return symbols.map((symbol) =>
      symbol === 'ZZZZ'
        ? { state: 'unavailable', symbol }
        : { ...demoStockQuote(symbol, range, now), state: 'ok', source: 'Fake' }
    );
  }
}
