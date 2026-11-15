import {
  STOCK_RANGE_LABELS,
  formatStockPercent,
  formatStockPrice,
  stockDirection,
  stockDirectionGlyph,
  stockRangeChange,
  type StockChart
} from '@inked/commons';

import type { WidgetComponentProps } from './types';
import { WidgetLabel } from './WidgetLabel';

/** HTML counterpart of the native Stocks renderer; the canvas output is authoritative. */
export function StocksWidget({ input, size }: WidgetComponentProps<'stocks'>) {
  const limit = size === 'small' ? 2 : size === 'wide' ? 3 : size === 'full' ? 4 : 5;
  const showChart = input.showChart && size !== 'small';
  return (
    <>
      <WidgetLabel>
        {showChart ? `Stocks · ${STOCK_RANGE_LABELS[input.range].short}` : 'Stocks'}
      </WidgetLabel>
      <div className={`stocks-list stocks-list--${size}`}>
        {input.quotes.slice(0, limit).map((quote) =>
          quote.state === 'ok' ? (
            <div className="stocks-row" key={quote.symbol}>
              <div className="stocks-identity">
                <strong>{quote.symbol}</strong>
                <small>{quote.name}</small>
              </div>
              {showChart && <StockSparkline chart={quote.chart} />}
              <div className={`stocks-value is-${stockDirection(quote.change)}`}>
                <strong>{formatStockPrice(quote.price)}</strong>
                <small>
                  {stockDirectionGlyph(quote.change)} {formatStockPercent(quote.changePercent)}
                </small>
              </div>
            </div>
          ) : (
            <div className="stocks-row" key={quote.symbol}>
              <div className="stocks-identity">
                <strong>{quote.symbol}</strong>
              </div>
              <div className="stocks-value">
                <small>No data</small>
              </div>
            </div>
          )
        )}
        {input.quotes.length === 0 && <p className="stocks-empty">Add tickers to track</p>}
      </div>
    </>
  );
}

function StockSparkline({ chart }: { chart: StockChart }) {
  if (chart.points.length < 2) return <span className="stocks-sparkline" />;
  const values = chart.points.map((point) => point.value);
  const low = Math.min(...values, chart.reference);
  const high = Math.max(...values, chart.reference);
  const spread = high - low || 1;
  const span = Math.max(1, chart.end - chart.start);
  const y = (value: number) => 28 - ((value - low) / spread) * 26;
  const path = chart.points
    .map((point, index) => {
      const x = ((point.t - chart.start) / span) * 100;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y(point.value).toFixed(2)}`;
    })
    .join(' ');
  const direction = stockDirection(stockRangeChange(chart).change);
  return (
    <svg
      className={`stocks-sparkline is-${direction}`}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
    >
      <line x1="0" x2="100" y1={y(chart.reference)} y2={y(chart.reference)} />
      <path d={path} />
    </svg>
  );
}
