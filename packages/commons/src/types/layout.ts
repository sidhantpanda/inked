import type { WidgetPreviewDimensions, WidgetSize } from './display.js';

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
