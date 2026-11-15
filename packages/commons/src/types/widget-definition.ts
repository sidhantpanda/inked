import type { WidgetSize } from './display.js';

export const WIDGET_IDS = ['clock', 'weather', 'calendar', 'scores', 'stocks', 'message'] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

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
