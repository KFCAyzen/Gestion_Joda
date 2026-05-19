# Phase 2 — Support offline-first

> **Statut** : Planification (non implémenté)
> **Phase 1 OK** : application desktop fonctionnelle, mais nécessite réseau pour fonctionner.

## Objectif

Permettre à l'application desktop de **continuer à fonctionner sans connexion Internet** :
- Consulter les étudiants, candidatures, dossiers, paiements vus récemment
- Créer / modifier des entités (avec mise en file de synchronisation)
- Resynchroniser automatiquement quand la connexion revient
- Gérer les conflits (last-write-wins, CRDT, ou résolution manuelle)

L'utilisateur a choisi **offline-first complet** : toutes les données critiques sont répliquées localement et la sync est bidirectionnelle.

## Architecture cible

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer (React + Next.js)                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TanStack Query hooks (use-students, use-payments…)  │   │
│  │              ↕ readQuery / writeQuery                │   │
│  │  Adapter offline (NEW)                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────┬─────────────────────────────┬─────────────┘
                  │                             │
                  ↓ IPC                         ↓ Supabase JS
┌────────────────────────────────┐  ┌──────────────────────────┐
│  Main process                  │  │  Supabase (cloud)        │
│  ┌──────────────────────────┐  │  │  - postgres tables       │
│  │  SQLite local            │←─┼──┼→ Realtime               │
│  │  (better-sqlite3)        │  │  │  - Auth                  │
│  │  - mirror tables         │  │  │  - Storage               │
│  │  - mutations_queue       │  │  │                          │
│  │  - sync_meta             │  │  └──────────────────────────┘
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │  SyncEngine              │  │
│  │  - pull (Supabase→SQLite)│  │
│  │  - push (queue→Supabase) │  │
│  │  - conflict resolution   │  │
│  │  - realtime subscriptions│  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

## Stack proposée

