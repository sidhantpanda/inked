import { defineWidget } from '../widget-maker.js';
import { plan } from './plan.js';

export const calendarWidget = defineWidget({
  id: 'calendar',
  name: 'Calendar',
  description: 'The next events on the agenda.',
  refresh: {
    mode: 'interval',
    everyMinutes: 15,
    reason: 'Agenda changes should appear promptly without continuous polling.'
  },
  variants: {
    small: plan('Glance', 'The next event only.', 'next event time', 'event title'),
    wide: plan('Strip', 'The next two events.', 'two event times', 'event titles'),
    tall: plan(
      'Rail',
      'Three upcoming events with categories.',
      'three events',
      'event categories'
    ),
    large: plan(
      'Feature',
      'Four upcoming events with detail.',
      'four events',
      'times',
      'categories'
    ),
    full: plan('Canvas', 'The complete five-event agenda.', 'five events', 'times', 'categories')
  }
});
