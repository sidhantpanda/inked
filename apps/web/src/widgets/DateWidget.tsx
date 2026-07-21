import type { WidgetComponentProps } from './types';
import { WidgetLabel } from './WidgetLabel';

export function DateWidget({ input, size }: WidgetComponentProps<'clock'>) {
  const now = new Date(input.now);
  const weekday = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    timeZone: input.timezone
  }).format(now);
  const dayNumber = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    timeZone: input.timezone
  }).format(now);
  const monthYear = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: input.timezone
  }).format(now);
  const showWeek = size === 'tall' || size === 'large' || size === 'full';
  const week = getWeek(now, input.timezone);

  return (
    <>
      <WidgetLabel>Date</WidgetLabel>
      <div className="date-main">
        <div className="date-number">{dayNumber}</div>
        <div className="date-copy">
          <strong>{weekday}</strong>
          <span>{monthYear}</span>
        </div>
      </div>
      {showWeek && (
        <div className="week-strip" aria-label="Current week">
          {week.map((day) => (
            <div className={day.current ? 'is-current' : ''} key={day.key}>
              <span>{day.weekday}</span>
              <strong>{day.day}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="accent-rule" />
    </>
  );
}

function getWeek(date: Date, timeZone: string) {
  const shortWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(
    date
  );
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(shortWeekday);
  const mondayOffset = -((weekdayIndex + 6) % 7);

  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(date.getTime() + (mondayOffset + index) * 86_400_000);
    return {
      key: value.toISOString(),
      weekday: new Intl.DateTimeFormat('en-GB', { weekday: 'narrow', timeZone }).format(value),
      day: new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone }).format(value),
      current: index === -mondayOffset
    };
  });
}
