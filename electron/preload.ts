/**
 * Preload script — exposé en contexte isolé.
 *
 * Aujourd'hui : expose juste quelques infos système (utile pour différencier
 * desktop vs web dans l'UI). Phase 2+ : exposer ici les API IPC pour
 * la base SQLite locale et le statut de sync offline.
 */
import { contextBridge, ipcRenderer } from 'electron';

const jodaApi = {
  platform: process.platform,
  appVersion: process.env.npm_package_version ?? null,
  isDesktop: true,

  /**
   * Liste les API IPC disponibles. Pour la Phase 2 :
   *   - db:query (lecture SQLite locale)
   *   - db:mutate (écriture + queue sync)
   *   - sync:status (online / offline / syncing / pending count)
   *   - sync:trigger (force une sync immédiate)
   */
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    const allowed = new Set(['sync:status', 'sync:error']);
    if (!allowed.has(channel)) return () => undefined;
    const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
};

contextBridge.exposeInMainWorld('jodaDesktop', jodaApi);

export type JodaDesktopApi = typeof jodaApi;
