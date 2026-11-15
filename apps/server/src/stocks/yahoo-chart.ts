import type { StockChartPoint, StockMarketState, StockRange } from '@inked/commons';
import { withStockChange } from '@inked/commons';

import { array, downsample, exchangeDate, finite, record, text } from './http.js';
import type { ProviderStockQuote } from './types.js';

/** Yahoo `range`/`interval` pairs for each chart window. */
export const RANGE_QUERIES: Record<StockRange, { range: string; interval: string }> = {
  '1d': { range: '1d', interval: '5m' },
  '5d': { range: '5d', interval: '30m' },
  '1mo': { range: '1mo', interval: '1d' },
  '3mo': { range: '3mo', interval: '1d' },
  '6mo': { range: '6mo', interval: '1d' },
  '1y': { range: '1y', interval: '1d' }
};

interface Period {
  start: number;
  end: number;
}

function period(value: unknown): Period | undefined {
  const item = record(value);
  const start = finite(item.start);
  const end = finite(item.end);
  return start !== undefined && end !== undefined
    ? { start: start * 1000, end: end * 1000 }
    : undefined;
}

function marketState(meta: Record<string, unknown>, now: number): StockMarketState {
  const current = record(meta.currentTradingPeriod);
  const within = (key: string) => {
    const window = period(current[key]);
    return window ? now >= window.start && now < window.end : false;
  };
  if (within('regular')) return 'open';
  if (within('pre')) return 'pre';
  if (within('post')) return 'post';
  return 'closed';
}

export interface ParsedChart {
  meta: Record<string, unknown>;
  points: StockChartPoint[];
}

export function parseChart(body: unknown, symbol: string): ParsedChart | null {
  const chart = record(record(body).chart);
  const result = record(array(chart.result)[0]);
  const meta = record(result.meta);
  if (finite(meta.regularMarketPrice) === undefined) {
    if (chart.error || !chart.result) return null;
    throw new Error(`Yahoo returned no price for ${symbol}`);
  }
  const timestamps = array(result.timestamp);
  const closes = array(record(array(record(result.indicators).quote)[0]).close);
  const points: StockChartPoint[] = [];
  timestamps.forEach((timestamp, index) => {
    const t = finite(timestamp);
    const value = finite(closes[index]);
    if (t !== undefined && value !== undefined) points.push({ t: t * 1000, value });
  });
  return { meta, points };
}

/** Normalizes a parsed chart into a quote; `lastSessionOnly` keeps just the latest session. */
export function chartToQuote(
  symbol: string,
  range: StockRange,
  { meta, points: allPoints }: ParsedChart,
  clock: () => number,
  lastSessionOnly = false
): ProviderStockQuote {
  const timeZone = text(meta.exchangeTimezoneName, 'America/New_York');
  const price = finite(meta.regularMarketPrice)!;
  const lastPoint = allPoints.at(-1);
  let points = allPoints;
  let previousClose = finite(meta.previousClose);

  if (lastSessionOnly && lastPoint) {
    const sessionDate = exchangeDate(lastPoint.t, timeZone);
    points = allPoints.filter((point) => exchangeDate(point.t, timeZone) === sessionDate);
    const before = allPoints.filter((point) => exchangeDate(point.t, timeZone) < sessionDate);
    previousClose = before.at(-1)?.value ?? previousClose;
  }
  if (previousClose === undefined && range !== '1d' && range !== '5d' && lastPoint) {
    // Daily windows omit previousClose; the bar before the latest session has it.
    const asOfDate = exchangeDate((finite(meta.regularMarketTime) ?? 0) * 1000, timeZone);
    const latestIsCurrent = exchangeDate(lastPoint.t, timeZone) === asOfDate;
    previousClose = (latestIsCurrent ? allPoints.at(-2) : lastPoint)?.value;
  }
  previousClose ??= finite(meta.chartPreviousClose) ?? price;

  const sampled = downsample(points);
  const first = sampled[0]?.t ?? clock();
  const last = sampled.at(-1)?.t ?? first;
  let start = first;
  let end = last;
  if (range === '1d') {
    const session = sessionFor(meta, last);
    if (session) {
      start = Math.min(session.start, first);
      end = Math.max(session.end, last);
    }
  }

  return withStockChange({
    symbol: text(meta.symbol, symbol),
    name: text(meta.longName, text(meta.shortName, symbol)),
    currency: text(meta.currency, 'USD'),
    price,
    previousClose,
    ...(finite(meta.regularMarketDayHigh) !== undefined
      ? { dayHigh: finite(meta.regularMarketDayHigh)! }
      : {}),
    ...(finite(meta.regularMarketDayLow) !== undefined
      ? { dayLow: finite(meta.regularMarketDayLow)! }
      : {}),
    marketState: marketState(meta, clock()),
    asOf: new Date((finite(meta.regularMarketTime) ?? last / 1000) * 1000).toISOString(),
    chart: {
      range,
      reference:
        range === '1d'
          ? previousClose
          : (finite(meta.chartPreviousClose) ?? sampled[0]?.value ?? price),
      start,
      end,
      points: sampled
    }
  });
}

/** The regular session containing `at`, from the per-day trading periods. */
function sessionFor(meta: Record<string, unknown>, at: number): Period | undefined {
  const periods = array(meta.tradingPeriods)
    .flatMap((entry): unknown[] => (Array.isArray(entry) ? array(entry) : [entry]))
    .map(period)
    .filter((value): value is Period => value !== undefined);
  return (
    periods.find((window) => at >= window.start && at <= window.end) ??
    period(record(meta.currentTradingPeriod).regular)
  );
}
