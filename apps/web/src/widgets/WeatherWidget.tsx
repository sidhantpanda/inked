import { CloudIcon } from '../icons';
import type { WidgetComponentProps } from './types';
import { WidgetLabel } from './WidgetLabel';

export function WeatherWidget({ input, size }: WidgetComponentProps<'weather'>) {
  const forecastLimit =
    size === 'small' ? 0 : size === 'wide' ? 2 : size === 'tall' ? 3 : size === 'large' ? 4 : 7;
  return (
    <>
      <WidgetLabel>{input.location}</WidgetLabel>
      <div className="weather-body">
        <div className="weather-now">
          <CloudIcon className="weather-icon" />
          <div className="weather-temp">{input.temperature}°</div>
          <strong className="weather-condition">{input.condition}</strong>
          <div className="weather-meta">
            <span>H {input.high}°</span>
            <span>L {input.low}°</span>
            <span>{input.precipitation}% rain</span>
          </div>
        </div>
        {forecastLimit > 0 && (
          <div className="weather-forecast">
            {input.forecast.slice(0, forecastLimit).map((day) => (
              <div className="forecast-day" key={day.date}>
                <span>
                  {new Intl.DateTimeFormat('en-GB', {
                    weekday: 'short',
                    timeZone: input.timezone
                  }).format(new Date(day.date))}
                </span>
                <b>{weatherSymbol(day.condition)}</b>
                <strong>{day.high}°</strong>
                <small>
                  {day.low}° · {day.precipitation}%
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function weatherSymbol(condition: string) {
  const normalized = condition.toLowerCase();
  if (normalized.includes('rain') || normalized.includes('shower')) return '≋';
  if (normalized.includes('sun')) return '●';
  return '◒';
}
