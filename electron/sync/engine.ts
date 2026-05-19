/**
 * Sync engine — pull/push bidirectionnel avec Supabase.
 *
 * Stratégie :
 *   - Pull (initial)       : au démarrage, télécharge tout (paginé) pour chaque table
 *   - Pull (incremental)   : toutes les 60s + sur demande, WHERE timestamp > last_pull_at
 *   - Push                 : toutes les 5s, traite la queue FIFO de mutations
 *   - Conflit (LWW)        : compare updated_at local vs serveur
 *   - Conflit (interactif) : payments → on stocke dans sync_conflicts pour résolution UI
 *
 * Émet des events IPC `sync:status` à chaque changement d'état.
 */
import { BrowserWindow } from 'electron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getRawDb } from '../db';
import {
  ALL_BUSINESS_TABLES,
  BusinessTable,
  TIMESTAMP_FIELD,
  INTERACTIVE_MERGE_TABLES,
} from '../db/schema';

const PULL_INTERVAL_MS = 60_000;
const PUSH_INTERVAL_MS = 5_000;
const PAGE_SIZE = 500;
const RETRY_BACKOFF_MS = [1_000, 5_000, 30_000, 120_000];

export type SyncStatus = {
  online: boolean;
  syncing: boolean;
  pendingMutations: number;
  pendingConflicts: number;
  lastPullAt: number | null;
  lastPushAt: number | null;
  lastError: string | null;
};

let sb: SupabaseClient | null = null;
let pullTimer: NodeJS.Timeout | null = null;
let pushTimer: NodeJS.Timeout | null = null;
let isSyncing = false;
let online = false;
let lastError: string | null = null;
const subscribers = new Set<BrowserWindow>();

function emitStatus() {
  const status = computeStatus();
  for (const win of subscribers) {
    if (!win.isDestroyed()) win.webContents.send('sync:status', status);
  }
}

export function computeStatus(): SyncStatus {
  const raw = getRawDb();
  const pending = (raw.prepare(`SELECT COUNT(*) AS n FROM mutations_queue WHERE status IN ('pending', 'failed')`).get() as { n: number }).n;
  const conflicts = (raw.prepare(`SELECT COUNT(*) AS n FROM sync_conflicts WHERE resolution = 'pending'`).get() as { n: number }).n;
  const lastPullRow = raw.prepare(`SELECT MAX(last_pull_run_at) AS t FROM sync_meta`).get() as { t: number | null };
  const lastPushRow = raw.prepare(`SELECT MAX(last_push_run_at) AS t FROM sync_meta`).get() as { t: number | null };

  return {
    online,
    syncing: isSyncing,
    pendingMutations: pending,
    pendingConflicts: conflicts,
    lastPullAt: lastPullRow.t,
    lastPushAt: lastPushRow.t,
    lastError,
  };
}

export function subscribeToStatus(win: BrowserWindow) {
  subscribers.add(win);
  win.on('closed', () => subscribers.delete(win));
  // Emit current status immédiatement
  win.webContents.send('sync:status', computeStatus());
}

// ─── Online detection ─────────────────────────────────────────────────────────

async function pingSupabase(): Promise<boolean> {
  if (!sb) return false;
  try {
    // Endpoint REST très léger : la documentation OpenAPI
    const url = (sb as any).rest.url + '/?select=count&limit=1';
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return r.ok || r.status === 404; // 404 OK aussi, le serveur répond
  } catch {
    return false;
  }
}

