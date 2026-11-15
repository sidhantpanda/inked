import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { Jimp } from 'jimp';

import {
  DISPLAY_HEIGHT,
  DISPLAY_GAP,
  DISPLAY_PADDING,
  DISPLAY_WIDTH,
  MIN_WIDGET_FONT_SIZE,
  STOCK_MARKET_STATE_LABELS,
  STOCK_RANGE_LABELS,
  formatCompactSportsSession,
  formatStockChange,
  formatStockPercent,
  formatStockPrice,
  planStocksLayout,
  stockDirection,
  stockDirectionGlyph,
  stockRangeChange,
  formatSportsEventTiming,
  groupSportsEvents,
  getLayout,
  type CalendarWidgetInput,
  type DashboardConfig,
  type DashboardData,
  type DashboardTheme,
  type DateWidgetInput,
  type LayoutSlot,
  type MessageWidgetInput,
  type ScoresWidgetInput,
  type SportsEventGroup,
  type StockChart,
  type StockQuoteResult,
  type StockRange,
  type StocksFocusChart,
  type StocksWidgetInput,
  type WidgetId,
  type WidgetInput,
  type WidgetInputMap,
  type WidgetLayoutVariant,
  type WeatherWidgetInput,
  type WidgetSize
} from '@inked/commons';

import { INKED_FONT_FAMILIES } from './fonts.js';
import { ensureMeteocons, getMeteocon } from './meteocons.js';

export { ensureMeteocons } from './meteocons.js';

export type RenderFormat = 'png' | 'bmp';

