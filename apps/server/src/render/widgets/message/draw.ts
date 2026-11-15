import type { SKRSContext2D } from '@napi-rs/canvas';
import { type MessageWidgetInput, MIN_WIDGET_FONT_SIZE, type WidgetSize } from '@inked/commons';

import { accentBar, label } from '../../primitives.js';
import {
  clippedText,
  setTextStyle,
  WIDGET_TYPOGRAPHY,
  wrappedLines,
  wrapText
} from '../../text.js';
import type { Palette, Rect } from '../../types.js';

export function drawMessage(
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
