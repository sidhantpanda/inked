import type { MessageWidgetInput, MessageWidgetSettings } from '@inked/commons';

import type { WidgetDataFetchContext } from './types.js';

/** Returns the author's message content straight from the slot settings. */
export async function fetchMessageWidgetInput(
  _context: WidgetDataFetchContext,
  settings: MessageWidgetSettings
): Promise<MessageWidgetInput> {
  return {
    eyebrow: settings.eyebrow,
    title: settings.title,
    detail: settings.detail
  };
}
