import {
  MAX_STOCK_SYMBOLS,
  STOCK_RANGES,
  type StockChart,
  type StockMarketState,
  type StockQuote,
  type StockRange
} from './types.js';

/** Tickers, share classes (`BRK-B`), and indexes (`^GSPC`). */
const STOCK_SYMBOL_PATTERN = /^\^?[A-Z0-9][A-Z0-9.\-=]{0,11}$/;

export const STOCK_RANGE_LABELS: Record<StockRange, { short: string; long: string }> = {
  '1d': { short: '1D', long: '1 day' },
  '5d': { short: '5D', long: '5 days' },
  '1mo': { short: '1M', long: '1 month' },
  '3mo': { short: '3M', long: '3 months' },
  '6mo': { short: '6M', long: '6 months' },
  '1y': { short: '1Y', long: '1 year' }
};

export const STOCK_MARKET_STATE_LABELS: Record<StockMarketState, string> = {
  pre: 'Pre-market',
  open: 'Open',
  post: 'After hours',
  closed: 'Closed'
};

export function isStockRange(value: unknown): value is StockRange {
  return STOCK_RANGES.includes(value as StockRange);
}

/** Uppercases and validates one ticker; returns null when it cannot be a symbol. */
export function normalizeStockSymbol(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const symbol = value.trim().toUpperCase();
  return STOCK_SYMBOL_PATTERN.test(symbol) ? symbol : null;
}

/** Normalizes, de-duplicates, and caps a ticker list while keeping its order. */
export function normalizeStockSymbols(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const symbols: string[] = [];
  for (const value of values) {
    const symbol = normalizeStockSymbol(value);
    if (symbol && !symbols.includes(symbol)) symbols.push(symbol);
    if (symbols.length === MAX_STOCK_SYMBOLS) break;
  }
  return symbols;
}

export type StockDirection = 'up' | 'down' | 'flat';

export function stockDirection(change: number): StockDirection {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'flat';
}

export function stockDirectionGlyph(change: number): string {
  const direction = stockDirection(change);
  return direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•';
}

/** Prices keep cents below 10,000; larger quotes (indexes, BRK-A) drop them. */
export function formatStockPrice(value: number): string {
  const digits = Math.abs(value) >= 10_000 ? 0 : 2;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

export function formatStockChange(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatStockPrice(Math.abs(value))}`;
}

export function formatStockPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

/** Performance over the charted window, measured from the chart's reference close. */
export function stockRangeChange(chart: StockChart): { change: number; changePercent: number } {
  const last = chart.points.at(-1)?.value ?? chart.reference;
  const change = last - chart.reference;
  return {
    change,
    changePercent: chart.reference === 0 ? 0 : (change / chart.reference) * 100
  };
}

/** Builds the derived change fields so every provider reports them identically. */
export function withStockChange<
  T extends Omit<StockQuote, 'change' | 'changePercent' | 'state' | 'source'>
>(quote: T): T & Pick<StockQuote, 'change' | 'changePercent'> {
  const change = quote.price - quote.previousClose;
  return {
    ...quote,
    change,
    changePercent: quote.previousClose === 0 ? 0 : (change / quote.previousClose) * 100
  };
}

/** Pixel thresholds shared by the native renderer and the React preview. */
export const STOCKS_LAYOUT_METRICS = {
  headerHeight: 44,
  bottomPadding: 12,
  /** Below this width a row cannot hold a symbol, sparkline, and price side by side. */
  narrowWidth: 300,
  /** At this width multiple tickers become a grid of cards instead of rows. */
  gridMinWidth: 560,
  gridMinColumnWidth: 170,
  denseRowHeight: 24,
  inlineChartRowHeight: 36,
  stackedChartRowHeight: 88,
  gridChartCardHeight: 110,
  gridCardHeight: 64,
  focusChartBelowMinHeight: 84,
  focusChartSideMinHeight: 40
} as const;

export type StocksFocusChart = 'none' | 'side' | 'below';

export type StocksLayoutPlan =
  | { mode: 'empty' }
  | { mode: 'focus'; chart: StocksFocusChart }
  | { mode: 'list'; visible: number; chart: 'none' | 'inline' | 'stacked' }
  | { mode: 'grid'; visible: number; columns: number; rows: number; chart: boolean };

/**
 * Chooses how a Stocks panel spends its pixels. Showing every ticker that fits
 * outranks drawing charts: a chart layout is used only when it shows at least as
 * many tickers as the chart-free layout would, so hidden graphs degrade into
 * denser quote rows rather than dropping symbols.
 */
export function planStocksLayout(
  width: number,
  height: number,
  count: number,
  showChart: boolean
): StocksLayoutPlan {
  const m = STOCKS_LAYOUT_METRICS;
  const contentHeight = Math.max(0, height - m.headerHeight - m.bottomPadding);
  if (count <= 0) return { mode: 'empty' };

  if (count === 1 || contentHeight < m.denseRowHeight * 2) {
    return { mode: 'focus', chart: showChart ? focusChart(width, contentHeight) : 'none' };
  }

  if (width >= m.gridMinWidth) {
    const maxColumns = Math.max(2, Math.floor(width / m.gridMinColumnWidth));
    const capacity = (cardHeight: number) =>
      Math.min(count, Math.floor(contentHeight / cardHeight) * maxColumns);
    const plainVisible = Math.max(1, capacity(m.gridCardHeight));
    const chartVisible = capacity(m.gridChartCardHeight);
    const chart = showChart && chartVisible >= plainVisible;
    const visible = chart ? chartVisible : plainVisible;
    const rows = Math.max(1, Math.ceil(visible / maxColumns));
    return { mode: 'grid', visible, columns: Math.ceil(visible / rows), rows, chart };
  }

  const narrow = width < m.narrowWidth;
  const plainVisible = Math.min(count, Math.floor(contentHeight / m.denseRowHeight));
  const chartRowHeight = narrow ? m.stackedChartRowHeight : m.inlineChartRowHeight;
  const chartVisible = Math.min(count, Math.floor(contentHeight / chartRowHeight));
  if (showChart && chartVisible >= plainVisible) {
    return { mode: 'list', visible: chartVisible, chart: narrow ? 'stacked' : 'inline' };
  }
  return { mode: 'list', visible: plainVisible, chart: 'none' };
}

function focusChart(width: number, contentHeight: number): StocksFocusChart {
  const m = STOCKS_LAYOUT_METRICS;
  const landscape = width >= m.narrowWidth && width >= (contentHeight + m.headerHeight) * 1.4;
  if (width >= m.narrowWidth && (landscape || contentHeight < 140)) {
    return contentHeight >= m.focusChartSideMinHeight ? 'side' : 'none';
  }
  return contentHeight >= m.focusChartBelowMinHeight ? 'below' : 'none';
}
