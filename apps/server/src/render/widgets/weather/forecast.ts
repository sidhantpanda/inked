import type { SKRSContext2D } from '@napi-rs/canvas';
import type { WeatherWidgetInput } from '@inked/commons';

import { formatDate, line } from '../../primitives.js';
import { text } from '../../text.js';
import type { Palette, Rect } from '../../types.js';
import { drawWeatherIcon } from './icons.js';

export function drawHorizontalForecast(
  ctx: SKRSContext2D,
  forecast: WeatherWidgetInput['forecast'],
  timeZone: string,
  palette: Palette,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const cellWidth = width / forecast.length;
  forecast.forEach((day, index) => {
    drawForecastCell(ctx, day, timeZone, palette, x + index * cellWidth, y, cellWidth, height);
  });
}

export function drawGridForecast(
  ctx: SKRSContext2D,
  forecast: WeatherWidgetInput['forecast'],
  timeZone: string,
  palette: Palette,
  x: number,
  y: number,
  width: number,
  height: number,
  columns: number
) {
  const rows = Math.ceil(forecast.length / columns);
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  forecast.forEach((day, index) => {
    drawForecastCell(
      ctx,
      day,
      timeZone,
      palette,
      x + (index % columns) * cellWidth,
      y + Math.floor(index / columns) * cellHeight,
      cellWidth,
      cellHeight
    );
  });
}

export function drawTallForecast(
  ctx: SKRSContext2D,
  rect: Rect,
  forecast: WeatherWidgetInput['forecast'],
  timeZone: string,
  palette: Palette,
  startY: number
) {
  const rowHeight = (rect.y + rect.height - startY - 10) / forecast.length;
  forecast.forEach((day, index) => {
    const y = startY + index * rowHeight;
    line(ctx, rect.x + 18, y, rect.x + rect.width - 18, y, palette.line);
    text(
      ctx,
      formatDate(new Date(day.date), timeZone, { weekday: 'short' }).toUpperCase(),
      rect.x + 18,
      y + rowHeight * 0.65,
      14,
      700,
      palette.muted
    );
    const markCx = rect.x + rect.width * 0.48;
    const iconSize = Math.min(26, rowHeight - 6);
    if (!drawWeatherIcon(ctx, day.icon, markCx, y + rowHeight * 0.5, iconSize)) {
      text(
        ctx,
        forecastMark(day.condition),
        markCx,
        y + rowHeight * 0.65,
        14,
        700,
        palette.ink,
        'center'
      );
    }
    text(
      ctx,
      `${day.high}° / ${day.low}°`,
      rect.x + rect.width - 18,
      y + rowHeight * 0.65,
      14,
      700,
      palette.ink,
      'right'
    );
  });
}

function drawForecastCell(
  ctx: SKRSContext2D,
  day: WeatherWidgetInput['forecast'][number],
  timeZone: string,
  palette: Palette,
  x: number,
  y: number,
  width: number,
  height: number
) {
  line(ctx, x, y, x, y + height, palette.line);
  const center = x + width / 2;
  const compact = height < 70;
  text(
    ctx,
    formatDate(new Date(day.date), timeZone, { weekday: 'short' }).toUpperCase(),
    center,
    y + (compact ? 15 : 19),
    14,
    700,
    palette.muted,
    'center'
  );
  if (!compact) {
    const iconSize = Math.min(38, width - 10, height - 40);
    if (!drawWeatherIcon(ctx, day.icon, center, y + 40, iconSize)) {
      text(ctx, forecastMark(day.condition), center, y + 43, 14, 700, palette.ink, 'center');
    }
  }
  text(
    ctx,
    `${day.high}° / ${day.low}°`,
    center,
    y + (compact ? 36 : 63),
    14,
    700,
    palette.ink,
    'center'
  );
  if (height > 96)
    text(ctx, `${day.precipitation}% rain`, center, y + 84, 14, 600, palette.muted, 'center');
}

function forecastMark(condition: string) {
  const normalized = condition.toLowerCase();
  if (normalized.includes('rain') || normalized.includes('shower')) return 'RAIN';
  if (normalized.includes('sun')) return 'SUN';
  return 'CLD';
}
