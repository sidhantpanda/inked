import type { WidgetId, WidgetInputMap, WidgetSettingsMap } from '@inked/commons';

import type { CalendarService } from '../google-calendar.js';
import type { SportsDataService } from '../sports/index.js';
import type { WeatherService } from './weather-service.js';

export interface WidgetDataFetchContext {
  now: Date;
  timezone: string;
  /** Live weather source; when absent the weather fetcher uses a fallback. */
  weather?: WeatherService;
  /** Google Calendar source; when absent the calendar fetcher uses demo data. */
  calendar?: CalendarService;
  /** Provider-neutral sports source; when absent the fetcher uses demo events. */
  sports?: SportsDataService;
}

export type WidgetDataFetcher<K extends WidgetId> = (
  context: WidgetDataFetchContext,
  settings: WidgetSettingsMap[K]
) => Promise<WidgetInputMap[K]>;

export type WidgetDataFetcherRegistry = {
  [K in WidgetId]: WidgetDataFetcher<K>;
};
