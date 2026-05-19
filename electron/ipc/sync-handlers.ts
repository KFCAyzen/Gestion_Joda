/**
 * IPC handlers pour le sync engine.
 * Le renderer peut :
 *   - Lire le statut de sync
 *   - Forcer un cycle immédiat
 *   - Lister les conflits en attente
 *   - Résoudre un conflit
 */
import { ipcMain, BrowserWindow } from 'electron';
import {
  computeStatus,
  forceSyncNow,
  resolveConflict,
  subscribeToStatus,
} from '../sync/engine';
import { getRawDb } from '../db';

export function registerSyncHandlers(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('sync:status', () => computeStatus());

  ipcMain.handle('sync:trigger', async () => {
    await forceSyncNow();
    return computeStatus();
  });

  ipcMain.handle('sync:list-conflicts', () => {
    const raw = getRawDb();
    return raw.prepare(`
      SELECT id, detected_at, table_name, record_id, local_payload, server_payload
      FROM sync_conflicts
      WHERE resolution = 'pending'
      ORDER BY detected_at DESC
    `).all();
  });

  ipcMain.handle('sync:resolve-conflict', async (
    _event,
    args: { id: number; resolution: 'kept_local' | 'kept_server' | 'merged'; mergedPayload?: Record<string, unknown> }
  ) => {
    await resolveConflict(args.id, args.resolution, args.mergedPayload);
    return computeStatus();
  });

  ipcMain.handle('sync:subscribe-status', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) subscribeToStatus(win);
    return true;
  });

  // Au démarrage de la première fenêtre, auto-subscribe
  const win = getMainWindow();
  if (win) subscribeToStatus(win);

  console.log('[ipc] sync handlers registered');
}
