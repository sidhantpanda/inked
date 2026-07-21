import type {
  CalendarEventData,
  CalendarEventQuery,
  CalendarService,
  GoogleAccountSummary,
  GoogleCalendarInfo
} from '../google-calendar.js';

/** Deterministic, offline CalendarService for tests. */
export class FakeCalendarService implements CalendarService {
  private accounts: GoogleAccountSummary[];

  constructor(accounts: GoogleAccountSummary[] = [{ id: 'acc-1', email: 'home@example.com' }]) {
    this.accounts = accounts;
  }

  isConfigured(): boolean {
    return true;
  }

  getAuthUrl(state: string): string {
    return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`;
  }

  async handleCallback(_code: string): Promise<GoogleAccountSummary> {
    const account = { id: 'acc-1', email: 'home@example.com' };
    if (!this.accounts.some((existing) => existing.id === account.id)) this.accounts.push(account);
    return account;
  }

  async listAccounts(): Promise<GoogleAccountSummary[]> {
    return this.accounts;
  }

  async removeAccount(id: string): Promise<void> {
    this.accounts = this.accounts.filter((account) => account.id !== id);
  }

  async listCalendars(_accountId: string): Promise<GoogleCalendarInfo[]> {
    return [
      { id: 'primary', summary: 'home@example.com', primary: true },
      { id: 'family@group.calendar.google.com', summary: 'Family', primary: false }
    ];
  }

  async listEvents(query: CalendarEventQuery): Promise<CalendarEventData[]> {
    const events: CalendarEventData[] = [];
    for (const source of query.sources) {
      for (const calendarId of source.calendarIds) {
        events.push({
          id: `${source.accountId}:${calendarId}:e1`,
          summary: calendarId === 'primary' ? 'Standup' : 'Family dinner',
          start: '2026-07-21T09:00:00.000Z',
          allDay: false,
          calendarId,
          calendarSummary: calendarId === 'primary' ? 'home@example.com' : 'Family',
          accountId: source.accountId,
          accountEmail: 'home@example.com'
        });
      }
    }
    return events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  }
}
