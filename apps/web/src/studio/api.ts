import type {
  DashboardConfig,
  DashboardResponse,
  DashboardTheme,
  PaintResponse
} from '@inked/commons';

import type { DashboardSummary } from './types';

const JSON_HEADERS = { 'content-type': 'application/json' };

/** Every studio request; each throws an Error whose message is shown in the status bar. */
export async function fetchActiveDashboard(): Promise<DashboardResponse> {
  const response = await fetch('/api/dashboard');
  if (!response.ok) throw new Error('Server unavailable');
  return response.json() as Promise<DashboardResponse>;
}

/** Lists saved compositions; an unreachable server yields an empty list. */
export async function fetchDashboards(): Promise<DashboardSummary[]> {
  try {
    const response = await fetch('/api/dashboards');
    if (!response.ok) return [];
    const result = (await response.json()) as { dashboards?: DashboardSummary[] };
    return result.dashboards ?? [];
  } catch {
    return [];
  }
}

export async function activateDashboard(id: string): Promise<DashboardConfig> {
  const response = await fetch(`/api/dashboards/${id}/activate`, { method: 'POST' });
  if (!response.ok) throw new Error('Could not switch composition');
  return ((await response.json()) as { config: DashboardConfig }).config;
}

export async function createDashboard(theme: DashboardTheme): Promise<DashboardConfig> {
  const response = await fetch('/api/dashboards', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name: 'New composition', theme })
  });
  if (!response.ok) throw new Error('Could not create composition');
  return ((await response.json()) as { config: DashboardConfig }).config;
}

export async function deleteDashboard(id: string): Promise<DashboardConfig> {
  const response = await fetch(`/api/dashboards/${id}`, { method: 'DELETE' });
  const result = (await response.json()) as { config?: DashboardConfig; error?: string };
  if (!response.ok || !result.config) throw new Error(result.error ?? 'Could not delete');
  return result.config;
}

export async function saveDashboard(config: DashboardConfig): Promise<DashboardConfig> {
  const response = await fetch('/api/dashboard', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(config)
  });
  if (!response.ok)
    throw new Error(((await response.json()) as { error?: string }).error ?? 'Could not save');
  return ((await response.json()) as { config: DashboardConfig }).config;
}

/** Renders the exact display PNG; its token later fetches or paints the matching BMP. */
export async function renderPreview(
  configSignature: string,
  signal: AbortSignal
): Promise<{ renderToken: string; blob: Blob }> {
  const response = await fetch('/api/preview', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: configSignature,
    signal
  });
  if (!response.ok) throw new Error('Could not render display preview');
  const renderToken = response.headers.get('x-inked-render-token');
  if (!renderToken) throw new Error('Preview is missing its render token');
  return { renderToken, blob: await response.blob() };
}

export async function fetchPreviewBmp(renderToken: string): Promise<Blob> {
  const response = await fetch(`/api/preview/${renderToken}/bmp`);
  if (!response.ok) throw new Error('Could not render BMP');
  return response.blob();
}

export async function paintPreview(renderToken: string): Promise<PaintResponse> {
  const response = await fetch('/api/paint', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ renderToken })
  });
  const result = (await response.json()) as PaintResponse & { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'Photo Painter rejected the image');
  return result;
}
