#!/usr/bin/env node
/**
 * Recompile uniquement better-sqlite3 contre l'ABI Node d'Electron.
 *
 * @electron/rebuild par défaut scanne tout node_modules et essaie de rebuild
 * tous les modules natifs, incluant @parcel/watcher qui est une transitive de
 * Next.js inutilisée en runtime. Ça plante avec node-gyp si VS Build Tools
 * n'est pas trouvé.
 *
 * Solution : on appelle @electron/rebuild en mode `onlyModules` pour cibler
 * UNIQUEMENT better-sqlite3.
 */
import { rebuild } from '@electron/rebuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const electronPkg = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'node_modules', 'electron', 'package.json'), 'utf-8')
);

console.log(`[rebuild-native] Electron ${electronPkg.version} → better-sqlite3`);

try {
  await rebuild({
    buildPath: projectRoot,
    electronVersion: electronPkg.version,
    onlyModules: ['better-sqlite3'],
    force: true,
  });
  console.log('[rebuild-native] ✓ better-sqlite3 rebuilt successfully');
} catch (e) {
  console.error('[rebuild-native] ✗ rebuild failed:', e?.message ?? e);
  process.exit(1);
}
