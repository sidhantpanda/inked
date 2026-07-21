import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Opens the shared Inked SQLite database. A single connection is reused by the
 * dashboard store and the Google account store so both see the same data.
 */
export function openInkedDatabase(filePath: string): DatabaseSync {
  if (filePath !== ':memory:') mkdirSync(path.dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  // Wait for a busy database instead of failing instantly — a dev restart can
  // briefly overlap the previous process holding the file.
  db.exec('PRAGMA busy_timeout = 5000;');
  try {
    // WAL improves read/write concurrency. Switching mode needs an exclusive
    // lock; if another connection holds it, keep the existing mode.
    db.exec('PRAGMA journal_mode = WAL;');
  } catch {
    // Ignore: the database already has a usable journal mode.
  }
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}
