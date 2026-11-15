import type { DashboardRefreshPlan, WidgetId } from './widget-definition.js';
import type { SlotAssignment, WidgetInputMap } from './widget-registry.js';

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
