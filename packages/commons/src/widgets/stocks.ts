import { defineWidget } from '../widget-maker.js';
import { plan } from './plan.js';

export const stocksWidget = defineWidget({
  id: 'stocks',
  name: 'Stocks',
  description: 'Prices, day change, and optional charts for the tickers you track.',
  refresh: {
    mode: 'interval',
    everyMinutes: 15,
    reason: 'Free market data is delayed about 15 minutes, so faster refreshes add e-ink wear only.'
  },
  variants: {
    small: plan(
      'Glance',
      'One ticker with a chart, or a compact quote list when tracking several.',
      'price',
      'day change',
      'optional chart'
    ),
    wide: plan(
      'Strip',
      'Quote rows with inline sparklines, or one ticker beside its chart.',
      'symbols and names',
      'prices',
      'day change',
      'inline sparklines'
    ),
    tall: plan(
      'Rail',
      'Stacked tickers, each with a chart beneath when there is room.',
      'stacked quotes',
      'day change',
      'per-ticker charts'
    ),
    large: plan(
      'Feature',
      'A hero quote with a full chart, or rows of quotes with sparklines.',
      'hero price',
      'day change',
      'range performance',
      'charts'
    ),
    full: plan(
      'Canvas',
      'A grid of ticker cards with charts across the display.',
      'ticker card grid',
      'prices',
      'day change',
      'charts'
    )
  }
});
