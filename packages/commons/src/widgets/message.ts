import { defineWidget } from '../widget-maker.js';
import { plan } from './plan.js';

export const messageWidget = defineWidget({
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
});
