import {
  DISPLAY_GAP,
  DISPLAY_HEIGHT,
  DISPLAY_PADDING,
  DISPLAY_WIDTH,
  WIDGET_SIZES,
  createAssignment,
  type DashboardConfig,
  type LayoutDefinition,
  type LayoutSlot,
  type SlotAssignment,
  type WidgetLayoutVariant,
  type WidgetPreviewDimensions
} from './types.js';

export const LAYOUTS: LayoutDefinition[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'A large story, a tall glance, and two supporting modules.',
    columns: 3,
    rows: 3,
    slots: [
      {
        id: 'feature',
        label: 'Feature',
        column: 1,
        row: 1,
        columnSpan: 2,
        rowSpan: 2,
        size: 'large'
      },
      {
        id: 'rail',
        label: 'Right rail',
        column: 3,
        row: 1,
        columnSpan: 1,
        rowSpan: 2,
        size: 'tall'
      },
      { id: 'brief', label: 'Brief', column: 1, row: 3, columnSpan: 1, rowSpan: 1, size: 'small' },
      { id: 'ticker', label: 'Ticker', column: 2, row: 3, columnSpan: 2, rowSpan: 1, size: 'wide' }
    ]
  },
  {
    id: 'quad',
    name: 'Four-up',
    description: 'A balanced dashboard with four equal panels.',
    columns: 2,
    rows: 2,
    slots: [
      {
        id: 'north-west',
        label: 'Top left',
        column: 1,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      },
      {
        id: 'north-east',
        label: 'Top right',
        column: 2,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      },
      {
        id: 'south-west',
        label: 'Bottom left',
        column: 1,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      },
      {
        id: 'south-east',
        label: 'Bottom right',
        column: 2,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      }
    ]
  },
  {
    id: 'broadcast',
    name: 'Broadcast',
    description: 'One dominant canvas above a pair of live strips.',
    columns: 2,
    rows: 3,
    slots: [
      {
        id: 'headline',
        label: 'Headline',
        column: 1,
        row: 1,
        columnSpan: 2,
        rowSpan: 2,
        size: 'full'
      },
      {
        id: 'lower-left',
        label: 'Lower left',
        column: 1,
        row: 3,
        columnSpan: 1,
        rowSpan: 1,
        size: 'wide'
      },
      {
        id: 'lower-right',
        label: 'Lower right',
        column: 2,
        row: 3,
        columnSpan: 1,
        rowSpan: 1,
        size: 'wide'
      }
    ]
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    description: 'A steady information rail beside a flexible main stack.',
    columns: 3,
    rows: 2,
    slots: [
      { id: 'side', label: 'Sidebar', column: 1, row: 1, columnSpan: 1, rowSpan: 2, size: 'tall' },
      { id: 'top', label: 'Main top', column: 2, row: 1, columnSpan: 2, rowSpan: 1, size: 'wide' },
      {
        id: 'bottom',
        label: 'Main bottom',
        column: 2,
        row: 2,
        columnSpan: 2,
        rowSpan: 1,
        size: 'wide'
      }
    ]
  },
  {
    id: 'command-five',
    name: 'Command split',
    description: 'A permanent side rail with four flexible command modules.',
    columns: 4,
    rows: 2,
    slots: [
      {
        id: 'command-rail',
        label: 'Command rail',
        column: 1,
        row: 1,
        columnSpan: 1,
        rowSpan: 2,
        size: 'tall'
      },
      {
        id: 'command-top',
        label: 'Top feature',
        column: 2,
        row: 1,
        columnSpan: 2,
        rowSpan: 1,
        size: 'wide'
      },
      {
        id: 'command-glance',
        label: 'Top glance',
        column: 4,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'command-brief',
        label: 'Bottom brief',
        column: 2,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'command-bottom',
        label: 'Bottom feature',
        column: 3,
        row: 2,
        columnSpan: 2,
        rowSpan: 1,
        size: 'wide'
      }
    ]
  },
  {
    id: 'desk-six',
    name: 'Desk grid',
    description: 'Six equally weighted modules for an at-a-glance dashboard.',
    columns: 3,
    rows: 2,
    slots: [
      {
        id: 'desk-1',
        label: 'Panel one',
        column: 1,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      },
      {
        id: 'desk-2',
        label: 'Panel two',
        column: 2,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      },
      {
        id: 'desk-3',
        label: 'Panel three',
        column: 3,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      },
      {
        id: 'desk-4',
        label: 'Panel four',
        column: 1,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      },
      {
        id: 'desk-5',
        label: 'Panel five',
        column: 2,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      },
      {
        id: 'desk-6',
        label: 'Panel six',
        column: 3,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'large'
      }
    ]
  },
  {
    id: 'newsroom-seven',
    name: 'Newsroom',
    description: 'A lead story surrounded by six compact information blocks.',
    columns: 4,
    rows: 3,
    slots: [
      {
        id: 'news-lead',
        label: 'Lead story',
        column: 1,
        row: 1,
        columnSpan: 2,
        rowSpan: 2,
        size: 'large'
      },
      {
        id: 'news-top',
        label: 'Top strip',
        column: 3,
        row: 1,
        columnSpan: 2,
        rowSpan: 1,
        size: 'wide'
      },
      {
        id: 'news-right-1',
        label: 'Right brief one',
        column: 3,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'news-right-2',
        label: 'Right brief two',
        column: 4,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'news-bottom-1',
        label: 'Bottom brief one',
        column: 1,
        row: 3,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'news-bottom-2',
        label: 'Bottom brief two',
        column: 2,
        row: 3,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'news-bottom-wide',
        label: 'Bottom strip',
        column: 3,
        row: 3,
        columnSpan: 2,
        rowSpan: 1,
        size: 'wide'
      }
    ]
  },
  {
    id: 'score-wall-seven',
    name: 'Score wall',
    description: 'A wide headline above six compact live-data tiles.',
    columns: 3,
    rows: 4,
    slots: [
      {
        id: 'wall-headline',
        label: 'Wall headline',
        column: 1,
        row: 1,
        columnSpan: 3,
        rowSpan: 2,
        size: 'full'
      },
      {
        id: 'wall-1',
        label: 'Tile one',
        column: 1,
        row: 3,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'wall-2',
        label: 'Tile two',
        column: 2,
        row: 3,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'wall-3',
        label: 'Tile three',
        column: 3,
        row: 3,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'wall-4',
        label: 'Tile four',
        column: 1,
        row: 4,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'wall-5',
        label: 'Tile five',
        column: 2,
        row: 4,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'wall-6',
        label: 'Tile six',
        column: 3,
        row: 4,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      }
    ]
  },
  {
    id: 'bento-eight',
    name: 'Bento eight',
    description: 'A rich mixed-scale composition with eight widget positions.',
    columns: 4,
    rows: 4,
    slots: [
      {
        id: 'bento-focus',
        label: 'Bento focus',
        column: 1,
        row: 1,
        columnSpan: 2,
        rowSpan: 2,
        size: 'large'
      },
      {
        id: 'bento-tall-1',
        label: 'Tall glance one',
        column: 3,
        row: 1,
        columnSpan: 1,
        rowSpan: 2,
        size: 'tall'
      },
      {
        id: 'bento-tall-2',
        label: 'Tall glance two',
        column: 4,
        row: 1,
        columnSpan: 1,
        rowSpan: 2,
        size: 'tall'
      },
      {
        id: 'bento-lower-tall',
        label: 'Lower rail',
        column: 1,
        row: 3,
        columnSpan: 1,
        rowSpan: 2,
        size: 'tall'
      },
      {
        id: 'bento-wide-1',
        label: 'Lower strip one',
        column: 2,
        row: 3,
        columnSpan: 2,
        rowSpan: 1,
        size: 'wide'
      },
      {
        id: 'bento-small-1',
        label: 'Small tile one',
        column: 4,
        row: 3,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'bento-wide-2',
        label: 'Lower strip two',
        column: 2,
        row: 4,
        columnSpan: 2,
        rowSpan: 1,
        size: 'wide'
      },
      {
        id: 'bento-small-2',
        label: 'Small tile two',
        column: 4,
        row: 4,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      }
    ]
  },
  {
    id: 'matrix-eight',
    name: 'Data matrix',
    description: 'Eight consistent tiles for maximum information density.',
    columns: 4,
    rows: 2,
    slots: [
      {
        id: 'matrix-1',
        label: 'Matrix one',
        column: 1,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'matrix-2',
        label: 'Matrix two',
        column: 2,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'matrix-3',
        label: 'Matrix three',
        column: 3,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'matrix-4',
        label: 'Matrix four',
        column: 4,
        row: 1,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'matrix-5',
        label: 'Matrix five',
        column: 1,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'matrix-6',
        label: 'Matrix six',
        column: 2,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'matrix-7',
        label: 'Matrix seven',
        column: 3,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      },
      {
        id: 'matrix-8',
        label: 'Matrix eight',
        column: 4,
        row: 2,
        columnSpan: 1,
        rowSpan: 1,
        size: 'small'
      }
    ]
  }
];

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
