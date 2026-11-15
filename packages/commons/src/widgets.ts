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
  }),
  defineWidget({
    id: 'stocks',
    name: 'Stocks',
    description: 'Prices, day change, and optional charts for the tickers you track.',
    refresh: {
      mode: 'interval',
      everyMinutes: 15,
      reason:
        'Free market data is delayed about 15 minutes, so faster refreshes add e-ink wear only.'
    },
    variants: {
      small: plan(
        'Glance',
        'One ticker with a chart, or a compact quote list when tracking several.',
        'price',
        'day change',
        'optional chart'
      ),
      wide: plan(
        'Strip',
        'Quote rows with inline sparklines, or one ticker beside its chart.',
        'symbols and names',
        'prices',
        'day change',
        'inline sparklines'
      ),
      tall: plan(
        'Rail',
        'Stacked tickers, each with a chart beneath when there is room.',
        'stacked quotes',
        'day change',
        'per-ticker charts'
      ),
      large: plan(
        'Feature',
        'A hero quote with a full chart, or rows of quotes with sparklines.',
        'hero price',
        'day change',
        'range performance',
        'charts'
      ),
      full: plan(
        'Canvas',
        'A grid of ticker cards with charts across the display.',
        'ticker card grid',
        'prices',
        'day change',
        'charts'
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
