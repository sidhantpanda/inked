import { describe, expect, it } from 'vitest';

import { WIDGET_IDS, createAssignment, createDefaultDashboard } from '@inked/commons';

import { FakeCalendarService } from '../testing/fake-calendar.js';
import {
  WIDGET_DATA_FETCHERS,
  fetchDashboardData,
  fetchWidgetInput,
  resolveSlotInputs
} from './index.js';

const context = { now: new Date('2026-07-15T10:00:00.000Z'), timezone: 'Europe/Amsterdam' };

describe('widget data fetchers', () => {
  it('provides one counterpart fetcher for every widget', () => {
    expect(Object.keys(WIDGET_DATA_FETCHERS)).toEqual(WIDGET_IDS);
  });

  it('fetches each widget input independently', async () => {
    expect(await fetchWidgetInput('clock', context)).toEqual({
      now: context.now.toISOString(),
      timezone: context.timezone
    });
    const weather = await fetchWidgetInput('weather', context);
    const calendar = await fetchWidgetInput('calendar', context);
    const scores = await fetchWidgetInput('scores', context);
    const message = await fetchWidgetInput('message', context);
    expect(weather).toMatchObject({ timezone: context.timezone, location: 'Amsterdam' });
    expect(weather.forecast.length).toBeGreaterThan(0);
    expect(calendar.events.length).toBeGreaterThan(0);
    expect(scores.events.length).toBeGreaterThan(0);
    expect(message.title).not.toBe('');
  });

  it('composes the independent inputs into a dashboard payload', async () => {
    const dashboard = await fetchDashboardData(context);
    expect(Object.keys(dashboard)).toEqual(WIDGET_IDS);
    expect(dashboard.weather.forecast).toHaveLength(7);
    expect(dashboard.calendar.events).toHaveLength(5);
    expect(dashboard.scores.events).toHaveLength(4);
  });

  it('honors per-slot settings so repeated widgets differ', async () => {
    const config = {
      ...createDefaultDashboard(),
      layoutId: 'quad',
      assignments: [
        createAssignment('north-west', 'weather', { location: 'Tokyo' }),
        createAssignment('north-east', 'weather', { location: 'Reykjavik' }),
        createAssignment('south-west', 'message', {
          eyebrow: 'Reminder',
          title: 'Water the plants',
          detail: 'Before it gets hot'
        }),
        createAssignment('south-east', 'clock')
      ]
    };

    const slots = await resolveSlotInputs(config, context);
    const tokyo = slots['north-west'];
    const reykjavik = slots['north-east'];
    const message = slots['south-east'] && slots['south-west'];

    expect(tokyo).toMatchObject({ location: 'Tokyo' });
    expect(reykjavik).toMatchObject({ location: 'Reykjavik' });
    // Different cities must not collapse to identical demo weather.
    expect(JSON.stringify(tokyo)).not.toBe(JSON.stringify(reykjavik));
    expect(message).toBeTruthy();
    expect(slots['south-west']).toMatchObject({ title: 'Water the plants' });
  });

  it('fetches real calendar events from the selected sources', async () => {
    const calendarContext = { ...context, calendar: new FakeCalendarService() };
    const input = await fetchWidgetInput('calendar', calendarContext, {
      sources: [{ accountId: 'acc-1', calendarIds: ['primary'] }]
    });
    expect(input.events.length).toBeGreaterThan(0);
    expect(input.events[0]).toMatchObject({ title: 'Standup', tag: 'home@example.com' });

    // With no sources selected it falls back to the demo agenda.
    const demo = await fetchWidgetInput('calendar', calendarContext, { sources: [] });
    expect(demo.events).toHaveLength(5);
  });
});
