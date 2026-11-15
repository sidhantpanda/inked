/** Shared fetch fixtures for provider adapter tests. */
export function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export function urlOf(input: string | URL | Request) {
  return new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
}

// Fri 13 Nov 2026, regular session 14:30–21:00 UTC (09:30–16:00 New York).
export const SESSION_START = 1794580200;
export const SESSION_END = 1794603600;
export const NOW = Date.UTC(2026, 10, 15, 10); // Sunday: market closed.