export interface DashboardRenderAssets {
  png: Buffer;
  bmp: Buffer;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Palette {
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

interface TextOptions {
  family?: WidgetFontFamily;
  letterSpacing?: number;
}

/** Mirrors the font stacks used by the original React widget components. */
export const WIDGET_TYPOGRAPHY = {
  sans: `"${INKED_FONT_FAMILIES.sans}"`,
  serif: `"${INKED_FONT_FAMILIES.serif}"`,
  labelLetterSpacingEm: 0.1,
  dateLetterSpacingEm: -0.07,
  messageLetterSpacingEm: -0.035,
  weatherLetterSpacingEm: -0.06
} as const;

type CanvasWidgetRenderer<K extends WidgetId> = (
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: WidgetInputMap[K],
  palette: Palette
) => void;

type CanvasWidgetRendererRegistry = {
  [K in WidgetId]: CanvasWidgetRenderer<K>;
};

/** Adding a WidgetId requires a native renderer with its exact input type. */
export const WIDGET_RENDERERS = {
  clock: drawDate,
  weather: drawWeather,
  calendar: drawCalendar,
  scores: drawScores,
  stocks: drawStocks,
  message: drawMessage
} satisfies CanvasWidgetRendererRegistry;

/** One resolved widget input per assigned slot id. */
export type ResolvedSlotInputs = Record<string, WidgetInput>;

export async function renderDashboard(
  config: DashboardConfig,
  slots: ResolvedSlotInputs,
  format: RenderFormat = 'png'
): Promise<Buffer> {
  const assets = await renderDashboardAssets(config, slots);
  return assets[format];
}

/**
 * Produces both transport formats from one canvas. The studio previews `png`
 * while PhotoPainter receives the matching `bmp`, so both formats contain the
 * same pixels.
 */
export async function renderDashboardAssets(
  config: DashboardConfig,
  slots: ResolvedSlotInputs
): Promise<DashboardRenderAssets> {
  await ensureMeteocons();
  const layout = getLayout(config.layoutId);
  const palette = getPalette(config.theme);
  const canvas = createCanvas(DISPLAY_WIDTH, DISPLAY_HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = palette.page;
  ctx.fillRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

  for (const slot of layout.slots) {
    const assignment = config.assignments.find((candidate) => candidate.slotId === slot.id);
    const rect = getSlotRect(layout.columns, layout.rows, slot);
    const input = assignment ? slots[assignment.slotId] : undefined;
    if (!assignment || !input) {
      drawEmptySlot(ctx, rect, slot.label, palette);
      continue;
    }
    renderWidget(ctx, assignment.widgetId, slot.size, rect, input, palette);
  }

  const png = canvas.toBuffer('image/png');
  const bmp = await (await Jimp.read(png)).getBuffer('image/bmp');
  return { png, bmp };
}

export function renderWidgetPreview(
  widgetId: WidgetId,
  variant: WidgetLayoutVariant,
  data: DashboardData,
  theme: DashboardTheme
): Buffer {
  const palette = getPalette(theme);
  const canvas = createCanvas(variant.width, variant.height);
  const ctx = canvas.getContext('2d');
  const rect: Rect = { x: 0, y: 0, width: variant.width, height: variant.height };

  ctx.fillStyle = palette.page;
  ctx.fillRect(0, 0, variant.width, variant.height);
  renderWidget(ctx, widgetId, variant.size, rect, data[widgetId], palette);
  return canvas.toBuffer('image/png');
}

function getSlotRect(columns: number, rows: number, slot: LayoutSlot): Rect {
  const columnWidth = (DISPLAY_WIDTH - DISPLAY_PADDING * 2 - DISPLAY_GAP * (columns - 1)) / columns;
  const rowHeight = (DISPLAY_HEIGHT - DISPLAY_PADDING * 2 - DISPLAY_GAP * (rows - 1)) / rows;
  return {
    x: DISPLAY_PADDING + (slot.column - 1) * (columnWidth + DISPLAY_GAP),
    y: DISPLAY_PADDING + (slot.row - 1) * (rowHeight + DISPLAY_GAP),
    width: columnWidth * slot.columnSpan + DISPLAY_GAP * (slot.columnSpan - 1),
    height: rowHeight * slot.rowSpan + DISPLAY_GAP * (slot.rowSpan - 1)
  };
}

function getPalette(theme: DashboardTheme): Palette {
  const accents = {
    citrus: ['#e0c341', '#241d02'],
    coral: ['#ef6a52', '#2a0f09'],
    cobalt: ['#3f61e8', '#ffffff']
  } as const;
  const backgrounds = {
    paper: {
      page: '#e9e8e1',
      card: '#fbfaf4',
      cardAlt: '#dce4d4',
      ink: '#18211c',
      muted: '#667068',
      line: '#ccd0c9',
      up: '#1b7f3b',
      down: '#c8372d'
    },
    mist: {
      page: '#dce4e7',
      card: '#f5f8f6',
      cardAlt: '#cbd9de',
      ink: '#142127',
      muted: '#607078',
      line: '#becacd',
      up: '#1b7f3b',
      down: '#c8372d'
    },
    night: {
      page: '#111714',
      card: '#1d2621',
      cardAlt: '#26332c',
      ink: '#f4f5ec',
      muted: '#a9b5ab',
      line: '#3a463f',
      up: '#58c27d',
      down: '#ff7b6b'
    }
  } as const;
  const base = backgrounds[theme.background];
  const [accent, accentInk] = accents[theme.accent];
  return { ...base, accent, accentInk };
}

function renderWidget<K extends WidgetId>(
  ctx: SKRSContext2D,
  widgetId: K,
  size: WidgetSize,
  rect: Rect,
  input: WidgetInputMap[K],
  palette: Palette
) {
  const localRect: Rect = { x: 0, y: 0, width: rect.width, height: rect.height };
  ctx.save();
  ctx.translate(rect.x, rect.y);
  drawCard(ctx, localRect, widgetId === 'weather' ? palette.cardAlt : palette.card, palette.line);
  roundRect(ctx, 0, 0, localRect.width, localRect.height, 11);
  ctx.clip();
  const renderer = WIDGET_RENDERERS[widgetId] as CanvasWidgetRenderer<K>;
  renderer(ctx, localRect, size, input, palette);
  ctx.restore();
}

function drawDate(
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: DateWidgetInput,
  palette: Palette
) {
  const date = new Date(input.now);
  const weekday = formatDate(date, input.timezone, { weekday: 'long' });
  const dayNumber = formatDate(date, input.timezone, { day: 'numeric' });
  const monthYear = formatDate(date, input.timezone, { month: 'long', year: 'numeric' });
  const compact = rect.height < 150 || size === 'small' || size === 'wide';
  const short = rect.height < 130;
  const dayFontSize = short ? 38 : compact ? 48 : 78;
  label(ctx, rect, 'DATE', palette);

  text(
    ctx,
    dayNumber,
    rect.x + 18,
    rect.y + (compact ? 82 : 121),
    dayFontSize,
    400,
    palette.ink,
    'left',
    {
      family: 'serif',
      letterSpacing: dayFontSize * WIDGET_TYPOGRAPHY.dateLetterSpacingEm
    }
  );
  const copyX = rect.x + 18 + ctx.measureText(dayNumber).width + Math.max(10, rect.width * 0.04);
  fittedText(
    ctx,
    weekday,
    copyX,
    rect.y + (short ? 60 : compact ? 63 : 79),
    rect.x + rect.width - 18 - copyX,
    compact ? 16 : 18,
    700,
    palette.ink
  );
  if (size !== 'small')
    text(ctx, monthYear, copyX, rect.y + (compact ? 84 : 103), 14, 400, palette.muted);

  if (!compact && (size === 'tall' || size === 'large' || size === 'full')) {
    drawWeekStrip(ctx, rect, date, input.timezone, palette);
  }
  accentBar(ctx, rect, palette);
}

function drawWeather(
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: WeatherWidgetInput,
  palette: Palette
) {
  const weather = input;
  label(ctx, rect, weather.location.toUpperCase(), palette);
  const forecastLimit =
    size === 'small' ? 0 : size === 'wide' ? 2 : size === 'tall' ? 3 : size === 'large' ? 4 : 7;
  const short = rect.height < 130;
  const compressedTall = size === 'tall' && rect.height < 250;
  const currentWidth =
    forecastLimit === 0
      ? rect.width
      : size === 'full'
        ? rect.width * 0.25
        : size === 'tall'
          ? rect.width
          : rect.width * 0.4;
  if (currentWidth >= 120) {
    const iconSize = short ? 44 : 58;
    const iconCx = rect.x + currentWidth - (short ? 32 : 40);
    const iconCy = rect.y + (short ? 46 : 58);
    if (!drawWeatherIcon(ctx, input.icon, iconCx, iconCy, iconSize)) {
      drawWeatherGlyph(
        ctx,
        rect.x + currentWidth - (short ? 42 : 31),
        rect.y + (short ? 47 : 56),
        short ? 15 : 17,
        palette
      );
    }
  }
  const temperatureSize =
    size === 'small' || size === 'wide' || short ? 41 : compressedTall ? 49 : 56;
  text(
    ctx,
    `${weather.temperature}°`,
    rect.x + 18,
    rect.y + (short || compressedTall ? 78 : 103),
    temperatureSize,
    700,
    palette.ink,
    'left',
    { letterSpacing: temperatureSize * WIDGET_TYPOGRAPHY.weatherLetterSpacingEm }
  );
  if (!short && !compressedTall) {
    clippedText(
      ctx,
      currentWidth < 120 ? compactWeatherCondition(weather.condition) : weather.condition,
      rect.x + 20,
      rect.y + 130,
      Math.max(42, currentWidth - 30),
      14,
      700,
      palette.ink
    );
    if (size !== 'small' && rect.height >= 175) {
      clippedText(
        ctx,
        currentWidth < 120
          ? `${weather.high}° / ${weather.low}°`
          : currentWidth < 180
            ? `H${weather.high}° · L${weather.low}°`
            : `H ${weather.high}°  L ${weather.low}°  ·  ${weather.precipitation}%`,
        rect.x + 20,
        rect.y + 153,
        Math.max(42, currentWidth - 30),
        14,
        600,
        palette.muted
      );
    }
  }

  const forecast = weather.forecast.slice(0, forecastLimit);
  if (size === 'tall' && forecast.length > 0) {
    drawTallForecast(
      ctx,
      rect,
      forecast,
      input.timezone,
      palette,
      short || compressedTall ? 88 : 164
    );
  } else if (size === 'large' && forecast.length > 0) {
    drawGridForecast(
      ctx,
      forecast,
      input.timezone,
      palette,
      rect.x + currentWidth,
      rect.y + 43,
      rect.width - currentWidth - 12,
      rect.height - 56,
      2
    );
  } else if (forecast.length > 0) {
    drawHorizontalForecast(
      ctx,
      forecast,
      input.timezone,
      palette,
      rect.x + currentWidth,
      rect.y + 43,
      rect.width - currentWidth - 12,
      rect.height - 56
    );
  }
}

function drawCalendar(
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: CalendarWidgetInput,
  palette: Palette
) {
  label(ctx, rect, 'UP NEXT', palette);
  const maxItems =
    size === 'small' ? 1 : size === 'wide' ? 2 : size === 'tall' ? 3 : size === 'large' ? 4 : 5;
  const contentTop = rect.y + 44;
  const contentBottom = rect.y + rect.height - 12;
  const rowHeight = Math.min(62, (contentBottom - contentTop) / maxItems);
  if (input.events.length === 0) {
    text(ctx, 'No upcoming events', rect.x + 18, contentTop + 18, 14, 600, palette.muted);
    return;
  }
  const visible = input.events.slice(0, maxItems);
  // Show the date under the time only where the row is tall enough for a
  // second line — dense variants keep a single line.
  const showSecondaryLine = rowHeight >= 50;
  // Reserve a time column as wide as the widest time (and date, when shown) so
  // day-prefixed times like "Sat 16:00" never overlap the event title.
  setTextStyle(ctx, 14, 700);
  const timeColumnWidth = Math.min(
    rect.width * 0.42,
    visible.reduce((widest, event) => {
      const dateWidth = showSecondaryLine && event.date ? ctx.measureText(event.date).width : 0;
      return Math.max(widest, ctx.measureText(event.time).width, dateWidth);
    }, 0)
  );
  const timeWidth = Math.ceil(timeColumnWidth) + 4;
  const titleX = rect.x + 18 + Math.ceil(timeColumnWidth) + 12;
  const titleWidth = Math.max(20, rect.x + rect.width - 18 - titleX);
  visible.forEach((event, index) => {
    const rowTop = contentTop + index * rowHeight;
    const baseline = rowTop + Math.min(22, rowHeight * 0.7);
    if (index > 0) {
      line(ctx, rect.x + 18, rowTop, rect.x + rect.width - 18, rowTop, palette.line);
    }
    clippedText(ctx, event.time, rect.x + 18, baseline, timeWidth, 14, 700, palette.muted);
    if (showSecondaryLine && event.date) {
      clippedText(ctx, event.date, rect.x + 18, baseline + 18, timeWidth, 14, 500, palette.muted);
    }
    clippedText(ctx, event.title, titleX, baseline, titleWidth, 16, 700, palette.ink);
    if (event.tag && rect.width > 300 && rowHeight >= 50) {
      clippedText(ctx, event.tag, titleX, baseline + 21, titleWidth, 14, 500, palette.muted);
    }
  });
}

function drawScores(
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: ScoresWidgetInput,
  palette: Palette
) {
  label(ctx, rect, 'SPORTS', palette);
  const narrow = rect.width < 300;
  const short = rect.height < 260;
  const fullWidth = size === 'full' && rect.width >= 650;
  const limit =
    size === 'small' ? 1 : narrow ? (rect.height < 240 ? 2 : 3) : fullWidth ? 4 : short ? 2 : 4;
  const groups = groupSportsEvents(input.events).slice(0, limit);
  if (groups.length === 0) {
    clippedText(
      ctx,
      'No upcoming events',
      rect.x + 18,
      rect.y + 77,
      rect.width - 36,
      16,
      600,
      palette.muted
    );
    return;
  }
  const contentTop = rect.y + 48;
  const contentHeight = rect.y + rect.height - 12 - contentTop;
  const columns = groups.length === 1 ? 1 : fullWidth ? Math.min(4, groups.length) : narrow ? 1 : 2;
  const rows = Math.ceil(groups.length / columns);
  const rowHeight = contentHeight / rows;
  const columnWidth = rect.width / columns;
  groups.forEach((group, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const spanLastRow =
      columns === 2 && groups.length % 2 === 1 && index === groups.length - 1 && size !== 'wide';
    const cell = {
      x: spanLastRow ? rect.x : rect.x + column * columnWidth,
      y: contentTop + row * rowHeight,
      width: spanLastRow ? rect.width : columnWidth,
      height: rowHeight
    };
    if (row > 0 && column === 0) {
      line(ctx, rect.x + 18, cell.y, rect.x + rect.width - 18, cell.y, palette.line);
    }
    if (column > 0) {
      line(ctx, cell.x, cell.y, cell.x, cell.y + cell.height, palette.line);
    }
    drawSportsEventCell(ctx, cell, group, input.timezone, palette);
  });
}

function drawSportsEventCell(
  ctx: SKRSContext2D,
  rect: Rect,
  group: SportsEventGroup,
  timezone: string,
  palette: Palette
) {
  if (group.type === 'sessions') {
    drawSportsSessionGroup(ctx, rect, group, timezone, palette);
    return;
  }
  const event = group.event;
  const timing = formatSportsEventTiming(event, timezone);
  const x = rect.x + 18;
  const right = rect.x + rect.width - 18;
  const width = Math.max(30, rect.width - 36);
  const compact = rect.height < 96;
  const primaryTimingY = rect.y + rect.height - (timing.secondary ? 27 : 11);
  const secondaryTimingY = rect.y + rect.height - 9;

  if (compact) {
    const timingReserve = 82;
    const teamWidth = Math.max(30, width - timingReserve);
    const veryCompact = rect.height < 70;
    const firstTeamY = rect.y + (veryCompact ? 20 : 24);
    const secondTeamY = rect.y + (veryCompact ? 42 : 51);
    const home = `${event.home}${event.homeScore === undefined ? '' : ` ${event.homeScore}`}`;
    const away = `${event.away}${event.awayScore === undefined ? '' : ` ${event.awayScore}`}`;
    clippedText(ctx, home, x, firstTeamY, teamWidth, 16, 700, palette.ink);
    clippedText(ctx, away, x, secondTeamY, teamWidth, 16, 700, palette.ink);
    text(
      ctx,
      timing.primary,
      right,
      firstTeamY,
      14,
      800,
      event.state === 'live' ? palette.accent : palette.ink,
      'right'
    );
    if (timing.secondary)
      text(ctx, timing.secondary, right, secondTeamY, 14, 600, palette.muted, 'right');
    return;
  }
  clippedText(ctx, event.competition, x, rect.y + 17, width, 14, 700, palette.muted);
  const firstTeamY = rect.y + 47;
  const secondTeamY = firstTeamY + 25;
  clippedText(ctx, event.home, x, firstTeamY, width - 30, 18, 700, palette.ink);
  clippedText(ctx, event.away, x, secondTeamY, width - 30, 18, 700, palette.ink);
  if (event.homeScore !== undefined)
    text(ctx, String(event.homeScore), right, firstTeamY, 18, 800, palette.ink, 'right');
  if (event.awayScore !== undefined)
    text(ctx, String(event.awayScore), right, secondTeamY, 18, 800, palette.ink, 'right');
  const timingColor = event.state === 'live' ? palette.accent : palette.ink;
  text(ctx, timing.primary, x, primaryTimingY, 14, 800, timingColor);
  if (timing.secondary) {
    text(ctx, timing.secondary, x, secondaryTimingY, 14, 600, palette.muted);
  }
}

function drawSportsSessionGroup(
  ctx: SKRSContext2D,
  rect: Rect,
  group: Extract<SportsEventGroup, { type: 'sessions' }>,
  timezone: string,
  palette: Palette
) {
  const x = rect.x + 18;
  const right = rect.x + rect.width - 18;
  const width = Math.max(30, rect.width - 36);
  const compact = rect.height < 96;
  const veryCompact = rect.height < 70;
  if (veryCompact) {
    fittedText(ctx, group.name, x, rect.y + 18, width, 17, 700, palette.ink);
    const session = group.sessions[0];
    if (session) {
      const timing = formatSportsEventTiming(session, timezone);
      const remaining = group.sessions.length - 1;
      const label = `${formatCompactSportsSession(session.session)}${remaining > 0 ? ` +${remaining}` : ''}`;
      clippedText(
        ctx,
        label.toUpperCase(),
        x,
        rect.y + 41,
        Math.max(30, width - 86),
        14,
        800,
        palette.ink
      );
      text(
        ctx,
        timing.primary,
        right,
        rect.y + 41,
        14,
        800,
        session.state === 'live' ? palette.accent : palette.ink,
        'right'
      );
    }
    return;
  }
  if (compact) fittedText(ctx, group.name, x, rect.y + 18, width, 17, 700, palette.ink);
  else wrapText(ctx, group.name, x, rect.y + 18, width, 16, 700, palette.ink, 2);

  const showVenue = !compact && rect.height >= 145 && Boolean(group.venue);
  if (showVenue && group.venue)
    clippedText(ctx, group.venue, x, rect.y + 54, width, 14, 600, palette.muted);
  const rowsTop = rect.y + (compact ? 26 : showVenue ? 66 : 45);
  const availableHeight = rect.y + rect.height - 5 - rowsTop;
  const capacity = compact ? 1 : rect.height >= 185 ? 4 : rect.height >= 140 ? 3 : 2;
  const hasMore = group.sessions.length > capacity;
  const showMoreRow = hasMore && !compact;
  const visibleCount =
    showMoreRow && capacity > 1 ? capacity - 1 : Math.min(capacity, group.sessions.length);
  const rowCount = visibleCount + (showMoreRow ? 1 : 0);
  const rowHeight = availableHeight / Math.max(rowCount, 1);

  group.sessions.slice(0, visibleCount).forEach((session, index) => {
    const rowTop = rowsTop + index * rowHeight;
    if (index > 0) line(ctx, x, rowTop, right, rowTop, palette.line);
    const timing = formatSportsEventTiming(session, timezone);
    const remaining = compact ? group.sessions.length - 1 : 0;
    const label = `${
      rect.width < 220 ? formatCompactSportsSession(session.session) : session.session
    }${remaining > 0 ? ` +${remaining}` : ''}`;
    clippedText(
      ctx,
      label.toUpperCase(),
      x,
      rowTop + 18,
      Math.max(30, width - 88),
      14,
      800,
      palette.ink
    );
    text(
      ctx,
      timing.primary,
      right,
      rowTop + 16,
      14,
      800,
      session.state === 'live' ? palette.accent : palette.ink,
      'right'
    );
    if (timing.secondary)
      text(ctx, timing.secondary, right, rowTop + 33, 14, 600, palette.muted, 'right');
  });

  if (showMoreRow) {
    const rowTop = rowsTop + visibleCount * rowHeight;
    if (visibleCount > 0) line(ctx, x, rowTop, right, rowTop, palette.line);
    const remaining = group.sessions.length - visibleCount;
    text(
      ctx,
      `+${remaining} more ${remaining === 1 ? 'session' : 'sessions'}`,
      x,
      rowTop + Math.min(22, rowHeight - 5),
      14,
      700,
      palette.muted
    );
  }
}

const STOCKS_HEADER_HEIGHT = 44;
const STOCKS_BOTTOM_PADDING = 12;

function drawStocks(
  ctx: SKRSContext2D,
  rect: Rect,
  _size: WidgetSize,
  input: StocksWidgetInput,
  palette: Palette
) {
  label(ctx, rect, 'STOCKS', palette);
  const plan = planStocksLayout(rect.width, rect.height, input.quotes.length, input.showChart);
  const content: Rect = {
    x: rect.x,
    y: rect.y + STOCKS_HEADER_HEIGHT,
    width: rect.width,
    height: rect.height - STOCKS_HEADER_HEIGHT - STOCKS_BOTTOM_PADDING
  };
  const chartVisible =
    plan.mode === 'grid' ? plan.chart : plan.mode !== 'empty' && plan.chart !== 'none';
  drawStocksStatus(ctx, rect, input, chartVisible, palette);

  if (plan.mode === 'empty') {
    clippedText(
      ctx,
      'Add tickers to track',
      content.x + 18,
      content.y + 30,
      content.width - 36,
      16,
      600,
      palette.muted
    );
    return;
  }
  if (plan.mode === 'focus') {
    drawStockCard(ctx, content, input.quotes[0]!, plan.chart, input.range, palette, 'focus');
    return;
  }
  const visible = input.quotes.slice(0, plan.visible);
  if (plan.mode === 'grid') {
    const columnWidth = content.width / plan.columns;
    const rowHeight = content.height / plan.rows;
    visible.forEach((quote, index) => {
      const row = Math.floor(index / plan.columns);
      const column = index % plan.columns;
      const cell: Rect = {
        x: content.x + column * columnWidth,
        y: content.y + row * rowHeight,
        width: columnWidth,
        height: rowHeight
      };
      if (row > 0 && column === 0) {
        line(ctx, rect.x + 18, cell.y, rect.x + rect.width - 18, cell.y, palette.line);
      }
      if (column > 0) line(ctx, cell.x, cell.y + 4, cell.x, cell.y + cell.height - 4, palette.line);
      const inset: Rect = row > 0 ? { ...cell, y: cell.y + 8, height: cell.height - 8 } : cell;
      drawStockCard(ctx, inset, quote, plan.chart ? 'below' : 'none', input.range, palette, 'grid');
    });
    return;
  }

  const rowHeight = content.height / visible.length;
  const narrow = content.width < 300;
  visible.forEach((quote, index) => {
    const row: Rect = { ...content, y: content.y + index * rowHeight, height: rowHeight };
    if (index > 0) line(ctx, row.x + 18, row.y, row.x + row.width - 18, row.y, palette.line);
    if (plan.chart === 'stacked') drawStackedStockRow(ctx, row, quote, palette);
    else if (rowHeight >= 92) drawStockCard(ctx, row, quote, 'none', input.range, palette, 'grid');
    else if (narrow) drawNarrowStockRow(ctx, row, quote, palette);
    else drawWideStockRow(ctx, row, quote, plan.chart === 'inline', palette);
  });
}

/** Header status, e.g. `1D · CLOSED`, drawn only when it clears the label. */
function drawStocksStatus(
  ctx: SKRSContext2D,
  rect: Rect,
  input: StocksWidgetInput,
  chartVisible: boolean,
  palette: Palette
) {
  const quote = input.quotes.find((candidate) => candidate.state === 'ok');
  const state = quote ? STOCK_MARKET_STATE_LABELS[quote.marketState].toUpperCase() : '';
  const range = chartVisible ? STOCK_RANGE_LABELS[input.range].short : '';
  const options = { letterSpacing: 14 * WIDGET_TYPOGRAPHY.labelLetterSpacingEm };
  setTextStyle(ctx, 14, 800, options);
  const labelRight = rect.x + 18 + ctx.measureText('STOCKS').width + 12;
  const right = rect.x + rect.width - 36;
  setTextStyle(ctx, 14, 700, options);
  for (const candidate of [[range, state].filter(Boolean).join(' · '), state, range]) {
    if (candidate && right - ctx.measureText(candidate).width >= labelRight) {
      text(ctx, candidate, right, rect.y + 31, 14, 700, palette.muted, 'right', options);
      return;
    }
  }
}

function stockColor(change: number, palette: Palette) {
  const direction = stockDirection(change);
  return direction === 'up' ? palette.up : direction === 'down' ? palette.down : palette.muted;
}

function stockPercentLabel(change: number, percent: number) {
  return `${stockDirectionGlyph(change)} ${formatStockPercent(percent)}`;
}

function textWidth(ctx: SKRSContext2D, value: string, size: number, weight: number) {
  setTextStyle(ctx, Math.max(size, MIN_WIDGET_FONT_SIZE), weight);
  return ctx.measureText(value).width;
}

function drawUnavailableStock(ctx: SKRSContext2D, row: Rect, symbol: string, palette: Palette) {
  const baseline = row.y + Math.min(row.height / 2 + 6, 24);
  const x = row.x + 18;
  const right = row.x + row.width - 18;
  const symbolWidth = Math.min(textWidth(ctx, symbol, 16, 800), (right - x) * 0.55);
  clippedText(ctx, symbol, x, baseline, symbolWidth + 1, 16, 800, palette.ink);
  text(ctx, 'No data', right, baseline, 14, 600, palette.muted, 'right');
}

/**
 * A single quote with its hero price and, when planned, a chart beside or
 * below it. Used for one-ticker panels and for each card in the full grid.
 */
function drawStockCard(
  ctx: SKRSContext2D,
  cell: Rect,
  quote: StockQuoteResult,
  chart: StocksFocusChart,
  range: StockRange,
  palette: Palette,
  scale: 'focus' | 'grid'
) {
  if (quote.state !== 'ok') {
    drawUnavailableStock(ctx, cell, quote.symbol, palette);
    return;
  }
  const x = cell.x + 18;
  const right = cell.x + cell.width - 18;
  const minChartHeight = 36;

  if (chart === 'side') {
    const infoWidth = Math.min(220, Math.max(130, (right - x) * 0.42));
    const info = stockInfoMetrics(infoWidth, cell.height, scale);
    const top = cell.y + Math.max(0, Math.floor((cell.height - info.height) / 2));
    drawStockInfo(ctx, x, top, infoWidth, info, quote, range, palette);
    const chartX = x + infoWidth + 14;
    drawStockChart(
      ctx,
      { x: chartX, y: cell.y + 6, width: right - chartX, height: cell.height - 10 },
      quote.chart,
      palette
    );
    return;
  }

  const width = right - x;
  if (chart === 'none') {
    // Center the quote in spare height so sparse panels don't hug the top.
    const info = stockInfoMetrics(width, cell.height, scale);
    const top = cell.y + Math.max(0, Math.floor((cell.height - info.height) / 2));
    drawStockInfo(ctx, x, top, width, info, quote, range, palette);
    return;
  }

  const info = stockInfoMetrics(width, cell.height - minChartHeight - 8, scale);
  // Cap the chart's aspect ratio: a tall sliver exaggerates every move.
  const available = cell.height - info.height - 8 - 4;
  const chartHeight = Math.min(available, Math.max(72, width * 0.75));
  const top = cell.y + Math.max(0, Math.floor((available - chartHeight) / 2));
  const bottom = drawStockInfo(ctx, x, top, width, info, quote, range, palette);
  drawStockChart(ctx, { x, y: bottom + 8, width, height: chartHeight }, quote.chart, palette);
}

interface StockInfoMetrics {
  compact: boolean;
  priceSize: number;
  showMeta: boolean;
  height: number;
}

/** Sizes the quote text block for a height budget before anything is drawn. */
function stockInfoMetrics(
  width: number,
  budget: number,
  scale: 'focus' | 'grid'
): StockInfoMetrics {
  const maxPrice = scale === 'focus' ? 48 : 34;
  const priceSize = Math.min(maxPrice, Math.max(26, Math.floor(budget - 70)));
  const heroHeight = 16 + priceSize + 4 + 24;
  if (budget < heroHeight + 4 || width < 120) {
    return { compact: true, priceSize, showMeta: false, height: 44 };
  }
  const showMeta = budget >= heroHeight + 26;
  return { compact: false, priceSize, showMeta, height: heroHeight + (showMeta ? 22 : 0) + 6 };
}

/** Draws the quote text block within the budget and returns its bottom edge. */
function drawStockInfo(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  { compact, priceSize, showMeta }: StockInfoMetrics,
  quote: Extract<StockQuoteResult, { state: 'ok' }>,
  range: StockRange,
  palette: Palette
): number {
  const color = stockColor(quote.change, palette);
  const right = x + width;

  if (compact) {
    // Compact two-line quote: symbol and price, then name and day change.
    const percent = stockPercentLabel(quote.change, quote.changePercent);
    const priceWidth = textWidth(ctx, formatStockPrice(quote.price), 16, 800);
    clippedText(
      ctx,
      quote.symbol,
      x,
      y + 18,
      Math.max(30, width - priceWidth - 10),
      16,
      800,
      palette.ink
    );
    text(ctx, formatStockPrice(quote.price), right, y + 18, 16, 800, palette.ink, 'right');
    const percentWidth = textWidth(ctx, percent, 14, 800);
    if (width - percentWidth - 10 > 40) {
      clippedText(ctx, quote.name, x, y + 38, width - percentWidth - 10, 14, 600, palette.muted);
    }
    text(ctx, percent, right, y + 38, 14, 800, color, 'right');
    return y + 44;
  }

  const symbolWidth = textWidth(ctx, quote.symbol, 16, 800);
  text(ctx, quote.symbol, x, y + 16, 16, 800, palette.ink);
  if (width - symbolWidth - 10 > 40) {
    clippedText(
      ctx,
      quote.name,
      x + symbolWidth + 10,
      y + 16,
      width - symbolWidth - 10,
      14,
      600,
      palette.muted
    );
  }
  const priceBaseline = y + 16 + priceSize + 4;
  fittedText(
    ctx,
    formatStockPrice(quote.price),
    x,
    priceBaseline,
    width,
    priceSize,
    700,
    palette.ink,
    {
      letterSpacing: priceSize * -0.03
    }
  );
  const changeBaseline = priceBaseline + 24;
  const full = `${stockDirectionGlyph(quote.change)} ${formatStockChange(quote.change)}  ${formatStockPercent(quote.changePercent)}`;
  const changeLabel =
    textWidth(ctx, full, 16, 800) <= width
      ? full
      : stockPercentLabel(quote.change, quote.changePercent);
  clippedText(ctx, changeLabel, x, changeBaseline, width, 16, 800, color);
  if (!showMeta) return changeBaseline + 6;

  const metaBaseline = changeBaseline + 22;
  clippedText(ctx, stockMeta(quote, range), x, metaBaseline, width, 14, 600, palette.muted);
  return metaBaseline + 6;
}

function stockMeta(quote: Extract<StockQuoteResult, { state: 'ok' }>, range: StockRange) {
  if (range !== '1d') {
    const performance = stockRangeChange(quote.chart);
    return `${STOCK_RANGE_LABELS[range].short} ${stockPercentLabel(performance.change, performance.changePercent)}`;
  }
  if (quote.dayLow !== undefined && quote.dayHigh !== undefined) {
    return `Day ${formatStockPrice(quote.dayLow)} – ${formatStockPrice(quote.dayHigh)}`;
  }
  return `Prev close ${formatStockPrice(quote.previousClose)}`;
}

/** Narrow rail row: symbol and day change, price, then a full-width chart. */
function drawStackedStockRow(
  ctx: SKRSContext2D,
  row: Rect,
  quote: StockQuoteResult,
  palette: Palette
) {
  if (quote.state !== 'ok') {
    drawUnavailableStock(ctx, row, quote.symbol, palette);
    return;
  }
  const x = row.x + 18;
  const right = row.x + row.width - 18;
  const color = stockColor(quote.change, palette);
  const percent = stockPercentLabel(quote.change, quote.changePercent);
  const percentWidth = textWidth(ctx, percent, 14, 800);
  clippedText(ctx, quote.symbol, x, row.y + 21, right - x - percentWidth - 8, 16, 800, palette.ink);
  text(ctx, percent, right, row.y + 21, 14, 800, color, 'right');
  text(ctx, formatStockPrice(quote.price), x, row.y + 42, 18, 700, palette.ink);
  const change = formatStockChange(quote.change);
  if (
    textWidth(ctx, formatStockPrice(quote.price), 18, 700) + textWidth(ctx, change, 14, 600) + 12 <
    right - x
  ) {
    text(ctx, change, right, row.y + 42, 14, 600, color, 'right');
  }
  const chartTop = row.y + 50;
  drawStockChart(
    ctx,
    { x, y: chartTop, width: right - x, height: row.y + row.height - 8 - chartTop },
    quote.chart,
    palette
  );
}

/** Narrow quote row: two lines when tall enough, otherwise a single dense line. */
function drawNarrowStockRow(
  ctx: SKRSContext2D,
  row: Rect,
  quote: StockQuoteResult,
  palette: Palette
) {
  if (quote.state !== 'ok') {
    drawUnavailableStock(ctx, row, quote.symbol, palette);
    return;
  }
  const x = row.x + 18;
  const right = row.x + row.width - 18;
  const color = stockColor(quote.change, palette);
  const price = formatStockPrice(quote.price);
  if (row.height < 44) {
    const baseline = row.y + row.height / 2 + 6;
    const priceWidth = textWidth(ctx, price, 15, 700);
    const glyph = stockDirectionGlyph(quote.change);
    const glyphWidth = textWidth(ctx, glyph, 14, 800);
    text(ctx, price, right, baseline, 15, 700, palette.ink, 'right');
    text(ctx, glyph, right - priceWidth - 6, baseline, 14, 800, color, 'right');
    clippedText(
      ctx,
      quote.symbol,
      x,
      baseline,
      right - x - priceWidth - glyphWidth - 16,
      15,
      800,
      palette.ink
    );
    return;
  }
  const top = row.y + (row.height - 38) / 2;
  const priceWidth = textWidth(ctx, price, 16, 700);
  clippedText(ctx, quote.symbol, x, top + 15, right - x - priceWidth - 10, 16, 800, palette.ink);
  text(ctx, price, right, top + 15, 16, 700, palette.ink, 'right');
  const percent = stockPercentLabel(quote.change, quote.changePercent);
  const percentWidth = textWidth(ctx, percent, 14, 800);
  if (right - x - percentWidth - 10 > 30) {
    clippedText(
      ctx,
      quote.name,
      x,
      top + 34,
      right - x - percentWidth - 10,
      14,
      600,
      palette.muted
    );
  }
  text(ctx, percent, right, top + 34, 14, 800, color, 'right');
}

/** Wide quote row: identity column, optional inline sparkline, and value column. */
function drawWideStockRow(
  ctx: SKRSContext2D,
  row: Rect,
  quote: StockQuoteResult,
  inlineChart: boolean,
  palette: Palette
) {
  if (quote.state !== 'ok') {
    drawUnavailableStock(ctx, row, quote.symbol, palette);
    return;
  }
  const x = row.x + 18;
  const right = row.x + row.width - 18;
  const innerWidth = right - x;
  const color = stockColor(quote.change, palette);
  const price = formatStockPrice(quote.price);
  const percent = stockPercentLabel(quote.change, quote.changePercent);
  const infoWidth = Math.min(150, Math.max(96, innerWidth * 0.28));
  const valueWidth = Math.min(170, Math.max(118, innerWidth * 0.32));
  const valueLeft = right - valueWidth;
  const identityRight = inlineChart ? x + infoWidth : valueLeft - 12;

  if (row.height >= 44) {
    const top = row.y + (row.height - 38) / 2;
    clippedText(ctx, quote.symbol, x, top + 15, identityRight - x, 16, 800, palette.ink);
    clippedText(ctx, quote.name, x, top + 34, identityRight - x, 14, 600, palette.muted);
    text(ctx, price, right, top + 15, 16, 700, palette.ink, 'right');
    const full = `${stockDirectionGlyph(quote.change)} ${formatStockChange(quote.change)}  ${formatStockPercent(quote.changePercent)}`;
    const change = textWidth(ctx, full, 14, 800) <= valueWidth ? full : percent;
    text(ctx, change, right, top + 34, 14, 800, color, 'right');
  } else {
    const baseline = row.y + row.height / 2 + 6;
    const percentWidth = textWidth(ctx, percent, 14, 800);
    text(ctx, percent, right, baseline, 14, 800, color, 'right');
    const priceRight = right - percentWidth - 12;
    text(ctx, price, priceRight, baseline, 16, 700, palette.ink, 'right');
    // Long prices can extend past the value column, so clip identity to the price itself.
    const identityLimit = Math.min(identityRight, priceRight - textWidth(ctx, price, 16, 700) - 12);
    const symbolWidth = Math.min(textWidth(ctx, quote.symbol, 16, 800), identityLimit - x);
    clippedText(ctx, quote.symbol, x, baseline, identityLimit - x, 16, 800, palette.ink);
    if (!inlineChart && identityLimit - x - symbolWidth - 10 > 40) {
      clippedText(
        ctx,
        quote.name,
        x + symbolWidth + 10,
        baseline,
        identityLimit - x - symbolWidth - 10,
        14,
        600,
        palette.muted
      );
    }
  }

  if (inlineChart) {
    const chartX = x + infoWidth + 10;
    drawStockChart(
      ctx,
      { x: chartX, y: row.y + 6, width: valueLeft - 10 - chartX, height: row.height - 12 },
      quote.chart,
      palette
    );
  }
}

/**
 * Price line over the chart's time domain with a dashed reference baseline
 * (previous close for 1D). Colored by performance over the charted window.
 */
function drawStockChart(ctx: SKRSContext2D, area: Rect, chart: StockChart, palette: Palette) {
  const points = chart.points;
  if (points.length < 2 || area.width < 24 || area.height < 14) return;
  const values = points.map((point) => point.value);
  let low = Math.min(...values, chart.reference);
  let high = Math.max(...values, chart.reference);
  if (high - low < high * 0.002) {
    low -= high * 0.001;
    high += high * 0.001;
  }
  const padding = (high - low) * 0.08;
  low -= padding;
  high += padding;
  const span = Math.max(1, chart.end - chart.start);
  const toX = (t: number) =>
    area.x + Math.min(1, Math.max(0, (t - chart.start) / span)) * area.width;
  const toY = (value: number) => area.y + (1 - (value - low) / (high - low)) * area.height;
  const performance = stockRangeChange(chart);
  const color = stockColor(performance.change, palette);

  ctx.save();
  ctx.strokeStyle = palette.muted;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  const baseline = Math.round(toY(chart.reference)) + 0.5;
  ctx.moveTo(area.x, baseline);
  ctx.lineTo(area.x + area.width, baseline);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = color;
  ctx.lineWidth = area.height >= 60 ? 2.5 : 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  points.forEach((point, index) => {
    const px = toX(point.t);
    const py = toY(point.value);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  if (area.height >= 36) {
    const last = points.at(-1)!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(toX(last.t), toY(last.value), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMessage(
  ctx: SKRSContext2D,
  rect: Rect,
  size: WidgetSize,
  input: MessageWidgetInput,
  palette: Palette
) {
  label(ctx, rect, input.eyebrow.toUpperCase(), palette);
  const showDetail = size !== 'small' && rect.height > 190;
  const short = rect.height < 130;
  const fontSize = fitMessageFontSize(ctx, input.title, rect, size, showDetail);
  const baseline = rect.y + (short ? 58 : rect.height < 160 ? 62 : 67);
  const contentBottom = rect.y + rect.height - (showDetail ? 46 : 12);
  const maxLines = Math.max(
    1,
    Math.min(size === 'tall' ? 4 : 3, Math.floor((contentBottom - baseline) / fontSize) + 1)
  );
  wrapText(
    ctx,
    input.title,
    rect.x + 18,
    baseline,
    rect.width - 36,
    fontSize,
    500,
    palette.ink,
    maxLines,
    {
      family: 'serif',
      letterSpacing: fontSize * WIDGET_TYPOGRAPHY.messageLetterSpacingEm
    }
  );
  if (showDetail) {
    clippedText(
      ctx,
      input.detail,
      rect.x + 20,
      rect.y + rect.height - 26,
      rect.width - 40,
      14,
      500,
      palette.muted
    );
  }
  accentBar(ctx, rect, palette);
}

function fitMessageFontSize(
  ctx: SKRSContext2D,
  value: string,
  rect: Rect,
  size: WidgetSize,
  showDetail: boolean
) {
  const short = rect.height < 130;
  const baseline = rect.y + (short ? 58 : rect.height < 160 ? 62 : 67);
  const contentBottom = rect.y + rect.height - (showDetail ? 46 : 12);
  const lineLimit = size === 'tall' ? 4 : size === 'small' ? 2 : 3;
  let fontSize = short ? 22 : rect.height < 160 ? 28 : rect.width < 220 ? 30 : 39;
  const options = {
    family: 'serif' as const,
    letterSpacing: fontSize * WIDGET_TYPOGRAPHY.messageLetterSpacingEm
  };

  while (fontSize > MIN_WIDGET_FONT_SIZE) {
    options.letterSpacing = fontSize * WIDGET_TYPOGRAPHY.messageLetterSpacingEm;
    setTextStyle(ctx, fontSize, 500, options);
    const availableLines = Math.max(
      1,
      Math.min(lineLimit, Math.floor((contentBottom - baseline) / fontSize) + 1)
    );
    if (wrappedLines(ctx, value, rect.width - 36).length <= availableLines) break;
    fontSize -= 1;
  }
  return fontSize;
}

function drawWeekStrip(
  ctx: SKRSContext2D,
  rect: Rect,
  date: Date,
  timeZone: string,
  palette: Palette
) {
  const shortWeekday = formatDate(date, timeZone, { weekday: 'short' });
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(shortWeekday);
  const mondayOffset = -((weekdayIndex + 6) % 7);
  const left = rect.x + 18;
  const width = rect.width - 36;
  const cellWidth = width / 7;
  const top = rect.y + rect.height - 59;

  for (let index = 0; index < 7; index += 1) {
    const value = new Date(date.getTime() + (mondayOffset + index) * 86_400_000);
    const x = left + index * cellWidth;
    const current = index === -mondayOffset;
    if (current) {
      roundRect(ctx, x + 2, top, cellWidth - 4, 39, 5);
      ctx.fillStyle = palette.accent;
      ctx.fill();
    }
    text(
      ctx,
      formatDate(value, timeZone, { weekday: 'narrow' }),
      x + cellWidth / 2,
      top + 13,
      14,
      700,
      current ? palette.accentInk : palette.muted,
      'center'
    );
    text(
      ctx,
      formatDate(value, timeZone, { day: 'numeric' }),
      x + cellWidth / 2,
      top + 34,
      14,
      700,
      current ? palette.accentInk : palette.ink,
      'center'
    );
  }
}

function drawHorizontalForecast(
  ctx: SKRSContext2D,
  forecast: WeatherWidgetInput['forecast'],
  timeZone: string,
  palette: Palette,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const cellWidth = width / forecast.length;
  forecast.forEach((day, index) => {
    drawForecastCell(ctx, day, timeZone, palette, x + index * cellWidth, y, cellWidth, height);
  });
}

function drawGridForecast(
  ctx: SKRSContext2D,
  forecast: WeatherWidgetInput['forecast'],
  timeZone: string,
  palette: Palette,
  x: number,
  y: number,
  width: number,
  height: number,
  columns: number
) {
  const rows = Math.ceil(forecast.length / columns);
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  forecast.forEach((day, index) => {
    drawForecastCell(
      ctx,
      day,
      timeZone,
      palette,
      x + (index % columns) * cellWidth,
      y + Math.floor(index / columns) * cellHeight,
      cellWidth,
      cellHeight
    );
  });
}

function drawTallForecast(
  ctx: SKRSContext2D,
  rect: Rect,
  forecast: WeatherWidgetInput['forecast'],
  timeZone: string,
  palette: Palette,
  startY: number
) {
  const rowHeight = (rect.y + rect.height - startY - 10) / forecast.length;
  forecast.forEach((day, index) => {
    const y = startY + index * rowHeight;
    line(ctx, rect.x + 18, y, rect.x + rect.width - 18, y, palette.line);
    text(
      ctx,
      formatDate(new Date(day.date), timeZone, { weekday: 'short' }).toUpperCase(),
      rect.x + 18,
      y + rowHeight * 0.65,
      14,
      700,
      palette.muted
    );
    const markCx = rect.x + rect.width * 0.48;
    const iconSize = Math.min(26, rowHeight - 6);
    if (!drawWeatherIcon(ctx, day.icon, markCx, y + rowHeight * 0.5, iconSize)) {
      text(
        ctx,
        forecastMark(day.condition),
        markCx,
        y + rowHeight * 0.65,
        14,
        700,
        palette.ink,
        'center'
      );
    }
    text(
      ctx,
      `${day.high}° / ${day.low}°`,
      rect.x + rect.width - 18,
      y + rowHeight * 0.65,
      14,
      700,
      palette.ink,
      'right'
    );
  });
}

function drawForecastCell(
  ctx: SKRSContext2D,
  day: WeatherWidgetInput['forecast'][number],
  timeZone: string,
  palette: Palette,
  x: number,
  y: number,
  width: number,
  height: number
) {
  line(ctx, x, y, x, y + height, palette.line);
  const center = x + width / 2;
  const compact = height < 70;
  text(
    ctx,
    formatDate(new Date(day.date), timeZone, { weekday: 'short' }).toUpperCase(),
    center,
    y + (compact ? 15 : 19),
    14,
    700,
    palette.muted,
    'center'
  );
  if (!compact) {
    const iconSize = Math.min(38, width - 10, height - 40);
    if (!drawWeatherIcon(ctx, day.icon, center, y + 40, iconSize)) {
      text(ctx, forecastMark(day.condition), center, y + 43, 14, 700, palette.ink, 'center');
    }
  }
  text(
    ctx,
    `${day.high}° / ${day.low}°`,
    center,
    y + (compact ? 36 : 63),
    14,
    700,
    palette.ink,
    'center'
  );
  if (height > 96)
    text(ctx, `${day.precipitation}% rain`, center, y + 84, 14, 600, palette.muted, 'center');
}

function forecastMark(condition: string) {
  const normalized = condition.toLowerCase();
  if (normalized.includes('rain') || normalized.includes('shower')) return 'RAIN';
  if (normalized.includes('sun')) return 'SUN';
  return 'CLD';
}

function compactWeatherCondition(condition: string) {
  const normalized = condition.toLowerCase();
  if (normalized.includes('rain') || normalized.includes('shower')) return 'Rain';
  if (normalized.includes('sun')) return 'Sunny';
  if (normalized.includes('cloud')) return 'Cloudy';
  return condition;
}

function formatDate(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(date);
}

function drawCard(ctx: SKRSContext2D, rect: Rect, fill: string, stroke: string) {
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 11);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawEmptySlot(ctx: SKRSContext2D, rect: Rect, slotLabel: string, palette: Palette) {
  ctx.save();
  ctx.setLineDash([5, 5]);
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 11);
  ctx.strokeStyle = palette.line;
  ctx.stroke();
  ctx.restore();
  text(ctx, slotLabel, rect.x + 16, rect.y + 30, 14, 600, palette.muted);
}

function label(ctx: SKRSContext2D, rect: Rect, value: string, palette: Palette) {
  text(ctx, value, rect.x + 18, rect.y + 31, 14, 800, palette.muted, 'left', {
    letterSpacing: 14 * WIDGET_TYPOGRAPHY.labelLetterSpacingEm
  });
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(rect.x + rect.width - 22, rect.y + 25, 5, 0, Math.PI * 2);
  ctx.fill();
}

function accentBar(ctx: SKRSContext2D, rect: Rect, palette: Palette) {
  ctx.fillStyle = palette.accent;
  ctx.fillRect(rect.x, rect.y + rect.height - 5, rect.width, 5);
}

/** Draws a bundled Meteocons icon centered at (cx, cy). Returns false if absent. */
function drawWeatherIcon(
  ctx: SKRSContext2D,
  name: string,
  cx: number,
  cy: number,
  size: number
): boolean {
  const image = getMeteocon(name);
  if (!image || size < 8) return false;
  ctx.drawImage(image, cx - size / 2, cy - size / 2, size, size);
  return true;
}

function drawWeatherGlyph(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  radius: number,
  palette: Palette
) {
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.72, Math.PI, Math.PI * 2);
  ctx.arc(x + radius * 0.7, y, radius * 0.55, Math.PI, Math.PI * 2);
  ctx.moveTo(x - radius * 0.7, y);
  ctx.lineTo(x + radius * 1.25, y);
  ctx.stroke();
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(x + radius * 0.85, y - radius * 0.8, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function text(
  ctx: SKRSContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  align: CanvasTextAlign = 'left',
  options: TextOptions = {}
) {
  const fontSize = Math.max(size, MIN_WIDGET_FONT_SIZE);
  setTextStyle(ctx, fontSize, weight, options);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function clippedText(
  ctx: SKRSContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: number,
  color: string,
  options: TextOptions = {}
) {
  const fontSize = Math.max(size, MIN_WIDGET_FONT_SIZE);
  setTextStyle(ctx, fontSize, weight, options);
  let result = value;
  while (result.length > 1 && ctx.measureText(result).width > maxWidth)
    result = `${result.slice(0, -2)}…`;
  text(ctx, result, x, y, fontSize, weight, color, 'left', options);
}

function fittedText(
  ctx: SKRSContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  preferredSize: number,
  weight: number,
  color: string,
  options: TextOptions = {}
) {
  let fontSize = Math.max(preferredSize, MIN_WIDGET_FONT_SIZE);
  setTextStyle(ctx, fontSize, weight, options);
  while (fontSize > MIN_WIDGET_FONT_SIZE && ctx.measureText(value).width > maxWidth) {
    fontSize -= 1;
    setTextStyle(ctx, fontSize, weight, options);
  }
  clippedText(ctx, value, x, y, maxWidth, fontSize, weight, color, options);
}

function wrapText(
  ctx: SKRSContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: number,
  color: string,
  maxLines: number,
  options: TextOptions = {}
) {
  const fontSize = Math.max(size, MIN_WIDGET_FONT_SIZE);
  setTextStyle(ctx, fontSize, weight, options);
  const lines = wrappedLines(ctx, value, maxWidth);
  const visibleLines = lines.slice(0, maxLines);
  const truncated = lines.length > maxLines;

  visibleLines.forEach((lineValue, index) => {
    const displayedValue =
      truncated && index === visibleLines.length - 1 ? `${lineValue}…` : lineValue;
    clippedText(
      ctx,
      displayedValue,
      x,
      y + index * fontSize * 0.98,
      maxWidth,
      fontSize,
      weight,
      color,
      options
    );
  });
}

function wrappedLines(ctx: SKRSContext2D, value: string, maxWidth: number) {
  const words = value.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) current = candidate;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function setTextStyle(ctx: SKRSContext2D, size: number, weight: number, options: TextOptions = {}) {
  ctx.font = `${weight} ${size}px ${WIDGET_TYPOGRAPHY[options.family ?? 'sans']}`;
  ctx.letterSpacing = `${options.letterSpacing ?? 0}px`;
}

function line(ctx: SKRSContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
