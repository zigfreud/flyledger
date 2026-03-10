import * as SQLite from 'expo-sqlite';

export async function initDatabase(db: SQLite.SQLiteDatabase) {
  // PRAGMA foreign_keys = ON is already ensured by database.ts, but we keep the structure clear.

  // NOTE: In a production V1, adding CHECK constraints to an SQLite DB that already
  // has rows might require a table recreation migration.
  // For this V1 local-first release, we declare STRICT CHECK constraints on table creation.

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Category (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS CaptureRecord (
      id TEXT PRIMARY KEY,
      capture_type TEXT NOT NULL CHECK (capture_type IN ('IMAGE', 'QR_CODE', 'MANUAL')),
      captured_at INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('captured', 'normalized', 'extracted', 'pending_review', 'validated', 'discarded', 'failed')),
      media_local_path TEXT DEFAULT NULL,
      raw_payload TEXT DEFAULT NULL,
      payload_format TEXT DEFAULT NULL,
      failure_reason TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS ProcessingSnapshot (
      id TEXT PRIMARY KEY,
      capture_record_id TEXT NOT NULL REFERENCES CaptureRecord(id) ON DELETE CASCADE,
      processed_at INTEGER NOT NULL,
      normalized_text TEXT DEFAULT NULL,
      suggested_date INTEGER DEFAULT NULL,
      suggested_date_confidence TEXT DEFAULT NULL CHECK (suggested_date_confidence IN ('HIGH', 'MEDIUM', 'LOW') OR suggested_date_confidence IS NULL),
      suggested_amount REAL DEFAULT NULL,
      suggested_amount_confidence TEXT DEFAULT NULL CHECK (suggested_amount_confidence IN ('HIGH', 'MEDIUM', 'LOW') OR suggested_amount_confidence IS NULL),
      suggested_merchant TEXT DEFAULT NULL,
      suggested_merchant_confidence TEXT DEFAULT NULL CHECK (suggested_merchant_confidence IN ('HIGH', 'MEDIUM', 'LOW') OR suggested_merchant_confidence IS NULL),
      warnings TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS Expense (
      id TEXT PRIMARY KEY,
      capture_record_id TEXT NOT NULL REFERENCES CaptureRecord(id) ON DELETE RESTRICT,
      category_id TEXT NOT NULL REFERENCES Category(id) ON DELETE RESTRICT,
      amount REAL NOT NULL CHECK (amount > 0),
      date INTEGER NOT NULL,
      merchant_name TEXT DEFAULT NULL,
      description TEXT DEFAULT NULL,
      retained_image_path TEXT DEFAULT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}
