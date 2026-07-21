import type { DatabaseSync } from 'node:sqlite';

/** A connected Google account and its OAuth tokens. */
export interface StoredGoogleAccount {
  id: string;
  email: string;
  refreshToken: string;
  accessToken: string;
  accessTokenExpiry: string;
  scope: string;
}

export interface GoogleAccountStore {
  list(): Promise<StoredGoogleAccount[]>;
  get(id: string): Promise<StoredGoogleAccount | null>;
  upsert(account: StoredGoogleAccount): Promise<void>;
  updateTokens(id: string, accessToken: string, accessTokenExpiry: string): Promise<void>;
  remove(id: string): Promise<void>;
}

interface GoogleAccountRow {
  id: string;
  email: string;
  refresh_token: string;
  access_token: string;
  access_token_expiry: string;
  scope: string;
}

function toAccount(row: GoogleAccountRow): StoredGoogleAccount {
  return {
    id: row.id,
    email: row.email,
    refreshToken: row.refresh_token,
    accessToken: row.access_token,
    accessTokenExpiry: row.access_token_expiry,
    scope: row.scope
  };
}

/** Stores connected Google accounts and their OAuth tokens in SQLite. */
export class SqliteGoogleAccountStore implements GoogleAccountStore {
  constructor(private readonly db: DatabaseSync) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS google_accounts (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        access_token TEXT NOT NULL DEFAULT '',
        access_token_expiry TEXT NOT NULL DEFAULT '',
        scope TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  async list(): Promise<StoredGoogleAccount[]> {
    const rows = this.db
      .prepare('SELECT * FROM google_accounts ORDER BY email')
      .all() as unknown as GoogleAccountRow[];
    return rows.map(toAccount);
  }

  async get(id: string): Promise<StoredGoogleAccount | null> {
    const row = this.db.prepare('SELECT * FROM google_accounts WHERE id = ?').get(id) as
      GoogleAccountRow | undefined;
    return row ? toAccount(row) : null;
  }

  async upsert(account: StoredGoogleAccount): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO google_accounts
           (id, email, refresh_token, access_token, access_token_expiry, scope, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           email = excluded.email,
           refresh_token = excluded.refresh_token,
           access_token = excluded.access_token,
           access_token_expiry = excluded.access_token_expiry,
           scope = excluded.scope,
           updated_at = datetime('now')`
      )
      .run(
        account.id,
        account.email,
        account.refreshToken,
        account.accessToken,
        account.accessTokenExpiry,
        account.scope
      );
  }

  async updateTokens(id: string, accessToken: string, accessTokenExpiry: string): Promise<void> {
    this.db
      .prepare(
        `UPDATE google_accounts
         SET access_token = ?, access_token_expiry = ?, updated_at = datetime('now')
         WHERE id = ?`
      )
      .run(accessToken, accessTokenExpiry, id);
  }

  async remove(id: string): Promise<void> {
    this.db.prepare('DELETE FROM google_accounts WHERE id = ?').run(id);
  }
}

/** In-memory account store for tests. */
export class MemoryGoogleAccountStore implements GoogleAccountStore {
  private readonly accounts = new Map<string, StoredGoogleAccount>();

  constructor(seed: StoredGoogleAccount[] = []) {
    for (const account of seed) this.accounts.set(account.id, account);
  }

  async list(): Promise<StoredGoogleAccount[]> {
    return [...this.accounts.values()].sort((a, b) => a.email.localeCompare(b.email));
  }

  async get(id: string): Promise<StoredGoogleAccount | null> {
    return this.accounts.get(id) ?? null;
  }

  async upsert(account: StoredGoogleAccount): Promise<void> {
    this.accounts.set(account.id, account);
  }

  async updateTokens(id: string, accessToken: string, accessTokenExpiry: string): Promise<void> {
    const account = this.accounts.get(id);
    if (account) this.accounts.set(id, { ...account, accessToken, accessTokenExpiry });
  }

  async remove(id: string): Promise<void> {
    this.accounts.delete(id);
  }
}
