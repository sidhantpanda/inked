import { describe, expect, it } from 'vitest';

import { WIDGET_LAYOUT_VARIANTS } from './layouts.js';
import {
  STOCKS_LAYOUT_METRICS,
  formatStockChange,
  formatStockPercent,
  formatStockPrice,
  normalizeStockSymbol,
  normalizeStockSymbols,
  planStocksLayout,
  stockRangeChange,
  withStockChange
} from './stocks.js';
import { MAX_STOCK_SYMBOLS, createAssignment } from './types.js';
import { parseDashboardConfig } from './validation.js';
import { createDefaultDashboard } from './layouts.js';

describe('stock symbols', () => {
  it('normalizes tickers, share classes, and indexes', () => {
    expect(normalizeStockSymbol(' aapl ')).toBe('AAPL');
    expect(normalizeStockSymbol('brk-b')).toBe('BRK-B');
    expect(normalizeStockSymbol('^gspc')).toBe('^GSPC');
    expect(normalizeStockSymbol('')).toBeNull();
    expect(normalizeStockSymbol('not a ticker!')).toBeNull();
    expect(normalizeStockSymbol(42)).toBeNull();
  });

  it('de-duplicates and caps lists in order', () => {
    const many = Array.from({ length: 12 }, (_, index) => `T${index}`);
    expect(normalizeStockSymbols(['msft', 'MSFT', 'bad ticker', 'aapl'])).toEqual(['MSFT', 'AAPL']);
    expect(normalizeStockSymbols(many)).toHaveLength(MAX_STOCK_SYMBOLS);
    expect(normalizeStockSymbols('AAPL')).toEqual([]);
  });

  it('validates saved Stocks settings', () => {
    const config = {
      ...createDefaultDashboard(),
      layoutId: 'quad',
      assignments: [
        createAssignment('north-west', 'stocks', {
          symbols: ['tsla', 'TSLA', '??'],
          range: 'forever' as never,
          showChart: 'yes' as never
        }),
        { slotId: 'north-east', widgetId: 'stocks', settings: {} }
      ]
    };
    const parsed = parseDashboardConfig(config);
    expect(parsed.assignments[0]?.settings).toEqual({
      symbols: ['TSLA'],
      range: '1d',
      showChart: true
    });
    expect(parsed.assignments[1]?.settings).toMatchObject({
      symbols: ['SPY', 'AAPL', 'MSFT', 'NVDA']
    });
  });
});

describe('stock formatting', () => {
  it('formats prices, changes, and percentages with explicit signs', () => {
    expect(formatStockPrice(356.271)).toBe('356.27');
    expect(formatStockPrice(6812.5)).toBe('6,812.50');
    expect(formatStockPrice(712_345.6)).toBe('712,346');
    expect(formatStockChange(1.391)).toBe('+1.39');
    expect(formatStockChange(-2.5)).toBe('−2.50');
    expect(formatStockPercent(0.392)).toBe('+0.39%');
    expect(formatStockPercent(0)).toBe('0.00%');
  });

  it('derives day and range change consistently', () => {
    const quote = withStockChange({
      symbol: 'AAPL',
      name: 'Apple Inc.',
      currency: 'USD',
      price: 110,
      previousClose: 100,
      marketState: 'closed',
      asOf: '2026-11-13T21:00:00.000Z',
      chart: {
        range: '1mo',
        reference: 88,
        start: 0,
        end: 1,
        points: [
          { t: 0, value: 90 },
          { t: 1, value: 110 }
        ]
      }
    });
    expect(quote.change).toBe(10);
    expect(quote.changePercent).toBe(10);
    expect(stockRangeChange(quote.chart).changePercent).toBeCloseTo(25);
  });
});

describe('stocks layout planner', () => {
  const variant = (id: string) => {
    const match = WIDGET_LAYOUT_VARIANTS.find((candidate) => candidate.id === id);
    if (!match) throw new Error(`Missing variant ${id}`);
    return match;
  };

  it('plans a usable layout for every layout geometry, ticker count, and chart setting', () => {
    for (const { width, height } of WIDGET_LAYOUT_VARIANTS) {
      for (let count = 0; count <= MAX_STOCK_SYMBOLS; count += 1) {
        for (const showChart of [true, false]) {
          const plan = planStocksLayout(width, height, count, showChart);
          if (count === 0) {
            expect(plan.mode).toBe('empty');
            continue;
          }
          if (plan.mode === 'list' || plan.mode === 'grid') {
            expect(plan.visible).toBeGreaterThanOrEqual(1);
            expect(plan.visible).toBeLessThanOrEqual(count);
          }
          if (plan.mode === 'grid') {
            expect(plan.columns * plan.rows).toBeGreaterThanOrEqual(plan.visible);
          }
          if (!showChart && plan.mode !== 'empty') {
            expect(plan.chart === 'none' || plan.chart === false).toBe(true);
          }
        }
      }
    }
  });

  it('puts a single ticker beside its chart in landscape and above it in portrait', () => {
    const wide = variant('wide-380x106');
    const tall = variant('tall-186x448');
    expect(planStocksLayout(wide.width, wide.height, 1, true)).toEqual({
      mode: 'focus',
      chart: 'side'
    });
    expect(planStocksLayout(tall.width, tall.height, 1, true)).toEqual({
      mode: 'focus',
      chart: 'below'
    });
    expect(planStocksLayout(tall.width, tall.height, 1, false)).toEqual({
      mode: 'focus',
      chart: 'none'
    });
  });

  it('stacks charts in narrow rails and inlines sparklines in wide strips', () => {
    const tall = variant('tall-186x448');
    const wide = variant('wide-380x220');
    expect(planStocksLayout(tall.width, tall.height, 4, true)).toEqual({
      mode: 'list',
      visible: 4,
      chart: 'stacked'
    });
    expect(planStocksLayout(wide.width, wide.height, 4, true)).toEqual({
      mode: 'list',
      visible: 4,
      chart: 'inline'
    });
  });

  it('drops charts instead of tickers when space is short', () => {
    const tall = variant('tall-186x448');
    const plan = planStocksLayout(tall.width, tall.height, 8, true);
    expect(plan).toEqual({ mode: 'list', visible: 8, chart: 'none' });

    const small = variant('small-186x106');
    const compact = planStocksLayout(small.width, small.height, 4, true);
    expect(compact).toMatchObject({ mode: 'list', chart: 'none' });
    expect(small.height - STOCKS_LAYOUT_METRICS.headerHeight).toBeGreaterThan(0);
  });

  it('lays several tickers out as a card grid across full-width panels', () => {
    const full = variant('full-768x296');
    expect(planStocksLayout(full.width, full.height, 4, true)).toEqual({
      mode: 'grid',
      visible: 4,
      columns: 4,
      rows: 1,
      chart: true
    });
    const short = variant('full-768x220');
    expect(planStocksLayout(short.width, short.height, 6, true)).toEqual({
      mode: 'grid',
      visible: 6,
      columns: 3,
      rows: 2,
      chart: false
    });
  });
});
