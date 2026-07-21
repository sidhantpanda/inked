import type { CalendarEvent, CalendarWidgetInput, CalendarWidgetSettings } from '@inked/commons';

import type { CalendarEventData } from '../google-calendar.js';
import type { WidgetDataFetchContext } from './types.js';

const EVENT_WINDOW_DAYS = 14;
const MAX_EVENTS = 8;

/** Demo agenda shown before any Google calendars are connected. */
function demoEvents(): CalendarEvent[] {
  return [
    { id: 'design-review', time: '09:30', title: 'Design review', tag: 'Studio' },
    { id: 'lunch', time: '12:30', title: 'Lunch with Maya', tag: 'Personal' },
    { id: 'focus', time: '15:00', title: 'Focus block', tag: 'Deep work' },
    { id: 'groceries', time: '17:30', title: 'Pick up groceries', tag: 'Home' },
    { id: 'dinner', time: '19:00', title: 'Dinner reservation', tag: 'Personal' }
  ];
}

function formatEventTime(event: CalendarEventData, now: Date, timezone: string): string {
  const start = new Date(event.start);
  if (event.allDay) {
    return sameDay(start, now, timezone)
      ? 'All day'
      : new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: timezone }).format(start);
  }
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone
  }).format(start);
  if (sameDay(start, now, timezone)) return time;
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: timezone }).format(
    start
  );
  return `${weekday} ${time}`;
}

function sameDay(a: Date, b: Date, timezone: string): boolean {
  const format = new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
  return format.format(a) === format.format(b);
}

function formatEventDate(event: CalendarEventData, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: timezone
  }).format(new Date(event.start));
}

/** Fetches upcoming events from the widget's selected Google calendars. */
export async function fetchCalendarWidgetInput(
  context: WidgetDataFetchContext,
  settings: CalendarWidgetSettings
): Promise<CalendarWidgetInput> {
  const service = context.calendar;
  const hasSources = settings.sources.some((source) => source.calendarIds.length > 0);
  if (!service || !hasSources) return { events: demoEvents() };

  try {
    const events = await service.listEvents({
      sources: settings.sources,
      timeMin: context.now,
      timeMax: new Date(context.now.getTime() + EVENT_WINDOW_DAYS * 86_400_000),
      maxPerCalendar: MAX_EVENTS
    });
    return {
      events: events.slice(0, MAX_EVENTS).map((event) => ({
        id: event.id,
        time: formatEventTime(event, context.now, context.timezone),
        date: formatEventDate(event, context.timezone),
        title: event.summary,
        tag: event.calendarSummary
      }))
    };
  } catch {
    return { events: demoEvents() };
  }
}
