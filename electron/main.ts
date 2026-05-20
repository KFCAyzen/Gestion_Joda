/**
 * Electron main process — Joda Company Desktop
 *
 * Architecture :
 *   - En dev   : pointe vers le serveur Next.js dev (http://localhost:3000)
 *   - En prod  : démarre le serveur Next.js standalone embarqué (port libre choisi
 *                automatiquement) puis ouvre la BrowserWindow dessus.
 *
 * Phase 1   : packaging desktop + lancement Next.js embarqué.
 * Phase 2+  : SQLite local + sync offline-first (cf. electron/offline/README.md).
 */
import { app, BrowserWindow, shell, Menu, dialog } from 'electron';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
// Les modules offline (./db, ./ipc, ./sync) sont importés en lazy require dans
// bootstrap() pour qu'un crash du module natif `better-sqlite3` ne tue pas le
// main process avant d'avoir loggué l'erreur.
type LocalDbModule = typeof import('./db');
type DbHandlersModule = typeof import('./ipc/db-handlers');
type SyncHandlersModule = typeof import('./ipc/sync-handlers');
type SyncEngineModule = typeof import('./sync/engine');

// File logger pour diagnostiquer les crashes en prod (Electron détache stdout).
// Écrit dans %APPDATA%\Joda Company\main.log avec appendFileSync pour garantir
// le flush avant que le process meure.
let logPath_: string | null = null;
function getLogPath(): string {
  if (logPath_) return logPath_;
  const logDir = app.getPath('userData');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  logPath_ = path.join(logDir, 'main.log');
  return logPath_;
}
function flog(level: 'log' | 'err' | 'warn', ...args: unknown[]) {
  try {
    const line = `[${new Date().toISOString()}] [${level}] ${args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n`;
    fs.appendFileSync(getLogPath(), line);
  } catch { /* ignore */ }
}
function initFileLogger() {
  try {
    // Reset le log à chaque démarrage
    fs.writeFileSync(getLogPath(), `[${new Date().toISOString()}] [boot] === main.log === pid=${process.pid} electron=${process.versions.electron} node=${process.versions.node}\n`);
    const origLog = console.log;
    const origErr = console.error;
    const origWarn = console.warn;
    console.log = (...args) => { flog('log', ...args); origLog(...args); };
    console.error = (...args) => { flog('err', ...args); origErr(...args); };
    console.warn = (...args) => { flog('warn', ...args); origWarn(...args); };
    process.on('uncaughtException', (e) => flog('err', 'uncaughtException', e));
    process.on('unhandledRejection', (r) => flog('err', 'unhandledRejection', r));
  } catch { /* ignore */ }
}

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_DEV_URL ?? 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let nextServer: ChildProcess | null = null;

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const addr = srv.address();
      if (typeof addr === 'object' && addr) {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        reject(new Error('Port allocation failed'));
      }
    });
  });
}

function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        // Tout code 2xx/3xx/4xx signifie que le serveur est joignable.
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`Next.js server unreachable on ${url} after ${timeoutMs}ms`));
        } else {
          setTimeout(tick, 250);
        }
      });
    };
    tick();
  });
}

