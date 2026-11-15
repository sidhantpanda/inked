import type { WidgetVariantPlan } from '../types.js';

/** Shorthand for a size variant's content plan: its name, summary, and what it shows. */
export const plan = (name: string, summary: string, ...shows: string[]): WidgetVariantPlan => ({
  name,
  summary,
  shows
});
