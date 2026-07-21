import { describe, expect, it } from 'vitest';

import {
  LAYOUTS,
  WIDGET_LAYOUT_VARIANTS,
  defaultAssignments,
  getLayoutSlotPixelDimensions
} from './layouts.js';
import { WIDGET_SIZES } from './types.js';
import { WIDGETS } from './widgets.js';

describe('layout catalog', () => {
  it('offers focused and high-density compositions', () => {
    expect(LAYOUTS).toHaveLength(10);
    expect(LAYOUTS.filter((layout) => layout.slots.length >= 5)).toHaveLength(6);
    expect(Math.max(...LAYOUTS.map((layout) => layout.slots.length))).toBe(8);
  });

  it('offers at least one placement for every standard widget size', () => {
    const availableSizes = new Set(
      LAYOUTS.flatMap((layout) => layout.slots.map((slot) => slot.size))
    );
    expect([...availableSizes].sort()).toEqual([...WIDGET_SIZES].sort());
  });

  it('catalogs every distinct widget geometry and all of its layout usages', () => {
    const totalSlots = LAYOUTS.reduce((total, layout) => total + layout.slots.length, 0);
    const usages = WIDGET_LAYOUT_VARIANTS.flatMap((variant) =>
      variant.usages.map((usage) => ({ variant, usage }))
    );

    expect(WIDGET_LAYOUT_VARIANTS).toHaveLength(20);
    expect(usages).toHaveLength(totalSlots);
    expect(totalSlots).toBe(55);
    expect(new Set(WIDGET_LAYOUT_VARIANTS.map((variant) => variant.id)).size).toBe(20);
    expect(new Set(WIDGET_LAYOUT_VARIANTS.map((variant) => variant.size))).toEqual(
      new Set(WIDGET_SIZES)
    );

    for (const layout of LAYOUTS) {
      for (const slot of layout.slots) {
        const dimensions = getLayoutSlotPixelDimensions(layout, slot);
        const matchingUsages = usages.filter(
          ({ variant, usage }) =>
            variant.size === slot.size &&
            variant.width === dimensions.width &&
            variant.height === dimensions.height &&
            usage.layoutId === layout.id &&
            usage.slotId === slot.id
        );
        expect(matchingUsages, `${layout.name} / ${slot.label}`).toHaveLength(1);
      }
    }
  });

  it('includes both Bento eight lower strips in their exact wide geometry', () => {
    const lowerStrip = WIDGET_LAYOUT_VARIANTS.find((variant) => variant.id === 'wide-380x106');

    expect(lowerStrip?.usages).toEqual([
      {
        layoutId: 'bento-eight',
        layoutName: 'Bento eight',
        slotId: 'bento-wide-1',
        slotLabel: 'Lower strip one'
      },
      {
        layoutId: 'bento-eight',
        layoutName: 'Bento eight',
        slotId: 'bento-wide-2',
        slotLabel: 'Lower strip two'
      }
    ]);
  });

  it.each(LAYOUTS)('$name stays within its grid without overlapping slots', (layout) => {
    const occupied = new Set<string>();
    const slotIds = new Set<string>();

    for (const slot of layout.slots) {
      expect(slotIds.has(slot.id)).toBe(false);
      slotIds.add(slot.id);
      expect(slot.column).toBeGreaterThanOrEqual(1);
      expect(slot.row).toBeGreaterThanOrEqual(1);
      expect(slot.column + slot.columnSpan - 1).toBeLessThanOrEqual(layout.columns);
      expect(slot.row + slot.rowSpan - 1).toBeLessThanOrEqual(layout.rows);

      for (let row = slot.row; row < slot.row + slot.rowSpan; row += 1) {
        for (let column = slot.column; column < slot.column + slot.columnSpan; column += 1) {
          const cell = `${column}:${row}`;
          expect(occupied.has(cell), `${slot.id} overlaps cell ${cell}`).toBe(false);
          occupied.add(cell);
        }
      }
    }
  });

  it.each(LAYOUTS)('$name receives a valid default widget in every slot', (layout) => {
    const knownWidgets = new Set(WIDGETS.map((widget) => widget.id));
    const assignments = defaultAssignments(layout.id);

    expect(assignments).toHaveLength(layout.slots.length);
    expect(assignments.every((assignment) => knownWidgets.has(assignment.widgetId))).toBe(true);
  });
});
