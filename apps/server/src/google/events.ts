import type { StoredGoogleAccount } from '../google-store.js';
import { CALENDAR_API, type EventsResponse, type GoogleApi } from './api.js';
import type { CalendarEventData, CalendarEventQuery } from './types.js';

/** Fetches one calendar's events in the query window and tags them with their source. */
export async function fetchCalendarEvents(
  api: GoogleApi,
  token: string,
  account: StoredGoogleAccount,
  calendarId: string,
  calendarSummary: string,
  query: CalendarEventQuery
): Promise<CalendarEventData[]> {
  const url = new URL(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.set('timeMin', query.timeMin.toISOString());
  url.searchParams.set('timeMax', query.timeMax.toISOString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', String(query.maxPerCalendar ?? 10));
  const data = await api.getJson<EventsResponse>(url.toString(), token);
  const events: CalendarEventData[] = [];
  for (const item of data.items ?? []) {
    const startDateTime = item.start?.dateTime ?? item.start?.date;
    if (!startDateTime) continue;
    events.push({
      id: `${account.id}:${calendarId}:${item.id}`,
      summary: item.summary ?? '(No title)',
      start: startDateTime,
      allDay: !item.start?.dateTime,
      calendarId,
      calendarSummary,
      accountId: account.id,
      accountEmail: account.email
    });
  }
  return events;
}
