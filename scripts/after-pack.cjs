/**
 * Hook electron-builder afterPack.
 *
 * electron-builder exclut systématiquement `node_modules` des extraResources,
 * ce qui empêche le serveur Next.js standalone de démarrer (server.js a besoin
 * de son propre node_modules). On copie donc le build standalone complet
 * manuellement, ici, juste après que l'app dir soit packagé et avant NSIS.
 *
 * Source : .next/standalone, .next/static, public
 * Dest   : <appOutDir>/resources/app/.next/standalone/...
 */
const fs = require('node:fs');
const path = require('node:path');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDir(s, d);
    } else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(s);
      try { fs.symlinkSync(link, d); } catch { fs.copyFileSync(s, d); }
      count++;
    } else {
      fs.copyFileSync(s, d);
      count++;
    }
  }
  return count;
}

exports.default = async function afterPack(context) {
  const projectRoot = path.resolve(__dirname, '..');
  const appResources = path.join(context.appOutDir, 'resources', 'app');
  const standaloneDest = path.join(appResources, '.next', 'standalone');

  console.log(`[afterPack] copie du build Next.js standalone → ${standaloneDest}`);

  // 1) standalone complet (inclut server.js + node_modules)
  const n1 = copyDir(path.join(projectRoot, '.next', 'standalone'), standaloneDest);
  // 2) static assets
  const n2 = copyDir(path.join(projectRoot, '.next', 'static'), path.join(standaloneDest, '.next', 'static'));
  // 3) public
  const n3 = copyDir(path.join(projectRoot, 'public'), path.join(standaloneDest, 'public'));

  console.log(`[afterPack] ✓ standalone=${n1} static=${n2} public=${n3} fichiers`);

  // Sanity check
  const nm = path.join(standaloneDest, 'node_modules');
  const serverJs = path.join(standaloneDest, 'server.js');
  if (!fs.existsSync(serverJs)) throw new Error(`[afterPack] server.js manquant : ${serverJs}`);
  if (!fs.existsSync(nm)) throw new Error(`[afterPack] node_modules standalone manquant : ${nm}`);
  console.log(`[afterPack] ✓ server.js + node_modules présents`);
};
