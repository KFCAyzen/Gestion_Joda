/**
 * Initialisation de la base SQLite locale.
 *
 * - Stockage : `app.getPath('userData')/joda-offline.db`
 * - WAL mode pour les écritures concurrentes
 * - Création / migration du schéma au démarrage
 *
 * Important : ce module ne doit s'importer QUE dans le main process Electron
 * (better-sqlite3 est natif et ne tourne pas dans le renderer).
 */
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let sqlite: Database.Database | null = null;
let db: BetterSQLite3Database<typeof schema> | null = null;

const SCHEMA_VERSION = 1;

function migrationsTableSql(): string {
  return `
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `;
}

/**
 * DDL inline (plus simple que drizzle-kit en mode embarqué dans Electron).
 * Si on évolue le schéma, incrémenter SCHEMA_VERSION et ajouter une migration.
 */
function v1Sql(): string {
  // Colonnes communes locales — ajoutées à chaque table métier.
  const localCols = `
    _local_dirty INTEGER DEFAULT 0,
    _local_deleted INTEGER DEFAULT 0,
    _last_synced_at INTEGER
  `;

  return `
    -- Tables métier (mirror Supabase)

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT, email TEXT, password_hash TEXT, role TEXT, name TEXT,
      must_change_password INTEGER, is_active INTEGER,
      telephone TEXT, contact_email TEXT,
      created_at TEXT, updated_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      nom TEXT, prenom TEXT, email TEXT, telephone TEXT,
      age INTEGER, sexe TEXT, niveau TEXT, filiere TEXT,
      langue TEXT, diplome_acquis TEXT,
      photo_url TEXT, passeport_numero TEXT, passeport_expiration TEXT, passeport_url TEXT,
      choix TEXT, user_id TEXT, created_by TEXT, nationalite TEXT,
      created_at TEXT, updated_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS universities (
      id TEXT PRIMARY KEY,
      nom TEXT, pays TEXT, ville TEXT, programme TEXT,
      niveau_etude TEXT, criteres_admission TEXT, logo_url TEXT,
      active INTEGER, code TEXT,
      created_at TEXT, updated_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      student_id TEXT, type TEXT, status TEXT, url TEXT,
      uploaded_at TEXT, validated_at TEXT, validated_by TEXT, rejection_reason TEXT,
      created_at TEXT, updated_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS dossier_bourses (
      id TEXT PRIMARY KEY,
      student_id TEXT, status TEXT, notes_internes TEXT,
      university_id TEXT, assigned_to TEXT,
      desired_program TEXT, study_level TEXT, language_level TEXT, scholarship_type TEXT,
      created_at TEXT, updated_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS dossier_history (
      id TEXT PRIMARY KEY,
      dossier_id TEXT, old_status TEXT, new_status TEXT,
      changed_by TEXT, notes TEXT,
      created_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      student_id TEXT, type TEXT, tranche INTEGER, montant REAL, status TEXT,
      date_limite TEXT, date_paiement TEXT, penalites REAL,
      facture_url TEXT, recu_url TEXT,
      validated_by TEXT, validated_at TEXT,
      initiated_by_student INTEGER, rejection_reason TEXT, rejected_at TEXT,
      created_at TEXT, updated_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS cours_langues (
      id TEXT PRIMARY KEY,
      student_id TEXT, langue TEXT, statut TEXT, inscrit_le TEXT,
      created_at TEXT, updated_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS entrees_comptables (
      id TEXT PRIMARY KEY,
      montant REAL, date TEXT, type TEXT, description TEXT,
      student_id TEXT, payment_id TEXT, created_by TEXT,
      created_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS sorties_comptables (
      id TEXT PRIMARY KEY,
      montant REAL, date TEXT, type TEXT, description TEXT,
      validated_by TEXT, validated_at TEXT, created_by TEXT,
      created_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT, type TEXT, titre TEXT, message TEXT,
      read INTEGER, metadata TEXT,
      created_at TEXT,
      ${localCols}
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      from_user_id TEXT, to_user_id TEXT, subject TEXT, content TEXT,
      read INTEGER, attachments TEXT, metadata TEXT,
      created_at TEXT,
      ${localCols}
    );

    -- Tables de sync

    CREATE TABLE IF NOT EXISTS mutations_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('insert','update','delete')),
      payload TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      last_attempt_at INTEGER,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','processing','failed','conflict'))
    );

    CREATE INDEX IF NOT EXISTS idx_mutations_status_created
      ON mutations_queue(status, created_at);

    CREATE TABLE IF NOT EXISTS sync_meta (
      table_name TEXT PRIMARY KEY,
      last_pull_at TEXT,
      last_pull_run_at INTEGER,
      last_push_run_at INTEGER,
      initial_pull_done INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      detected_at INTEGER NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      local_payload TEXT NOT NULL,
      server_payload TEXT NOT NULL,
      resolution TEXT DEFAULT 'pending' CHECK(resolution IN ('pending','kept_local','kept_server','merged')),
      resolved_at INTEGER,
      resolved_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_conflicts_pending
      ON sync_conflicts(resolution, detected_at);
  `;
}

function applyMigrations(db: Database.Database) {
  db.exec(migrationsTableSql());
  const row = db.prepare('SELECT MAX(version) AS v FROM _migrations').get() as { v: number | null };
  const current = row?.v ?? 0;

  if (current < 1) {
    db.transaction(() => {
      db.exec(v1Sql());
      db.prepare('INSERT INTO _migrations(version, applied_at) VALUES (?, ?)').run(1, Date.now());
    })();
    console.log('[db] migration v1 applied');
  }

  if (current === SCHEMA_VERSION) {
    console.log(`[db] schema v${current} up to date`);
  }
}

/**
 * Initialise (ou ré-ouvre) la base SQLite locale. Idempotent.
 */
export function initLocalDb(): { db: BetterSQLite3Database<typeof schema>; raw: Database.Database; dbPath: string } {
  if (db && sqlite) {
    return { db, raw: sqlite, dbPath: sqlite.name };
  }

  const userData = app.getPath('userData');
  if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });

  const dbPath = path.join(userData, 'joda-offline.db');
  console.log(`[db] opening ${dbPath}`);

  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');

  applyMigrations(sqlite);
  db = drizzle(sqlite, { schema });

  return { db, raw: sqlite, dbPath };
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) throw new Error('Database not initialized. Call initLocalDb() first.');
  return db;
}

export function getRawDb(): Database.Database {
  if (!sqlite) throw new Error('Database not initialized. Call initLocalDb() first.');
  return sqlite;
}

export function closeLocalDb() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
    console.log('[db] closed');
  }
}
