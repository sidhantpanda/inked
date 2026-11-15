import { vi } from 'vitest';
import type {
  LayoutDefinition,
  WidgetDefinition,
  WidgetLayoutVariant,
  WidgetPreviewDimensions,
  WidgetSize,
  WidgetSizeDefinition
} from '@inked/commons';

import { buildApp } from '../app.js';
import { MemoryDashboardConfigStore } from '../config-store.js';
import { DemoDashboardDataProvider } from '../data.js';
import { FakeCalendarService } from './fake-calendar.js';
import { FakeSportsService } from './fake-sports.js';
import { FakeStocksService } from './fake-stocks.js';
import { FakeWeatherService } from './fake-weather.js';

/** Shape of `GET /api/catalog`. */
export interface CatalogResponse {
  layouts: LayoutDefinition[];
  widgets: WidgetDefinition[];
  widgetSizes: Record<WidgetSize, WidgetSizeDefinition>;
  widgetPreviewDimensions: Record<WidgetSize, WidgetPreviewDimensions>;
  widgetLayoutVariants: WidgetLayoutVariant[];
  minimumWidgetFontSize: number;
}

/** The API wired to deterministic offline fakes, with a Photo Painter that always accepts. */
export function testApp() {
  const weather = new FakeWeatherService();
  const calendar = new FakeCalendarService();
  const sports = new FakeSportsService();
  return buildApp({
    store: new MemoryDashboardConfigStore(),
    dataProvider: new DemoDashboardDataProvider(weather, calendar),
    weatherService: weather,
    calendarService: calendar,
    sportsService: sports,
    stocksService: new FakeStocksService(),
    photoPainter: {
      endpoint: 'https://example.test/paint',
      paint: vi.fn(async () => ({ message: 'accepted' }))
    }
  });
}
