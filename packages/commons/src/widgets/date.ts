import { defineWidget } from '../widget-maker.js';
import { plan } from './plan.js';

export const dateWidget = defineWidget({
  id: 'clock',
  name: 'Date',
  description: 'Today’s date with week context in larger panels.',
  refresh: {
    mode: 'daily',
    atLocalTime: '00:05',
    reason: 'The displayed date changes once per local day.'
  },
  variants: {
    small: plan('Glance', 'Day number and weekday.', 'day number', 'weekday'),
    wide: plan(
      'Strip',
      'Date, weekday, month, and year.',
      'day number',
      'weekday',
      'month and year'
    ),
    tall: plan('Rail', 'Date plus the full current week.', 'full date', 'seven-day week strip'),
    large: plan(
      'Feature',
      'Prominent date plus the full current week.',
      'large date',
      'weekday',
      'month and year',
      'seven-day week strip'
    ),
    full: plan(
      'Canvas',
      'Maximum-scale date with week context.',
      'hero date',
      'full date context',
      'seven-day week strip'
    )
  }
});
