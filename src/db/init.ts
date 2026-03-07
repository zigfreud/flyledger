import * as SQLite from 'expo-sqlite';

export async function initDB() {
    const db = SQLite.openDatabaseSync('gastos.db');

    // PRAGMA EXPLICIT OBRIGATÓRIO (Épico 1)
    db.execSync('PRAGMA foreign_keys = ON;');

    db.execSync(`
    CREATE TABLE IF NOT EXISTS Category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );
  `);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS CaptureRecord (
      id TEXT PRIMARY KEY,
      capture_type TEXT NOT NULL,
      captured_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      media_local_path TEXT DEFAULT NULL,
      raw_payload TEXT DEFAULT NULL,
      payload_format TEXT DEFAULT NULL,
      failure_reason TEXT DEFAULT NULL
    );
  `);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS ProcessingSnapshot (
      id TEXT PRIMARY KEY,
      capture_record_id TEXT NOT NULL REFERENCES CaptureRecord(id) ON DELETE CASCADE,
      processed_at INTEGER NOT NULL,
      normalized_text TEXT DEFAULT NULL,
      suggested_date INTEGER DEFAULT NULL,
      suggested_date_confidence TEXT DEFAULT NULL,
      suggested_amount REAL DEFAULT NULL,
      suggested_amount_confidence TEXT DEFAULT NULL,
      suggested_merchant TEXT DEFAULT NULL,
      suggested_merchant_confidence TEXT DEFAULT NULL,
      warnings TEXT DEFAULT NULL
    );
  `);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS Expense (
      id TEXT PRIMARY KEY,
      capture_record_id TEXT NOT NULL REFERENCES CaptureRecord(id) ON DELETE RESTRICT,
      category_id TEXT NOT NULL REFERENCES Category(id) ON DELETE RESTRICT,
      amount REAL NOT NULL,
      date INTEGER NOT NULL,
      merchant_name TEXT DEFAULT NULL,
      description TEXT DEFAULT NULL,
      retained_image_path TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

    return db;
}
