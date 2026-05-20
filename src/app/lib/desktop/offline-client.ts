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

export type OfflineCmpOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is';
export type OfflineFilter =
  | { op: OfflineCmpOp; column: string; value: unknown }
  | { op: 'in'; column: string; value: unknown[] }
  | { op: 'or'; clauses: Array<{ op: OfflineCmpOp; column: string; value: unknown }> };

export type OfflineSelectOpts = {
  filters?: OfflineFilter[];
  limit?: number;
  offset?: number;
  orderBy?: { column: string; direction?: 'asc' | 'desc' };
  count?: boolean;
  head?: boolean;
};

export interface DesktopApi {
  isDesktop: true;
  platform?: string;
  db: {
    select<T>(table: BusinessTable, opts?: OfflineSelectOpts): Promise<{ rows: T[]; count: number | null }>;
    insert<T>(table: BusinessTable, payload: Record<string, unknown>): Promise<T>;
    update<T = Record<string, unknown>>(table: BusinessTable, id: string, patch: Record<string, unknown>): Promise<T>;
    updateWhere<T = Record<string, unknown>>(table: BusinessTable, filters: OfflineFilter[] | undefined, patch: Record<string, unknown>): Promise<T[]>;
    delete(table: BusinessTable, id: string): Promise<{ ok: true }>;
    deleteWhere(table: BusinessTable, filters: OfflineFilter[] | undefined): Promise<{ ok: true; count: number }>;
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
 * Clé interne permettant de récupérer le client Supabase brut (réseau direct)
 * caché derrière le proxy offline. Sert aux lectures qui DOIVENT venir du
 * serveur — typiquement le profil applicatif au login — alors que le cache
 * SQLite local est encore vide (1er login / install fraîche).
 */
const REAL_CLIENT = Symbol('jodaRealClient');

/**
 * Retourne le client Supabase qui parle directement au réseau, même sur desktop.
 *   - Web    : `client` est déjà le vrai client → renvoyé tel quel.
 *   - Desktop : renvoie le client brut encapsulé par le proxy offline.
 * On réutilise l'instance existante (pas de second `createBrowserClient`) pour
 * éviter le warning « Multiple GoTrueClient instances » et partager la session.
 */
export function getDirectClient(client: SupabaseClient): SupabaseClient {
  const real = (client as unknown as Record<symbol, SupabaseClient>)[REAL_CLIENT];
  return real ?? client;
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
      if (prop === REAL_CLIENT) return target;
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
  filters: OfflineFilter[];
  orderBy: { column: string; direction: 'asc' | 'desc' } | null;
  limitN: number | null;
  offsetN: number | null;
  singleMode: 'none' | 'single' | 'maybeSingle';
  countMode: boolean;
  headMode: boolean;
  selectStr: string;
};

/** Déduit la colonne FK locale pour une relation embarquée (students→student_id). */
function singularFk(relation: string): string {
  let base = relation;
  if (/ies$/.test(base)) base = base.replace(/ies$/, 'y');
  else if (/s$/.test(base)) base = base.replace(/s$/, '');
  return base + '_id';
}

/**
 * Résout les jointures embarquées Supabase de 1er niveau (`select('*, students(nom)')`)
 * en chargeant la table liée depuis SQLite et en l'attachant sur chaque ligne.
 * Gère la relation to-one parent→enfant via la FK `<singulier>_id`.
 */
async function resolveEmbeds(rows: any[], selectStr: string, api: DesktopApi): Promise<any[]> {
  if (!selectStr || !selectStr.includes('(') || rows.length === 0) return rows;
  const embedRe = /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^()]*)\)/g;
  let m: RegExpExecArray | null;
  const relations: string[] = [];
  while ((m = embedRe.exec(selectStr))) relations.push(m[1]);

  for (const rel of relations) {
    if (!OFFLINE_TABLES.has(rel as BusinessTable)) continue;
    const fk = singularFk(rel);
    if (rows[0][fk] === undefined) continue; // la FK n'est pas sur cette table
    const ids = [...new Set(rows.map((r) => r[fk]).filter((v) => v != null))];
    if (ids.length === 0) {
      for (const r of rows) r[rel] = null;
      continue;
    }
    const { rows: related } = await api.db.select<any>(rel as BusinessTable, {
      filters: [{ op: 'in', column: 'id', value: ids }],
    });
    const map = new Map<unknown, any>(related.map((r: any) => [r.id, r]));
    for (const r of rows) r[rel] = map.get(r[fk]) ?? null;
  }
  return rows;
}

const CMP_OPS = new Set<OfflineCmpOp>(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is']);

/**
 * Découpe une chaîne PostgREST `.or()` sur les virgules de premier niveau
 * (en respectant les parenthèses d'un éventuel `in.(...)`).
 */
function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(buf); buf = ''; }
    else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}

/** Parse `col.op.value,col.op.value` → clauses pour un groupe OR. */
function parseOrString(orStr: string): Array<{ op: OfflineCmpOp; column: string; value: unknown }> {
  const clauses: Array<{ op: OfflineCmpOp; column: string; value: unknown }> = [];
  for (const token of splitTopLevel(orStr)) {
    const i1 = token.indexOf('.');
    if (i1 < 0) continue;
    const column = token.slice(0, i1);
    const rest = token.slice(i1 + 1);
    const i2 = rest.indexOf('.');
    if (i2 < 0) continue;
    const rawOp = rest.slice(0, i2);
    let value: unknown = rest.slice(i2 + 1);
    const op: OfflineCmpOp = CMP_OPS.has(rawOp as OfflineCmpOp) ? (rawOp as OfflineCmpOp) : 'eq';
    if (op === 'is' && value === 'null') value = null;
    clauses.push({ op, column, value });
  }
  return clauses;
}

