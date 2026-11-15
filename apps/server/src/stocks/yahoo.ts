import type { StockRange, StockSearchResult } from '@inked/commons';

import { array, getJson, record, text, type Fetch } from './http.js';
import { StockSymbolNotFoundError, type ProviderStockQuote, type StocksProvider } from './types.js';
import { chartToQuote, parseChart, RANGE_QUERIES, type ParsedChart } from './yahoo-chart.js';

const CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';

/** Yahoo exchange codes for US listings, ETFs, OTC, and the major US indexes. */
const US_EXCHANGES = new Set([
  'NMS',
  'NGM',
  'NCM',
  'NAS',
  'NYQ',
  'NYS',
  'ASE',
  'PCX',
  'BTS',
  'PNK',
  'SNP',
  'DJI',
  'NIM',
  'WCB',
  'CXI'
]);
const SEARCHABLE_TYPES = new Set(['EQUITY', 'ETF', 'INDEX', 'MUTUALFUND']);

/**
 * Yahoo Finance's public chart and search endpoints. They are free and need
 * no key but are unofficial and undocumented; responses are validated here so
 * schema drift fails over to the next provider instead of reaching widgets.
 */
export class YahooFinanceStocksProvider implements StocksProvider {
  readonly id = 'yahoo';
  readonly name = 'Yahoo Finance';

  constructor(
    private readonly fetchImpl: Fetch = globalThis.fetch,
    private readonly clock: () => number = Date.now
  ) {}

  async getQuote(symbol: string, range: StockRange): Promise<ProviderStockQuote> {
    const parsed = await this.fetchChart(symbol, RANGE_QUERIES[range]);
    if (range !== '1d') return chartToQuote(symbol, range, parsed, this.clock);
    if (parsed.points.length >= 2) return chartToQuote(symbol, range, parsed, this.clock);
    // Before the first trade of a session Yahoo's 1d window is empty: chart the
    // most recent complete session from a five-day intraday window instead.
    const recent = await this.fetchChart(symbol, { range: '5d', interval: '5m' });
    return chartToQuote(symbol, range, recent, this.clock, true);
  }

  async search(query: string, limit: number): Promise<StockSearchResult[]> {
    const url = new URL(SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('quotesCount', String(Math.min(20, limit * 3)));
    url.searchParams.set('newsCount', '0');
    url.searchParams.set('listsCount', '0');
    const { body } = await getJson(this.fetchImpl, url, this.name);
    return array(record(body).quotes)
      .map(record)
      .filter(
        (item) =>
          US_EXCHANGES.has(text(item.exchange)) && SEARCHABLE_TYPES.has(text(item.quoteType))
      )
      .slice(0, limit)
      .map((item) => {
        const symbol = text(item.symbol);
        return {
          symbol,
          name: text(item.longname, text(item.shortname, symbol)),
          exchange: text(item.exchDisp, text(item.exchange)),
          type: text(item.typeDisp, text(item.quoteType))
        };
      })
      .filter((item) => item.symbol);
  }

  private async fetchChart(
    symbol: string,
    query: { range: string; interval: string }
  ): Promise<ParsedChart> {
    const url = new URL(`${CHART_URL}${encodeURIComponent(symbol)}`);
    url.searchParams.set('range', query.range);
    url.searchParams.set('interval', query.interval);
    const { status, body } = await getJson(this.fetchImpl, url, this.name);
    const parsed = status === 404 ? null : parseChart(body, symbol);
    if (!parsed) throw new StockSymbolNotFoundError(symbol, this.name);
    return parsed;
  }
}
