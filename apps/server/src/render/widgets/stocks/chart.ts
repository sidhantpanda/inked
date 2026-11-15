import type { SKRSContext2D } from '@napi-rs/canvas';
import { type StockChart, stockRangeChange } from '@inked/commons';

import type { Palette, Rect } from '../../types.js';
import { stockColor } from './shared.js';

/**
 * Price line over the chart's time domain with a dashed reference baseline
 * (previous close for 1D). Colored by performance over the charted window.
 */
export function drawStockChart(
  ctx: SKRSContext2D,
  area: Rect,
  chart: StockChart,
  palette: Palette
) {
  const points = chart.points;
  if (points.length < 2 || area.width < 24 || area.height < 14) return;
  const values = points.map((point) => point.value);
  let low = Math.min(...values, chart.reference);
  let high = Math.max(...values, chart.reference);
  if (high - low < high * 0.002) {
    low -= high * 0.001;
    high += high * 0.001;
  }
  const padding = (high - low) * 0.08;
  low -= padding;
  high += padding;
  const span = Math.max(1, chart.end - chart.start);
  const toX = (t: number) =>
    area.x + Math.min(1, Math.max(0, (t - chart.start) / span)) * area.width;
  const toY = (value: number) => area.y + (1 - (value - low) / (high - low)) * area.height;
  const performance = stockRangeChange(chart);
  const color = stockColor(performance.change, palette);

  ctx.save();
  ctx.strokeStyle = palette.muted;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  const baseline = Math.round(toY(chart.reference)) + 0.5;
  ctx.moveTo(area.x, baseline);
  ctx.lineTo(area.x + area.width, baseline);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = color;
  ctx.lineWidth = area.height >= 60 ? 2.5 : 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  points.forEach((point, index) => {
    const px = toX(point.t);
    const py = toY(point.value);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  if (area.height >= 36) {
    const last = points.at(-1)!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(toX(last.t), toY(last.value), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
