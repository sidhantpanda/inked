import { describe, expect, it, vi } from 'vitest';

import type { StockRange } from '@inked/commons';

import { demoStockQuote } from '../widget-data/stocks.js';
import { DefaultStocksService } from './service.js';
import { StockSymbolNotFoundError, type StocksProvider } from './types.js';

const NOW = new Date('2026-11-13T21:00:00.000Z');

function provider(
  id: string,
  getQuote: (symbol: string, range: StockRange) => Promise<ReturnType<typeof demoStockQuote>>
): StocksProvider & { getQuote: ReturnType<typeof vi.fn> } {
  return { id, name: id.toUpperCase(), getQuote: vi.fn(getQuote) };
}

describe('stocks service', () => {
  it('falls through to the backup provider and tags the source', async () => {
    const primary = provider('primary', async () => {
      throw new Error('503');
    });
    const backup = provider('backup', async (symbol, range) => demoStockQuote(symbol, range, NOW));
    const service = new DefaultStocksService([primary, backup]);

    const [quote] = await service.getQuotes(['aapl'], '1d');
    expect(quote).toMatchObject({ state: 'ok', symbol: 'AAPL', source: 'BACKUP' });

    // The failed primary cools down instead of being retried on every symbol.
    await service.getQuotes(['MSFT'], '1d');
    expect(primary.getQuote).toHaveBeenCalledTimes(1);
  });

  it('does not cool down a provider for an unknown ticker', async () => {
    const primary = provider('primary', async (symbol, range) => {
      if (symbol === 'NOPE') throw new StockSymbolNotFoundError(symbol, 'primary');
      return demoStockQuote(symbol, range, NOW);
    });
    const service = new DefaultStocksService([primary]);
    const quotes = await service.getQuotes(['NOPE', 'AAPL'], '1d');
    expect(quotes.map((quote) => quote.state)).toEqual(['unavailable', 'ok']);
  });

  it('caches quotes and coalesces concurrent requests', async () => {
    const primary = provider('primary', async (symbol, range) =>
      demoStockQuote(symbol, range, NOW)
    );
    const service = new DefaultStocksService([primary]);
    await Promise.all([service.getQuotes(['AAPL'], '1d'), service.getQuotes(['AAPL'], '1d')]);
    await service.getQuotes(['AAPL'], '1d');
    await service.getQuotes(['AAPL'], '5d');
    expect(primary.getQuote).toHaveBeenCalledTimes(2);
  });

  it('searches with the first provider that supports it', async () => {
    const quoteOnly = provider('quote-only', async (symbol, range) =>
      demoStockQuote(symbol, range, NOW)
    );
    const searchable: StocksProvider = {
      ...provider('search', async (symbol, range) => demoStockQuote(symbol, range, NOW)),
      search: vi.fn(async () => [
        { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'Equity' }
      ])
    };
    const service = new DefaultStocksService([quoteOnly, searchable]);
    expect(await service.search('apple')).toHaveLength(1);
    expect(await service.search('  ')).toEqual([]);
  });
});
