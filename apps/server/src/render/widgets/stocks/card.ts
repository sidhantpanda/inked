import type { SKRSContext2D } from '@napi-rs/canvas';
import {
  formatStockChange,
  formatStockPercent,
  formatStockPrice,
  STOCK_RANGE_LABELS,
  stockDirectionGlyph,
  type StockQuoteResult,
  type StockRange,
  stockRangeChange,
  type StocksFocusChart
} from '@inked/commons';

import { clippedText, fittedText, text, textWidth } from '../../text.js';
import type { Palette, Rect } from '../../types.js';
import { drawStockChart } from './chart.js';
import { drawUnavailableStock, stockColor, stockPercentLabel } from './shared.js';

/**
 * A single quote with its hero price and, when planned, a chart beside or
 * below it. Used for one-ticker panels and for each card in the full grid.
 */
export function drawStockCard(
  ctx: SKRSContext2D,
  cell: Rect,
  quote: StockQuoteResult,
  chart: StocksFocusChart,
  range: StockRange,
  palette: Palette,
  scale: 'focus' | 'grid'
) {
  if (quote.state !== 'ok') {
    drawUnavailableStock(ctx, cell, quote.symbol, palette);
    return;
  }
  const x = cell.x + 18;
  const right = cell.x + cell.width - 18;
  const minChartHeight = 36;

  if (chart === 'side') {
    const infoWidth = Math.min(220, Math.max(130, (right - x) * 0.42));
    const info = stockInfoMetrics(infoWidth, cell.height, scale);
    const top = cell.y + Math.max(0, Math.floor((cell.height - info.height) / 2));
    drawStockInfo(ctx, x, top, infoWidth, info, quote, range, palette);
    const chartX = x + infoWidth + 14;
    drawStockChart(
      ctx,
      { x: chartX, y: cell.y + 6, width: right - chartX, height: cell.height - 10 },
      quote.chart,
      palette
    );
    return;
  }

  const width = right - x;
  if (chart === 'none') {
    // Center the quote in spare height so sparse panels don't hug the top.
    const info = stockInfoMetrics(width, cell.height, scale);
    const top = cell.y + Math.max(0, Math.floor((cell.height - info.height) / 2));
    drawStockInfo(ctx, x, top, width, info, quote, range, palette);
    return;
  }

  const info = stockInfoMetrics(width, cell.height - minChartHeight - 8, scale);
  // Cap the chart's aspect ratio: a tall sliver exaggerates every move.
  const available = cell.height - info.height - 8 - 4;
  const chartHeight = Math.min(available, Math.max(72, width * 0.75));
  const top = cell.y + Math.max(0, Math.floor((available - chartHeight) / 2));
  const bottom = drawStockInfo(ctx, x, top, width, info, quote, range, palette);
  drawStockChart(ctx, { x, y: bottom + 8, width, height: chartHeight }, quote.chart, palette);
}

interface StockInfoMetrics {
  compact: boolean;
  priceSize: number;
  showMeta: boolean;
  height: number;
}

/** Sizes the quote text block for a height budget before anything is drawn. */
function stockInfoMetrics(
  width: number,
  budget: number,
  scale: 'focus' | 'grid'
): StockInfoMetrics {
  const maxPrice = scale === 'focus' ? 48 : 34;
  const priceSize = Math.min(maxPrice, Math.max(26, Math.floor(budget - 70)));
  const heroHeight = 16 + priceSize + 4 + 24;
  if (budget < heroHeight + 4 || width < 120) {
    return { compact: true, priceSize, showMeta: false, height: 44 };
  }
  const showMeta = budget >= heroHeight + 26;
  return { compact: false, priceSize, showMeta, height: heroHeight + (showMeta ? 22 : 0) + 6 };
}

/** Draws the quote text block within the budget and returns its bottom edge. */
function drawStockInfo(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  { compact, priceSize, showMeta }: StockInfoMetrics,
  quote: Extract<StockQuoteResult, { state: 'ok' }>,
  range: StockRange,
  palette: Palette
): number {
  const color = stockColor(quote.change, palette);
  const right = x + width;

  if (compact) {
    // Compact two-line quote: symbol and price, then name and day change.
    const percent = stockPercentLabel(quote.change, quote.changePercent);
    const priceWidth = textWidth(ctx, formatStockPrice(quote.price), 16, 800);
    clippedText(
      ctx,
      quote.symbol,
      x,
      y + 18,
      Math.max(30, width - priceWidth - 10),
      16,
      800,
      palette.ink
    );
    text(ctx, formatStockPrice(quote.price), right, y + 18, 16, 800, palette.ink, 'right');
    const percentWidth = textWidth(ctx, percent, 14, 800);
    if (width - percentWidth - 10 > 40) {
      clippedText(ctx, quote.name, x, y + 38, width - percentWidth - 10, 14, 600, palette.muted);
    }
    text(ctx, percent, right, y + 38, 14, 800, color, 'right');
    return y + 44;
  }

  const symbolWidth = textWidth(ctx, quote.symbol, 16, 800);
  text(ctx, quote.symbol, x, y + 16, 16, 800, palette.ink);
  if (width - symbolWidth - 10 > 40) {
    clippedText(
      ctx,
      quote.name,
      x + symbolWidth + 10,
      y + 16,
      width - symbolWidth - 10,
      14,
      600,
      palette.muted
    );
  }
  const priceBaseline = y + 16 + priceSize + 4;
  fittedText(
    ctx,
    formatStockPrice(quote.price),
    x,
    priceBaseline,
    width,
    priceSize,
    700,
    palette.ink,
    {
      letterSpacing: priceSize * -0.03
    }
  );
  const changeBaseline = priceBaseline + 24;
  const full = `${stockDirectionGlyph(quote.change)} ${formatStockChange(quote.change)}  ${formatStockPercent(quote.changePercent)}`;
  const changeLabel =
    textWidth(ctx, full, 16, 800) <= width
      ? full
      : stockPercentLabel(quote.change, quote.changePercent);
  clippedText(ctx, changeLabel, x, changeBaseline, width, 16, 800, color);
  if (!showMeta) return changeBaseline + 6;

  const metaBaseline = changeBaseline + 22;
  clippedText(ctx, stockMeta(quote, range), x, metaBaseline, width, 14, 600, palette.muted);
  return metaBaseline + 6;
}

function stockMeta(quote: Extract<StockQuoteResult, { state: 'ok' }>, range: StockRange) {
  if (range !== '1d') {
    const performance = stockRangeChange(quote.chart);
    return `${STOCK_RANGE_LABELS[range].short} ${stockPercentLabel(performance.change, performance.changePercent)}`;
  }
  if (quote.dayLow !== undefined && quote.dayHigh !== undefined) {
    return `Day ${formatStockPrice(quote.dayLow)} – ${formatStockPrice(quote.dayHigh)}`;
  }
  return `Prev close ${formatStockPrice(quote.previousClose)}`;
}
