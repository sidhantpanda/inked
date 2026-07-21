import type { WeatherWidgetInput, WeatherWidgetSettings } from '@inked/commons';

import type { WidgetDataFetchContext } from './types.js';

const CONDITIONS = ['Sunny', 'Partly cloudy', 'Cloudy', 'Showers', 'Clear'] as const;

/** Stable pseudo-random offset so each city renders distinct demo weather. */
function cityHash(location: string): number {
  let hash = 0;
  for (let index = 0; index < location.length; index += 1) {
    hash = (hash * 31 + location.charCodeAt(index)) & 0xffff;
  }
  return hash;
}

/** Replace this demo body with the production weather API integration. */
export async function fetchWeatherWidgetInput(
  context: WidgetDataFetchContext,
  settings: WeatherWidgetSettings
): Promise<WeatherWidgetInput> {
  const location = settings.location.trim() || 'Amsterdam';
  const seed = cityHash(location);
  const baseHigh = 14 + (seed % 16); // 14–29°C
  const current = baseHigh - 3;

  const forecast = Array.from({ length: 7 }, (_, index) => {
    const dayNoise = (seed + index * 7) % 11;
    const high = baseHigh - 2 + (dayNoise % 6);
    return {
      condition: CONDITIONS[(seed + index) % CONDITIONS.length]!,
      high,
      low: high - 6 - (dayNoise % 3),
      precipitation: (dayNoise * 9) % 80,
      date: new Date(context.now.getTime() + (index + 1) * 86_400_000).toISOString()
    };
  });

  return {
    timezone: context.timezone,
    temperature: current,
    condition: CONDITIONS[seed % CONDITIONS.length]!,
    high: baseHigh,
    low: baseHigh - 7,
    location,
    precipitation: seed % 60,
    forecast
  };
}
