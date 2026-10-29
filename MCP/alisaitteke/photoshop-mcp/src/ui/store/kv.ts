import { getDB } from './db.js';

export function kvGet<T>(key: string): T | undefined {
  const row = getDB()
    .prepare<[string], { value: string }>('SELECT value FROM kv WHERE key = ?')
    .get(key);
  if (!row) return undefined;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return undefined;
  }
}

export function kvSet<T>(key: string, value: T): void {
  getDB()
    .prepare(
      `INSERT INTO kv (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, JSON.stringify(value));
}

export function kvDelete(key: string): void {
  getDB().prepare('DELETE FROM kv WHERE key = ?').run(key);
}
