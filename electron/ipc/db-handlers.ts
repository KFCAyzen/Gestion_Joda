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
import { ALL_BUSINESS_TABLES, BusinessTable, deserializeRow } from '../db/schema';

/**
 * Filtre structuré transmis par le wrapper renderer. Préserve l'opérateur
 * (contrairement à l'ancien `where` plat qui ne supportait que l'égalité).
 */
type CmpOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is';
type Filter =
  | { op: CmpOp; column: string; value: unknown }
  | { op: 'in'; column: string; value: unknown[] }
  | { op: 'or'; clauses: Array<{ op: CmpOp; column: string; value: unknown }> };

type SelectArgs = {
  table: BusinessTable;
  filters?: Filter[];
  limit?: number;
  offset?: number;
  orderBy?: { column: string; direction?: 'asc' | 'desc' };
  /** Demande le nombre total de lignes (ignore limit/offset), façon `count: 'exact'`. */
  count?: boolean;
  /** `head: true` → ne ramène aucune ligne, juste le count. */
  head?: boolean;
};

type SelectResult = { rows: unknown[]; count: number | null };

const COLUMN_RE = /^[a-z_][a-z0-9_]*$/i;
function assertColumn(col: string): void {
  if (!COLUMN_RE.test(col)) throw new Error(`Nom de colonne invalide : ${col}`);
}

const SQL_OP: Record<CmpOp, string> = {
  eq: '=', neq: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=',
  like: 'LIKE', ilike: 'LIKE', is: 'IS',
};

/**
 * better-sqlite3 ne sait binder que number/string/bigint/buffer/null.
 * Les booléens (ex: `.eq('read', false)`, `.eq('active', true)`) doivent être
 * convertis en 0/1, sinon le bind jette une exception.
 */
function bindValue(v: unknown): unknown {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

/** Compile un filtre simple (non-OR) en fragment SQL + params. */
function compileCmp(f: { op: CmpOp; column: string; value: unknown }): { sql: string; params: unknown[] } {
  assertColumn(f.column);
  if (f.op === 'is' || (f.op === 'eq' && f.value === null)) {
    return { sql: `${f.column} IS ${f.value === null ? 'NULL' : '?'}`, params: f.value === null ? [] : [bindValue(f.value)] };
  }
  return { sql: `${f.column} ${SQL_OP[f.op]} ?`, params: [bindValue(f.value)] };
}

type InsertArgs = { table: BusinessTable; payload: Record<string, unknown> };
type UpdateArgs = { table: BusinessTable; id: string; patch: Record<string, unknown> };
type DeleteArgs = { table: BusinessTable; id: string };

function assertValidTable(name: string): asserts name is BusinessTable {
  if (!(ALL_BUSINESS_TABLES as readonly string[]).includes(name)) {
    throw new Error(`Table inconnue : ${name}`);
  }
}

/**
 * Construit la clause WHERE à partir des filtres structurés.
 * Tous les filtres sont AND'és entre eux ; un filtre `or` devient un groupe
 * `(a OR b OR …)`. `_local_deleted = 0` est toujours ajouté.
 */
function buildWhereClause(filters: Filter[] | undefined): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];

  for (const f of filters ?? []) {
    if (f.op === 'in') {
      assertColumn(f.column);
      const arr = f.value ?? [];
      if (arr.length === 0) {
        parts.push('0 = 1'); // IN () → toujours faux, comme PostgREST
      } else {
        parts.push(`${f.column} IN (${arr.map(() => '?').join(', ')})`);
        params.push(...arr.map(bindValue));
      }
    } else if (f.op === 'or') {
      const orParts: string[] = [];
      for (const c of f.clauses) {
        const { sql, params: p } = compileCmp(c);
        orParts.push(sql);
        params.push(...p);
      }
      if (orParts.length > 0) parts.push(`(${orParts.join(' OR ')})`);
    } else {
      const { sql, params: p } = compileCmp(f);
      parts.push(sql);
      params.push(...p);
    }
  }

  parts.push('_local_deleted = 0');
  return { sql: ' WHERE ' + parts.join(' AND '), params };
}

function enqueueMutation(table: BusinessTable, recordId: string, operation: 'insert' | 'update' | 'delete', payload: Record<string, unknown>) {
  const raw = getRawDb();
  raw.prepare(`
    INSERT INTO mutations_queue (created_at, table_name, record_id, operation, payload)
    VALUES (?, ?, ?, ?, ?)
  `).run(Date.now(), table, recordId, operation, JSON.stringify(payload));
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function handleSelect(args: SelectArgs): SelectResult {
  assertValidTable(args.table);
  const raw = getRawDb();
  const { sql: whereSql, params } = buildWhereClause(args.filters);

  // count: 'exact' → COUNT(*) sur le filtre complet, indépendant de limit/offset.
  let count: number | null = null;
  if (args.count || args.head) {
    const row = raw.prepare(`SELECT COUNT(*) AS n FROM ${args.table}${whereSql}`).get(...params) as { n: number };
    count = row.n;
  }

  // head: true → on ne ramène aucune ligne (juste le count).
  if (args.head) return { rows: [], count };

  let sql = `SELECT * FROM ${args.table}${whereSql}`;
  if (args.orderBy) {
    assertColumn(args.orderBy.column);
    const dir = args.orderBy.direction === 'desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY ${args.orderBy.column} ${dir}`;
  }
  if (args.limit != null) sql += ` LIMIT ${Number(args.limit)}`;
  if (args.offset != null) sql += ` OFFSET ${Number(args.offset)}`;

  const rows = raw.prepare(sql).all(...params) as Record<string, unknown>[];
  // Convertit booleans 0/1 → true/false et JSON strings → objets pour le renderer.
  return { rows: rows.map((r) => deserializeRow(args.table, r)), count };
}

function handleInsert({ table, payload }: InsertArgs): Record<string, unknown> {
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

  // Renvoie la ligne complète (façon Supabase `.insert().select().single()`),
  // pour que les champs renseignés par la DB (created_at, defaults…) soient présents.
  const row = raw.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Record<string, unknown>;
  return deserializeRow(table, row);
}

function handleUpdate({ table, id, patch }: UpdateArgs): Record<string, unknown> {
  assertValidTable(table);
  const raw = getRawDb();

  const now = new Date().toISOString();
  const fullPatch = { ...patch, updated_at: now, _local_dirty: 1 };

  const cols = Object.keys(fullPatch);

  const setSql = cols.map((c) => `${c} = ?`).join(', ');
  const values = cols.map((c) => {
    const v = (fullPatch as Record<string, unknown>)[c];
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v !== null && typeof v === 'object') return JSON.stringify(v);
    return v;
  });

  if (cols.length > 0) {
    raw.transaction(() => {
      const result = raw.prepare(`UPDATE ${table} SET ${setSql} WHERE id = ?`).run(...values, id);
      if (result.changes === 0) throw new Error(`${table}/${id} not found`);

      // On enqueue le patch complet + id pour que le push puisse réémettre l'UPDATE serveur
      enqueueMutation(table, id, 'update', { id, ...patch, updated_at: now });
    })();
  }

  // Renvoie la ligne complète mise à jour (façon Supabase `.update().select().single()`).
  const row = raw.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`${table}/${id} not found`);
  return deserializeRow(table, row);
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
