import {
  DEFAULT_WIDGET_SETTINGS,
  WIDGET_IDS,
  type DashboardConfig,
  type DashboardData,
  type WidgetId,
  type WidgetInput,
  type WidgetInputMap,
  type WidgetSettingsMap
} from '@inked/commons';

import { fetchCalendarWidgetInput } from './calendar.js';
import { fetchDateWidgetInput } from './date.js';
import { fetchMessageWidgetInput } from './message.js';
import { fetchScoresWidgetInput } from './scores.js';
import { fetchStocksWidgetInput } from './stocks.js';
import type {
  WidgetDataFetcher,
  WidgetDataFetcherRegistry,
  WidgetDataFetchContext
} from './types.js';
import { fetchWeatherWidgetInput } from './weather.js';

/** Adding a WidgetId requires a matching typed fetcher here. */
export const WIDGET_DATA_FETCHERS = {
  clock: fetchDateWidgetInput,
  weather: fetchWeatherWidgetInput,
  calendar: fetchCalendarWidgetInput,
  scores: fetchScoresWidgetInput,
  stocks: fetchStocksWidgetInput,
  message: fetchMessageWidgetInput
} satisfies WidgetDataFetcherRegistry;

export async function fetchWidgetInput<K extends WidgetId>(
  widgetId: K,
  context: WidgetDataFetchContext,
  settings: WidgetSettingsMap[K] = DEFAULT_WIDGET_SETTINGS[widgetId]
): Promise<WidgetInputMap[K]> {
  const fetcher = WIDGET_DATA_FETCHERS[widgetId] as unknown as WidgetDataFetcher<K>;
  return fetcher(context, settings);
}

/** Default per-widget inputs used by the widget gallery previews. */
export async function fetchDashboardData(context: WidgetDataFetchContext): Promise<DashboardData> {
  const entries = await Promise.all(
    WIDGET_IDS.map(
      async (widgetId) => [widgetId, await fetchWidgetInput(widgetId, context)] as const
    )
  );

  return Object.fromEntries(entries) as DashboardData;
}

/**
 * Resolves one input per assigned slot, honoring each slot's own settings so
 * repeated widgets (for example two weather cities) fetch independently.
 */
export async function resolveSlotInputs(
  config: DashboardConfig,
  context: WidgetDataFetchContext
): Promise<Record<string, WidgetInput>> {
  const entries = await Promise.all(
    config.assignments.map(
      async (assignment) =>
        [
          assignment.slotId,
          await fetchWidgetInput(assignment.widgetId, context, assignment.settings)
        ] as const
    )
  );
  return Object.fromEntries(entries);
}

export type {
  WidgetDataFetcher,
  WidgetDataFetcherRegistry,
  WidgetDataFetchContext
} from './types.js';
export {
  OpenMeteoWeatherService,
  type GeocodeResult,
  type WeatherService
} from './weather-service.js';
