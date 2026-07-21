import type { WidgetComponentProps } from './types';
import { WidgetLabel } from './WidgetLabel';

export function CalendarWidget({ input, size }: WidgetComponentProps<'calendar'>) {
  const limit =
    size === 'small' ? 1 : size === 'wide' ? 2 : size === 'tall' ? 3 : size === 'large' ? 4 : 5;
  return (
    <>
      <WidgetLabel>Up next</WidgetLabel>
      <div className="event-list">
        {input.events.slice(0, limit).map((event) => (
          <div className="event" key={event.id}>
            <time>{event.time}</time>
            <div>
              <strong>{event.title}</strong>
              {event.tag && <span>{event.tag}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
