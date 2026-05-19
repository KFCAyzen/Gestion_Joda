/**
 * Wrapper offline-first du client Supabase pour la version desktop.
 *
 * Quand `window.jodaDesktop` est présent (= on tourne dans Electron) :
 *   - Les SELECTs sont servis depuis SQLite local (instantané, fonctionne offline)
 *   - Les INSERTs/UPDATEs/DELETEs sont écrits dans SQLite + queue de sync
 *   - La sync bidirectionnelle Supabase est gérée en arrière-plan par le main process
 *
 * Quand le code tourne en navigateur (web), `window.jodaDesktop` est undefined
 * et on retourne le client Supabase normal. AUCUN refactor des hooks TanStack
 * existants n'est requis : ils utilisent toujours `createClient()` et obtiennent
 * automatiquement le bon backend.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type BusinessTable =
  | 'users' | 'students' | 'universities' | 'documents'
  | 'dossier_bourses' | 'dossier_history' | 'payments' | 'cours_langues'
  | 'entrees_comptables' | 'sorties_comptables' | 'notifications' | 'messages';

const OFFLINE_TABLES = new Set<BusinessTable>([
  'users', 'students', 'universities', 'documents',
  'dossier_bourses', 'dossier_history', 'payments', 'cours_langues',
  'entrees_comptables', 'sorties_comptables', 'notifications', 'messages',
]);

export type DesktopSyncStatus = {
  online: boolean;
  syncing: boolean;
  pendingMutations: number;
  pendingConflicts: number;
  lastPullAt: number | null;
  lastPushAt: number | null;
  lastError: string | null;
};

export interface DesktopApi {
  isDesktop: true;
  platform?: string;
  db: {
    select<T>(table: BusinessTable, opts?: { where?: Record<string, unknown>; limit?: number; offset?: number; orderBy?: { column: string; direction?: 'asc' | 'desc' } }): Promise<T[]>;
    insert<T>(table: BusinessTable, payload: Record<string, unknown>): Promise<T>;
    update(table: BusinessTable, id: string, patch: Record<string, unknown>): Promise<{ ok: true }>;
    delete(table: BusinessTable, id: string): Promise<{ ok: true }>;
    raw?<T>(sql: string, params?: unknown[]): Promise<T[]>;
    stats?(): Promise<Record<string, number>>;
  };
  sync: {
    status(): Promise<DesktopSyncStatus>;
    trigger(): Promise<DesktopSyncStatus>;
    listConflicts(): Promise<unknown[]>;
    resolveConflict(id: number, resolution: 'kept_local' | 'kept_server' | 'merged', mergedPayload?: Record<string, unknown>): Promise<DesktopSyncStatus>;
    setAuth(accessToken: string | null, refreshToken: string | null): Promise<{ ok: true }>;
    subscribe(cb: (status: DesktopSyncStatus) => void): () => void;
  };
}

declare global {
  interface Window {
    jodaDesktop?: DesktopApi;
  }
}

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && !!window.jodaDesktop;
}

/**
 * Crée un client Supabase qui :
 *   - en desktop : intercepte SELECT/INSERT/UPDATE/DELETE pour les tables
 *     offline-syncées et les redirige vers SQLite local
 *   - sinon : retourne le client Supabase classique
 *
 * Les opérations sur les tables NON-syncées (ex: storage, RPC) passent
 * directement à Supabase (qui peut échouer si offline).
 */
