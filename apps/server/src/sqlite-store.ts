import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { createDefaultDashboard, parseDashboardConfig, type DashboardConfig } from '@inked/commons';

import type { DashboardConfigStore, DashboardSummary } from './config-store.js';

const ACTIVE_KEY = 'active_dashboard_id';

interface DashboardRow {
  id: string;
  data: string;
  updated_at: string;
}

/** Persists every dashboard composition and the active selection in SQLite. */
export class SqliteDashboardConfigStore implements DashboardConfigStore {
  private readonly db: DatabaseSync;

  constructor(filePath: string) {
    if (filePath !== ':memory:') mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dashboards (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    this.seedIfEmpty();
  }

  private seedIfEmpty(): void {
    const count = this.db.prepare('SELECT COUNT(*) AS n FROM dashboards').get() as { n: number };
    if (count.n > 0) return;
    const config = createDefaultDashboard();
    this.writeConfig(config);
    this.setActiveId(config.id);
  }

  private writeConfig(config: DashboardConfig): void {
    this.db
      .prepare(
        `INSERT INTO dashboards (id, data, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
      )
      .run(config.id, JSON.stringify(config), config.updatedAt);
  }

  private readConfig(id: string): DashboardConfig | null {
    const row = this.db.prepare('SELECT data FROM dashboards WHERE id = ?').get(id) as
      Pick<DashboardRow, 'data'> | undefined;
    return row ? parseDashboardConfig(JSON.parse(row.data)) : null;
  }

  private getActiveId(): string {
    const row = this.db.prepare('SELECT value FROM app_state WHERE key = ?').get(ACTIVE_KEY) as
      { value: string } | undefined;
    if (row) return row.value;
    const first = this.db.prepare('SELECT id FROM dashboards LIMIT 1').get() as
      { id: string } | undefined;
    return first?.id ?? '';
  }

  private setActiveId(id: string): void {
    this.db
      .prepare(
        `INSERT INTO app_state (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(ACTIVE_KEY, id);
  }

  async list(): Promise<DashboardSummary[]> {
    const activeId = this.getActiveId();
    const rows = this.db
      .prepare('SELECT id, data, updated_at FROM dashboards ORDER BY updated_at DESC')
      .all() as unknown as DashboardRow[];
    return rows.map((row) => {
      const config = parseDashboardConfig(JSON.parse(row.data));
      return {
        id: config.id,
        name: config.name,
        layoutId: config.layoutId,
        updatedAt: config.updatedAt,
        active: config.id === activeId
      };
    });
  }

  async get(): Promise<DashboardConfig> {
    return this.readConfig(this.getActiveId()) ?? createDefaultDashboard();
  }

  async getById(id: string): Promise<DashboardConfig | null> {
    return this.readConfig(id);
  }

  async set(config: DashboardConfig): Promise<DashboardConfig> {
    const saved = parseDashboardConfig({ ...config, updatedAt: new Date().toISOString() });
    this.writeConfig(saved);
    this.setActiveId(saved.id);
    return saved;
  }

  async activate(id: string): Promise<DashboardConfig> {
    const config = this.readConfig(id);
    if (!config) throw new Error(`Unknown dashboard: ${id}`);
    this.setActiveId(id);
    return config;
  }

  async remove(id: string): Promise<DashboardConfig> {
    if (!this.readConfig(id)) throw new Error(`Unknown dashboard: ${id}`);
    const count = this.db.prepare('SELECT COUNT(*) AS n FROM dashboards').get() as { n: number };
    if (count.n === 1) throw new Error('Cannot delete the only dashboard.');
    this.db.prepare('DELETE FROM dashboards WHERE id = ?').run(id);
    if (this.getActiveId() === id) {
      const next = this.db.prepare('SELECT id FROM dashboards LIMIT 1').get() as { id: string };
      this.setActiveId(next.id);
    }
    return this.get();
  }
}
