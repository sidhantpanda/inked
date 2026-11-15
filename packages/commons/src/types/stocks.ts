/** Chart windows offered by the Stocks widget, shortest first. */
export const STOCK_RANGES = ['1d', '5d', '1mo', '3mo', '6mo', '1y'] as const;

export type StockRange = (typeof STOCK_RANGES)[number];

/** Upper bound on tickers per Stocks panel; panels show as many as fit. */
export const MAX_STOCK_SYMBOLS = 8;

export interface StocksWidgetSettings {
  /** Normalized tickers in display priority order, e.g. `AAPL`, `BRK-B`, `^GSPC`. */
  symbols: string[];
  /** Window plotted by the chart. Day change is always shown alongside. */
  range: StockRange;
  /** Draw price charts where the panel has room; off keeps compact quote rows. */
  showChart: boolean;
}

/** A tradable instrument returned by the Stocks symbol search. */
export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

/** Regular-session state of the instrument's exchange when the quote was taken. */
export type StockMarketState = 'pre' | 'open' | 'post' | 'closed';

export interface StockChartPoint {
  /** Epoch milliseconds. */
  t: number;
  value: number;
}

export interface StockChart {
  range: StockRange;
  /** Dashed baseline: the previous close for `1d`, otherwise the close before the window. */
  reference: number;
  /** Horizontal domain in epoch ms; for `1d` this is the full regular session. */
  start: number;
  end: number;
  points: StockChartPoint[];
}

export interface StockQuote {
  state: 'ok';
  symbol: string;
  name: string;
  currency: string;
  price: number;
  previousClose: number;
  /** Change versus the previous close. */
  change: number;
  changePercent: number;
  dayHigh?: number;
  dayLow?: number;
  marketState: StockMarketState;
  /** ISO time of the last trade. */
  asOf: string;
  chart: StockChart;
  source: string;
}

export interface StockQuoteUnavailable {
  state: 'unavailable';
  symbol: string;
}

export type StockQuoteResult = StockQuote | StockQuoteUnavailable;

export interface StocksWidgetInput {
  quotes: StockQuoteResult[];
  range: StockRange;
  showChart: boolean;
}
