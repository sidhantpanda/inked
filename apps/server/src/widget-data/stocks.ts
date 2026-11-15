import {
  normalizeStockSymbols,
  withStockChange,
  type StockChartPoint,
  type StockRange,
  type StocksWidgetInput,
  type StocksWidgetSettings
} from '@inked/commons';

import type { ProviderStockQuote } from '../stocks/index.js';
import type { WidgetDataFetchContext } from './types.js';

const DEMO_NAMES: Record<string, { name: string; price: number }> = {
  SPY: { name: 'SPDR S&P 500 ETF Trust', price: 754.21 },
  AAPL: { name: 'Apple Inc.', price: 356.27 },
  MSFT: { name: 'Microsoft Corporation', price: 523.88 },
  NVDA: { name: 'NVIDIA Corporation', price: 212.4 },
  GOOGL: { name: 'Alphabet Inc.', price: 288.1 },
  AMZN: { name: 'Amazon.com, Inc.', price: 241.6 },
  META: { name: 'Meta Platforms, Inc.', price: 702.3 },
  TSLA: { name: 'Tesla, Inc.', price: 418.9 },
  '^GSPC': { name: 'S&P 500', price: 7561.67 }
};

const RANGE_SPAN_MS: Record<StockRange, number> = {
  '1d': 6.5 * 60 * 60 * 1000,
  '5d': 5 * 86_400_000,
  '1mo': 30 * 86_400_000,
  '3mo': 91 * 86_400_000,
  '6mo': 182 * 86_400_000,
  '1y': 365 * 86_400_000
};

function seeded(symbol: string, salt: string) {
  let state = 2166136261;
  for (const character of `${symbol}:${salt}`) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0;
    state = Math.imul(state ^ (state >>> 13), 3266489909) >>> 0;
    return ((state ^= state >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic placeholder quotes, used when no market-data service is wired
 * (tests and offline previews). Each symbol gets its own stable random walk.
 */
export function demoStockQuote(symbol: string, range: StockRange, now: Date): ProviderStockQuote {
  const known = DEMO_NAMES[symbol];
  const random = seeded(symbol, range);
  const price = known?.price ?? 40 + Math.round(random() * 40_000) / 100;
  const end = now.getTime();
  const start = end - RANGE_SPAN_MS[range];
  const count = range === '1d' ? 78 : 60;
  const drift = (random() - 0.45) * 0.06;
  const values: number[] = [price];
  for (let index = 1; index < count; index += 1) {
    const previous = values[0]!;
    values.unshift(previous * (1 - drift / count + (random() - 0.5) * 0.012));
  }
  const points: StockChartPoint[] = values.map((value, index) => ({
    t: start + ((end - start) * index) / (count - 1),
    value: Math.round(value * 100) / 100
  }));
  const reference = Math.round(points[0]!.value * (1 + (random() - 0.5) * 0.01) * 100) / 100;
  const previousClose =
    range === '1d' ? reference : Math.round(price * (1 + (random() - 0.5) * 0.03) * 100) / 100;
  const dayValues = range === '1d' ? values : values.slice(-5);
  return withStockChange({
    symbol,
    name: known?.name ?? symbol,
    currency: 'USD',
    price,
    previousClose,
    dayHigh: Math.round(Math.max(...dayValues) * 100) / 100,
    dayLow: Math.round(Math.min(...dayValues) * 100) / 100,
    marketState: 'closed',
    asOf: now.toISOString(),
    chart: { range, reference, start, end, points }
  });
}

export async function fetchStocksWidgetInput(
  context: WidgetDataFetchContext,
  settings: StocksWidgetSettings
): Promise<StocksWidgetInput> {
  const symbols = normalizeStockSymbols(settings.symbols);
  const quotes = context.stocks
    ? await context.stocks.getQuotes(symbols, settings.range)
    : symbols.map((symbol) => ({
        ...demoStockQuote(symbol, settings.range, context.now),
        state: 'ok' as const,
        source: 'Demo'
      }));
  return { quotes, range: settings.range, showChart: settings.showChart };
}
