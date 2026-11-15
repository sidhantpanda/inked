import type { StockChartPoint } from '@inked/commons';

export type Fetch = typeof fetch;

/**
 * Both public endpoints reject browser-like agents and agents containing URLs,
 * so Inked identifies itself with a short product token.
 */
export const STOCKS_USER_AGENT = 'Inked/0.1 (e-ink dashboard)';
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_CHART_POINTS = 160;

export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export async function getJson(
  fetchImpl: Fetch,
  url: URL,
  provider: string
): Promise<{ status: number; body: unknown }> {
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': STOCKS_USER_AGENT },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`${provider} ${response.status} ${response.statusText} for ${url.pathname}`);
  }
  return { status: response.status, body: (await response.json()) as unknown };
}

/** Keeps charts light for the dashboard payload while preserving the latest point. */
export function downsample(points: StockChartPoint[]): StockChartPoint[] {
  if (points.length <= MAX_CHART_POINTS) return points;
  const step = points.length / (MAX_CHART_POINTS - 1);
  const sampled: StockChartPoint[] = [];
  for (let index = 0; index < MAX_CHART_POINTS - 1; index += 1) {
    sampled.push(points[Math.floor(index * step)]!);
  }
  sampled.push(points.at(-1)!);
  return sampled;
}

/** Calendar date (YYYY-MM-DD) of an instant in the exchange's time zone. */
export function exchangeDate(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(epochMs));
}

/** Offset in ms of `timeZone` from UTC at an instant, e.g. -5h for New York in winter. */
export function timeZoneOffsetMs(epochMs: number, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(new Date(epochMs))
    .find((part) => part.type === 'timeZoneName')?.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '');
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === '-' ? -1 : 1) * minutes * 60_000;
}
