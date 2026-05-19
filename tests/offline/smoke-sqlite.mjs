/**
 * Smoke test SQLite isolé : crée la base, applique la migration, fait CRUD
 * et vérifie la queue de mutations + déserialization booléens/JSON.
 *
 * Lancé via `node tests/offline/smoke-sqlite.mjs`. Pas besoin d'Electron.
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'joda-smoke-'));
const dbPath = path.join(tmpDir, 'test.db');
console.log(`[smoke] db at ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Charge le DDL inline (copie du electron/db/index.ts v1Sql() simplifié pour les tables testées).
const ddl = `
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    nom TEXT, prenom TEXT, email TEXT,
    is_active INTEGER,
    metadata TEXT,
    created_at TEXT, updated_at TEXT,
    _local_dirty INTEGER DEFAULT 0,
    _local_deleted INTEGER DEFAULT 0,
    _last_synced_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS mutations_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending'
  );
`;
db.exec(ddl);
console.log('[smoke] schema v1 applied');

// Test 1 : INSERT + queue
const id = 'test-' + Date.now();
const now = new Date().toISOString();
const payload = {
  id, nom: 'Doe', prenom: 'John', email: 'john@test',
  is_active: 1, metadata: JSON.stringify({ source: 'smoke' }),
  created_at: now, updated_at: now,
  _local_dirty: 1, _local_deleted: 0,
};

db.transaction(() => {
  const cols = Object.keys(payload);
  const placeholders = cols.map(() => '?').join(', ');
  db.prepare(`INSERT INTO students (${cols.join(', ')}) VALUES (${placeholders})`).run(...Object.values(payload));
  db.prepare(`INSERT INTO mutations_queue (created_at, table_name, record_id, operation, payload) VALUES (?, ?, ?, ?, ?)`)
    .run(Date.now(), 'students', id, 'insert', JSON.stringify(payload));
})();
console.log('[smoke] insert + queue OK');

// Test 2 : SELECT et déserialization
const row = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
console.log('[smoke] raw row:', JSON.stringify(row));

// Simule la déserialization
const BOOLEAN_COLS = ['is_active'];
const JSON_COLS = ['metadata'];
const deserialize = (r) => {
  const out = { ...r };
  for (const c of BOOLEAN_COLS) if (out[c] === 0 || out[c] === 1) out[c] = out[c] === 1;
  for (const c of JSON_COLS) if (typeof out[c] === 'string') { try { out[c] = JSON.parse(out[c]); } catch {} }
  return out;
};
const ds = deserialize(row);
console.log('[smoke] deserialized:', JSON.stringify(ds));

if (ds.is_active !== true) throw new Error('FAIL: is_active should be boolean true');
if (typeof ds.metadata !== 'object' || ds.metadata.source !== 'smoke') throw new Error('FAIL: metadata should be object');
console.log('[smoke] booleans + JSON deserialization OK');

// Test 3 : UPDATE + queue
db.transaction(() => {
  db.prepare(`UPDATE students SET nom = ?, updated_at = ?, _local_dirty = 1 WHERE id = ?`).run('Smith', new Date().toISOString(), id);
  db.prepare(`INSERT INTO mutations_queue (created_at, table_name, record_id, operation, payload) VALUES (?, ?, ?, ?, ?)`)
    .run(Date.now(), 'students', id, 'update', JSON.stringify({ id, nom: 'Smith' }));
})();
const after = db.prepare('SELECT nom FROM students WHERE id = ?').get(id);
if (after.nom !== 'Smith') throw new Error('FAIL: update did not apply');
console.log('[smoke] update + queue OK');

// Test 4 : Soft DELETE
db.transaction(() => {
  db.prepare(`UPDATE students SET _local_deleted = 1, _local_dirty = 1 WHERE id = ?`).run(id);
  db.prepare(`INSERT INTO mutations_queue (created_at, table_name, record_id, operation, payload) VALUES (?, ?, ?, ?, ?)`)
    .run(Date.now(), 'students', id, 'delete', JSON.stringify({ id }));
})();
const visible = db.prepare('SELECT * FROM students WHERE id = ? AND _local_deleted = 0').get(id);
if (visible) throw new Error('FAIL: soft delete should hide the row');
console.log('[smoke] soft delete OK');

// Test 5 : queue contains 3 mutations
const queueCount = db.prepare('SELECT COUNT(*) AS n FROM mutations_queue WHERE record_id = ?').get(id).n;
if (queueCount !== 3) throw new Error(`FAIL: expected 3 mutations in queue, got ${queueCount}`);
console.log(`[smoke] mutations_queue has ${queueCount} entries OK`);

// Cleanup
db.close();
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('\n✅ Tous les tests SQLite passent.');
