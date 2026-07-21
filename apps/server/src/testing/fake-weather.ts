import type {
  GeocodeResult,
  WeatherObservation,
  WeatherQuery,
  WeatherService
} from '../widget-data/weather-service.js';

/** Deterministic, offline WeatherService for tests (no network, stable pixels). */
export class FakeWeatherService implements WeatherService {
  async geocode(query: string, count = 6): Promise<GeocodeResult[]> {
    const name = query.trim() || 'Amsterdam';
    return [
      {
        id: 1,
        name,
        admin1: 'North Holland',
        country: 'Netherlands',
        countryCode: 'NL',
        latitude: 52.374,
        longitude: 4.8997,
        timezone: 'Europe/Amsterdam'
      }
    ].slice(0, count);
  }

  async getWeather(_query: WeatherQuery): Promise<WeatherObservation> {
    const codes = [0, 2, 3, 61, 3, 2, 95];
    const forecast = codes.map((weatherCode, index) => ({
      date: `2026-07-${String(15 + index).padStart(2, '0')}`,
      weatherCode,
      high: 22 - index,
      low: 14 - index,
      precipitation: index * 10
    }));
    return {
      temperature: 18,
      weatherCode: 2,
      isDay: true,
      high: 22,
      low: 14,
      precipitation: 10,
      timezone: 'Europe/Amsterdam',
      forecast
    };
  }
}
