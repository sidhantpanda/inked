import { useCallback, useEffect, useState } from 'react';

import type { CalendarSource, CalendarWidgetSettings } from '@inked/commons';

interface GoogleAccount {
  id: string;
  email: string;
}
interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
}

/** Calendar options: connect Google accounts and pick which calendars to show. */
export function CalendarSettings({
  settings,
  onChange
}: {
  settings: CalendarWidgetSettings;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [calendars, setCalendars] = useState<Record<string, GoogleCalendar[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadCalendars = useCallback((accountId: string) => {
    void fetch(`/api/google/accounts/${accountId}/calendars`)
      .then(async (response) => {
        if (!response.ok) throw new Error('load failed');
        return response.json() as Promise<{ calendars: GoogleCalendar[] }>;
      })
      .then((data) => setCalendars((current) => ({ ...current, [accountId]: data.calendars })))
      .catch(() =>
        setErrors((current) => ({ ...current, [accountId]: 'Could not load calendars.' }))
      );
  }, []);

  const loadAccounts = useCallback(() => {
    void fetch('/api/google/accounts')
      .then((response) => (response.ok ? response.json() : { accounts: [] }))
      .then((data: { accounts?: GoogleAccount[] }) => {
        const list = data.accounts ?? [];
        setAccounts(list);
        list.forEach((account) => loadCalendars(account.id));
      })
      .catch(() => setAccounts([]));
  }, [loadCalendars]);

  useEffect(() => {
    void fetch('/api/google/status')
      .then((response) => (response.ok ? response.json() : { configured: false }))
      .then((data: { configured?: boolean }) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    function onMessage(event: MessageEvent<{ type?: string }>) {
      if (event.data?.type === 'inked-google') loadAccounts();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loadAccounts]);

  function connect() {
    window.open('/api/google/auth', 'inked-google', 'popup,width=520,height=680');
  }

  function removeAccount(accountId: string) {
    void fetch(`/api/google/accounts/${accountId}`, { method: 'DELETE' }).then(() => {
      onChange({ sources: settings.sources.filter((source) => source.accountId !== accountId) });
      loadAccounts();
    });
  }

  function isSelected(accountId: string, calendarId: string): boolean {
    return Boolean(
      settings.sources
        .find((source) => source.accountId === accountId)
        ?.calendarIds.includes(calendarId)
    );
  }

  function toggleCalendar(accountId: string, calendarId: string, selected: boolean) {
    const existing = settings.sources.find((source) => source.accountId === accountId);
    const ids = new Set(existing?.calendarIds ?? []);
    if (selected) ids.add(calendarId);
    else ids.delete(calendarId);

    const others = settings.sources.filter((source) => source.accountId !== accountId);
    const next: CalendarSource[] =
      ids.size > 0 ? [...others, { accountId, calendarIds: [...ids] }] : others;
    onChange({ sources: next });
  }

  if (configured === false) {
    return (
      <p className="options-empty">
        Connect Google Calendar by setting <code>GOOGLE_CLIENT_ID</code> and{' '}
        <code>GOOGLE_CLIENT_SECRET</code> on the server, then reload.
      </p>
    );
  }

  return (
    <div className="calendar-settings">
      {accounts.length === 0 && <p className="city-hint">No Google accounts connected yet.</p>}
      {accounts.map((account) => (
        <div className="calendar-account" key={account.id}>
          <div className="calendar-account-head">
            <strong>{account.email}</strong>
            <button
              type="button"
              className="calendar-account-remove"
              aria-label={`Disconnect ${account.email}`}
              title="Disconnect"
              onClick={() => removeAccount(account.id)}
            >
              Disconnect
            </button>
          </div>
          {errors[account.id] && <p className="city-hint">{errors[account.id]}</p>}
          <ul className="calendar-list">
            {(calendars[account.id] ?? []).map((calendar) => (
              <li key={calendar.id}>
                <label className="calendar-check">
                  <input
                    type="checkbox"
                    checked={isSelected(account.id, calendar.id)}
                    onChange={(event) =>
                      toggleCalendar(account.id, calendar.id, event.target.checked)
                    }
                  />
                  <span>{calendar.summary}</span>
                  {calendar.primary && <em>primary</em>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <button type="button" className="calendar-connect" onClick={connect}>
        + Connect Google account
      </button>
    </div>
  );
}
