import type { SKRSContext2D } from '@napi-rs/canvas';
import {
  planStocksLayout,
  STOCK_MARKET_STATE_LABELS,
  STOCK_RANGE_LABELS,
  type StocksWidgetInput,
  type WidgetSize
} from '@inked/commons';

import { label, line } from '../../primitives.js';
import { clippedText, setTextStyle, text, WIDGET_TYPOGRAPHY } from '../../text.js';
import type { Palette, Rect } from '../../types.js';
import { drawStockCard } from './card.js';
import { drawNarrowStockRow, drawStackedStockRow, drawWideStockRow } from './rows.js';

const STOCKS_HEADER_HEIGHT = 44;
const STOCKS_BOTTOM_PADDING = 12;

export function drawStocks(
  ctx: SKRSContext2D,
  rect: Rect,
  _size: WidgetSize,
  input: StocksWidgetInput,
  palette: Palette
) {
  label(ctx, rect, 'STOCKS', palette);
  const plan = planStocksLayout(rect.width, rect.height, input.quotes.length, input.showChart);
  const content: Rect = {
    x: rect.x,
    y: rect.y + STOCKS_HEADER_HEIGHT,
    width: rect.width,
    height: rect.height - STOCKS_HEADER_HEIGHT - STOCKS_BOTTOM_PADDING
  };
  const chartVisible =
    plan.mode === 'grid' ? plan.chart : plan.mode !== 'empty' && plan.chart !== 'none';
  drawStocksStatus(ctx, rect, input, chartVisible, palette);

  if (plan.mode === 'empty') {
    clippedText(
      ctx,
      'Add tickers to track',
      content.x + 18,
      content.y + 30,
      content.width - 36,
      16,
      600,
      palette.muted
    );
    return;
  }
  if (plan.mode === 'focus') {
    drawStockCard(ctx, content, input.quotes[0]!, plan.chart, input.range, palette, 'focus');
    return;
  }
  const visible = input.quotes.slice(0, plan.visible);
  if (plan.mode === 'grid') {
    const columnWidth = content.width / plan.columns;
    const rowHeight = content.height / plan.rows;
    visible.forEach((quote, index) => {
      const row = Math.floor(index / plan.columns);
      const column = index % plan.columns;
      const cell: Rect = {
        x: content.x + column * columnWidth,
        y: content.y + row * rowHeight,
        width: columnWidth,
        height: rowHeight
      };
      if (row > 0 && column === 0) {
        line(ctx, rect.x + 18, cell.y, rect.x + rect.width - 18, cell.y, palette.line);
      }
      if (column > 0) line(ctx, cell.x, cell.y + 4, cell.x, cell.y + cell.height - 4, palette.line);
      const inset: Rect = row > 0 ? { ...cell, y: cell.y + 8, height: cell.height - 8 } : cell;
      drawStockCard(ctx, inset, quote, plan.chart ? 'below' : 'none', input.range, palette, 'grid');
    });
    return;
  }

  const rowHeight = content.height / visible.length;
  const narrow = content.width < 300;
  visible.forEach((quote, index) => {
    const row: Rect = { ...content, y: content.y + index * rowHeight, height: rowHeight };
    if (index > 0) line(ctx, row.x + 18, row.y, row.x + row.width - 18, row.y, palette.line);
    if (plan.chart === 'stacked') drawStackedStockRow(ctx, row, quote, palette);
    else if (rowHeight >= 92) drawStockCard(ctx, row, quote, 'none', input.range, palette, 'grid');
    else if (narrow) drawNarrowStockRow(ctx, row, quote, palette);
    else drawWideStockRow(ctx, row, quote, plan.chart === 'inline', palette);
  });
}

/** Header status, e.g. `1D · CLOSED`, drawn only when it clears the label. */
function drawStocksStatus(
  ctx: SKRSContext2D,
  rect: Rect,
  input: StocksWidgetInput,
  chartVisible: boolean,
  palette: Palette
) {
  const quote = input.quotes.find((candidate) => candidate.state === 'ok');
  const state = quote ? STOCK_MARKET_STATE_LABELS[quote.marketState].toUpperCase() : '';
  const range = chartVisible ? STOCK_RANGE_LABELS[input.range].short : '';
  const options = { letterSpacing: 14 * WIDGET_TYPOGRAPHY.labelLetterSpacingEm };
  setTextStyle(ctx, 14, 800, options);
  const labelRight = rect.x + 18 + ctx.measureText('STOCKS').width + 12;
  const right = rect.x + rect.width - 36;
  setTextStyle(ctx, 14, 700, options);
  for (const candidate of [[range, state].filter(Boolean).join(' · '), state, range]) {
    if (candidate && right - ctx.measureText(candidate).width >= labelRight) {
      text(ctx, candidate, right, rect.y + 31, 14, 700, palette.muted, 'right', options);
      return;
    }
  }
}
