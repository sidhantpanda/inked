import type { WidgetId, WidgetInputMap, WidgetSettingsMap } from '@inked/commons';

import type { WeatherService } from './weather-service.js';

export interface WidgetDataFetchContext {
  now: Date;
  timezone: string;
  /** Live weather source; when absent the weather fetcher uses a fallback. */
  weather?: WeatherService;
}

export type WidgetDataFetcher<K extends WidgetId> = (
  context: WidgetDataFetchContext,
  settings: WidgetSettingsMap[K]
) => Promise<WidgetInputMap[K]>;

export type WidgetDataFetcherRegistry = {
  [K in WidgetId]: WidgetDataFetcher<K>;
};
