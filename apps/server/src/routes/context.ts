import type { DashboardConfigStore } from '../config-store.js';
import type { DashboardDataProvider } from '../data.js';
import type { CalendarService } from '../google-calendar.js';
import type { PhotoPainter } from '../photo-painter.js';
import type { PreviewCache } from '../preview-cache.js';
import type { SportsDataService } from '../sports/index.js';
import type { StocksDataService } from '../stocks/index.js';
import type { WeatherService } from '../widget-data/index.js';

/** The services every route module receives from `buildApp`. */
export interface AppServices {
  store: DashboardConfigStore;
  dataProvider: DashboardDataProvider;
  photoPainter: PhotoPainter;
  weatherService: WeatherService;
  calendarService: CalendarService;
  sportsService: SportsDataService;
  stocksService: StocksDataService;
  previews: PreviewCache;
}
