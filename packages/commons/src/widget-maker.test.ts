import { describe, expect, it } from 'vitest';

import { createDefaultDashboard } from './layouts.js';
import {
  MIN_WIDGET_FONT_SIZE,
  WIDGET_PREVIEW_DIMENSIONS,
  WIDGET_SIZES,
  WIDGET_SIZE_DEFINITIONS,
  createAssignment,
  type WidgetDefinition
} from './types.js';
import { buildDashboardRefreshPlan, defineWidget, formatRefreshPolicy } from './widget-maker.js';
import { WIDGETS } from './widgets.js';

describe('widget maker', () => {
  it('publishes the calibrated minimum display font size', () => {
    expect(MIN_WIDGET_FONT_SIZE).toBe(14);
  });

  it('publishes the standard size set in increasing content levels', () => {
    expect(Object.keys(WIDGET_SIZE_DEFINITIONS)).toEqual(WIDGET_SIZES);
    expect(WIDGET_SIZES.map((size) => WIDGET_SIZE_DEFINITIONS[size].contentLevel)).toEqual([
      1, 2, 2, 3, 4
    ]);
    expect(WIDGET_SIZE_DEFINITIONS.wide).toMatchObject({ gridColumns: 2, gridRows: 1 });
    expect(WIDGET_SIZE_DEFINITIONS.tall).toMatchObject({ gridColumns: 1, gridRows: 2 });
    expect(WIDGET_PREVIEW_DIMENSIONS).toEqual({
      small: { width: 186, height: 220 },
      wide: { width: 380, height: 220 },
      tall: { width: 186, height: 448 },
      large: { width: 380, height: 448 },
      full: { width: 768, height: 448 }
    });
  });

  it('requires a named plan with visible content for every size', () => {
    for (const widget of WIDGETS) {
      expect(widget.supportedSizes).toEqual(WIDGET_SIZES);
      for (const size of WIDGET_SIZES) {
        expect(widget.variants[size].name).not.toBe('');
        expect(widget.variants[size].summary).not.toBe('');
        expect(widget.variants[size].shows.length).toBeGreaterThan(0);
      }
    }
  });

  it('rejects incomplete runtime definitions', () => {
    expect(() =>
      defineWidget({
        id: 'message',
        name: 'Broken',
        description: 'Missing most size plans.',
        refresh: { mode: 'manual', reason: 'Test' },
        variants: { small: { name: 'Glance', summary: 'One line.', shows: ['headline'] } }
      } as unknown as Omit<WidgetDefinition, 'supportedSizes'>)
    ).toThrow('complete wide variant');
  });

  it('validates interval and daily refresh policies', () => {
    const variants = Object.fromEntries(
      WIDGET_SIZES.map((size) => [
        size,
        {
          name: size,
          summary: `${size} plan`,
          shows: ['content']
        }
      ])
    ) as WidgetDefinition['variants'];

    expect(() =>
      defineWidget({
        id: 'message',
        name: 'Bad',
        description: 'Bad interval',
        variants,
        refresh: { mode: 'interval', everyMinutes: 0, reason: 'Test' }
      })
    ).toThrow('positive whole number');
    expect(() =>
      defineWidget({
        id: 'message',
        name: 'Bad',
        description: 'Bad time',
        variants,
        refresh: { mode: 'daily', atLocalTime: '25:00', reason: 'Test' }
      })
    ).toThrow('HH:mm');
  });

  it('uses the fastest assigned widget as the dashboard cadence', () => {
    const plan = buildDashboardRefreshPlan(createDefaultDashboard(), WIDGETS);
    expect(plan.intervalMinutes).toBe(5);
    expect(plan.label).toBe('Every 5 min');
    expect(new Set(plan.widgets.map((widget) => widget.widgetId)).size).toBe(plan.widgets.length);
  });

  it('keeps a manual-only dashboard off a polling schedule', () => {
    const config = createDefaultDashboard();
    config.assignments = config.assignments.map((assignment) =>
      createAssignment(assignment.slotId, 'message')
    );
    expect(buildDashboardRefreshPlan(config, WIDGETS)).toMatchObject({
      intervalMinutes: null,
      label: 'Manual refresh',
      widgets: [{ widgetId: 'message', label: 'Manual', intervalMinutes: null }]
    });
    expect(formatRefreshPolicy(WIDGETS[0].refresh)).toBe('Daily · 00:05');
  });
});
