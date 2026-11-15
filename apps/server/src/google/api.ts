export const DEFAULT_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.readonly'
];
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';
export const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface CalendarListResponse {
  items?: { id: string; summary: string; summaryOverride?: string; primary?: boolean }[];
}

export interface EventsResponse {
  items?: {
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
  }[];
}

/** Minimal Google REST client: form posts to the token endpoint and bearer-token GETs. */
export class GoogleApi {
  constructor(private readonly fetchImpl: typeof fetch) {}

  async postForm<T>(endpoint: string, body: Record<string, string>): Promise<T> {
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

  async getJson<T>(url: string, accessToken: string): Promise<T> {
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) {
      throw new Error(`Google Calendar ${response.status} for ${url}: ${await response.text()}`);
    }
    return (await response.json()) as T;
  }
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
