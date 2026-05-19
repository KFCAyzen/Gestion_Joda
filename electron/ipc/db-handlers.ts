/**
 * IPC handlers pour la base SQLite locale.
 *
 * Le renderer appelle ces handlers via `window.jodaDesktop.db.*` (cf. preload.ts).
 * Chaque handler :
 *   - lit/écrit dans SQLite local
 *   - enregistre une mutation dans `mutations_queue` (insert/update/delete)
 *   - retourne immédiatement (UI fluide, sync asynchrone en arrière-plan)
 */
import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import { getRawDb } from '../db';
import { ALL_BUSINESS_TABLES, BusinessTable } from '../db/schema';

type SelectArgs = {
  table: BusinessTable;
  where?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; direction?: 'asc' | 'desc' };
};

type InsertArgs = { table: BusinessTable; payload: Record<string, unknown> };
type UpdateArgs = { table: BusinessTable; id: string; patch: Record<string, unknown> };
type DeleteArgs = { table: BusinessTable; id: string };

function assertValidTable(name: string): asserts name is BusinessTable {
  if (!(ALL_BUSINESS_TABLES as readonly string[]).includes(name)) {
    throw new Error(`Table inconnue : ${name}`);
  }
}

function buildWhereClause(where: Record<string, unknown> | undefined): { sql: string; params: unknown[] } {
  if (!where || Object.keys(where).length === 0) {
    return { sql: '', params: [] };
  }
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(where)) {
    if (v === null) {
      parts.push(`${k} IS NULL`);
    } else if (Array.isArray(v)) {
      const placeholders = v.map(() => '?').join(', ');
      parts.push(`${k} IN (${placeholders})`);
      params.push(...v);
    } else {
      parts.push(`${k} = ?`);
      params.push(v);
    }
  }
  return { sql: ' WHERE ' + parts.join(' AND ') + ' AND _local_deleted = 0', params };
}

function enqueueMutation(table: BusinessTable, recordId: string, operation: 'insert' | 'update' | 'delete', payload: Record<string, unknown>) {
  const raw = getRawDb();
  raw.prepare(`
    INSERT INTO mutations_queue (created_at, table_name, record_id, operation, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(Date.now(), table, recordId, operation, JSON.stringify(payload));
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleSelect(args: SelectArgs): unknown[] {
  assertValidTable(args.table);
  const raw = getRawDb();
  const { sql: whereSql, params } = buildWhereClause(args.where);

  let sql = `SELECT * FROM ${args.table}`;
  // Si pas de where, on filtre quand même les soft-deleted
  sql += whereSql || ' WHERE _local_deleted = 0';

  if (args.orderBy) {
    const dir = args.orderBy.direction === 'desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${args.orderBy.column} ${dir}`;
  }
  if (args.limit) sql += ` LIMIT ${args.limit}`;
  if (args.offset) sql += ` OFFSET ${args.offset}`;

  return raw.prepare(sql).all(...params);
}

function handleInsert({ table, payload }: InsertArgs): { id: string } {
  assertValidTable(table);
  const raw = getRawDb();

  const id = (payload.id as string) ?? randomUUID();
  const now = new Date().toISOString();
  const fullPayload = {
    ...payload,
    id,
    created_at: payload.created_at ?? now,
    updated_at: payload.updated_at ?? now,
    _local_dirty: 1,
    _local_deleted: 0,
  };

  const cols = Object.keys(fullPayload);
  const placeholders = cols.map(() => '?').join(', ');
  const values = cols.map((c) => {
    const v = (fullPayload as Record<string, unknown>)[c];
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v !== null && typeof v === 'object') return JSON.stringify(v);
    return v;
  });

  raw.transaction(() => {
    raw.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...values);
    enqueueMutation(table, id, 'insert', fullPayload);
  })();

  return { id };
}

function handleUpdate({ table, id, patch }: UpdateArgs): { ok: true } {
  assertValidTable(table);
  const raw = getRawDb();

  const now = new Date().toISOString();
  const fullPatch = { ...patch, updated_at: now, _local_dirty: 1 };

  const cols = Object.keys(fullPatch);
  if (cols.length === 0) return { ok: true };

  const setSql = cols.map((c) => `${c} = ?`).join(', ');
  const values = cols.map((c) => {
    const v = (fullPatch as Record<string, unknown>)[c];
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v !== null && typeof v === 'object') return JSON.stringify(v);
    return v;
  });

  raw.transaction(() => {
    const result = raw.prepare(`UPDATE ${table} SET ${setSql} WHERE id = ?`).run(...values, id);
    if (result.changes === 0) throw new Error(`${table}/${id} not found`);

    // On enqueue le patch complet + id pour que le push puisse réémettre l'UPDATE serveur
    enqueueMutation(table, id, 'update', { id, ...patch, updated_at: now });
  })();

  return { ok: true };
}

function handleDelete({ table, id }: DeleteArgs): { ok: true } {
  assertValidTable(table);
  const raw = getRawDb();

  raw.transaction(() => {
    // Soft delete local
    const result = raw.prepare(`
      UPDATE ${table} SET _local_deleted = 1, _local_dirty = 1, updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);
    if (result.changes === 0) throw new Error(`${table}/${id} not found`);

    enqueueMutation(table, id, 'delete', { id });
  })();

  return { ok: true };
}

function handleRawSql({ sql, params }: { sql: string; params?: unknown[] }): unknown {
  // Pour les requêtes complexes (JOIN, agrégats). À utiliser avec parcimonie.
  // SECURITY : le main process fait confiance au renderer parce qu'on est en
  // single-user desktop ; pas d'exposition à l'extérieur.
  if (/INSERT|UPDATE|DELETE|DROP|ALTER|CREATE/i.test(sql)) {
    throw new Error('Seules les requêtes SELECT sont autorisées via db:raw');
  }
  const raw = getRawDb();
  return raw.prepare(sql).all(...(params ?? []));
}

// ─── Enregistrement ──────────────────────────────────────────────────────────

export function registerDbHandlers() {
  ipcMain.handle('db:select', (_event, args: SelectArgs) => handleSelect(args));
  ipcMain.handle('db:insert', (_event, args: InsertArgs) => handleInsert(args));
  ipcMain.handle('db:update', (_event, args: UpdateArgs) => handleUpdate(args));
  ipcMain.handle('db:delete', (_event, args: DeleteArgs) => handleDelete(args));
  ipcMain.handle('db:raw', (_event, args: { sql: string; params?: unknown[] }) => handleRawSql(args));

  ipcMain.handle('db:stats', () => {
    const raw = getRawDb();
    const stats: Record<string, number> = {};
    for (const t of ALL_BUSINESS_TABLES) {
      const r = raw.prepare(`SELECT COUNT(*) AS n FROM ${t} WHERE _local_deleted = 0`).get() as { n: number };
      stats[t] = r.n;
    }
    const pending = raw.prepare(`SELECT COUNT(*) AS n FROM mutations_queue WHERE status = 'pending'`).get() as { n: number };
    stats._pending_mutations = pending.n;
    return stats;
  });

  console.log('[ipc] db handlers registered');
}