async function refreshOnlineStatus() {
  const wasOnline = online;
  online = await pingSupabase();
  if (wasOnline !== online) {
    console.log(`[sync] connectivity changed: ${wasOnline} -> ${online}`);
    emitStatus();
  }
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

async function pullTable(table: BusinessTable): Promise<{ fetched: number }> {
  if (!sb || !online) return { fetched: 0 };

  const raw = getRawDb();
  const tsField = TIMESTAMP_FIELD[table];

  const metaRow = raw.prepare(`SELECT last_pull_at FROM sync_meta WHERE table_name = ?`).get(table) as { last_pull_at: string | null } | undefined;
  const since = metaRow?.last_pull_at;

  let fetched = 0;
  let cursor: string | null = since ?? null;
  let maxTs: string | null = since ?? null;

  while (true) {
    let query = sb.from(table).select('*').order(tsField, { ascending: true }).limit(PAGE_SIZE);
    if (cursor) query = query.gt(tsField, cursor);

    const { data, error } = await query;
    if (error) throw new Error(`pull ${table}: ${error.message}`);
    if (!data || data.length === 0) break;

    raw.transaction(() => {
      for (const row of data as Array<Record<string, unknown>>) {
        upsertLocal(table, row);
        const ts = row[tsField] as string | null;
        if (ts && (!maxTs || ts > maxTs)) maxTs = ts;
      }
    })();

    fetched += data.length;
    cursor = (data[data.length - 1] as Record<string, unknown>)[tsField] as string;
    if (data.length < PAGE_SIZE) break;
  }

  // Update sync_meta
  raw.prepare(`
    INSERT INTO sync_meta (table_name, last_pull_at, last_pull_run_at, initial_pull_done)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(table_name) DO UPDATE SET
      last_pull_at = COALESCE(excluded.last_pull_at, sync_meta.last_pull_at),
      last_pull_run_at = excluded.last_pull_run_at,
      initial_pull_done = 1
  `).run(table, maxTs, Date.now());

  return { fetched };
}

function upsertLocal(table: BusinessTable, row: Record<string, unknown>) {
  const raw = getRawDb();
  const id = row.id as string;
  if (!id) return;

  // Check if local row exists and is dirty (mutation locale en attente de push)
  const local = raw.prepare(`SELECT _local_dirty, updated_at FROM ${table} WHERE id = ?`).get(id) as
    | { _local_dirty: number; updated_at: string | null }
    | undefined;

  if (local?._local_dirty) {
    // On a une mutation locale en queue → ne pas écraser. Le push devra arbitrer.
    return;
  }

  const cols = Object.keys(row).filter((c) => !c.startsWith('_'));
  const values = cols.map((c) => {
    const v = row[c];
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (v !== null && typeof v === 'object') return JSON.stringify(v);
    return v;
  });

  const placeholders = cols.map(() => '?').join(', ');
  const updateClause = cols.map((c) => `${c} = excluded.${c}`).join(', ');

  raw.prepare(`
    INSERT INTO ${table} (${cols.join(', ')}, _local_dirty, _local_deleted, _last_synced_at)
    VALUES (${placeholders}, 0, 0, ?)
    ON CONFLICT(id) DO UPDATE SET
      ${updateClause},
      _last_synced_at = excluded._last_synced_at
  `).run(...values, Date.now());
}

export async function pullAll() {
  if (!sb) return;
  console.log('[sync] pull all tables…');
  for (const table of ALL_BUSINESS_TABLES) {
    try {
      const { fetched } = await pullTable(table);
      if (fetched > 0) console.log(`[sync] pull ${table}: +${fetched}`);
    } catch (e: any) {
      console.warn(`[sync] pull ${table} failed: ${e?.message}`);
      lastError = `pull ${table}: ${e?.message}`;
    }
  }
  emitStatus();
}

// ─── Push ─────────────────────────────────────────────────────────────────────

type Mutation = {
  id: number;
  table_name: BusinessTable;
  record_id: string;
  operation: 'insert' | 'update' | 'delete';
  payload: string;
  retry_count: number;
};

async function applyMutation(m: Mutation): Promise<{ done: boolean; conflict?: boolean; error?: string }> {
  if (!sb) return { done: false, error: 'No supabase client' };

  const payload = JSON.parse(m.payload) as Record<string, unknown>;
  // Strip local meta fields
  for (const k of Object.keys(payload)) {
    if (k.startsWith('_local_') || k.startsWith('_last_synced_')) delete payload[k];
  }

  try {
    if (m.operation === 'insert') {
      const { error } = await sb.from(m.table_name).upsert(payload);
      if (error) return { done: false, error: error.message };
    } else if (m.operation === 'update') {
      // Vérifier conflit : si le record serveur a un updated_at > local, c'est un conflit.
      const isInteractive = INTERACTIVE_MERGE_TABLES.includes(m.table_name);
      if (isInteractive) {
        const { data: serverRow } = await sb.from(m.table_name).select('*').eq('id', m.record_id).maybeSingle();
        if (serverRow && payload.updated_at && (serverRow as any).updated_at > payload.updated_at) {
          return { done: false, conflict: true, error: 'Server has newer version' };
        }
      }
      const { error } = await sb.from(m.table_name).update(payload).eq('id', m.record_id);
      if (error) return { done: false, error: error.message };
    } else if (m.operation === 'delete') {
      const { error } = await sb.from(m.table_name).delete().eq('id', m.record_id);
      if (error) return { done: false, error: error.message };
    }
    return { done: true };
  } catch (e: any) {
    return { done: false, error: e?.message ?? String(e) };
  }
}

async function pushOne(m: Mutation) {
  const raw = getRawDb();
  raw.prepare(`UPDATE mutations_queue SET status = 'processing', last_attempt_at = ? WHERE id = ?`).run(Date.now(), m.id);

  const result = await applyMutation(m);

  if (result.done) {
    raw.transaction(() => {
      raw.prepare(`DELETE FROM mutations_queue WHERE id = ?`).run(m.id);
      // Le record n'est plus dirty
      raw.prepare(`UPDATE ${m.table_name} SET _local_dirty = 0, _last_synced_at = ? WHERE id = ?`)
        .run(Date.now(), m.record_id);
    })();
    return;
  }

  if (result.conflict) {
    // Logger dans sync_conflicts pour résolution interactive
    const local = raw.prepare(`SELECT * FROM ${m.table_name} WHERE id = ?`).get(m.record_id);
    let server: unknown = null;
    if (sb) {
      const { data } = await sb.from(m.table_name).select('*').eq('id', m.record_id).maybeSingle();
      server = data;
    }
    raw.transaction(() => {
      raw.prepare(`
        INSERT INTO sync_conflicts (detected_at, table_name, record_id, local_payload, server_payload)
        VALUES (?, ?, ?, ?, ?)
      `).run(Date.now(), m.table_name, m.record_id, JSON.stringify(local), JSON.stringify(server));
      raw.prepare(`UPDATE mutations_queue SET status = 'conflict', last_error = ? WHERE id = ?`).run('Conflit serveur plus récent', m.id);
    })();
    lastError = `Conflit détecté sur ${m.table_name}/${m.record_id}`;
    return;
  }

  // Erreur réseau / autre : retry avec backoff
  const retry = m.retry_count + 1;
  const errMsg = result.error ?? 'unknown';
  raw.prepare(`UPDATE mutations_queue SET status = 'failed', retry_count = ?, last_error = ? WHERE id = ?`)
    .run(retry, errMsg, m.id);
  lastError = `push ${m.table_name}: ${errMsg}`;
}

async function pushPending() {
  if (!sb || !online) return;
  const raw = getRawDb();

  // Récupère les mutations qui peuvent être retentées (status pending OU failed avec backoff écoulé)
  const now = Date.now();
  const candidates = raw.prepare(`
    SELECT * FROM mutations_queue
    WHERE status = 'pending'
       OR (status = 'failed' AND retry_count < ? AND (last_attempt_at IS NULL OR ? - last_attempt_at > ?))
    ORDER BY created_at ASC
    LIMIT 50
  `).all(RETRY_BACKOFF_MS.length, now, RETRY_BACKOFF_MS[0]) as Mutation[];

  if (candidates.length === 0) return;

  for (const m of candidates) {
    if (m.retry_count > 0) {
      const wait = RETRY_BACKOFF_MS[Math.min(m.retry_count - 1, RETRY_BACKOFF_MS.length - 1)];
      if (m.retry_count > 0 && (now - (((m as any).last_attempt_at as number) || 0)) < wait) continue;
    }
    await pushOne(m);
  }

  raw.prepare(`UPDATE sync_meta SET last_push_run_at = ?`).run(Date.now());
  emitStatus();
}

// ─── Cycle principal ──────────────────────────────────────────────────────────

async function syncTick() {
  if (isSyncing) return;
  isSyncing = true;
  emitStatus();
  try {
    await refreshOnlineStatus();
    if (online) {
      await pushPending();
      await pullAll();
    }
  } catch (e: any) {
    console.error('[sync] tick error:', e?.message);
    lastError = e?.message ?? String(e);
  } finally {
    isSyncing = false;
    emitStatus();
  }
}

export function startSyncEngine(supabaseUrl: string, supabaseAnonKey: string) {
  sb = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('[sync] engine starting…');

  // Cycle initial dès maintenant
  void syncTick();

  pullTimer = setInterval(() => void syncTick(), PULL_INTERVAL_MS);
  pushTimer = setInterval(() => {
    if (online && !isSyncing) void pushPending();
  }, PUSH_INTERVAL_MS);
}

export function stopSyncEngine() {
  if (pullTimer) clearInterval(pullTimer);
  if (pushTimer) clearInterval(pushTimer);
  pullTimer = null;
  pushTimer = null;
  sb = null;
}

/**
 * Force un cycle sync immédiat (utilisé par l'UI via IPC `sync:trigger`).
 */
export async function forceSyncNow() {
  await syncTick();
}

/**
 * Résolution interactive d'un conflit (cas paiements).
 */
export async function resolveConflict(conflictId: number, resolution: 'kept_local' | 'kept_server' | 'merged', mergedPayload?: Record<string, unknown>) {
  const raw = getRawDb();
  const conflict = raw.prepare(`SELECT * FROM sync_conflicts WHERE id = ?`).get(conflictId) as
    | { table_name: BusinessTable; record_id: string; local_payload: string; server_payload: string }
    | undefined;
  if (!conflict) throw new Error(`Conflit ${conflictId} introuvable`);

  if (resolution === 'kept_server') {
    // Adopter la version serveur : update local + supprimer la mutation et le conflit
    const server = JSON.parse(conflict.server_payload);
    upsertLocal(conflict.table_name, server);
    raw.prepare(`DELETE FROM mutations_queue WHERE table_name = ? AND record_id = ?`).run(conflict.table_name, conflict.record_id);
  } else if (resolution === 'kept_local') {
    // Forcer le push de la version locale → re-mettre la mutation en pending
    raw.prepare(`UPDATE mutations_queue SET status = 'pending', retry_count = 0 WHERE table_name = ? AND record_id = ?`)
      .run(conflict.table_name, conflict.record_id);
  } else if (resolution === 'merged' && mergedPayload) {
    // Appliquer le merge en local + push
    upsertLocal(conflict.table_name, mergedPayload);
    raw.prepare(`UPDATE ${conflict.table_name} SET _local_dirty = 1 WHERE id = ?`).run(conflict.record_id);
    raw.prepare(`UPDATE mutations_queue SET status = 'pending', retry_count = 0, payload = ? WHERE table_name = ? AND record_id = ?`)
      .run(JSON.stringify(mergedPayload), conflict.table_name, conflict.record_id);
  }

  raw.prepare(`UPDATE sync_conflicts SET resolution = ?, resolved_at = ? WHERE id = ?`)
    .run(resolution, Date.now(), conflictId);

  emitStatus();
}
