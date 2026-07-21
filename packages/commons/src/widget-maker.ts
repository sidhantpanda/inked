import {
  WIDGET_SIZES,
  type DashboardConfig,
  type DashboardRefreshPlan,
  type WidgetDefinition,
  type WidgetId,
  type WidgetRefreshPolicy
} from './types.js';

type WidgetDefinitionInput = Omit<WidgetDefinition, 'supportedSizes'>;

/**
 * Creates a widget definition and enforces an authoring plan for every canvas
 * size. Runtime checks keep JavaScript consumers and generated definitions safe
 * in addition to TypeScript's Record<WidgetSize, ...> exhaustiveness.
 */
export function defineWidget(input: WidgetDefinitionInput): WidgetDefinition {
  for (const size of WIDGET_SIZES) {
    const variant = input.variants[size];
    if (!variant?.name.trim() || !variant.summary.trim() || variant.shows.length === 0) {
      throw new Error(`Widget ${input.id} must plan a complete ${size} variant.`);
    }
  }

  if (
    input.refresh.mode === 'interval' &&
    (!Number.isInteger(input.refresh.everyMinutes) || input.refresh.everyMinutes < 1)
  ) {
    throw new Error(`Widget ${input.id} refresh interval must be a positive whole number.`);
  }
  if (
    input.refresh.mode === 'daily' &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.refresh.atLocalTime)
  ) {
    throw new Error(`Widget ${input.id} daily refresh time must use HH:mm.`);
  }

  return { ...input, supportedSizes: [...WIDGET_SIZES] };
}

export function getRefreshIntervalMinutes(policy: WidgetRefreshPolicy): number | null {
  if (policy.mode === 'manual') return null;
  if (policy.mode === 'daily') return 24 * 60;
  return policy.everyMinutes;
}

export function formatRefreshPolicy(policy: WidgetRefreshPolicy): string {
  if (policy.mode === 'manual') return 'Manual';
  if (policy.mode === 'daily') return `Daily · ${policy.atLocalTime}`;
  if (policy.everyMinutes < 60) return `${policy.everyMinutes} min`;
  if (policy.everyMinutes % 60 === 0) return `${policy.everyMinutes / 60} hr`;
  return `${policy.everyMinutes} min`;
}

export function buildDashboardRefreshPlan(
  config: DashboardConfig,
  definitions: readonly WidgetDefinition[]
): DashboardRefreshPlan {
  const assignedIds = [...new Set(config.assignments.map((assignment) => assignment.widgetId))];
  const widgets = assignedIds.map((widgetId) => {
    const definition = definitions.find((candidate) => candidate.id === widgetId);
    if (!definition) throw new Error(`Missing widget definition: ${widgetId}`);
    return {
      widgetId,
      label: formatRefreshPolicy(definition.refresh),
      intervalMinutes: getRefreshIntervalMinutes(definition.refresh),
      policy: definition.refresh
    };
  });
  const intervals = widgets
    .map((widget) => widget.intervalMinutes)
    .filter((interval): interval is number => interval !== null);
  const intervalMinutes = intervals.length > 0 ? Math.min(...intervals) : null;

  return {
    intervalMinutes,
    label: intervalMinutes === null ? 'Manual refresh' : `Every ${formatInterval(intervalMinutes)}`,
    widgets
  };
}

function formatInterval(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes % 60 === 0) return `${minutes / 60} hr`;
  return `${minutes} min`;
}

export function assertWidgetIdsExhaustive(
  definitions: readonly WidgetDefinition[],
  widgetIds: readonly WidgetId[]
) {
  const definitionIds = new Set(definitions.map((definition) => definition.id));
  for (const widgetId of widgetIds) {
    if (!definitionIds.has(widgetId))
      throw new Error(`Widget ${widgetId} is missing from the catalog.`);
  }
  if (definitionIds.size !== widgetIds.length)
    throw new Error('Widget catalog contains duplicate or unknown ids.');
}
