import { LAYOUTS } from './layouts.js';
import { isStockRange, normalizeStockSymbols } from './stocks.js';
import {
  DEFAULT_WIDGET_SETTINGS,
  SPORTS_EVENT_TYPES,
  type DashboardConfig,
  type SportsEventType,
  type SportsFollow,
  type SlotAssignment,
  type WidgetId,
  type WidgetSettingsMap
} from './types.js';
import { WIDGETS } from './widgets.js';

function readString(source: Record<string, unknown>, key: string, fallback: string): string {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function readNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Fills and validates the settings for one assignment against its widget. */
function normalizeWidgetSettings(widgetId: WidgetId, raw: unknown): WidgetSettingsMap[WidgetId] {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  switch (widgetId) {
    case 'weather': {
      const latitude = readNumber(source, 'latitude');
      const longitude = readNumber(source, 'longitude');
      const timezone = typeof source.timezone === 'string' ? source.timezone : undefined;
      return {
        location: readString(source, 'location', DEFAULT_WIDGET_SETTINGS.weather.location),
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
        ...(timezone ? { timezone } : {}),
        units: source.units === 'fahrenheit' ? 'fahrenheit' : 'celsius'
      };
    }
    case 'calendar': {
      const rawSources = Array.isArray(source.sources) ? source.sources : [];
      const sources = rawSources
        .map((entry) => {
          const item = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
          const accountId = typeof item.accountId === 'string' ? item.accountId : '';
          const calendarIds = Array.isArray(item.calendarIds)
            ? item.calendarIds.filter((id): id is string => typeof id === 'string')
            : [];
          return { accountId, calendarIds };
        })
        .filter((entry) => entry.accountId);
      return { sources };
    }
    case 'scores': {
      const rawFollows = Array.isArray(source.follows)
        ? source.follows
        : DEFAULT_WIDGET_SETTINGS.scores.follows;
      const parsedFollows = rawFollows
        .slice(0, 12)
        .map((entry): SportsFollow | null => {
          const item = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};
          const sportId = typeof item.sportId === 'string' ? item.sportId.trim() : '';
          const competitionId =
            typeof item.competitionId === 'string' ? item.competitionId.trim() : '';
          if (!sportId || !competitionId) return null;
          const eventTypes = Array.isArray(item.eventTypes)
            ? item.eventTypes.filter((type): type is SportsEventType =>
                SPORTS_EVENT_TYPES.includes(type as SportsEventType)
              )
            : [];
          if (item.kind === 'team' && typeof item.teamId === 'string' && item.teamId.trim()) {
            return {
              kind: 'team',
              sportId,
              competitionId,
              teamId: item.teamId.trim(),
              eventTypes: [...new Set(eventTypes)]
            };
          }
          return {
            kind: 'competition',
            sportId,
            competitionId,
            eventTypes: [...new Set(eventTypes)]
          };
        })
        .filter((follow): follow is SportsFollow => follow !== null);
      const configuredSportId = typeof source.sportId === 'string' ? source.sportId.trim() : '';
      const sportId =
        configuredSportId || parsedFollows[0]?.sportId || DEFAULT_WIDGET_SETTINGS.scores.sportId;
      const follows = parsedFollows.filter((follow) => follow.sportId === sportId);
      const horizonDays = source.horizonDays;
      return {
        sportId,
        follows,
        horizonDays:
          horizonDays === 7 || horizonDays === 30 || horizonDays === 90 ? horizonDays : 90
      };
    }
    case 'stocks': {
      const symbols = Array.isArray(source.symbols)
        ? normalizeStockSymbols(source.symbols)
        : [...DEFAULT_WIDGET_SETTINGS.stocks.symbols];
      return {
        symbols,
        range: isStockRange(source.range) ? source.range : DEFAULT_WIDGET_SETTINGS.stocks.range,
        showChart:
          typeof source.showChart === 'boolean'
            ? source.showChart
            : DEFAULT_WIDGET_SETTINGS.stocks.showChart
      };
    }
    case 'message':
      return {
        eyebrow: readString(source, 'eyebrow', DEFAULT_WIDGET_SETTINGS.message.eyebrow),
        title: readString(source, 'title', DEFAULT_WIDGET_SETTINGS.message.title),
        detail: readString(source, 'detail', DEFAULT_WIDGET_SETTINGS.message.detail)
      };
    default:
      return {};
  }
}

export function parseDashboardConfig(input: unknown): DashboardConfig {
  if (!input || typeof input !== 'object') {
    throw new Error('Dashboard configuration must be an object.');
  }

  const value = input as Partial<DashboardConfig>;
  const layout = LAYOUTS.find((candidate) => candidate.id === value.layoutId);
  if (!layout) throw new Error(`Unknown layout: ${String(value.layoutId)}`);
  if (typeof value.id !== 'string' || !value.id.trim())
    throw new Error('Dashboard id is required.');
  if (typeof value.name !== 'string' || !value.name.trim())
    throw new Error('Dashboard name is required.');
  if (!Array.isArray(value.assignments)) throw new Error('Assignments must be an array.');

  const knownWidgets = new Set(WIDGETS.map((widget) => widget.id));
  const knownSlots = new Set(layout.slots.map((slot) => slot.id));
  const assignedSlots = new Set<string>();

  const assignments: SlotAssignment[] = value.assignments.map((assignment) => {
    if (!knownSlots.has(assignment.slotId)) throw new Error(`Unknown slot: ${assignment.slotId}`);
    if (!knownWidgets.has(assignment.widgetId))
      throw new Error(`Unknown widget: ${assignment.widgetId}`);
    if (assignedSlots.has(assignment.slotId))
      throw new Error(`Slot assigned twice: ${assignment.slotId}`);
    assignedSlots.add(assignment.slotId);
    return {
      slotId: assignment.slotId,
      widgetId: assignment.widgetId,
      settings: normalizeWidgetSettings(assignment.widgetId, assignment.settings)
    } as SlotAssignment;
  });

  if (!value.theme || !['paper', 'mist', 'night'].includes(value.theme.background)) {
    throw new Error('Unknown background theme.');
  }
  if (!['citrus', 'coral', 'cobalt'].includes(value.theme.accent)) {
    throw new Error('Unknown accent theme.');
  }

  return {
    id: value.id,
    name: value.name,
    layoutId: layout.id,
    assignments,
    theme: value.theme,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString()
  };
}
