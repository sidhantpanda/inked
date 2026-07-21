import { WIDGET_IDS, type WidgetVariantPlan } from './types.js';
import { assertWidgetIdsExhaustive, defineWidget } from './widget-maker.js';

const plan = (name: string, summary: string, ...shows: string[]): WidgetVariantPlan => ({
  name,
  summary,
  shows
});

export const WIDGETS = [
  defineWidget({
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
  }),
  defineWidget({
    id: 'weather',
    name: 'Weather',
    description: 'Current conditions plus an adaptive weekly forecast.',
    refresh: {
      mode: 'interval',
      everyMinutes: 60,
      reason: 'Hourly weather updates balance freshness with e-ink wear.'
    },
    variants: {
      small: plan('Glance', 'Current temperature and condition.', 'temperature', 'condition'),
      wide: plan(
        'Strip',
        'Current temperature plus two forecast days.',
        'current conditions',
        'two-day forecast'
      ),
      tall: plan(
        'Rail',
        'Current conditions plus three stacked days.',
        'current conditions',
        'high and low',
        'three-day forecast'
      ),
      large: plan(
        'Feature',
        'Current conditions and a four-day forecast grid.',
        'current conditions',
        'precipitation',
        'four-day forecast'
      ),
      full: plan(
        'Canvas',
        'Current conditions and the complete week.',
        'current conditions',
        'high and low',
        'precipitation',
        'seven-day forecast'
      )
    }
  }),
  defineWidget({
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
  }),
  defineWidget({
    id: 'scores',
    name: 'Sports scores',
    description: 'Live and upcoming games.',
    refresh: {
      mode: 'interval',
      everyMinutes: 5,
      reason: 'Live scores are the fastest-changing supported content.'
    },
    variants: {
      small: plan('Glance', 'One priority score.', 'teams', 'score', 'status'),
      wide: plan('Strip', 'Two scores side by side.', 'two games', 'scores', 'status'),
      tall: plan(
        'Rail',
        'Two or three stacked scores as height allows.',
        'stacked games',
        'scores',
        'status'
      ),
      large: plan(
        'Feature',
        'Three games with competition context.',
        'three games',
        'competitions',
        'scores'
      ),
      full: plan(
        'Canvas',
        'Four live and upcoming games.',
        'four games',
        'competitions',
        'scores',
        'statuses'
      )
    }
  }),
  defineWidget({
    id: 'message',
    name: 'Message',
    description: 'A configurable headline or reminder.',
    refresh: { mode: 'manual', reason: 'Messages change only when their author edits them.' },
    variants: {
      small: plan('Glance', 'A short headline.', 'eyebrow', 'headline'),
      wide: plan('Strip', 'A single-line headline.', 'eyebrow', 'headline'),
      tall: plan(
        'Rail',
        'A wrapped headline and supporting detail.',
        'eyebrow',
        'headline',
        'detail'
      ),
      large: plan('Feature', 'A prominent headline and note.', 'eyebrow', 'headline', 'detail'),
      full: plan(
        'Canvas',
        'A display-scale message with context.',
        'eyebrow',
        'hero headline',
        'supporting detail'
      )
    }
  })
] as const;

assertWidgetIdsExhaustive(WIDGETS, WIDGET_IDS);
