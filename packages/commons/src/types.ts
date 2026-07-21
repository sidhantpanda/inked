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

export interface WeatherWidgetSettings {
  /** The city whose current conditions and forecast the widget shows. */
  location: string;
}

export interface MessageWidgetSettings {
  eyebrow: string;
  title: string;
  detail: string;
}

/** The customization each widget accepts. Empty when a widget has no options. */
export interface WidgetSettingsMap {
  clock: EmptyWidgetSettings;
  weather: WeatherWidgetSettings;
  calendar: EmptyWidgetSettings;
  scores: EmptyWidgetSettings;
  message: MessageWidgetSettings;
}

export type WidgetSettings<K extends WidgetId = WidgetId> = WidgetSettingsMap[K];

/** Default settings applied when a slot is first assigned a widget. */
export const DEFAULT_WIDGET_SETTINGS: WidgetSettingsMap = {
  clock: {},
  weather: { location: 'Amsterdam' },
  calendar: {},
  scores: {},
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
  calendar: false,
  scores: false,
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
  high: number;
  low: number;
  location: string;
  precipitation: number;
  forecast: WeatherForecastDay[];
}

export interface WeatherForecastDay {
  date: string;
  condition: string;
  high: number;
  low: number;
  precipitation: number;
}

export interface CalendarEvent {
  id: string;
  time: string;
  title: string;
  tag?: string;
}

export interface SportsGame {
  id: string;
  competition: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  status: string;
  live: boolean;
}

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
  games: SportsGame[];
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
