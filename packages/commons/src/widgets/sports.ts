import { defineWidget } from '../widget-maker.js';
import { plan } from './plan.js';

export const sportsWidget = defineWidget({
  id: 'scores',
  name: 'Sports',
  description: 'The leagues, teams, races, and sessions you follow.',
  refresh: {
    mode: 'interval',
    everyMinutes: 15,
    reason: 'Schedules and active events stay current while shared caching protects providers.'
  },
  variants: {
    small: plan('Glance', 'One focused event card.', 'matchup or session', 'date and time'),
    wide: plan('Strip', 'Two event cards side by side.', 'two events', 'date and time'),
    tall: plan(
      'Timeline',
      'Three full-width events in chronological order.',
      'event names',
      'sessions or teams',
      'date and time'
    ),
    large: plan(
      'Event grid',
      'Two or four event cards, based on available geometry.',
      'adaptive event grid',
      'competitions',
      'sessions or scores',
      'date and time'
    ),
    full: plan(
      'Canvas',
      'Four live and upcoming events across the canvas.',
      'four-column event grid',
      'competitions',
      'sessions or scores',
      'date and time'
    )
  }
});
