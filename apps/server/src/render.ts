import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { Jimp } from 'jimp';

import {
  DISPLAY_HEIGHT,
  DISPLAY_GAP,
  DISPLAY_PADDING,
  DISPLAY_WIDTH,
  MIN_WIDGET_FONT_SIZE,
  getLayout,
  type CalendarWidgetInput,
  type DashboardConfig,
  type DashboardData,
  type DashboardTheme,
  type DateWidgetInput,
  type LayoutSlot,
  type MessageWidgetInput,
  type ScoresWidgetInput,
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
      line: '#ccd0c9'
    },
    mist: {
      page: '#dce4e7',
      card: '#f5f8f6',
      cardAlt: '#cbd9de',
      ink: '#142127',
      muted: '#607078',
      line: '#becacd'
    },
    night: {
      page: '#111714',
      card: '#1d2621',
      cardAlt: '#26332c',
      ink: '#f4f5ec',
      muted: '#a9b5ab',
      line: '#3a463f'
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
  input.events.slice(0, maxItems).forEach((event, index) => {
    const rowTop = contentTop + index * rowHeight;
    const baseline = rowTop + Math.min(22, rowHeight * 0.7);
    if (index > 0) {
      line(ctx, rect.x + 18, rowTop, rect.x + rect.width - 18, rowTop, palette.line);
    }
    text(ctx, event.time, rect.x + 18, baseline, 14, 700, palette.muted);
    clippedText(
      ctx,
      event.title,
      rect.x + 74,
      baseline,
      Math.max(20, rect.width - 94),
      16,
      700,
      palette.ink
    );
    if (event.tag && rect.width > 300 && rowHeight >= 50) {
      text(ctx, event.tag, rect.x + 74, baseline + 21, 14, 500, palette.muted);
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
  label(ctx, rect, 'MATCH CENTRE', palette);
  const limit =
    size === 'small'
      ? 1
      : size === 'wide'
        ? 2
        : size === 'tall'
          ? rect.height < 240
            ? 2
            : 3
          : size === 'large'
            ? 3
            : 4;
  const games = input.games.slice(0, limit);
  const candidateAreaWidth = rect.width / Math.max(games.length, 1);
  const horizontal = (size === 'wide' || size === 'full') && candidateAreaWidth >= 180;
  const compactHeight = rect.height < 130;
  const contentTop = rect.y + 46;
  const contentBottom = rect.y + rect.height - 12;
  const verticalRowHeight = (contentBottom - contentTop) / Math.max(games.length, 1);
  games.forEach((game, index) => {
    const areaWidth = horizontal ? rect.width / games.length : rect.width;
    const x = horizontal ? rect.x + index * areaWidth : rect.x;
    const rowTop = horizontal ? contentTop : contentTop + index * verticalRowHeight;
    if (index > 0) {
      if (horizontal) line(ctx, x, contentTop, x, contentBottom, palette.line);
      else line(ctx, rect.x + 18, rowTop, rect.x + rect.width - 18, rowTop, palette.line);
    }

    const denseVertical = !horizontal && verticalRowHeight < 66;
    if (denseVertical) {
      fittedText(
        ctx,
        `${game.home} ${game.homeScore} · ${game.away} ${game.awayScore}`,
        x + 18,
        rowTop + verticalRowHeight / 2 + 5,
        areaWidth - 36,
        17,
        700,
        palette.ink
      );
      return;
    }

    const showStatus = !compactHeight && (horizontal || verticalRowHeight >= 74);
    const statusReserve = showStatus ? 82 : 0;
    const firstBaseline = rowTop + (horizontal ? 19 : 25);
    const secondBaseline = rowTop + (horizontal ? 46 : 51);
    clippedText(
      ctx,
      `${game.home}  ${game.homeScore}`,
      x + 18,
      firstBaseline,
      Math.max(30, areaWidth - 36 - statusReserve),
      horizontal ? 18 : 17,
      700,
      palette.ink
    );
    clippedText(
      ctx,
      `${game.away}  ${game.awayScore}`,
      x + 18,
      secondBaseline,
      Math.max(30, areaWidth - 36 - statusReserve),
      horizontal ? 18 : 17,
      700,
      palette.ink
    );
    if (showStatus) {
      pill(ctx, game.status, x + areaWidth - 14, rowTop + 4, game.live, palette);
    }
  });
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

function pill(
  ctx: SKRSContext2D,
  value: string,
  right: number,
  y: number,
  live: boolean,
  palette: Palette
) {
  const fontSize = MIN_WIDGET_FONT_SIZE;
  setTextStyle(ctx, fontSize, 800);
  const width = Math.max(48, ctx.measureText(value).width + 14);
  const x = right - width;
  roundRect(ctx, x, y, width, 26, 13);
  ctx.fillStyle = live ? palette.accent : palette.cardAlt;
  ctx.fill();
  text(
    ctx,
    value,
    x + width / 2,
    y + 18,
    fontSize,
    800,
    live ? palette.accentInk : palette.ink,
    'center'
  );
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
