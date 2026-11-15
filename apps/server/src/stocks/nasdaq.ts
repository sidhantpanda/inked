import type { StockChartPoint, StockMarketState, StockRange } from '@inked/commons';
import { withStockChange } from '@inked/commons';

import {
  array,
  downsample,
  finite,
  getJson,
  record,
  text,
  timeZoneOffsetMs,
  type Fetch
} from './http.js';
import { StockSymbolNotFoundError, type ProviderStockQuote, type StocksProvider } from './types.js';

const API_URL = 'https://api.nasdaq.com/api/quote/';
const TIME_ZONE = 'America/New_York';
const ASSET_CLASSES = ['stocks', 'etf'] as const;
const DAY_MS = 86_400_000;
const SESSION_OPEN_MS = (9 * 60 + 30) * 60_000;
const SESSION_CLOSE_MS = 16 * 60 * 60_000;
const RANGE_DAYS: Record<Exclude<StockRange, '1d'>, number> = {
  '5d': 7,
  '1mo': 31,
  '3mo': 92,
  '6mo': 183,
  '1y': 366
};

/** Parses Nasdaq's display strings such as `$1,234.56`, `+1.39`, or `N/A`. */
function money(value: unknown): number | undefined {
  if (typeof value === 'number') return finite(value);
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value.replace(/[$,+%\s]/g, ''));
  return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
}

function marketState(status: string): StockMarketState {
  const normalized = status.toLowerCase();
  if (normalized.includes('pre')) return 'pre';
  if (normalized.includes('after')) return 'post';
  if (normalized.includes('open')) return 'open';
  return 'closed';
}

/** Nasdaq encodes chart times as New York wall-clock time labelled as UTC. */
function wallClockToInstant(wallMs: number): number {
  return wallMs - timeZoneOffsetMs(wallMs, TIME_ZONE);
}

function isoDay(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/**
 * Nasdaq's public quote API, used as a backup for US-listed stocks and ETFs.
 * Unofficial and undocumented like Yahoo's; it has no index quotes.
 */
export class NasdaqStocksProvider implements StocksProvider {
  readonly id = 'nasdaq';
  readonly name = 'Nasdaq';

  constructor(
    private readonly fetchImpl: Fetch = globalThis.fetch,
    private readonly clock: () => number = Date.now
  ) {}

  async getQuote(symbol: string, range: StockRange): Promise<ProviderStockQuote> {
    if (symbol.startsWith('^') || symbol.includes('=')) {
      throw new StockSymbolNotFoundError(symbol, this.name);
    }
    const nasdaqSymbol = symbol.replace(/-/g, '.');
    for (const assetClass of ASSET_CLASSES) {
      const info = await this.request(nasdaqSymbol, 'info', assetClass);
      if (!info) continue;
      const primary = record(info.primaryData);
      const price = money(primary.lastSalePrice);
      if (price === undefined) throw new Error(`Nasdaq returned no price for ${symbol}`);
      const previousClose = price - (money(primary.netChange) ?? 0);
      const chart =
        range === '1d'
          ? await this.intraday(nasdaqSymbol, assetClass, previousClose)
          : await this.daily(nasdaqSymbol, assetClass, range);
      const last = chart.points.at(-1)?.t ?? this.clock();
      return withStockChange({
        symbol,
        name: text(info.companyName, symbol).replace(/ (Common Stock|Class [A-C] .*)$/i, ''),
        currency: 'USD',
        price,
        previousClose,
        marketState: marketState(text(info.marketStatus)),
        asOf: new Date(last).toISOString(),
        chart: { range, ...chart }
      });
    }
    throw new StockSymbolNotFoundError(symbol, this.name);
  }

  private async intraday(symbol: string, assetClass: string, previousClose: number) {
    const data = await this.request(symbol, 'chart', assetClass);
    const wallPoints = array(data?.chart)
      .map(record)
      .map((point) => ({ wall: finite(point.x), value: money(point.y) }))
      .filter(
        (point): point is { wall: number; value: number } =>
          point.wall !== undefined && point.value !== undefined
      );
    const sessionDay = Math.floor((wallPoints.at(-1)?.wall ?? 0) / DAY_MS) * DAY_MS;
    const open = sessionDay + SESSION_OPEN_MS;
    const close = sessionDay + SESSION_CLOSE_MS;
    const points = wallPoints
      .filter((point) => point.wall >= open && point.wall <= close)
      .map((point) => ({ t: wallClockToInstant(point.wall), value: point.value }));
    return {
      reference: money(data?.previousClose) ?? previousClose,
      start: wallClockToInstant(open),
      end: wallClockToInstant(close),
      points: downsample(points)
    };
  }

  private async daily(symbol: string, assetClass: string, range: Exclude<StockRange, '1d'>) {
    const now = this.clock();
    const windowStart = isoDay(now - RANGE_DAYS[range] * DAY_MS);
    const from = isoDay(now - (RANGE_DAYS[range] + 10) * DAY_MS);
    const data = await this.request(symbol, 'historical', assetClass, {
      fromdate: from,
      todate: isoDay(now),
      limit: '400'
    });
    const rows = array(record(data?.tradesTable).rows)
      .map(record)
      .map((row) => {
        const [month, day, year] = text(row.date).split('/').map(Number);
        const value = money(row.close);
        if (!month || !day || !year || value === undefined) return null;
        // Daily bars are stamped at the 16:00 New York close.
        const wall = Date.UTC(year, month - 1, day) + SESSION_CLOSE_MS;
        return { day: isoDay(wall), point: { t: wallClockToInstant(wall), value } };
      })
      .filter((row): row is { day: string; point: StockChartPoint } => row !== null)
      .sort((left, right) => left.point.t - right.point.t);
    const inWindow = rows.filter((row) => row.day >= windowStart).map((row) => row.point);
    const before = rows.filter((row) => row.day < windowStart).at(-1)?.point;
    const points = downsample(inWindow);
    return {
      reference: before?.value ?? points[0]?.value ?? 0,
      start: points[0]?.t ?? now,
      end: points.at(-1)?.t ?? now,
      points
    };
  }

  private async request(
    symbol: string,
    endpoint: 'info' | 'chart' | 'historical',
    assetClass: string,
    params: Record<string, string> = {}
  ): Promise<Record<string, unknown> | null> {
    const url = new URL(`${API_URL}${encodeURIComponent(symbol)}/${endpoint}`);
    url.searchParams.set('assetclass', assetClass);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const { body } = await getJson(this.fetchImpl, url, this.name);
    const data = record(body).data;
    return data && typeof data === 'object' ? record(data) : null;
  }
}
