/**
 * Maps WMO weather interpretation codes (as returned by Open-Meteo) to a short
 * display label and a bundled Meteocons icon name. Day/night variants are
 * chosen from `isDay`. Icons live in `packages/commons/icons/meteocons`.
 */
export interface WmoWeather {
  label: string;
  icon: string;
}

function dayNight(isDay: boolean, day: string, night: string): string {
  return isDay ? day : night;
}

export function wmoWeather(code: number, isDay = true): WmoWeather {
  switch (code) {
    case 0:
      return { label: 'Clear', icon: dayNight(isDay, 'clear-day', 'clear-night') };
    case 1:
      return { label: 'Mainly clear', icon: dayNight(isDay, 'clear-day', 'clear-night') };
    case 2:
      return {
        label: 'Partly cloudy',
        icon: dayNight(isDay, 'partly-cloudy-day', 'partly-cloudy-night')
      };
    case 3:
      return { label: 'Overcast', icon: dayNight(isDay, 'overcast-day', 'overcast-night') };
    case 45:
      return { label: 'Fog', icon: dayNight(isDay, 'fog-day', 'fog-night') };
    case 48:
      return { label: 'Rime fog', icon: 'fog' };
    case 51:
      return { label: 'Light drizzle', icon: 'drizzle' };
    case 53:
      return { label: 'Drizzle', icon: 'drizzle' };
    case 55:
      return { label: 'Heavy drizzle', icon: 'drizzle' };
    case 56:
    case 57:
      return { label: 'Freezing drizzle', icon: 'sleet' };
    case 61:
      return { label: 'Light rain', icon: 'rain' };
    case 63:
      return { label: 'Rain', icon: 'rain' };
    case 65:
      return { label: 'Heavy rain', icon: 'rain' };
    case 66:
    case 67:
      return { label: 'Freezing rain', icon: 'sleet' };
    case 71:
      return { label: 'Light snow', icon: 'snow' };
    case 73:
      return { label: 'Snow', icon: 'snow' };
    case 75:
      return { label: 'Heavy snow', icon: 'snow' };
    case 77:
      return { label: 'Snow grains', icon: 'snow' };
    case 80:
      return { label: 'Light showers', icon: 'rain' };
    case 81:
      return { label: 'Showers', icon: 'rain' };
    case 82:
      return { label: 'Heavy showers', icon: 'rain' };
    case 85:
      return { label: 'Snow showers', icon: 'snow' };
    case 86:
      return { label: 'Heavy snow showers', icon: 'snow' };
    case 95:
      return {
        label: 'Thunderstorm',
        icon: dayNight(isDay, 'thunderstorms-day', 'thunderstorms-night')
      };
    case 96:
    case 99:
      return { label: 'Thunderstorm, hail', icon: 'thunderstorms-rain' };
    default:
      return { label: 'Overcast', icon: 'overcast' };
  }
}

/** All Meteocons icon names the map can produce; used to preload the set. */
export const METEOCON_ICON_NAMES = [
  'clear-day',
  'clear-night',
  'partly-cloudy-day',
  'partly-cloudy-night',
  'overcast-day',
  'overcast-night',
  'overcast',
  'fog-day',
  'fog-night',
  'fog',
  'drizzle',
  'rain',
  'sleet',
  'snow',
  'thunderstorms-day',
  'thunderstorms-night',
  'thunderstorms-rain'
] as const;
