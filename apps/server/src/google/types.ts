import type { GoogleAccountStore } from '../google-store.js';

export interface GoogleAccountSummary {
  id: string;
  email: string;
}

export interface GoogleCalendarInfo {
  id: string;
  summary: string;
  primary: boolean;
}

export interface CalendarEventData {
  id: string;
  summary: string;
  start: string;
  allDay: boolean;
  calendarId: string;
  calendarSummary: string;
  accountId: string;
  accountEmail: string;
}

export interface CalendarEventQuery {
  sources: { accountId: string; calendarIds: string[] }[];
  timeMin: Date;
  timeMax: Date;
  maxPerCalendar?: number;
}

/** Google Calendar access used by the calendar widget and studio endpoints. */
export interface CalendarService {
  isConfigured(): boolean;
  getAuthUrl(state: string): string;
  handleCallback(code: string): Promise<GoogleAccountSummary>;
  listAccounts(): Promise<GoogleAccountSummary[]>;
  removeAccount(id: string): Promise<void>;
  listCalendars(accountId: string): Promise<GoogleCalendarInfo[]>;
  listEvents(query: CalendarEventQuery): Promise<CalendarEventData[]>;
}

export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
  accounts: GoogleAccountStore;
  fetchImpl?: typeof fetch;
}