| Couche | Choix | Pourquoi |
|--------|-------|----------|
| Stockage local | **`better-sqlite3`** | Sync API, performances, fiable, mature |
| Migration schéma | **drizzle-orm** ou **kysely** | Schéma typé partagé avec le client |
| IPC main↔renderer | **electron `ipcRenderer.invoke`** | Promises, type-safe, async-ready |
| Sync engine | **Custom** (option A) ou **WatermelonDB**/**RxDB** (option B) | A : maîtrise totale ; B : sync prête à l'emploi |
| Resolution conflits | **Last-write-wins** + champ `updated_at` | Simple, suffisant pour ce domaine métier |
| Détection réseau | **`window.navigator.onLine`** + ping Supabase | Heartbeat toutes les 30s |

### Option A — Sync engine custom (recommandé pour Joda)

**Avantages** :
- Aucune dépendance lourde
- Adapté précisément aux 15 tables métier
- Logique de conflit simple (LWW sur `updated_at`)
- Pas besoin de réécrire tous les hooks TanStack

**Implémentation** :
- ~800 lignes de code dans `electron/offline/`
- Tables Supabase à mirror : `users`, `students`, `applications`, `dossier_bourses`, `payments`, `documents`, `universities`, `notifications`, `messages`, `entrees_comptables`, `sorties_comptables`, `cours_langues` (12 tables)
- Stratégie pull : `select * where updated_at > last_sync_at`
- Stratégie push : queue FIFO traitée séquentiellement quand online

### Option B — RxDB + Supabase replication plugin

**Avantages** :
- CRDT prêt à l'emploi
- Sync gérée par RxDB
- Réplication push/pull standardisée

**Inconvénients** :
- Réécrire tous les hooks TanStack pour utiliser les Collections RxDB
- Plus lourd (~150 KB minified)
- Setup réplicateur Supabase à maintenir

## Schéma SQLite local

```sql
-- Mirror des 12 tables Supabase (mêmes colonnes + 2 colonnes meta)
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT,
  -- ... toutes les colonnes du schéma Supabase
  _local_dirty INTEGER DEFAULT 0,    -- 1 si modifié localement, à pousser
  _local_deleted INTEGER DEFAULT 0,  -- soft delete pour sync
  _last_synced_at INTEGER             -- timestamp ms de la dernière sync OK
);
-- ... même pattern pour les 11 autres tables

-- Queue de mutations
CREATE TABLE mutations_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('insert', 'update', 'delete')),
  payload TEXT NOT NULL,             -- JSON serialisé
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'failed'))
);

-- Métadonnées sync
CREATE TABLE sync_meta (
  table_name TEXT PRIMARY KEY,
  last_pull_at INTEGER,              -- timestamp de la dernière pull réussie
  last_push_at INTEGER,
  cursor TEXT                        -- pour pagination
);
```

## API IPC (à exposer dans `preload.ts`)

```ts
window.jodaDesktop.db.select<Student[]>('students', { where: { nom: 'Doe' } });
window.jodaDesktop.db.insert<Student>('students', payload);
window.jodaDesktop.db.update<Student>('students', id, partialPayload);
window.jodaDesktop.db.delete('students', id);
window.jodaDesktop.sync.status();                  // { online, pendingCount, syncing }
window.jodaDesktop.sync.trigger();                 // force pull + push immédiatement
window.jodaDesktop.sync.subscribe(cb);             // notifié à chaque changement de statut
```

## Modifications nécessaires côté React

Refactor minimal : créer un wrapper autour de Supabase client qui essaie SQLite local d'abord :

```ts
// src/app/lib/supabase/client.ts (Phase 2)
export function createClient() {
  if (window.jodaDesktop?.isDesktop) {
    return createOfflineFirstClient(window.jodaDesktop.db);
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
```

Le `createOfflineFirstClient` expose la même API que `@supabase/supabase-js` mais redirige `select`, `insert`, `update`, `delete` vers SQLite (avec mise en queue pour push).

## Sync engine — flow type

### Démarrage de l'app
1. Vérifier que SQLite local existe et est à jour (migrations)
2. Charger l'auth Supabase (cache local des cookies si offline)
3. Lancer **pull complet** des 12 tables si premier lancement, sinon **incremental pull**
4. Démarrer le **realtime subscriber** sur chaque table (mises à jour push depuis Supabase)
5. Démarrer le **push worker** (toutes les 5s, traite la queue de mutations)
6. Émettre `sync:status` events pour l'UI

### Écriture utilisateur
1. Renderer appelle `db.insert/update/delete` via IPC
2. Main process : écrit dans SQLite + push dans `mutations_queue`
3. Renderer : invalide les hooks TanStack concernés → UI mise à jour immédiatement
4. Push worker (en arrière-plan) : envoie à Supabase au prochain tick

### Conflit (LWW)
1. Sur push : si Supabase retourne 409 ou `updated_at` plus récent côté serveur :
   - Comparer `updated_at` local vs serveur
   - Si serveur plus récent : drop la mutation locale, prendre la version serveur
   - Sinon : forcer l'upsert
2. Log dans une table `sync_conflicts` pour audit

## Indicateurs UI

À ajouter dans le header de l'app :

```
[●] En ligne        — réseau OK, tout est synchronisé
[●] Hors ligne      — pas de réseau, données locales utilisées
[●] Synchronisation — push/pull en cours
[●] 3 en attente    — mutations dans la queue, pas encore poussées
```

## Étapes de mise en œuvre

| # | Étape | Estim. |
|---|-------|--------|
| 1 | Setup `better-sqlite3` + native rebuild Electron | 1 j |
| 2 | Schéma SQLite + migrations + ORM (drizzle) | 1-2 j |
| 3 | IPC handlers (db.select/insert/update/delete) | 1 j |
| 4 | Wrapper offline-first du client Supabase | 1-2 j |
| 5 | Pull initial + incremental | 1 j |
| 6 | Push worker + queue mutations | 1 j |
| 7 | Realtime subscriber | 1 j |
| 8 | Conflict resolution (LWW) | 1 j |
| 9 | UI indicateurs (online/syncing/pending) | 0,5 j |
| 10 | Tests E2E offline (couper le réseau, refaire actions, reconnecter, valider sync) | 2 j |
| **Total** | | **~12 jours** |

## Risques connus

1. **`better-sqlite3` est natif** → requiert `@electron/rebuild` + Visual Studio Build Tools sur la machine de build. Désactiver `npmRebuild: false` dans `electron-builder.yml` quand on l'ajoutera.
2. **Conflits sync** : LWW est simple mais peut perdre des données. Pour les cas critiques (paiements), envisager un mode "merge interactif" qui demande à l'admin.
3. **Auth offline** : Supabase Auth nécessite réseau pour le refresh token. À mitigation : stocker un long-lived refresh token et garder une session "trustée" pendant 7 jours hors-ligne.
4. **Realtime + offline** : pendant l'offline, les events realtime sont perdus. Au retour, faire un pull complet ou incremental généreux (24h).
5. **Volume de données** : Supabase free tier = 500 MB. SQLite local peut grossir vite si on cache tous les documents/photos. → ne pas répliquer les `documents.url` (S3 files), juste les metadonnées.

## Décisions à prendre avant de commencer

- [ ] Option A (custom) ou B (RxDB) ?
- [ ] Quelles tables sont **critiques offline** ? (suggestion : students, applications, dossier_bourses, payments, notifications)
- [ ] Quelles sont juste **read-only cache** ? (universities, custom_categories, payment_config)
- [ ] Mode de conflit : LWW seul ou avec merge interactif sur certaines tables ?
- [ ] Durée maximale de fonctionnement offline tolérée ? (impacte la stratégie de refresh token Supabase Auth)