async function startEmbeddedNext(): Promise<string> {
  // En production, electron-builder copie le dossier `.next/standalone` dans resources.
  // Le serveur démarre via `node server.js`.
  const standaloneDir = path.join(process.resourcesPath, 'app', '.next', 'standalone');
  const serverEntry = path.join(standaloneDir, 'server.js');

  if (!fs.existsSync(serverEntry)) {
    throw new Error(`server.js introuvable : ${serverEntry}. Build manquant ?`);
  }

  const port = await findFreePort();
  const url = `http://127.0.0.1:${port}`;

  // Charge .env.local pour les clés Supabase si présent à côté de l'app.
  // (l'utilisateur final installera ses clés via un fichier de config local)
  const envPath = path.join(process.resourcesPath, 'app', '.env.local');
  const env: Record<string, string | undefined> = {
    ...process.env,
    PORT: String(port),
    HOSTNAME: '127.0.0.1',
    NODE_ENV: 'production',
  };
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }

  // node intégré à Electron : on lance via `process.execPath` + ELECTRON_RUN_AS_NODE.
  const proc = spawn(process.execPath, [serverEntry], {
    cwd: standaloneDir,
    env: { ...env, ELECTRON_RUN_AS_NODE: '1' } as NodeJS.ProcessEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  nextServer = proc;

  proc.stdout?.on('data', (d) => console.log(`[next] ${d.toString().trimEnd()}`));
  proc.stderr?.on('data', (d) => console.error(`[next] ${d.toString().trimEnd()}`));
  proc.on('exit', (code) => {
    console.warn(`[next] server exited with code ${code}`);
    nextServer = null;
  });

  await waitForServer(url, 60_000);
  return url;
}

async function createMainWindow(targetUrl: string) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Joda Company',
    icon: path.join(__dirname, '..', 'electron', 'icons', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // requis pour préload qui utilise require()
    },
    show: false,
    backgroundColor: '#0a0a0a',
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  // Liens externes ouverts dans le navigateur système, pas une nouvelle BrowserWindow.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(targetUrl)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(targetUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function buildAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Fichier',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'forceReload', label: 'Forcer le rechargement' },
        { type: 'separator' },
        { role: 'quit', label: 'Quitter' },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'resetZoom', label: 'Zoom 100%' },
        { role: 'zoomIn', label: 'Zoom +' },
        { role: 'zoomOut', label: 'Zoom -' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos de Joda Company',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: 'À propos',
              message: 'Joda Company Desktop',
              detail: `Version : ${app.getVersion()}\nElectron : ${process.versions.electron}\nNode : ${process.versions.node}`,
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function loadEnvFromAppDir(): Record<string, string> {
  const candidates = isDev
    ? [path.join(__dirname, '..', '..', '.env.local'), path.join(process.cwd(), '.env.local')]
    : [
        path.join(process.resourcesPath, 'app', '.env.local'),
        path.join(app.getPath('userData'), '.env.local'),
      ];

  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    const env: Record<string, string> = {};
    const content = fs.readFileSync(c, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    console.log(`[main] env loaded from ${c}`);
    return env;
  }
  console.warn('[main] no .env.local found; offline sync disabled');
  return {};
}

let dbMod: LocalDbModule | null = null;
let syncEngineMod: SyncEngineModule | null = null;

async function bootstrap() {
  try {
    earlyLog('bootstrap() entered');

    // 1) DB locale + IPC handlers — lazy require pour capturer un crash du
    //    binding natif better-sqlite3 avec un message clair.
    try {
      earlyLog('loading ./db module…');
      dbMod = require('./db') as LocalDbModule;
      earlyLog('initLocalDb…');
      const { dbPath } = dbMod.initLocalDb();
      earlyLog(`SQLite OK at ${dbPath}`);

      const dbHandlers = require('./ipc/db-handlers') as DbHandlersModule;
      dbHandlers.registerDbHandlers();
      earlyLog('db handlers registered');
    } catch (e: any) {
      earlyLog(`✗ db init failed: ${e?.message}\n${e?.stack}`);
      // On continue sans la DB locale plutôt que de planter tout
    }

    // 2) Sync engine
    try {
      const envFromFile = loadEnvFromAppDir();
      const supabaseUrl = envFromFile.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = envFromFile.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey && dbMod) {
        syncEngineMod = require('./sync/engine') as SyncEngineModule;
        syncEngineMod.startSyncEngine(supabaseUrl, supabaseAnonKey);
        earlyLog('sync engine started');
      } else {
        earlyLog('Supabase keys missing or DB unavailable, sync engine not started');
      }
    } catch (e: any) {
      earlyLog(`✗ sync engine failed: ${e?.message}`);
    }

    // 3) Next.js server + fenêtre — fonctionnement DOIT marcher même si DB/sync KO
    earlyLog(`starting Next.js… (isDev=${isDev})`);
    const targetUrl = isDev ? DEV_URL : await startEmbeddedNext();
    earlyLog(`Next.js ready at ${targetUrl}`);
    buildAppMenu();
    await createMainWindow(targetUrl);
    earlyLog('main window created');

    // 4) Sync handlers une fois la fenêtre prête
    if (dbMod && syncEngineMod) {
      try {
        const syncHandlers = require('./ipc/sync-handlers') as SyncHandlersModule;
        syncHandlers.registerSyncHandlers(() => mainWindow);
        earlyLog('sync handlers registered');
      } catch (e: any) {
        earlyLog(`✗ sync handlers failed: ${e?.message}`);
      }
    }
  } catch (err: any) {
    earlyLog(`bootstrap fatal: ${err?.message}\n${err?.stack}`);
    console.error('[main] bootstrap failed:', err);
    dialog.showErrorBox('Joda Company - Erreur', err?.message ?? String(err));
    app.quit();
  }
}

// Logger immédiat — utilise os.tmpdir() qui marche toujours, avant tout le reste.
import { tmpdir } from 'node:os';
const earlyLogPath = path.join(tmpdir(), 'joda-electron-boot.log');
function earlyLog(msg: string) {
  try {
    fs.appendFileSync(earlyLogPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch { /* ignore */ }
}
try {
  fs.writeFileSync(earlyLogPath, `[${new Date().toISOString()}] [boot-top] entering main.js (pid=${process.pid}, electron=${process.versions.electron})\n`);
} catch (e: any) {
  // Tentative de fallback vers stderr
  process.stderr.write(`early log write failed: ${e?.message}\n`);
}

// Nom cohérent pour le dossier userData (%APPDATA%\Joda Company) au lieu du
// `name` du package.json (gestion_joda). Doit être appelé avant app.whenReady().
app.setName('Joda Company');

// Une seule instance autorisée.
earlyLog('about to requestSingleInstanceLock');
const gotLock = app.requestSingleInstanceLock();
earlyLog(`gotSingleInstanceLock=${gotLock}`);
if (!gotLock) {
  earlyLog('another instance running, quitting');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  earlyLog('registering app.whenReady()');
  app.whenReady().then(() => {
    earlyLog('whenReady fired');
    initFileLogger();
    earlyLog('logger initialized, entering bootstrap()');
    return bootstrap().catch((e) => earlyLog(`bootstrap promise rejected: ${e?.message}`));
  }).catch((e) => earlyLog(`whenReady rejected: ${e?.message}`));

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    try { syncEngineMod?.stopSyncEngine(); } catch {}
    try { dbMod?.closeLocalDb(); } catch {}
    if (nextServer && !nextServer.killed) {
      nextServer.kill();
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) bootstrap();
  });
}
