import { NasdaqStocksProvider } from './nasdaq.js';
import type { StocksProvider } from './types.js';
import { YahooFinanceStocksProvider } from './yahoo.js';

/** Ordered primary and backup sources; the first provider that answers wins. */
export function createStocksProviders(): StocksProvider[] {
  return [new YahooFinanceStocksProvider(), new NasdaqStocksProvider()];
}
