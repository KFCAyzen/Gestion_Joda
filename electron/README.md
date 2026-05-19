# Joda Company Desktop (Electron)

Version native Windows de l'application Joda Company, construite avec Electron + Next.js standalone.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Joda Company.exe (Electron, ~217 MB)                   │
│  ├── Main process (dist-electron/main.js)               │
│  │     └── démarre le serveur Next.js sur port libre    │
│  ├── Renderer (BrowserWindow)                           │
│  │     └── loadURL(http://127.0.0.1:<port>)             │
│  └── resources/app/.next/standalone/                    │
│        └── server.js  +  node_modules tracés            │
└─────────────────────────────────────────────────────────┘
```

L'app embarque :
- **Le runtime Electron** (Chromium + Node.js)
- **Le build Next.js standalone** (avec `output: 'standalone'`)
- **Toutes les API routes** `/api/*` continuent de fonctionner localement
- **Les ressources publiques** (Logo.png, fonts, etc.)

## Prérequis pour builder

- Node.js 18+
- Windows 10/11 (build supporté nativement sur Windows ; possible aussi en cross-compile depuis macOS/Linux mais non testé)
- ~3 GB d'espace disque libre (cache npm + electron download + build)

## Configuration runtime

Le serveur Next.js embarqué lit `.env.local` depuis :

```
%ProgramFiles%\Joda Company\resources\app\.env.local
```

ou

```
%LOCALAPPDATA%\Programs\Joda Company\resources\app\.env.local
```

selon le mode d'installation choisi (per-machine vs per-user).

Variables requises :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (envoi email)
- `SMSVAS_USER` / `SMSVAS_PASS` / `SMS_SENDER_ID` (envoi SMS)

## Commandes

```bash
# Développement (utilise le serveur npm run dev en parallèle)
npm run dev                # terminal 1 : Next.js dev sur :3000
npm run electron:dev       # terminal 2 : Electron pointe sur :3000

# Build + lancement avec serveur standalone embarqué
npm run desktop:build      # 1) next build standalone  2) tsc main electron
npm run electron:start     # lance l'app sur le build standalone

# Installer Windows (NSIS)
npm run desktop:dist       # → release/Joda Company-Setup-X.Y.Z.exe (~100 MB)
npm run desktop:dist:dir   # même chose mais juste le dossier décompressé (debug)
```

## Sortie du build

```
release/
├── Joda Company-Setup-0.1.0.exe       # Installer NSIS, ~100 MB
├── Joda Company-Setup-0.1.0.exe.blockmap
└── win-unpacked/                      # Version décompressée (pour debug)
    ├── Joda Company.exe               # Le binaire principal
    ├── resources/
    │   ├── app.asar                   # Main process + preload bundlés
    │   └── app/
    │       ├── .env.local             # (à fournir manuellement)
    │       └── .next/standalone/      # Serveur Next.js complet
    └── locales/, *.dll, ...           # Runtime Chromium
```

## Pour distribuer

1. `npm run desktop:dist` — génère l'installer
2. **Copier `.env.local`** dans le dossier d'installation après installation (ou inclure une étape de config au premier lancement — Phase 2)
3. Double-cliquer sur l'installer pour installer

L'installer NSIS propose :
- Choix du dossier d'installation
- Raccourcis bureau + menu Démarrer
- Désinstalleur automatique (Programmes et fonctionnalités)
- Pas d'élévation admin requise (`perMachine: false`)

## Signature de code (à faire en prod)

L'app actuelle est **non signée**. Windows affichera "Éditeur inconnu" au premier lancement (SmartScreen).

Pour signer :
1. Acquérir un certificat EV (Extended Validation) ou OV chez DigiCert / Sectigo
2. Ajouter dans `electron-builder.yml` :
   ```yaml
   win:
     certificateFile: "C:\\path\\to\\cert.pfx"
     certificatePassword: "..."  # ou via env CSC_KEY_PASSWORD
   ```
3. Rebuild → installer + binaires signés → SmartScreen disparait

## Auto-update (à faire)

Non implémenté. Pour ajouter :
1. Configurer un serveur de release (S3, GitHub Releases, ou serveur HTTP custom)
2. Ajouter `publish:` dans `electron-builder.yml`
3. Utiliser `electron-updater` dans le main process
4. Tester avec une release "draft"

## Phase 2 — Support offline-first

Voir [`docs/PHASE2_OFFLINE.md`](../docs/PHASE2_OFFLINE.md) pour le plan détaillé.

**TL;DR** : ajout d'une base SQLite locale via `better-sqlite3`, refactor des hooks TanStack pour lire/écrire localement d'abord, sync bidirectionnelle avec Supabase via une couche custom (ou intégration RxDB / PowerSync).
