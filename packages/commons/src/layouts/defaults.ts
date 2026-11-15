import {
  createAssignment,
  type DashboardConfig,
  type LayoutDefinition,
  type SlotAssignment
} from '../types.js';
import { LAYOUTS } from './catalog.js';

export function getLayout(layoutId: string): LayoutDefinition {
  return LAYOUTS.find((layout) => layout.id === layoutId) ?? LAYOUTS[0]!;
}

export function defaultAssignments(layoutId: string): SlotAssignment[] {
  const layout = getLayout(layoutId);
  const defaults = ['clock', 'weather', 'calendar', 'scores', 'message'] as const;

  return layout.slots.map((slot, index) =>
    createAssignment(slot.id, defaults[index % defaults.length]!)
  );
}

export function createDefaultDashboard(now = new Date()): DashboardConfig {
  return {
    id: 'home-display',
    name: 'Home display',
    layoutId: 'editorial',
    assignments: defaultAssignments('editorial'),
    theme: { background: 'paper', accent: 'citrus' },
    updatedAt: now.toISOString()
  };
}
