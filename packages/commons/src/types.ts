export const DISPLAY_WIDTH = 800;
export const DISPLAY_HEIGHT = 480;
export const DISPLAY_PADDING = 16;
export const DISPLAY_GAP = 8;
export const MIN_WIDGET_FONT_SIZE = 14;

export const WIDGET_IDS = ['clock', 'weather', 'calendar', 'scores', 'message'] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export const WIDGET_SIZES = ['small', 'wide', 'tall', 'large', 'full'] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];

export interface WidgetSizeDefinition {
  id: WidgetSize;
  name: string;
  gridColumns: number;
  gridRows: number;
  contentLevel: number;
  description: string;
}

/**
 * The placement sizes every Inked widget implements. Grid units describe the
 * intended shape, while layouts remain free to provide the exact pixel bounds.
 */
export const WIDGET_SIZE_DEFINITIONS = {
  small: {
    id: 'small',
    name: 'Small',
    gridColumns: 1,
    gridRows: 1,
    contentLevel: 1,
    description: 'A one-glance value or item.'
  },
  wide: {
    id: 'wide',
    name: 'Wide',
    gridColumns: 2,
    gridRows: 1,
    contentLevel: 2,
    description: 'A horizontal strip with supporting context.'
  },
  tall: {
    id: 'tall',
    name: 'Tall',
    gridColumns: 1,
    gridRows: 2,
    contentLevel: 2,
    description: 'A vertical rail for a short stacked list.'
  },
  large: {
    id: 'large',
    name: 'Large',
    gridColumns: 2,
    gridRows: 2,
    contentLevel: 3,
    description: 'A feature panel with several useful details.'
  },
  full: {
    id: 'full',
    name: 'Full',
    gridColumns: 4,
    gridRows: 2,
    contentLevel: 4,
    description: 'A display-scale composition with the complete useful dataset.'
  }
} as const satisfies Record<WidgetSize, WidgetSizeDefinition>;

export interface WidgetPreviewDimensions {
  width: number;
  height: number;
}

export interface WidgetLayoutVariantUsage {
  layoutId: string;
  layoutName: string;
  slotId: string;
  slotLabel: string;
}

export interface WidgetLayoutVariant extends WidgetPreviewDimensions {
  id: string;
  size: WidgetSize;
  usages: WidgetLayoutVariantUsage[];
}

/**
 * Canonical pixel bounds for the widget gallery. These are the exact slot
 * dimensions produced by a four-column, two-row 800 × 480 display with the
 * standard 16px canvas padding and 8px gaps.
 */
export const WIDGET_PREVIEW_DIMENSIONS = {
  small: { width: 186, height: 220 },
  wide: { width: 380, height: 220 },
  tall: { width: 186, height: 448 },
  large: { width: 380, height: 448 },
  full: { width: 768, height: 448 }
} as const satisfies Record<WidgetSize, WidgetPreviewDimensions>;

export interface LayoutSlot {
  id: string;
  label: string;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
  size: WidgetSize;
}

export interface LayoutDefinition {
  id: string;
  name: string;
  description: string;
  columns: number;
  rows: number;
  slots: LayoutSlot[];
}

export interface WidgetDefinition {
  id: WidgetId;
  name: string;
  description: string;
  supportedSizes: WidgetSize[];
  variants: Record<WidgetSize, WidgetVariantPlan>;
  refresh: WidgetRefreshPolicy;
}

export interface WidgetVariantPlan {
  name: string;
  summary: string;
  shows: string[];
}

export type WidgetRefreshPolicy =
  | { mode: 'interval'; everyMinutes: number; reason: string }
  | { mode: 'daily'; atLocalTime: string; reason: string }
  | { mode: 'manual'; reason: string };

export interface WidgetRefreshPlanItem {
  widgetId: WidgetId;
  label: string;
  intervalMinutes: number | null;
  policy: WidgetRefreshPolicy;
}

export interface DashboardRefreshPlan {
  intervalMinutes: number | null;
  label: string;
  widgets: WidgetRefreshPlanItem[];
}

/** No user-configurable options. */
export type EmptyWidgetSettings = Record<string, never>;

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export interface WeatherWidgetSettings {
  /** Display name of the place, resolved by geocoding. */
  location: string;
  /** Resolved coordinates. Absent settings fall back to geocoding `location`. */
  latitude?: number;
  longitude?: number;
  /** IANA timezone for the place; forecast days are labeled in this zone. */
  timezone?: string;
  units: TemperatureUnit;
}

export interface MessageWidgetSettings {
  eyebrow: string;
  title: string;
  detail: string;
}

