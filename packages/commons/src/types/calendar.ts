/** Which calendars to show from one connected Google account. */
export interface CalendarSource {
  /** References a stored Google account (google_accounts.id). */
  accountId: string;
  /** Calendar ids selected from that account. */
  calendarIds: string[];
}

export interface CalendarWidgetSettings {
  sources: CalendarSource[];
}

export interface CalendarEvent {
  id: string;
  time: string;
  /** Short date shown under the time when the row has room, e.g. "26 Jul". */
  date?: string;
  title: string;
  tag?: string;
}

export interface CalendarWidgetInput {
  events: CalendarEvent[];
}
