import 'dotenv/config';

import path from 'node:path';

import { buildApp } from './app.js';
import { openInkedDatabase } from './db.js';
import { GoogleCalendarService } from './google-calendar.js';
import { SqliteGoogleAccountStore } from './google-store.js';
import { SqliteDashboardConfigStore } from './sqlite-store.js';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const dbPath = process.env.INKED_DB_PATH ?? path.resolve('.data/inked.db');
const db = openInkedDatabase(dbPath);

const calendarService = new GoogleCalendarService({
  clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? 'http://localhost:5173/api/google/callback',
  accounts: new SqliteGoogleAccountStore(db)
});

const app = await buildApp({
  logger: true,
  store: new SqliteDashboardConfigStore(db),
  calendarService
});

await app.listen({ port, host });
