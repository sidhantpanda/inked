import type { DashboardConfig, DashboardData, WidgetInput } from '@inked/commons';

import type { CalendarService } from './google-calendar.js';
import { fetchDashboardData, resolveSlotInputs } from './widget-data/index.js';
import { OpenMeteoWeatherService, type WeatherService } from './widget-data/weather-service.js';

export interface DashboardDataProvider {
  /** Default per-widget inputs, used by the widget gallery previews. */
  getData(now?: Date): Promise<DashboardData>;
  /** One resolved input per assigned slot, honoring each slot's settings. */
  resolveSlots(config: DashboardConfig, now?: Date): Promise<Record<string, WidgetInput>>;
}

const TIMEZONE = 'Europe/Amsterdam';

export class DemoDashboardDataProvider implements DashboardDataProvider {
  constructor(
    private readonly weather: WeatherService = new OpenMeteoWeatherService(),
    private readonly calendar?: CalendarService
  ) {}

  async getData(now = new Date()): Promise<DashboardData> {
    return fetchDashboardData({
      now,
      timezone: TIMEZONE,
      weather: this.weather,
      ...(this.calendar ? { calendar: this.calendar } : {})
    });
  }

  async resolveSlots(
    config: DashboardConfig,
    now = new Date()
  ): Promise<Record<string, WidgetInput>> {
    return resolveSlotInputs(config, {
      now,
      timezone: TIMEZONE,
      weather: this.weather,
      ...(this.calendar ? { calendar: this.calendar } : {})
    });
  }
}
