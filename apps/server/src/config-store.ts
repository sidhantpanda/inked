import { createDefaultDashboard, parseDashboardConfig, type DashboardConfig } from '@inked/commons';

export interface DashboardSummary {
  id: string;
  name: string;
  layoutId: string;
  updatedAt: string;
  active: boolean;
}

/**
 * Stores any number of named dashboard compositions and tracks which one is
 * active. `get`/`set` operate on the active composition so existing callers
 * keep working, while `list`/`activate`/`remove` manage the full collection.
 */
export interface DashboardConfigStore {
  list(): Promise<DashboardSummary[]>;
  get(): Promise<DashboardConfig>;
  getById(id: string): Promise<DashboardConfig | null>;
  /** Upserts a composition and makes it the active one. */
  set(config: DashboardConfig): Promise<DashboardConfig>;
  activate(id: string): Promise<DashboardConfig>;
  remove(id: string): Promise<DashboardConfig>;
}

function toSummary(config: DashboardConfig, activeId: string): DashboardSummary {
  return {
    id: config.id,
    name: config.name,
    layoutId: config.layoutId,
    updatedAt: config.updatedAt,
    active: config.id === activeId
  };
}

export class MemoryDashboardConfigStore implements DashboardConfigStore {
  private readonly configs = new Map<string, DashboardConfig>();
  private activeId: string;

  constructor(seed = createDefaultDashboard()) {
    this.configs.set(seed.id, seed);
    this.activeId = seed.id;
  }

  async list(): Promise<DashboardSummary[]> {
    return [...this.configs.values()]
      .map((config) => toSummary(config, this.activeId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async get(): Promise<DashboardConfig> {
    return this.configs.get(this.activeId) ?? createDefaultDashboard();
  }

  async getById(id: string): Promise<DashboardConfig | null> {
    return this.configs.get(id) ?? null;
  }

  async set(config: DashboardConfig): Promise<DashboardConfig> {
    const saved = parseDashboardConfig({ ...config, updatedAt: new Date().toISOString() });
    this.configs.set(saved.id, saved);
    this.activeId = saved.id;
    return saved;
  }

  async activate(id: string): Promise<DashboardConfig> {
    const config = this.configs.get(id);
    if (!config) throw new Error(`Unknown dashboard: ${id}`);
    this.activeId = id;
    return config;
  }

  async remove(id: string): Promise<DashboardConfig> {
    if (!this.configs.has(id)) throw new Error(`Unknown dashboard: ${id}`);
    if (this.configs.size === 1) throw new Error('Cannot delete the only dashboard.');
    this.configs.delete(id);
    if (this.activeId === id) {
      this.activeId = [...this.configs.keys()][0]!;
    }
    return this.get();
  }
}
