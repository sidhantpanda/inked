import type { GoogleAccountStore, StoredGoogleAccount } from './google-store.js';

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

const DEFAULT_SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.readonly'];
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface CalendarListResponse {
  items?: { id: string; summary: string; summaryOverride?: string; primary?: boolean }[];
}

/**
 * The calendar's display name: the name the user set for it in Google
 * (`summaryOverride`) when present, otherwise the calendar's `summary` as-is.
 * For a shared personal calendar with no override that summary is the owner's
 * email, which we show verbatim rather than guessing a name from it.
 */
export function calendarDisplayName(summary: string, summaryOverride?: string): string {
  return summaryOverride?.trim() || summary;
}

interface EventsResponse {
  items?: {
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
  }[];
}

/** Implements the Google Calendar contract over the REST API with `fetch`. */
export class GoogleCalendarService implements CalendarService {
  private readonly scopes: string[];
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: GoogleCalendarConfig) {
    this.scopes = config.scopes ?? DEFAULT_SCOPES;
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
  }

  isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret && this.config.redirectUri);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) throw new Error('Google OAuth is not configured.');
  }

  getAuthUrl(state: string): string {
    this.assertConfigured();
    const url = new URL(AUTH_ENDPOINT);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', this.scopes.join(' '));
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('state', state);
    return url.toString();
  }

  private async postForm<T>(endpoint: string, body: Record<string, string>): Promise<T> {
    const response = await this.fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) {
      throw new Error(`Google token endpoint ${response.status}: ${await response.text()}`);
    }
    return (await response.json()) as T;
  }

  private async getJson<T>(url: string, accessToken: string): Promise<T> {
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) {
      throw new Error(`Google Calendar ${response.status} for ${url}: ${await response.text()}`);
    }
    return (await response.json()) as T;
  }

  private expiryFrom(expiresIn: number): string {
    return new Date(Date.now() + expiresIn * 1000).toISOString();
  }

  async handleCallback(code: string): Promise<GoogleAccountSummary> {
    this.assertConfigured();
    const token = await this.postForm<TokenResponse>(TOKEN_ENDPOINT, {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code'
    });

    const userinfo = await this.getJson<{ sub: string; email: string }>(
      USERINFO_ENDPOINT,
      token.access_token
    );

    const existing = await this.config.accounts.get(userinfo.sub);
    const refreshToken = token.refresh_token ?? existing?.refreshToken;
    if (!refreshToken) {
      throw new Error('Google did not return a refresh token; remove app access and reconnect.');
    }

    await this.config.accounts.upsert({
      id: userinfo.sub,
      email: userinfo.email,
      refreshToken,
      accessToken: token.access_token,
      accessTokenExpiry: this.expiryFrom(token.expires_in),
      scope: token.scope ?? this.scopes.join(' ')
    });
    return { id: userinfo.sub, email: userinfo.email };
  }

  async listAccounts(): Promise<GoogleAccountSummary[]> {
    const accounts = await this.config.accounts.list();
    return accounts.map((account) => ({ id: account.id, email: account.email }));
  }

  async removeAccount(id: string): Promise<void> {
    await this.config.accounts.remove(id);
  }

  private async accessTokenFor(account: StoredGoogleAccount): Promise<string> {
    const expiresAt = Date.parse(account.accessTokenExpiry);
    if (account.accessToken && Number.isFinite(expiresAt) && expiresAt - 60_000 > Date.now()) {
      return account.accessToken;
    }
    const token = await this.postForm<TokenResponse>(TOKEN_ENDPOINT, {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token'
    });
    await this.config.accounts.updateTokens(
      account.id,
      token.access_token,
      this.expiryFrom(token.expires_in)
    );
    return token.access_token;
  }

  async listCalendars(accountId: string): Promise<GoogleCalendarInfo[]> {
    const account = await this.config.accounts.get(accountId);
    if (!account) throw new Error(`Unknown Google account: ${accountId}`);
    const token = await this.accessTokenFor(account);
    const data = await this.getJson<CalendarListResponse>(
      `${CALENDAR_API}/users/me/calendarList?minAccessRole=reader`,
      token
    );
    return (data.items ?? []).map((item) => ({
      id: item.id,
      summary: calendarDisplayName(item.summary, item.summaryOverride),
      primary: item.primary ?? false
    }));
  }

  async listEvents(query: CalendarEventQuery): Promise<CalendarEventData[]> {
    const events: CalendarEventData[] = [];
    for (const source of query.sources) {
      const account = await this.config.accounts.get(source.accountId);
      if (!account) continue;
      let token: string;
      try {
        token = await this.accessTokenFor(account);
      } catch {
        continue;
      }
      const names = new Map<string, string>();
      try {
        for (const calendar of await this.listCalendars(account.id)) {
          names.set(calendar.id, calendar.summary);
        }
      } catch {
        // Fall back to the calendar id for the tag if the list can't be fetched.
      }
      for (const calendarId of source.calendarIds) {
        try {
          const url = new URL(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
          url.searchParams.set('timeMin', query.timeMin.toISOString());
          url.searchParams.set('timeMax', query.timeMax.toISOString());
          url.searchParams.set('singleEvents', 'true');
          url.searchParams.set('orderBy', 'startTime');
          url.searchParams.set('maxResults', String(query.maxPerCalendar ?? 10));
          const data = await this.getJson<EventsResponse>(url.toString(), token);
          for (const item of data.items ?? []) {
            const startDateTime = item.start?.dateTime ?? item.start?.date;
            if (!startDateTime) continue;
            events.push({
              id: `${account.id}:${calendarId}:${item.id}`,
              summary: item.summary ?? '(No title)',
              start: startDateTime,
              allDay: !item.start?.dateTime,
              calendarId,
              calendarSummary: names.get(calendarId) ?? calendarId,
              accountId: account.id,
              accountEmail: account.email
            });
          }
        } catch {
          // Skip a calendar that fails; other calendars still render.
        }
      }
    }
    return events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  }
}
