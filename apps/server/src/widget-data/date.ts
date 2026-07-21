import type { DateWidgetInput } from '@inked/commons';

import type { WidgetDataFetchContext } from './types.js';

/** Fetches the input variables consumed by the Date widget. */
export async function fetchDateWidgetInput(
  context: WidgetDataFetchContext
): Promise<DateWidgetInput> {
  return { now: context.now.toISOString(), timezone: context.timezone };
}
