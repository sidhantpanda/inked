import { describe, expect, it } from 'vitest';

import { createDefaultDashboard } from './layouts.js';
import { parseDashboardConfig } from './validation.js';

describe('sports settings validation', () => {
  it('migrates an old empty scores assignment to the default follow', () => {
    const config = createDefaultDashboard();
    const input = {
      ...config,
      assignments: config.assignments.map((assignment) =>
        assignment.widgetId === 'scores' ? { ...assignment, settings: {} } : assignment
      )
    };

    const parsed = parseDashboardConfig(input);
    expect(parsed.assignments.find((assignment) => assignment.widgetId === 'scores')).toMatchObject(
      {
        settings: {
          sportId: 'football',
          horizonDays: 90,
          follows: [{ competitionId: 'premier-league', eventTypes: [] }]
        }
      }
    );
  });

  it('keeps independent team and series selections on repeated sports widgets', () => {
    const parsed = parseDashboardConfig({
      ...createDefaultDashboard(),
      layoutId: 'quad',
      assignments: [
        {
          slotId: 'north-west',
          widgetId: 'scores',
          settings: {
            follows: [
              {
                kind: 'team',
                sportId: 'football',
                competitionId: 'premier-league',
                teamId: 'premier-league:arsenal',
                eventTypes: ['match']
              }
            ],
            horizonDays: 7
          }
        },
        {
          slotId: 'north-east',
          widgetId: 'scores',
          settings: {
            follows: [
              {
                kind: 'competition',
                sportId: 'motorsport',
                competitionId: 'formula-1',
                eventTypes: ['qualifying', 'race', 'invalid']
              }
            ],
            horizonDays: 30
          }
        }
      ]
    });

    expect(parsed.assignments[0]?.settings).toMatchObject({
      sportId: 'football',
      follows: [{ teamId: 'premier-league:arsenal' }],
      horizonDays: 7
    });
    expect(parsed.assignments[1]?.settings).toEqual({
      sportId: 'motorsport',
      follows: [
        {
          kind: 'competition',
          sportId: 'motorsport',
          competitionId: 'formula-1',
          eventTypes: ['qualifying', 'race']
        }
      ],
      horizonDays: 30
    });
  });

  it('keeps only the configured sport when a widget contains mixed follows', () => {
    const config = createDefaultDashboard();
    const parsed = parseDashboardConfig({
      ...config,
      assignments: [
        {
          slotId: config.assignments[0]!.slotId,
          widgetId: 'scores',
          settings: {
            sportId: 'football',
            follows: [
              {
                kind: 'competition',
                sportId: 'football',
                competitionId: 'premier-league',
                eventTypes: ['match']
              },
              {
                kind: 'competition',
                sportId: 'motorsport',
                competitionId: 'formula-1',
                eventTypes: ['race']
              }
            ],
            horizonDays: 30
          }
        }
      ]
    });

    expect(parsed.assignments[0]?.settings).toEqual({
      sportId: 'football',
      follows: [
        {
          kind: 'competition',
          sportId: 'football',
          competitionId: 'premier-league',
          eventTypes: ['match']
        }
      ],
      horizonDays: 30
    });
  });
});
