import type { WidgetId, WidgetInputMap, WidgetSettingsMap } from '@inked/commons';

export interface WidgetDataFetchContext {
  now: Date;
  timezone: string;
}

export type WidgetDataFetcher<K extends WidgetId> = (
  context: WidgetDataFetchContext,
  settings: WidgetSettingsMap[K]
) => Promise<WidgetInputMap[K]>;

export type WidgetDataFetcherRegistry = {
  [K in WidgetId]: WidgetDataFetcher<K>;
};
