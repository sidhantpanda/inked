import {
  DISPLAY_GAP,
  DISPLAY_HEIGHT,
  DISPLAY_PADDING,
  DISPLAY_WIDTH,
  WIDGET_SIZES,
  type LayoutDefinition,
  type LayoutSlot,
  type WidgetLayoutVariant,
  type WidgetPreviewDimensions
} from '../types.js';
import { LAYOUTS } from './catalog.js';

/** Exact pixel bounds of a slot on the 800 × 480 display. */
export function getLayoutSlotPixelDimensions(
  layout: LayoutDefinition,
  slot: LayoutSlot
): WidgetPreviewDimensions {
  const columnWidth =
    (DISPLAY_WIDTH - DISPLAY_PADDING * 2 - DISPLAY_GAP * (layout.columns - 1)) / layout.columns;
  const rowHeight =
    (DISPLAY_HEIGHT - DISPLAY_PADDING * 2 - DISPLAY_GAP * (layout.rows - 1)) / layout.rows;
  return {
    width: Math.round(columnWidth * slot.columnSpan + DISPLAY_GAP * (slot.columnSpan - 1)),
    height: Math.round(rowHeight * slot.rowSpan + DISPLAY_GAP * (slot.rowSpan - 1))
  };
}

export function buildWidgetLayoutVariants(
  layouts: LayoutDefinition[] = LAYOUTS
): WidgetLayoutVariant[] {
  const variants = new Map<string, WidgetLayoutVariant>();

  for (const layout of layouts) {
    for (const slot of layout.slots) {
      const dimensions = getLayoutSlotPixelDimensions(layout, slot);
      const id = `${slot.size}-${dimensions.width}x${dimensions.height}`;
      const usage = {
        layoutId: layout.id,
        layoutName: layout.name,
        slotId: slot.id,
        slotLabel: slot.label
      };
      const existing = variants.get(id);
      if (existing) existing.usages.push(usage);
      else variants.set(id, { id, size: slot.size, ...dimensions, usages: [usage] });
    }
  }

  return [...variants.values()].sort((left, right) => {
    const sizeOrder = WIDGET_SIZES.indexOf(left.size) - WIDGET_SIZES.indexOf(right.size);
    if (sizeOrder !== 0) return sizeOrder;
    const areaOrder = left.width * left.height - right.width * right.height;
    return areaOrder !== 0 ? areaOrder : left.width - right.width;
  });
}

export const WIDGET_LAYOUT_VARIANTS = buildWidgetLayoutVariants();
