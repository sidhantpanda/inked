import { wmoWeather, type WeatherWidgetInput, type WeatherWidgetSettings } from '@inked/commons';

import type { WidgetDataFetchContext } from './types.js';
import type { GeocodeResult, WeatherObservation, WeatherService } from './weather-service.js';

/** A calm placeholder shown when live weather is unavailable (offline, error). */
function fallbackWeather(
  context: WidgetDataFetchContext,
  settings: WeatherWidgetSettings
): WeatherWidgetInput {
  const forecast = Array.from({ length: 7 }, (_, index) => ({
    date: new Date(context.now.getTime() + (index + 1) * 86_400_000).toISOString(),
    condition: 'Overcast',
    icon: 'overcast',
    high: 18,
    low: 12,
    precipitation: 0
  }));
  return {
    timezone: settings.timezone ?? context.timezone,
    temperature: 15,
    condition: 'Overcast',
    icon: 'overcast',
    high: 18,
    low: 12,
    location: settings.location,
    precipitation: 0,
    units: settings.units,
    forecast
  };
}

/** Resolves coordinates from settings, geocoding the name when they are absent. */
async function resolveCoordinates(
  service: WeatherService,
  settings: WeatherWidgetSettings
): Promise<{ latitude: number; longitude: number; timezone?: string } | null> {
  if (settings.latitude !== undefined && settings.longitude !== undefined) {
    return {
      latitude: settings.latitude,
      longitude: settings.longitude,
      ...(settings.timezone ? { timezone: settings.timezone } : {})
    };
  }
  const [match] = await service.geocode(settings.location, 1).catch((): GeocodeResult[] => []);
  if (!match) return null;
  return { latitude: match.latitude, longitude: match.longitude, timezone: match.timezone };
}

function toWidgetInput(
  observation: WeatherObservation,
  settings: WeatherWidgetSettings
): WeatherWidgetInput {
  const current = wmoWeather(observation.weatherCode, observation.isDay);
  return {
    timezone: settings.timezone ?? observation.timezone,
    temperature: observation.temperature,
    condition: current.label,
    icon: current.icon,
    high: observation.high,
    low: observation.low,
    location: settings.location,
    precipitation: observation.precipitation,
    units: settings.units,
    forecast: observation.forecast.map((day) => {
      const conditions = wmoWeather(day.weatherCode, true);
      return {
        date: day.date,
        condition: conditions.label,
        icon: conditions.icon,
        high: day.high,
        low: day.low,
        precipitation: day.precipitation
      };
    })
  };
}

/** Fetches live conditions for the slot's place from Open-Meteo (see WeatherService). */
export async function fetchWeatherWidgetInput(
  context: WidgetDataFetchContext,
  settings: WeatherWidgetSettings
): Promise<WeatherWidgetInput> {
  const service = context.weather;
  if (!service) return fallbackWeather(context, settings);

  try {
    const coordinates = await resolveCoordinates(service, settings);
    if (!coordinates) return fallbackWeather(context, settings);
    const observation = await service.getWeather({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      units: settings.units
    });
    return toWidgetInput(observation, settings);
  } catch {
    return fallbackWeather(context, settings);
  }
}
