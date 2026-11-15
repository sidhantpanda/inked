export const DISPLAY_WIDTH = 800;

export const DISPLAY_HEIGHT = 480;

export const DISPLAY_PADDING = 16;

export const DISPLAY_GAP = 8;

export const MIN_WIDGET_FONT_SIZE = 14;

export const WIDGET_SIZES = ['small', 'wide', 'tall', 'large', 'full'] as const;

export type WidgetSize = (typeof WIDGET_SIZES)[number];

export interface WidgetSizeDefinition {
  id: WidgetSize;
  name: string;
  gridColumns: number;
  gridRows: number;
  contentLevel: number;
  description: string;
}

/**
 * The placement sizes every Inked widget implements. Grid units describe the
 * intended shape, while layouts remain free to provide the exact pixel bounds.
 */
export const WIDGET_SIZE_DEFINITIONS = {
  small: {
    id: 'small',
    name: 'Small',
    gridColumns: 1,
    gridRows: 1,
    contentLevel: 1,
    description: 'A one-glance value or item.'
  },
  wide: {
    id: 'wide',
    name: 'Wide',
    gridColumns: 2,
    gridRows: 1,
    contentLevel: 2,
    description: 'A horizontal strip with supporting context.'
  },
  tall: {
    id: 'tall',
    name: 'Tall',
    gridColumns: 1,
    gridRows: 2,
    contentLevel: 2,
    description: 'A vertical rail for a short stacked list.'
  },
  large: {
    id: 'large',
    name: 'Large',
    gridColumns: 2,
    gridRows: 2,
    contentLevel: 3,
    description: 'A feature panel with several useful details.'
  },
  full: {
    id: 'full',
    name: 'Full',
    gridColumns: 4,
    gridRows: 2,
    contentLevel: 4,
    description: 'A display-scale composition with the complete useful dataset.'
  }
} as const satisfies Record<WidgetSize, WidgetSizeDefinition>;

export interface WidgetPreviewDimensions {
  width: number;
  height: number;
}

/**
 * Canonical pixel bounds for the widget gallery. These are the exact slot
 * dimensions produced by a four-column, two-row 800 × 480 display with the
 * standard 16px canvas padding and 8px gaps.
 */
export const WIDGET_PREVIEW_DIMENSIONS = {
  small: { width: 186, height: 220 },
  wide: { width: 380, height: 220 },
  tall: { width: 186, height: 448 },
  large: { width: 380, height: 448 },
  full: { width: 768, height: 448 }
} as const satisfies Record<WidgetSize, WidgetPreviewDimensions>;
