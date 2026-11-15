import type { StoredGoogleAccount } from '../google-store.js';
import {
  AUTH_ENDPOINT,
  CALENDAR_API,
  calendarDisplayName,
  DEFAULT_SCOPES,
  GoogleApi,
  TOKEN_ENDPOINT,
  USERINFO_ENDPOINT,
  type CalendarListResponse,
  type TokenResponse
} from './api.js';
import { fetchCalendarEvents } from './events.js';
import type {
  CalendarEventData,
  CalendarEventQuery,
  CalendarService,
  GoogleAccountSummary,
  GoogleCalendarConfig,
  GoogleCalendarInfo
} from './types.js';

/** Implements the Google Calendar contract over the REST API with `fetch`. */
export class GoogleCalendarService implements CalendarService {
  private readonly scopes: string[];
  private readonly api: GoogleApi;

  constructor(private readonly config: GoogleCalendarConfig) {
    this.scopes = config.scopes ?? DEFAULT_SCOPES;
    this.api = new GoogleApi(config.fetchImpl ?? globalThis.fetch);
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

  private expiryFrom(expiresIn: number): string {
    return new Date(Date.now() + expiresIn * 1000).toISOString();
  }

  async handleCallback(code: string): Promise<GoogleAccountSummary> {
    this.assertConfigured();
    const token = await this.api.postForm<TokenResponse>(TOKEN_ENDPOINT, {
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code'
    });

    const userinfo = await this.api.getJson<{ sub: string; email: string }>(
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

  /** A valid access token, refreshed when it expires within the next minute. */
  private async accessTokenFor(account: StoredGoogleAccount): Promise<string> {
    const expiresAt = Date.parse(account.accessTokenExpiry);
    if (account.accessToken && Number.isFinite(expiresAt) && expiresAt - 60_000 > Date.now()) {
      return account.accessToken;
    }
    const token = await this.api.postForm<TokenResponse>(TOKEN_ENDPOINT, {
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
    const data = await this.api.getJson<CalendarListResponse>(
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
          events.push(
            ...(await fetchCalendarEvents(
              this.api,
              token,
              account,
              calendarId,
              names.get(calendarId) ?? calendarId,
              query
            ))
          );
        } catch {
          // Skip a calendar that fails; other calendars still render.
        }
      }
    }
    return events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  }
}
