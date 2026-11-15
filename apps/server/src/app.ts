import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(import.meta.dirname, '../../../.env') });
import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { MemoryDashboardConfigStore, type DashboardConfigStore } from './config-store.js';
import { DemoDashboardDataProvider, type DashboardDataProvider } from './data.js';
import { GoogleCalendarService, type CalendarService } from './google-calendar.js';
import { MemoryGoogleAccountStore } from './google-store.js';
import { PhotoPainterClient, type PhotoPainter } from './photo-painter.js';
import { PreviewCache } from './preview-cache.js';
import { ensureMeteocons } from './render.js';
import { registerCatalogRoutes } from './routes/catalog.js';
import type { AppServices } from './routes/context.js';
import { registerDashboardsRoutes } from './routes/dashboards.js';
import { registerGoogleRoutes } from './routes/google.js';
import { registerLookupsRoutes } from './routes/lookups.js';
import { registerRenderingRoutes } from './routes/rendering.js';
import { createDefaultSportsService, type SportsDataService } from './sports/index.js';
import { createDefaultStocksService, type StocksDataService } from './stocks/index.js';
import { OpenMeteoWeatherService, type WeatherService } from './widget-data/index.js';

export interface BuildAppOptions {
  store?: DashboardConfigStore;
  dataProvider?: DashboardDataProvider;
  photoPainter?: PhotoPainter;
  weatherService?: WeatherService;
  calendarService?: CalendarService;
  sportsService?: SportsDataService;
  stocksService?: StocksDataService;
  logger?: boolean;
}

function defaultCalendarService(): CalendarService {
  return new GoogleCalendarService({
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? '',
    accounts: new MemoryGoogleAccountStore()
  });
}

/** Builds the API: resolves services (real by default, injectable for tests) and routes. */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 1_000_000 });
  const weatherService = options.weatherService ?? new OpenMeteoWeatherService();
  const calendarService = options.calendarService ?? defaultCalendarService();
  const sportsService = options.sportsService ?? createDefaultSportsService();
  const stocksService = options.stocksService ?? createDefaultStocksService();
  const services: AppServices = {
    store: options.store ?? new MemoryDashboardConfigStore(),
    dataProvider:
      options.dataProvider ??
      new DemoDashboardDataProvider(weatherService, calendarService, sportsService, stocksService),
    photoPainter: options.photoPainter ?? new PhotoPainterClient(),
    weatherService,
    calendarService,
    sportsService,
    stocksService,
    previews: new PreviewCache()
  };
  await ensureMeteocons();
  await app.register(cors, { origin: true });

  registerCatalogRoutes(app, services);
  registerDashboardsRoutes(app, services);
  registerLookupsRoutes(app, services);
  registerGoogleRoutes(app, services);
  registerRenderingRoutes(app, services);

  return app;
}
