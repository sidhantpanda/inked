import type { CalendarWidgetInput } from '@inked/commons';

import type { WidgetDataFetchContext } from './types.js';

/** Replace this demo body with the production calendar integration. */
export async function fetchCalendarWidgetInput(
  _context: WidgetDataFetchContext
): Promise<CalendarWidgetInput> {
  return {
    events: [
      { id: 'design-review', time: '09:30', title: 'Design review', tag: 'Studio' },
      { id: 'lunch', time: '12:30', title: 'Lunch with Maya', tag: 'Personal' },
      { id: 'focus', time: '15:00', title: 'Focus block', tag: 'Deep work' },
      { id: 'groceries', time: '17:30', title: 'Pick up groceries', tag: 'Home' },
      { id: 'dinner', time: '19:00', title: 'Dinner reservation', tag: 'Personal' }
    ]
  };
}
