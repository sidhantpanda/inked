import type { SKRSContext2D } from '@napi-rs/canvas';
import {
  formatStockChange,
  formatStockPercent,
  formatStockPrice,
  stockDirectionGlyph,
  type StockQuoteResult
} from '@inked/commons';

import { clippedText, text, textWidth } from '../../text.js';
import type { Palette, Rect } from '../../types.js';
import { drawStockChart } from './chart.js';
import { drawUnavailableStock, stockColor, stockPercentLabel } from './shared.js';

/** Narrow rail row: symbol and day change, price, then a full-width chart. */
export function drawStackedStockRow(
  ctx: SKRSContext2D,
  row: Rect,
  quote: StockQuoteResult,
  palette: Palette
) {
  if (quote.state !== 'ok') {
    drawUnavailableStock(ctx, row, quote.symbol, palette);
    return;
  }
  const x = row.x + 18;
  const right = row.x + row.width - 18;
  const color = stockColor(quote.change, palette);
  const percent = stockPercentLabel(quote.change, quote.changePercent);
  const percentWidth = textWidth(ctx, percent, 14, 800);
  clippedText(ctx, quote.symbol, x, row.y + 21, right - x - percentWidth - 8, 16, 800, palette.ink);
  text(ctx, percent, right, row.y + 21, 14, 800, color, 'right');
  text(ctx, formatStockPrice(quote.price), x, row.y + 42, 18, 700, palette.ink);
  const change = formatStockChange(quote.change);
  if (
    textWidth(ctx, formatStockPrice(quote.price), 18, 700) + textWidth(ctx, change, 14, 600) + 12 <
    right - x
  ) {
    text(ctx, change, right, row.y + 42, 14, 600, color, 'right');
  }
  const chartTop = row.y + 50;
  drawStockChart(
    ctx,
    { x, y: chartTop, width: right - x, height: row.y + row.height - 8 - chartTop },
    quote.chart,
    palette
  );
}

/** Narrow quote row: two lines when tall enough, otherwise a single dense line. */
export function drawNarrowStockRow(
  ctx: SKRSContext2D,
  row: Rect,
  quote: StockQuoteResult,
  palette: Palette
) {
  if (quote.state !== 'ok') {
    drawUnavailableStock(ctx, row, quote.symbol, palette);
    return;
  }
  const x = row.x + 18;
  const right = row.x + row.width - 18;
  const color = stockColor(quote.change, palette);
  const price = formatStockPrice(quote.price);
  if (row.height < 44) {
    const baseline = row.y + row.height / 2 + 6;
    const priceWidth = textWidth(ctx, price, 15, 700);
    const glyph = stockDirectionGlyph(quote.change);
    const glyphWidth = textWidth(ctx, glyph, 14, 800);
    text(ctx, price, right, baseline, 15, 700, palette.ink, 'right');
    text(ctx, glyph, right - priceWidth - 6, baseline, 14, 800, color, 'right');
    clippedText(
      ctx,
      quote.symbol,
      x,
      baseline,
      right - x - priceWidth - glyphWidth - 16,
      15,
      800,
      palette.ink
    );
    return;
  }
  const top = row.y + (row.height - 38) / 2;
  const priceWidth = textWidth(ctx, price, 16, 700);
  clippedText(ctx, quote.symbol, x, top + 15, right - x - priceWidth - 10, 16, 800, palette.ink);
  text(ctx, price, right, top + 15, 16, 700, palette.ink, 'right');
  const percent = stockPercentLabel(quote.change, quote.changePercent);
  const percentWidth = textWidth(ctx, percent, 14, 800);
  if (right - x - percentWidth - 10 > 30) {
    clippedText(
      ctx,
      quote.name,
      x,
      top + 34,
      right - x - percentWidth - 10,
      14,
      600,
      palette.muted
    );
  }
  text(ctx, percent, right, top + 34, 14, 800, color, 'right');
}

/** Wide quote row: identity column, optional inline sparkline, and value column. */
export function drawWideStockRow(
  ctx: SKRSContext2D,
  row: Rect,
  quote: StockQuoteResult,
  inlineChart: boolean,
  palette: Palette
) {
  if (quote.state !== 'ok') {
    drawUnavailableStock(ctx, row, quote.symbol, palette);
    return;
  }
  const x = row.x + 18;
  const right = row.x + row.width - 18;
  const innerWidth = right - x;
  const color = stockColor(quote.change, palette);
  const price = formatStockPrice(quote.price);
  const percent = stockPercentLabel(quote.change, quote.changePercent);
  const infoWidth = Math.min(150, Math.max(96, innerWidth * 0.28));
  const valueWidth = Math.min(170, Math.max(118, innerWidth * 0.32));
  const valueLeft = right - valueWidth;
  const identityRight = inlineChart ? x + infoWidth : valueLeft - 12;

  if (row.height >= 44) {
    const top = row.y + (row.height - 38) / 2;
    clippedText(ctx, quote.symbol, x, top + 15, identityRight - x, 16, 800, palette.ink);
    clippedText(ctx, quote.name, x, top + 34, identityRight - x, 14, 600, palette.muted);
    text(ctx, price, right, top + 15, 16, 700, palette.ink, 'right');
    const full = `${stockDirectionGlyph(quote.change)} ${formatStockChange(quote.change)}  ${formatStockPercent(quote.changePercent)}`;
    const change = textWidth(ctx, full, 14, 800) <= valueWidth ? full : percent;
    text(ctx, change, right, top + 34, 14, 800, color, 'right');
  } else {
    const baseline = row.y + row.height / 2 + 6;
    const percentWidth = textWidth(ctx, percent, 14, 800);
    text(ctx, percent, right, baseline, 14, 800, color, 'right');
    const priceRight = right - percentWidth - 12;
    text(ctx, price, priceRight, baseline, 16, 700, palette.ink, 'right');
    // Long prices can extend past the value column, so clip identity to the price itself.
    const identityLimit = Math.min(identityRight, priceRight - textWidth(ctx, price, 16, 700) - 12);
    const symbolWidth = Math.min(textWidth(ctx, quote.symbol, 16, 800), identityLimit - x);
    clippedText(ctx, quote.symbol, x, baseline, identityLimit - x, 16, 800, palette.ink);
    if (!inlineChart && identityLimit - x - symbolWidth - 10 > 40) {
      clippedText(
        ctx,
        quote.name,
        x + symbolWidth + 10,
        baseline,
        identityLimit - x - symbolWidth - 10,
        14,
        600,
        palette.muted
      );
    }
  }

  if (inlineChart) {
    const chartX = x + infoWidth + 10;
    drawStockChart(
      ctx,
      { x: chartX, y: row.y + 6, width: valueLeft - 10 - chartX, height: row.height - 12 },
      quote.chart,
      palette
    );
  }
}
