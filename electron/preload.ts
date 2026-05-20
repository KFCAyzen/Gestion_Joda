/**
 * Preload script — pont sécurisé entre main process et renderer.
 *
 * Expose `window.jodaDesktop` avec :
 *   - db       : SQLite local (select/insert/update/delete/raw/stats)
 *   - sync     : statut, déclenchement manuel, gestion conflits
 *   - on/off   : subscribe events IPC (sync:status changements)
 *
 * SECURITY : contextIsolation activé, nodeIntegration désactivé.
 * Le renderer ne peut PAS appeler require/process — seulement window.jodaDesktop.
 */
import { contextBridge, ipcRenderer } from 'electron';

type BusinessTable =
  | 'users' | 'students' | 'universities' | 'documents'
  | 'dossier_bourses' | 'dossier_history' | 'payments' | 'cours_langues'
  | 'entrees_comptables' | 'sorties_comptables' | 'notifications' | 'messages';

type CmpOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is';
type Filter =
  | { op: CmpOp; column: string; value: unknown }
  | { op: 'in'; column: string; value: unknown[] }
  | { op: 'or'; clauses: Array<{ op: CmpOp; column: string; value: unknown }> };
type SelectOptions = {
  filters?: Filter[];
  limit?: number;
  offset?: number;
  orderBy?: { column: string; direction?: 'asc' | 'desc' };
  count?: boolean;
  head?: boolean;
};
type SelectResult<T> = { rows: T[]; count: number | null };

const db = {
  select: <T = unknown>(table: BusinessTable, opts?: SelectOptions): Promise<SelectResult<T>> =>
    ipcRenderer.invoke('db:select', { table, ...opts }),

  insert: <T = Record<string, unknown>>(table: BusinessTable, payload: Record<string, unknown>): Promise<T> =>
    ipcRenderer.invoke('db:insert', { table, payload }),

  update: <T = Record<string, unknown>>(table: BusinessTable, id: string, patch: Record<string, unknown>): Promise<T> =>
    ipcRenderer.invoke('db:update', { table, id, patch }),

  updateWhere: <T = Record<string, unknown>>(table: BusinessTable, filters: Filter[] | undefined, patch: Record<string, unknown>): Promise<T[]> =>
    ipcRenderer.invoke('db:update-where', { table, filters, patch }),

  delete: (table: BusinessTable, id: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('db:delete', { table, id }),

  deleteWhere: (table: BusinessTable, filters: Filter[] | undefined): Promise<{ ok: true; count: number }> =>
    ipcRenderer.invoke('db:delete-where', { table, filters }),

  raw: <T = unknown>(sql: string, params?: unknown[]): Promise<T[]> =>
    ipcRenderer.invoke('db:raw', { sql, params }),

  stats: (): Promise<Record<string, number>> =>
    ipcRenderer.invoke('db:stats'),
};

const sync = {
  status: (): Promise<SyncStatusType> =>
    ipcRenderer.invoke('sync:status'),

  trigger: (): Promise<SyncStatusType> =>
    ipcRenderer.invoke('sync:trigger'),

  listConflicts: (): Promise<ConflictRow[]> =>
    ipcRenderer.invoke('sync:list-conflicts'),

  resolveConflict: (id: number, resolution: ConflictResolution, mergedPayload?: Record<string, unknown>): Promise<SyncStatusType> =>
    ipcRenderer.invoke('sync:resolve-conflict', { id, resolution, mergedPayload }),

  /**
   * Transmet l'access/refresh token au main process pour que le sync engine
   * puisse accéder aux tables RLS-protégées. À appeler depuis AuthContext sur
   * SIGNED_IN, TOKEN_REFRESHED et SIGNED_OUT (avec null).
   */
  setAuth: (accessToken: string | null, refreshToken: string | null): Promise<{ ok: true }> =>
    ipcRenderer.invoke('sync:set-auth', { accessToken, refreshToken }),

  subscribe: (callback: (status: SyncStatusType) => void): (() => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, status: SyncStatusType) => callback(status);
    ipcRenderer.on('sync:status', wrapped);
    void ipcRenderer.invoke('sync:subscribe-status');
    return () => ipcRenderer.removeListener('sync:status', wrapped);
  },
};

export type SyncStatusType = {
  online: boolean;
  syncing: boolean;
  pendingMutations: number;
  pendingConflicts: number;
  lastPullAt: number | null;
  lastPushAt: number | null;
  lastError: string | null;
};

export type ConflictResolution = 'kept_local' | 'kept_server' | 'merged';

export type ConflictRow = {
  id: number;
  detected_at: number;
  table_name: BusinessTable;
  record_id: string;
  local_payload: string;
  server_payload: string;
};

const jodaDesktop = {
  platform: process.platform,
  isDesktop: true as const,
  db,
  sync,
};

contextBridge.exposeInMainWorld('jodaDesktop', jodaDesktop);

export type JodaDesktopApi = typeof jodaDesktop;
