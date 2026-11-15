import type { CalendarWidgetInput, CalendarWidgetSettings } from './calendar.js';
import type { DateWidgetInput } from './date.js';
import type { WidgetSize } from './display.js';
import type { MessageWidgetInput, MessageWidgetSettings } from './message.js';
import type { ScoresWidgetInput, SportsWidgetSettings } from './sports.js';
import type { StocksWidgetInput, StocksWidgetSettings } from './stocks.js';
import type { WeatherWidgetInput, WeatherWidgetSettings } from './weather.js';
import type { WidgetId } from './widget-definition.js';

/** No user-configurable options. */
export type EmptyWidgetSettings = Record<string, never>;

/** The customization each widget accepts. Empty when a widget has no options. */
export interface WidgetSettingsMap {
  clock: EmptyWidgetSettings;
  weather: WeatherWidgetSettings;
  calendar: CalendarWidgetSettings;
  scores: SportsWidgetSettings;
  stocks: StocksWidgetSettings;
  message: MessageWidgetSettings;
}

export type WidgetSettings<K extends WidgetId = WidgetId> = WidgetSettingsMap[K];

/** Default settings applied when a slot is first assigned a widget. */
export const DEFAULT_WIDGET_SETTINGS: WidgetSettingsMap = {
  clock: {},
  weather: {
    location: 'Amsterdam',
    latitude: 52.374,
    longitude: 4.89969,
    timezone: 'Europe/Amsterdam',
    units: 'celsius'
  },
  calendar: { sources: [] },
  scores: {
    sportId: 'football',
    follows: [
      {
        kind: 'competition',
        sportId: 'football',
        competitionId: 'premier-league',
        eventTypes: []
      }
    ],
    horizonDays: 90
  },
  stocks: {
    symbols: ['SPY', 'AAPL', 'MSFT', 'NVDA'],
    range: '1d',
    showChart: true
  },
  message: {
    eyebrow: 'Today’s note',
    title: 'Make room for the good stuff.',
    detail: 'A calm screen for a busy day.'
  }
};

/** True when a widget exposes user-editable options in the studio. */
export const WIDGET_HAS_SETTINGS: Record<WidgetId, boolean> = {
  clock: false,
  weather: true,
  calendar: true,
  scores: true,
  stocks: true,
  message: true
};

/**
 * A widget placed in a slot, carrying its own settings. The discriminated
 * union keeps each widget's settings strongly typed once narrowed by widgetId,
 * so two `weather` slots can track different cities in the same layout.
 */
export type SlotAssignment = {
  [K in WidgetId]: { slotId: string; widgetId: K; settings: WidgetSettingsMap[K] };
}[WidgetId];

/** Builds a fully-populated assignment, filling any unset settings with defaults. */
export function createAssignment<K extends WidgetId>(
  slotId: string,
  widgetId: K,
  settings?: Partial<WidgetSettingsMap[K]>
): SlotAssignment {
  return {
    slotId,
    widgetId,
    settings: { ...DEFAULT_WIDGET_SETTINGS[widgetId], ...(settings ?? {}) }
  } as SlotAssignment;
}

/** The input variables accepted by each widget renderer and data fetcher. */
export interface WidgetInputMap {
  clock: DateWidgetInput;
  weather: WeatherWidgetInput;
  calendar: CalendarWidgetInput;
  scores: ScoresWidgetInput;
  stocks: StocksWidgetInput;
  message: MessageWidgetInput;
}

export type WidgetInput<K extends WidgetId = WidgetId> = WidgetInputMap[K];

export interface WidgetRenderProps<K extends WidgetId = WidgetId> {
  input: WidgetInputMap[K];
  size: WidgetSize;
}
