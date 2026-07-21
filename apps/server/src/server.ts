import 'dotenv/config';

import path from 'node:path';

import { buildApp } from './app.js';
import { SqliteDashboardConfigStore } from './sqlite-store.js';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const dbPath = process.env.INKED_DB_PATH ?? path.resolve('.data/inked.db');
const app = await buildApp({ logger: true, store: new SqliteDashboardConfigStore(dbPath) });

await app.listen({ port, host });
