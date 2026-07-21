import type { TemperatureUnit } from '@inked/commons';

export interface GeocodeResult {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface WeatherForecastPoint {
  date: string;
  weatherCode: number;
  high: number;
  low: number;
  precipitation: number;
}

export interface WeatherObservation {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  high: number;
  low: number;
  precipitation: number;
  timezone: string;
  forecast: WeatherForecastPoint[];
}

export interface WeatherQuery {
  latitude: number;
  longitude: number;
  units: TemperatureUnit;
}

export interface WeatherService {
  geocode(query: string, count?: number): Promise<GeocodeResult[]>;
  getWeather(query: WeatherQuery): Promise<WeatherObservation>;
}

const USER_AGENT = 'Inked/0.1 (https://github.com/inked; e-ink dashboard)';
const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;
const WEATHER_TTL_MS = 10 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface OpenMeteoGeocodeResponse {
  results?: {
    id: number;
    name: string;
    admin1?: string;
    country?: string;
    country_code?: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }[];
}

interface OpenMeteoForecastResponse {
  timezone: string;
  current: { temperature_2m: number; weather_code: number; is_day: number };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
  };
}

/** Fetches geocoding and forecast data from the free Open-Meteo API. */
export class OpenMeteoWeatherService implements WeatherService {
  private readonly geocodeCache = new Map<string, CacheEntry<GeocodeResult[]>>();
  private readonly weatherCache = new Map<string, CacheEntry<WeatherObservation>>();

  constructor(private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  private async getJson<T>(url: URL): Promise<T> {
    const response = await this.fetchImpl(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(12_000)
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo ${response.status} ${response.statusText} for ${url.pathname}`);
    }
    return (await response.json()) as T;
  }

  async geocode(query: string, count = 6): Promise<GeocodeResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];
    const key = `${trimmed.toLowerCase()}::${count}`;
    const cached = this.geocodeCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', trimmed);
    url.searchParams.set('count', String(count));
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const data = await this.getJson<OpenMeteoGeocodeResponse>(url);
    const results: GeocodeResult[] = (data.results ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      ...(item.admin1 ? { admin1: item.admin1 } : {}),
      ...(item.country ? { country: item.country } : {}),
      ...(item.country_code ? { countryCode: item.country_code } : {}),
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone
    }));
    this.geocodeCache.set(key, { value: results, expiresAt: Date.now() + GEOCODE_TTL_MS });
    return results;
  }

  async getWeather(query: WeatherQuery): Promise<WeatherObservation> {
    const lat = Number(query.latitude.toFixed(3));
    const lon = Number(query.longitude.toFixed(3));
    const key = `${lat},${lon},${query.units}`;
    const cached = this.weatherCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('temperature_unit', query.units);

    const data = await this.getJson<OpenMeteoForecastResponse>(url);
    const daily = data.daily;
    const forecast: WeatherForecastPoint[] = daily.time.map((date, index) => ({
      date,
      weatherCode: daily.weather_code[index] ?? 0,
      high: Math.round(daily.temperature_2m_max[index] ?? 0),
      low: Math.round(daily.temperature_2m_min[index] ?? 0),
      precipitation: Math.round(daily.precipitation_probability_max[index] ?? 0)
    }));

    const observation: WeatherObservation = {
      temperature: Math.round(data.current.temperature_2m),
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      high: forecast[0]?.high ?? Math.round(data.current.temperature_2m),
      low: forecast[0]?.low ?? Math.round(data.current.temperature_2m),
      precipitation: forecast[0]?.precipitation ?? 0,
      timezone: data.timezone,
      forecast
    };
    this.weatherCache.set(key, { value: observation, expiresAt: Date.now() + WEATHER_TTL_MS });
    return observation;
  }
}
