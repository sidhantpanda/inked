export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface WeatherWidgetSettings {
  /** Display name of the place, resolved by geocoding. */
  location: string;
  /** Resolved coordinates. Absent settings fall back to geocoding `location`. */
  latitude?: number;
  longitude?: number;
  /** IANA timezone for the place; forecast days are labeled in this zone. */
  timezone?: string;
  units: TemperatureUnit;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  /** Meteocons icon name for current conditions (see wmoWeather). */
  icon: string;
  high: number;
  low: number;
  location: string;
  precipitation: number;
  units: TemperatureUnit;
  forecast: WeatherForecastDay[];
}

export interface WeatherForecastDay {
  date: string;
  condition: string;
  /** Meteocons icon name for the day's conditions. */
  icon: string;
  high: number;
  low: number;
  precipitation: number;
}

export interface WeatherWidgetInput extends WeatherData {
  timezone: string;
}
