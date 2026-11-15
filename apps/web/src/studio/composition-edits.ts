import {
  createAssignment,
  defaultAssignments,
  getLayout,
  type DashboardConfig,
  type LayoutDefinition,
  type SlotAssignment,
  type WidgetId
} from '@inked/commons';

/** Pure edits to a composition; the studio applies them through state updaters. */
export function firstSlotId(config: DashboardConfig): string {
  return getLayout(config.layoutId).slots[0]?.id ?? '';
}

/** Switches layout, carrying widgets over slot by slot and defaulting the rest. */
export function withLayout(current: DashboardConfig, next: LayoutDefinition): DashboardConfig {
  const currentLayout = getLayout(current.layoutId);
  const currentAssignments = currentLayout.slots
    .map((slot) => current.assignments.find((assignment) => assignment.slotId === slot.id))
    .filter((assignment): assignment is SlotAssignment => Boolean(assignment));
  const defaults = defaultAssignments(next.id);

  return {
    ...current,
    layoutId: next.id,
    assignments: next.slots.map((slot, index) => {
      const carried = currentAssignments[index];
      return carried ? { ...carried, slotId: slot.id } : defaults[index]!;
    })
  };
}

/** Places a widget in a slot, keeping its settings when the same widget is re-selected. */
export function withWidget(
  current: DashboardConfig,
  slotId: string,
  widgetId: WidgetId
): DashboardConfig {
  const existing = current.assignments.find((assignment) => assignment.slotId === slotId);
  const next = existing?.widgetId === widgetId ? existing : createAssignment(slotId, widgetId);
  return {
    ...current,
    assignments: [...current.assignments.filter((assignment) => assignment.slotId !== slotId), next]
  };
}

export function withSettings(
  current: DashboardConfig,
  slotId: string,
  patch: Record<string, unknown>
): DashboardConfig {
  return {
    ...current,
    assignments: current.assignments.map((assignment) =>
      assignment.slotId === slotId
        ? ({ ...assignment, settings: { ...assignment.settings, ...patch } } as SlotAssignment)
        : assignment
    )
  };
}

export function withoutSlot(current: DashboardConfig, slotId: string): DashboardConfig {
  return {
    ...current,
    assignments: current.assignments.filter((assignment) => assignment.slotId !== slotId)
  };
}

/** Gives every empty slot of `layout` its default widget. */
export function withEmptySlotsFilled(
  current: DashboardConfig,
  layout: LayoutDefinition
): DashboardConfig {
  const defaults = defaultAssignments(current.layoutId);
  return {
    ...current,
    assignments: layout.slots.map(
      (slot, index) =>
        current.assignments.find((assignment) => assignment.slotId === slot.id) ?? defaults[index]!
    )
  };
}

export function withTheme(
  current: DashboardConfig,
  theme: Partial<DashboardConfig['theme']>
): DashboardConfig {
  return { ...current, theme: { ...current.theme, ...theme } };
}

/** The slot `offset` steps away from `slotId`, wrapping around the layout. */
export function steppedSlotId(layout: LayoutDefinition, slotId: string, offset: number) {
  const slots = layout.slots;
  if (slots.length === 0) return null;
  const currentIndex = Math.max(
    0,
    slots.findIndex((slot) => slot.id === slotId)
  );
  return slots[(currentIndex + offset + slots.length) % slots.length]!.id;
}
