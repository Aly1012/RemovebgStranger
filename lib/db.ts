import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'app.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!_db) {
    const fs = require('fs')
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    initSchema(_db)
  }
  return _db
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT,
      image       TEXT,
      plan        TEXT NOT NULL DEFAULT 'free',
      credits     INTEGER NOT NULL DEFAULT 0,
      plan_expires_at INTEGER,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    TEXT,
      ip         TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_ip   ON usage_logs(ip, created_at);

    CREATE TABLE IF NOT EXISTS payment_logs (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          TEXT NOT NULL,
      paypal_order_id  TEXT UNIQUE NOT NULL,
      type             TEXT NOT NULL DEFAULT 'credits',  -- 'credits' | 'subscription'
      credits          INTEGER,
      amount_usd       TEXT,
      payer_email      TEXT,
      created_at       INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_payment_user ON payment_logs(user_id, created_at);
  `)
}
