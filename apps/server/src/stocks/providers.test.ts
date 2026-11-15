import { describe, expect, it, vi } from 'vitest';

import { NasdaqStocksProvider } from './nasdaq.js';
import { StockSymbolNotFoundError } from './types.js';
import { YahooFinanceStocksProvider } from './yahoo.js';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function urlOf(input: string | URL | Request) {
  return new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
}

// Fri 13 Nov 2026, regular session 14:30–21:00 UTC (09:30–16:00 New York).
const SESSION_START = 1794580200;
const SESSION_END = 1794603600;
const NOW = Date.UTC(2026, 10, 15, 10); // Sunday: market closed.

function yahooChart(timestamps: number[], closes: (number | null)[], meta: object = {}) {
  return {
    chart: {
      result: [
        {
          meta: {
            currency: 'USD',
            symbol: 'AAPL',
            exchangeTimezoneName: 'America/New_York',
            regularMarketPrice: 356.27,
            regularMarketTime: SESSION_END + 1,
            regularMarketDayHigh: 360.83,
            regularMarketDayLow: 355.755,
            longName: 'Apple Inc.',
            previousClose: 354.88,
            chartPreviousClose: 354.88,
            currentTradingPeriod: {
              pre: { start: SESSION_START - 19800, end: SESSION_START },
              regular: { start: SESSION_START, end: SESSION_END },
              post: { start: SESSION_END, end: SESSION_END + 14400 }
            },
            tradingPeriods: [[{ start: SESSION_START, end: SESSION_END }]],
            ...meta
          },
          timestamp: timestamps,
          indicators: { quote: [{ close: closes }] }
        }
      ],
      error: null
    }
  };
}

describe('Yahoo Finance stocks provider', () => {
  it('normalizes a 1D quote with the full session as the chart domain', async () => {
    const fetchImpl = vi.fn(async () =>
      response(
        yahooChart([SESSION_START, SESSION_START + 300, SESSION_START + 600], [359.2, null, 356.27])
      )
    );
    const provider = new YahooFinanceStocksProvider(fetchImpl, () => NOW);
    const quote = await provider.getQuote('AAPL', '1d');

    expect(urlOf(fetchImpl.mock.calls[0]![0] as string).searchParams.get('interval')).toBe('5m');
    expect(quote).toMatchObject({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 356.27,
      previousClose: 354.88,
      dayHigh: 360.83,
      marketState: 'closed'
    });
    expect(quote.change).toBeCloseTo(1.39);
    expect(quote.changePercent).toBeCloseTo(0.392, 2);
    expect(quote.chart.points).toHaveLength(2);
    expect(quote.chart).toMatchObject({
      range: '1d',
      reference: 354.88,
      start: SESSION_START * 1000,
      end: SESSION_END * 1000
    });
  });

  it('reports an open market during the regular session', async () => {
    const fetchImpl = vi.fn(async () =>
      response(yahooChart([SESSION_START, SESSION_START + 300], [359, 358]))
    );
    const provider = new YahooFinanceStocksProvider(fetchImpl, () => (SESSION_START + 3600) * 1000);
    expect((await provider.getQuote('AAPL', '1d')).marketState).toBe('open');
  });

  it('falls back to the last complete session before the first trade of the day', async () => {
    const dayBefore = SESSION_START - 86_400;
    const fetchImpl = vi.fn(async (input: string | URL | Request) =>
      urlOf(input).searchParams.get('range') === '1d'
        ? response(yahooChart([], []))
        : response(
            yahooChart(
              [dayBefore, dayBefore + 300, SESSION_START, SESSION_START + 300],
              [350, 351, 355, 356],
              {
                previousClose: undefined
              }
            )
          )
    );
    const provider = new YahooFinanceStocksProvider(fetchImpl, () => NOW);
    const quote = await provider.getQuote('AAPL', '1d');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(quote.chart.points.map((point) => point.value)).toEqual([355, 356]);
    expect(quote.previousClose).toBe(351);
  });

  it('derives the day change for daily windows that omit previousClose', async () => {
    const day = 86_400;
    const fetchImpl = vi.fn(async () =>
      response(
        yahooChart(
          [SESSION_START - 2 * day, SESSION_START - day, SESSION_START],
          [340, 350, 356.27],
          { previousClose: undefined, chartPreviousClose: 320 }
        )
      )
    );
    const provider = new YahooFinanceStocksProvider(fetchImpl, () => NOW);
    const quote = await provider.getQuote('AAPL', '1mo');
    expect(quote.previousClose).toBe(350);
    expect(quote.chart.reference).toBe(320);
  });

  it('signals unknown symbols separately from outages', async () => {
    const notFound = vi.fn(async () =>
      response({ chart: { result: null, error: { code: 'Not Found' } } }, 404)
    );
    await expect(
      new YahooFinanceStocksProvider(notFound as typeof fetch).getQuote('NOPE', '1d')
    ).rejects.toBeInstanceOf(StockSymbolNotFoundError);

    const outage = vi.fn(async () => new Response('busy', { status: 429 }));
    await expect(
      new YahooFinanceStocksProvider(outage as typeof fetch).getQuote('AAPL', '1d')
    ).rejects.not.toBeInstanceOf(StockSymbolNotFoundError);
  });

  it('keeps search results to US stocks, ETFs, and indexes', async () => {
    const fetchImpl = vi.fn(async () =>
      response({
        quotes: [
          {
            symbol: '^GSPC',
            shortname: 'S&P 500',
            exchange: 'SNP',
            exchDisp: 'SNP',
            quoteType: 'INDEX',
            typeDisp: 'Index'
          },
          {
            symbol: 'SPY',
            longname: 'SPDR S&P 500 ETF Trust',
            exchange: 'PCX',
            exchDisp: 'NYSEArca',
            quoteType: 'ETF',
            typeDisp: 'ETF'
          },
          { symbol: 'ES=F', shortname: 'E-Mini S&P 500', exchange: 'CME', quoteType: 'FUTURE' },
          { symbol: 'TSLA.TO', shortname: 'Tesla CDR', exchange: 'TOR', quoteType: 'EQUITY' }
        ]
      })
    );
    const results = await new YahooFinanceStocksProvider(fetchImpl).search('s&p', 8);
    expect(results).toEqual([
      { symbol: '^GSPC', name: 'S&P 500', exchange: 'SNP', type: 'Index' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSEArca', type: 'ETF' }
    ]);
  });
});

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
    const fetchImpl = vi.fn(async () => response({ data: null, status: { rCode: 400 } }));
    const provider = new NasdaqStocksProvider(fetchImpl, () => NOW);
    await expect(provider.getQuote('^GSPC', '1d')).rejects.toBeInstanceOf(StockSymbolNotFoundError);
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(provider.getQuote('BRK-B', '1d')).rejects.toBeInstanceOf(StockSymbolNotFoundError);
    expect(urlOf(fetchImpl.mock.calls[0]![0] as string).pathname).toContain('/BRK.B/');
  });
});
