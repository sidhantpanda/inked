import { defineWidget } from '../widget-maker.js';
import { plan } from './plan.js';

export const weatherWidget = defineWidget({
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
});
