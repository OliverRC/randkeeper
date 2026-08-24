import { DatabaseSync } from 'node:sqlite'
import { DEFAULT_SETTINGS } from '~~/shared/domain'
import { mkdirSync } from 'node:fs'

let _db: DatabaseSync | undefined

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, number TEXT, balance REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT,
  amount REAL NOT NULL,
  groupId TEXT,
  categoryId TEXT,
  tranche TEXT NOT NULL DEFAULT 'none',
  wasteful INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  note TEXT,
  edited INTEGER NOT NULL DEFAULT 0,
  parentId TEXT,
  flagged INTEGER NOT NULL DEFAULT 0,
  linkedId TEXT
);
CREATE INDEX IF NOT EXISTS tx_date ON transactions(date);
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY, pattern TEXT NOT NULL UNIQUE, categoryId TEXT NOT NULL, tranche TEXT, wasteful INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS budgets (
  period TEXT NOT NULL, categoryId TEXT NOT NULL, amount REAL NOT NULL, PRIMARY KEY (period, categoryId)
);
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, target REAL NOT NULL, categoryId TEXT, startDate TEXT NOT NULL, manual REAL NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS splits (
  id INTEGER PRIMARY KEY, pattern TEXT NOT NULL UNIQUE, name TEXT NOT NULL, extraCategoryId TEXT NOT NULL DEFAULT 'shared-expenses'
);
CREATE TABLE IF NOT EXISTS split_lines (
  id INTEGER PRIMARY KEY, splitId INTEGER NOT NULL REFERENCES splits(id) ON DELETE CASCADE, label TEXT NOT NULL, categoryId TEXT NOT NULL, amount REAL NOT NULL, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS budget_notes (period TEXT PRIMARY KEY, note TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS otp (email TEXT PRIMARY KEY, code TEXT NOT NULL, expiresAt INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
`

export function db() {
  if (!_db) {
    mkdirSync('data', { recursive: true })
    // One database per bank provider so mock data never mixes with the real ledger.
    _db = new DatabaseSync(`data/wealth.${useRuntimeConfig().bankProvider || 'mock'}.db`)
    _db.exec('PRAGMA journal_mode = WAL')
    _db.exec(SCHEMA)
    // additive migrations
    try { _db.exec('ALTER TABLE transactions ADD COLUMN edited INTEGER NOT NULL DEFAULT 0') } catch {}
    try { _db.exec('ALTER TABLE transactions ADD COLUMN parentId TEXT') } catch {}
    try { _db.exec('ALTER TABLE transactions ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0') } catch {}
    try { _db.exec('ALTER TABLE transactions ADD COLUMN linkedId TEXT') } catch {}
  }
  return _db
}

export const all = <T = any>(sql: string, ...p: any[]) => db().prepare(sql).all(...p) as T[]
export const one = <T = any>(sql: string, ...p: any[]) => db().prepare(sql).get(...p) as T | undefined
export const run = (sql: string, ...p: any[]) => db().prepare(sql).run(...p)

export function getSettings(): Record<string, any> {
  const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings')
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)])) }
}
export function setSetting(key: string, value: unknown) {
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, JSON.stringify(value))
}