function idFromFilters(filters: OfflineFilter[]): string | undefined {
  for (const f of filters) {
    if (f.op === 'eq' && f.column === 'id') return f.value as string;
  }
  return undefined;
}

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
    countMode: false,
    headMode: false,
    selectStr: '*',
  };

  // L'action est mémorisée : on n'exécute qu'au .then()/.single()/.maybeSingle().
  // Ainsi `from(t).update(p).eq('id', x)` ou `from(t).delete().eq('id', x)`
  // fonctionnent comme avec Supabase JS officiel.
  let pendingAction: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  let pendingPayload: any = undefined;

  const wrap = (rows: any[], count: number | null = null) => {
    if (state.headMode) return { data: null, count, error: null };
    if (state.singleMode === 'single') {
      if (rows.length === 0) return { data: null, count, error: { message: 'No rows' } };
      return { data: rows[0], count, error: null };
    }
    if (state.singleMode === 'maybeSingle') {
      return { data: rows[0] ?? null, count, error: null };
    }
    return { data: rows, count, error: null };
  };

  const exec = async () => {
    const api = window.jodaDesktop!;
    try {
      if (pendingAction === 'select') {
        const { rows, count } = await api.db.select<any>(state.table as BusinessTable, {
          filters: state.filters,
          limit: state.limitN ?? undefined,
          offset: state.offsetN ?? undefined,
          orderBy: state.orderBy ?? undefined,
          count: state.countMode || state.headMode,
          head: state.headMode,
        });
        const resolved = state.headMode ? rows : await resolveEmbeds(rows, state.selectStr, api);
        return wrap(resolved, count);
      }
      if (pendingAction === 'insert' || pendingAction === 'upsert') {
        const items = Array.isArray(pendingPayload) ? pendingPayload : [pendingPayload];
        const inserted: any[] = [];
        for (const item of items) {
          // db.insert renvoie la ligne complète (created_at, defaults, id…).
          const row = await api.db.insert<any>(state.table as BusinessTable, item);
          inserted.push(row);
        }
        return wrap(inserted);
      }
      if (pendingAction === 'update') {
        const id = idFromFilters(state.filters);
        if (id) {
          // Chemin rapide : update par id unique.
          const row = await api.db.update<any>(state.table as BusinessTable, id, pendingPayload);
          return wrap([row]);
        }
        // Update en masse par filtre (mark-all-read, .in('id', …), .eq('user_id', …)…).
        const rows = await api.db.updateWhere<any>(state.table as BusinessTable, state.filters, pendingPayload);
        return wrap(rows);
      }
      if (pendingAction === 'delete') {
        const id = idFromFilters(state.filters);
        if (id) {
          await api.db.delete(state.table as BusinessTable, id);
          return wrap([]);
        }
        // Delete par filtre.
        await api.db.deleteWhere(state.table as BusinessTable, state.filters);
        return wrap([]);
      }
    } catch (e: any) {
      return { data: null, count: null, error: { message: e?.message ?? String(e) } };
    }
  };

  const pushCmp = (op: OfflineCmpOp, column: string, value: unknown) => {
    state.filters.push({ op, column, value });
    return chain;
  };

  const chain: any = {
    // `select()` ne réinitialise PAS l'action : `insert(p).select()` / `update(p).eq().select()`
    // doivent rester un insert/update (sinon la mutation était perdue). On capte juste
    // les options de count/head éventuelles.
    select(cols?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
      if (typeof cols === 'string' && cols.trim()) state.selectStr = cols;
      if (opts?.count) state.countMode = true;
      if (opts?.head) state.headMode = true;
      return chain;
    },
    insert(payload: any) { pendingAction = 'insert'; pendingPayload = payload; return chain; },
    update(payload: any) { pendingAction = 'update'; pendingPayload = payload; return chain; },
    upsert(payload: any) { pendingAction = 'upsert'; pendingPayload = payload; return chain; },
    delete() { pendingAction = 'delete'; return chain; },
    eq(column: string, value: unknown) { return pushCmp('eq', column, value); },
    neq(column: string, value: unknown) { return pushCmp('neq', column, value); },
    gt(column: string, value: unknown) { return pushCmp('gt', column, value); },
    gte(column: string, value: unknown) { return pushCmp('gte', column, value); },
    lt(column: string, value: unknown) { return pushCmp('lt', column, value); },
    lte(column: string, value: unknown) { return pushCmp('lte', column, value); },
    like(column: string, value: unknown) { return pushCmp('like', column, value); },
    ilike(column: string, value: unknown) { return pushCmp('ilike', column, value); },
    is(column: string, value: unknown) { return pushCmp('is', column, value); },
    in(column: string, value: unknown[]) { state.filters.push({ op: 'in', column, value }); return chain; },
    or(orStr: string) { state.filters.push({ op: 'or', clauses: parseOrString(orStr) }); return chain; },
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

