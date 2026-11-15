import type { LayoutDefinition, LayoutSlot, WidgetSize } from '../types.js';

/** A slot at grid `[column, row, columnSpan, rowSpan]`, all 1-based. */
function slot(
  id: string,
  label: string,
  [column, row, columnSpan, rowSpan]: [number, number, number, number],
  size: WidgetSize
): LayoutSlot {
  return { id, label, column, row, columnSpan, rowSpan, size };
}

/** The fixed, code-defined compositions, in picker order. */
export const LAYOUTS: LayoutDefinition[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'A large story, a tall glance, and two supporting modules.',
    columns: 3,
    rows: 3,
    slots: [
      slot('feature', 'Feature', [1, 1, 2, 2], 'large'),
      slot('rail', 'Right rail', [3, 1, 1, 2], 'tall'),
      slot('brief', 'Brief', [1, 3, 1, 1], 'small'),
      slot('ticker', 'Ticker', [2, 3, 2, 1], 'wide')
    ]
  },
  {
    id: 'quad',
    name: 'Four-up',
    description: 'A balanced dashboard with four equal panels.',
    columns: 2,
    rows: 2,
    slots: [
      slot('north-west', 'Top left', [1, 1, 1, 1], 'large'),
      slot('north-east', 'Top right', [2, 1, 1, 1], 'large'),
      slot('south-west', 'Bottom left', [1, 2, 1, 1], 'large'),
      slot('south-east', 'Bottom right', [2, 2, 1, 1], 'large')
    ]
  },
  {
    id: 'broadcast',
    name: 'Broadcast',
    description: 'One dominant canvas above a pair of live strips.',
    columns: 2,
    rows: 3,
    slots: [
      slot('headline', 'Headline', [1, 1, 2, 2], 'full'),
      slot('lower-left', 'Lower left', [1, 3, 1, 1], 'wide'),
      slot('lower-right', 'Lower right', [2, 3, 1, 1], 'wide')
    ]
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    description: 'A steady information rail beside a flexible main stack.',
    columns: 3,
    rows: 2,
    slots: [
      slot('side', 'Sidebar', [1, 1, 1, 2], 'tall'),
      slot('top', 'Main top', [2, 1, 2, 1], 'wide'),
      slot('bottom', 'Main bottom', [2, 2, 2, 1], 'wide')
    ]
  },
  {
    id: 'command-five',
    name: 'Command split',
    description: 'A permanent side rail with four flexible command modules.',
    columns: 4,
    rows: 2,
    slots: [
      slot('command-rail', 'Command rail', [1, 1, 1, 2], 'tall'),
      slot('command-top', 'Top feature', [2, 1, 2, 1], 'wide'),
      slot('command-glance', 'Top glance', [4, 1, 1, 1], 'small'),
      slot('command-brief', 'Bottom brief', [2, 2, 1, 1], 'small'),
      slot('command-bottom', 'Bottom feature', [3, 2, 2, 1], 'wide')
    ]
  },
  {
    id: 'desk-six',
    name: 'Desk grid',
    description: 'Six equally weighted modules for an at-a-glance dashboard.',
    columns: 3,
    rows: 2,
    slots: [
      slot('desk-1', 'Panel one', [1, 1, 1, 1], 'large'),
      slot('desk-2', 'Panel two', [2, 1, 1, 1], 'large'),
      slot('desk-3', 'Panel three', [3, 1, 1, 1], 'large'),
      slot('desk-4', 'Panel four', [1, 2, 1, 1], 'large'),
      slot('desk-5', 'Panel five', [2, 2, 1, 1], 'large'),
      slot('desk-6', 'Panel six', [3, 2, 1, 1], 'large')
    ]
  },
  {
    id: 'newsroom-seven',
    name: 'Newsroom',
    description: 'A lead story surrounded by six compact information blocks.',
    columns: 4,
    rows: 3,
    slots: [
      slot('news-lead', 'Lead story', [1, 1, 2, 2], 'large'),
      slot('news-top', 'Top strip', [3, 1, 2, 1], 'wide'),
      slot('news-right-1', 'Right brief one', [3, 2, 1, 1], 'small'),
      slot('news-right-2', 'Right brief two', [4, 2, 1, 1], 'small'),
      slot('news-bottom-1', 'Bottom brief one', [1, 3, 1, 1], 'small'),
      slot('news-bottom-2', 'Bottom brief two', [2, 3, 1, 1], 'small'),
      slot('news-bottom-wide', 'Bottom strip', [3, 3, 2, 1], 'wide')
    ]
  },
  {
    id: 'score-wall-seven',
    name: 'Score wall',
    description: 'A wide headline above six compact live-data tiles.',
    columns: 3,
    rows: 4,
    slots: [
      slot('wall-headline', 'Wall headline', [1, 1, 3, 2], 'full'),
      slot('wall-1', 'Tile one', [1, 3, 1, 1], 'small'),
      slot('wall-2', 'Tile two', [2, 3, 1, 1], 'small'),
      slot('wall-3', 'Tile three', [3, 3, 1, 1], 'small'),
      slot('wall-4', 'Tile four', [1, 4, 1, 1], 'small'),
      slot('wall-5', 'Tile five', [2, 4, 1, 1], 'small'),
      slot('wall-6', 'Tile six', [3, 4, 1, 1], 'small')
    ]
  },
  {
    id: 'bento-eight',
    name: 'Bento eight',
    description: 'A rich mixed-scale composition with eight widget positions.',
    columns: 4,
    rows: 4,
    slots: [
      slot('bento-focus', 'Bento focus', [1, 1, 2, 2], 'large'),
      slot('bento-tall-1', 'Tall glance one', [3, 1, 1, 2], 'tall'),
      slot('bento-tall-2', 'Tall glance two', [4, 1, 1, 2], 'tall'),
      slot('bento-lower-tall', 'Lower rail', [1, 3, 1, 2], 'tall'),
      slot('bento-wide-1', 'Lower strip one', [2, 3, 2, 1], 'wide'),
      slot('bento-small-1', 'Small tile one', [4, 3, 1, 1], 'small'),
      slot('bento-wide-2', 'Lower strip two', [2, 4, 2, 1], 'wide'),
      slot('bento-small-2', 'Small tile two', [4, 4, 1, 1], 'small')
    ]
  },
  {
    id: 'matrix-eight',
    name: 'Data matrix',
    description: 'Eight consistent tiles for maximum information density.',
    columns: 4,
    rows: 2,
    slots: [
      slot('matrix-1', 'Matrix one', [1, 1, 1, 1], 'small'),
      slot('matrix-2', 'Matrix two', [2, 1, 1, 1], 'small'),
      slot('matrix-3', 'Matrix three', [3, 1, 1, 1], 'small'),
      slot('matrix-4', 'Matrix four', [4, 1, 1, 1], 'small'),
      slot('matrix-5', 'Matrix five', [1, 2, 1, 1], 'small'),
      slot('matrix-6', 'Matrix six', [2, 2, 1, 1], 'small'),
      slot('matrix-7', 'Matrix seven', [3, 2, 1, 1], 'small'),
      slot('matrix-8', 'Matrix eight', [4, 2, 1, 1], 'small')
    ]
  }
];
