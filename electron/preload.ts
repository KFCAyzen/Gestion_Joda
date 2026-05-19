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

type WhereClause = Record<string, unknown>;
type SelectOptions = {
  where?: WhereClause;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; direction?: 'asc' | 'desc' };
};

const db = {
  select: <T = unknown>(table: BusinessTable, opts?: SelectOptions): Promise<T[]> =>
    ipcRenderer.invoke('db:select', { table, ...opts }),

  insert: <T = { id: string }>(table: BusinessTable, payload: Record<string, unknown>): Promise<T> =>
    ipcRenderer.invoke('db:insert', { table, payload }),

  update: (table: BusinessTable, id: string, patch: Record<string, unknown>): Promise<{ ok: true }> =>
    ipcRenderer.invoke('db:update', { table, id, patch }),

  delete: (table: BusinessTable, id: string): Promise<{ ok: true }> =>
    ipcRenderer.invoke('db:delete', { table, id }),

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
