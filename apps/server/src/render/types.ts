import type { SKRSContext2D } from '@napi-rs/canvas';
import type { WidgetId, WidgetInputMap, WidgetSize } from '@inked/commons';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Palette {
  page: string;
  card: string;
  cardAlt: string;
  ink: string;
  muted: string;
  line: string;
  accent: string;
  accentInk: string;
  /** Market direction colors; both map onto the e-ink panel's red and green inks. */
  up: string;
  down: string;
}

type WidgetFontFamily = 'sans' | 'serif';

export interface TextOptions {
  family?: WidgetFontFamily;
  letterSpacing?: number;
}

export type CanvasWidgetRenderer<K extends WidgetId> = (
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: WidgetInputMap[K],
  palette: Palette
) => void;