export function createOfflineFirstClient(url: string, anonKey: string): SupabaseClient {
  const real = createBrowserClient(url, anonKey);

  if (!isDesktop()) return real;

  return new Proxy(real, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table: string) => buildTableProxy(table, target);
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

// ─── Table proxy ─────────────────────────────────────────────────────────────

type QueryState = {
  table: string;
  filters: Array<{ op: string; column: string; value: unknown }>;
  orderBy: { column: string; direction: 'asc' | 'desc' } | null;
  limitN: number | null;
  offsetN: number | null;
  singleMode: 'none' | 'single' | 'maybeSingle';
};

function buildTableProxy(table: string, fallback: SupabaseClient): any {
  if (!OFFLINE_TABLES.has(table as BusinessTable)) {
    return fallback.from(table);
  }

  const state: QueryState = {
    table,
    filters: [],
    orderBy: null,
    limitN: null,
    offsetN: null,
    singleMode: 'none',
  };

  // L'action est mémorisée : on n'exécute qu'au .then()/.single()/.maybeSingle().
  // Ainsi `from(t).update(p).eq('id', x)` ou `from(t).delete().eq('id', x)`
  // fonctionnent comme avec Supabase JS officiel.
  let pendingAction: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  let pendingPayload: any = undefined;

  const exec = async () => {
    const api = window.jodaDesktop!;
    try {
      if (pendingAction === 'select') {
        const where = whereFromFilters(state.filters);
        const rows = await api.db.select<any>(state.table as BusinessTable, {
          where,
          limit: state.limitN ?? undefined,
          offset: state.offsetN ?? undefined,
          orderBy: state.orderBy ?? undefined,
        });
        return wrapResult(rows, state.singleMode);
      }
      if (pendingAction === 'insert' || pendingAction === 'upsert') {
        const items = Array.isArray(pendingPayload) ? pendingPayload : [pendingPayload];
        const inserted: any[] = [];
        for (const item of items) {
          const r = await api.db.insert<any>(state.table as BusinessTable, item);
          inserted.push({ ...item, id: r.id });
        }
        return wrapResult(inserted, state.singleMode);
      }
      if (pendingAction === 'update') {
        const where = whereFromFilters(state.filters);
        const id = where?.id as string | undefined;
        if (!id) return { data: null, error: { message: `update offline ${state.table} requiert .eq('id', ...)` } };
        await api.db.update(state.table as BusinessTable, id, pendingPayload);
        return wrapResult([{ id, ...pendingPayload }], state.singleMode);
      }
      if (pendingAction === 'delete') {
        const where = whereFromFilters(state.filters);
        const id = where?.id as string | undefined;
        if (!id) return { data: null, error: { message: `delete offline ${state.table} requiert .eq('id', ...)` } };
        await api.db.delete(state.table as BusinessTable, id);
        return wrapResult([], state.singleMode);
      }
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? String(e) } };
    }
  };

  const chain: any = {
    select(_cols?: string) { pendingAction = 'select'; return chain; },
    insert(payload: any) { pendingAction = 'insert'; pendingPayload = payload; return chain; },
    update(payload: any) { pendingAction = 'update'; pendingPayload = payload; return chain; },
    upsert(payload: any) { pendingAction = 'upsert'; pendingPayload = payload; return chain; },
    delete() { pendingAction = 'delete'; return chain; },
    eq(column: string, value: unknown) { state.filters.push({ op: 'eq', column, value }); return chain; },
    in(column: string, value: unknown[]) { state.filters.push({ op: 'in', column, value }); return chain; },
    is(column: string, value: unknown) { state.filters.push({ op: 'is', column, value }); return chain; },
    neq(column: string, value: unknown) { state.filters.push({ op: 'neq', column, value }); return chain; },
    gt(column: string, value: unknown) { state.filters.push({ op: 'gt', column, value }); return chain; },
    gte(column: string, value: unknown) { state.filters.push({ op: 'gte', column, value }); return chain; },
    lt(column: string, value: unknown) { state.filters.push({ op: 'lt', column, value }); return chain; },
    lte(column: string, value: unknown) { state.filters.push({ op: 'lte', column, value }); return chain; },
    order(column: string, opts?: { ascending?: boolean }) {
      state.orderBy = { column, direction: opts?.ascending === false ? 'desc' : 'asc' };
      return chain;
    },
    limit(n: number) { state.limitN = n; return chain; },
    range(from: number, to: number) { state.offsetN = from; state.limitN = to - from + 1; return chain; },
    single() { state.singleMode = 'single'; return exec(); },
    maybeSingle() { state.singleMode = 'maybeSingle'; return exec(); },
    then: (resolve: any, reject: any) => exec().then(resolve, reject),
  };

  return chain;
}

function whereFromFilters(filters: QueryState['filters']): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  for (const f of filters) {
    if (f.op === 'eq') where[f.column] = f.value;
    else if (f.op === 'in') where[f.column] = f.value;
    else if (f.op === 'is' && f.value === null) where[f.column] = null;
    // Les autres opérateurs (gt, lt, ...) ne sont pas supportés en offline pour l'instant.
    // → ils sont silencieusement ignorés (le caller verra des résultats potentiellement plus larges).
  }
  return where;
}

function wrapResult(rows: any[], mode: QueryState['singleMode']) {
  if (mode === 'single') {
    if (rows.length === 0) return { data: null, error: { message: 'No rows' } };
    return { data: rows[0], error: null };
  }
  if (mode === 'maybeSingle') {
    return { data: rows[0] ?? null, error: null };
  }
  return { data: rows, error: null };
}

