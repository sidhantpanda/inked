import type { SKRSContext2D } from '@napi-rs/canvas';
import type { WeatherWidgetInput, WidgetSize } from '@inked/commons';

import { label } from '../../primitives.js';
import { clippedText, text, WIDGET_TYPOGRAPHY } from '../../text.js';
import type { Palette, Rect } from '../../types.js';
import { drawGridForecast, drawHorizontalForecast, drawTallForecast } from './forecast.js';
import { drawWeatherGlyph, drawWeatherIcon } from './icons.js';

export function drawWeather(
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: WeatherWidgetInput,
  palette: Palette
) {
  const weather = input;
  label(ctx, rect, weather.location.toUpperCase(), palette);
  const forecastLimit =
    size === 'small' ? 0 : size === 'wide' ? 2 : size === 'tall' ? 3 : size === 'large' ? 4 : 7;
  const short = rect.height < 130;
  const compressedTall = size === 'tall' && rect.height < 250;
  const currentWidth =
    forecastLimit === 0
      ? rect.width
      : size === 'full'
        ? rect.width * 0.25
        : size === 'tall'
          ? rect.width
          : rect.width * 0.4;
  if (currentWidth >= 120) {
    const iconSize = short ? 44 : 58;
    const iconCx = rect.x + currentWidth - (short ? 32 : 40);
    const iconCy = rect.y + (short ? 46 : 58);
    if (!drawWeatherIcon(ctx, input.icon, iconCx, iconCy, iconSize)) {
      drawWeatherGlyph(
        ctx,
        rect.x + currentWidth - (short ? 42 : 31),
        rect.y + (short ? 47 : 56),
        short ? 15 : 17,
        palette
      );
    }
  }
  const temperatureSize =
    size === 'small' || size === 'wide' || short ? 41 : compressedTall ? 49 : 56;
  text(
    ctx,
    `${weather.temperature}°`,
    rect.x + 18,
    rect.y + (short || compressedTall ? 78 : 103),
    temperatureSize,
    700,
    palette.ink,
    'left',
    { letterSpacing: temperatureSize * WIDGET_TYPOGRAPHY.weatherLetterSpacingEm }
  );
  if (!short && !compressedTall) {
    clippedText(
      ctx,
      currentWidth < 120 ? compactWeatherCondition(weather.condition) : weather.condition,
      rect.x + 20,
      rect.y + 130,
      Math.max(42, currentWidth - 30),
      14,
      700,
      palette.ink
    );
    if (size !== 'small' && rect.height >= 175) {
      clippedText(
        ctx,
        currentWidth < 120
          ? `${weather.high}° / ${weather.low}°`
          : currentWidth < 180
            ? `H${weather.high}° · L${weather.low}°`
            : `H ${weather.high}°  L ${weather.low}°  ·  ${weather.precipitation}%`,
        rect.x + 20,
        rect.y + 153,
        Math.max(42, currentWidth - 30),
        14,
        600,
        palette.muted
      );
    }
  }

  const forecast = weather.forecast.slice(0, forecastLimit);
  if (size === 'tall' && forecast.length > 0) {
    drawTallForecast(
      ctx,
      rect,
      forecast,
      input.timezone,
      palette,
      short || compressedTall ? 88 : 164
    );
  } else if (size === 'large' && forecast.length > 0) {
    drawGridForecast(
      ctx,
      forecast,
      input.timezone,
      palette,
      rect.x + currentWidth,
      rect.y + 43,
      rect.width - currentWidth - 12,
      rect.height - 56,
      2
    );
  } else if (forecast.length > 0) {
    drawHorizontalForecast(
      ctx,
      forecast,
      input.timezone,
      palette,
      rect.x + currentWidth,
      rect.y + 43,
      rect.width - currentWidth - 12,
      rect.height - 56
    );
  }
}

function compactWeatherCondition(condition: string) {
  const normalized = condition.toLowerCase();
  if (normalized.includes('rain') || normalized.includes('shower')) return 'Rain';
  if (normalized.includes('sun')) return 'Sunny';
  if (normalized.includes('cloud')) return 'Cloudy';
  return condition;
}
