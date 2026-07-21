import { LAYOUTS } from './layouts.js';
import {
  DEFAULT_WIDGET_SETTINGS,
  type DashboardConfig,
  type SlotAssignment,
  type WidgetId,
  type WidgetSettingsMap
} from './types.js';
import { WIDGETS } from './widgets.js';

function readString(source: Record<string, unknown>, key: string, fallback: string): string {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/** Fills and validates the settings for one assignment against its widget. */
function normalizeWidgetSettings(widgetId: WidgetId, raw: unknown): WidgetSettingsMap[WidgetId] {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  switch (widgetId) {
    case 'weather':
      return { location: readString(source, 'location', DEFAULT_WIDGET_SETTINGS.weather.location) };
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
