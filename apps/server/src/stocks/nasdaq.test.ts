import { describe, expect, it, vi } from 'vitest';

import { NOW, response, SESSION_END, SESSION_START, urlOf } from '../testing/http-fixtures.js';
import { NasdaqStocksProvider } from './nasdaq.js';
import { StockSymbolNotFoundError } from './types.js';

describe('Nasdaq stocks provider', () => {
  it('converts wall-clock chart times and keeps only the regular session', async () => {
    // Nasdaq stamps 09:30 New York as 09:30 "UTC".
    const wall = (hours: number, minutes: number) => Date.UTC(2026, 10, 13, hours, minutes);
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = urlOf(input);
      if (url.pathname.endsWith('/info')) {
        return response({
          data: {
            companyName: 'Apple Inc. Common Stock',
            marketStatus: 'Closed',
            primaryData: { lastSalePrice: '$356.27', netChange: '+1.39' }
          }
        });
      }
      return response({
        data: {
          previousClose: '$354.88',
          chart: [
            { x: wall(4, 0), y: 356.1 },
            { x: wall(9, 30), y: 359.2 },
            { x: wall(16, 0), y: 356.27 },
            { x: wall(19, 0), y: 356.4 }
          ]
        }
      });
    });
    const provider = new NasdaqStocksProvider(fetchImpl, () => NOW);
    const quote = await provider.getQuote('AAPL', '1d');
    expect(quote).toMatchObject({ name: 'Apple Inc.', price: 356.27, marketState: 'closed' });
    expect(quote.previousClose).toBeCloseTo(354.88);
    expect(quote.chart.points.map((point) => point.value)).toEqual([359.2, 356.27]);
    expect(quote.chart.start).toBe(SESSION_START * 1000);
    expect(quote.chart.end).toBe(SESSION_END * 1000);
  });

  it('maps share classes and skips indexes it does not carry', async () => {
    const fetchImpl = vi.fn(async (_input: string | URL | Request) =>
      response({ data: null, status: { rCode: 400 } })
    );
    const provider = new NasdaqStocksProvider(fetchImpl, () => NOW);
    await expect(provider.getQuote('^GSPC', '1d')).rejects.toBeInstanceOf(StockSymbolNotFoundError);
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(provider.getQuote('BRK-B', '1d')).rejects.toBeInstanceOf(StockSymbolNotFoundError);
    expect(urlOf(fetchImpl.mock.calls[0]![0]).pathname).toContain('/BRK.B/');
  });
});