/** Which calendars to show from one connected Google account. */
export interface CalendarSource {
  /** References a stored Google account (google_accounts.id). */
  accountId: string;
  /** Calendar ids selected from that account. */
  calendarIds: string[];
}

export interface CalendarWidgetSettings {
  sources: CalendarSource[];
}

export const SPORTS_EVENT_TYPES = ['match', 'practice', 'qualifying', 'sprint', 'race'] as const;
export type SportsEventType = (typeof SPORTS_EVENT_TYPES)[number];

/** A league/series or one team that a single Sports panel follows. */
export type SportsFollow =
  | {
      kind: 'competition';
      sportId: string;
      competitionId: string;
      /** Motorsport panels can choose race-only or include other sessions. */
      eventTypes: SportsEventType[];
    }
  | {
      kind: 'team';
      sportId: string;
      competitionId: string;
      teamId: string;
      eventTypes: SportsEventType[];
    };

export interface SportsWidgetSettings {
  /** A Sports panel is scoped to exactly one sport category. */
  sportId: string;
  follows: SportsFollow[];
  horizonDays: 7 | 30 | 90;
}

/** Provider-neutral catalog returned by the server for the Sports picker. */
export interface SportsCatalog {
  sports: SportsCatalogSport[];
}

export interface SportsCatalogSport {
  id: string;
  name: string;
  competitions: SportsCatalogCompetition[];
}

export interface SportsCatalogCompetition {
  id: string;
  sportId: string;
  name: string;
  supportsTeams: boolean;
  eventTypes: SportsEventType[];
}

export interface SportsCatalogTeam {
  id: string;
  competitionId: string;
  name: string;
  abbreviation: string;
}

/** The customization each widget accepts. Empty when a widget has no options. */
export interface WidgetSettingsMap {
  clock: EmptyWidgetSettings;
  weather: WeatherWidgetSettings;
  calendar: CalendarWidgetSettings;
  scores: SportsWidgetSettings;
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

export interface DashboardTheme {
  background: 'paper' | 'mist' | 'night';
  accent: 'citrus' | 'coral' | 'cobalt';
}

export interface DashboardConfig {
  id: string;
  name: string;
  layoutId: string;
  assignments: SlotAssignment[];
  theme: DashboardTheme;
  updatedAt: string;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  /** Meteocons icon name for current conditions (see wmoWeather). */
  icon: string;
  high: number;
  low: number;
  location: string;
  precipitation: number;
  units: TemperatureUnit;
  forecast: WeatherForecastDay[];
}

export interface WeatherForecastDay {
  date: string;
  condition: string;
  /** Meteocons icon name for the day's conditions. */
  icon: string;
  high: number;
  low: number;
  precipitation: number;
}

export interface CalendarEvent {
  id: string;
  time: string;
  /** Short date shown under the time when the row has room, e.g. "26 Jul". */
  date?: string;
  title: string;
  tag?: string;
}

export type SportsEventState = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

interface SportsEventBase {
  id: string;
  type: SportsEventType;
  sport: string;
  competition: string;
  startsAt: string;
  state: SportsEventState;
  source: string;
}

export interface SportsMatchEvent extends SportsEventBase {
  type: 'match';
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
}

export interface SportsSessionEvent extends SportsEventBase {
  type: Exclude<SportsEventType, 'match'>;
  name: string;
  session: string;
  venue?: string;
}

export type SportsEvent = SportsMatchEvent | SportsSessionEvent;

export interface DateWidgetInput {
  now: string;
  timezone: string;
}

export interface WeatherWidgetInput extends WeatherData {
  timezone: string;
}

export interface CalendarWidgetInput {
  events: CalendarEvent[];
}

export interface ScoresWidgetInput {
  events: SportsEvent[];
  timezone: string;
}

export interface MessageWidgetInput {
  eyebrow: string;
  title: string;
  detail: string;
}

/** The input variables accepted by each widget renderer and data fetcher. */
export interface WidgetInputMap {
  clock: DateWidgetInput;
  weather: WeatherWidgetInput;
  calendar: CalendarWidgetInput;
  scores: ScoresWidgetInput;
  message: MessageWidgetInput;
}

export type WidgetInput<K extends WidgetId = WidgetId> = WidgetInputMap[K];

export interface WidgetRenderProps<K extends WidgetId = WidgetId> {
  input: WidgetInputMap[K];
  size: WidgetSize;
}

/** A dashboard response contains one independently fetched input per widget. */
export type DashboardData = {
  [K in WidgetId]: WidgetInputMap[K];
};

export interface DashboardResponse {
  config: DashboardConfig;
  data: DashboardData;
  refreshPlan: DashboardRefreshPlan;
}

export interface PaintResponse {
  bytes: number;
  hash: string;
  message?: string;
}
