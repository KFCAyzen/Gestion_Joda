# Suite de tests fonctionnels — Gestion Joda

Tests E2E Playwright couvrant les 22 modules du document [`TESTS_FONCTIONNELS.md`](../TESTS_FONCTIONNELS.md).

## Prérequis

1. **Node.js 18+** et `npm`
2. **`.env.local`** à la racine avec :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (⚠️ obligatoire — sert à créer les comptes de test)
3. Base Supabase accessible avec **migrations à jour** (voir `migrations/`)

## Installation initiale

```powershell
npm install -D @playwright/test dotenv
npx playwright install chromium
```

## Lancer tous les tests

### Via le runner PowerShell (séquentiel, module par module)

```powershell
npm run test:all
# ou directement :
.\tests\run-all-tests.ps1
```

Options :
```powershell
.\tests\run-all-tests.ps1 -Headed              # voir le navigateur
.\tests\run-all-tests.ps1 -Module 7            # uniquement le module 7
.\tests\run-all-tests.ps1 -KeepData            # ne pas nettoyer la base après
.\tests\run-all-tests.ps1 -SkipWebServer       # si npm run dev tourne déjà
.\tests\run-all-tests.ps1 -StopOnFail          # arrêt au premier module en échec
.\tests\run-all-tests.ps1 -OpenReport          # ouvre le rapport HTML à la fin
```

### Via Playwright directement

```powershell
npm run test:e2e                  # tous les tests (sans découpage module)
npm run test:e2e:headed           # avec navigateur visible
npm run test:e2e:ui               # mode UI interactif
npm run test:e2e:report           # rapport HTML après exécution
```

### Lancer un seul fichier

```powershell
npx playwright test tests/e2e/01-auth.spec.ts
```

### Lancer un seul cas de test

```powershell
npx playwright test -g "TC-AUTH-001"
```

## Structure

```
tests/
├── e2e/                        # 22 fichiers .spec.ts (un par module)
│   ├── 01-auth.spec.ts
│   ├── 02-etudiants.spec.ts
│   └── ... 03 à 22
├── fixtures/
│   └── authenticated.ts        # Fixtures auth par rôle (admin/agent/supervisor/student)
├── helpers/
│   ├── supabase-admin.ts       # Client Supabase service_role
│   ├── seed.ts                 # Création / cleanup des données de test
│   └── auth-utils.ts           # Helpers login UI
├── global-setup.ts             # Crée les comptes + seed avant tous les tests
├── global-teardown.ts          # Nettoie la base après tous les tests
├── run-all-tests.ps1           # Runner PowerShell séquentiel
└── README.md                   # Ce fichier
```

## Comptes de test créés automatiquement

Le `global-setup` crée un compte par rôle (mot de passe commun : `TestJoda!2026`) :

| Rôle | Username | Email d'auth |
|------|----------|--------------|
| super_admin | `e2e_superadmin` | `e2e_super_admin@joda-tests.local` |
| admin | `e2e_admin` | `e2e_admin@joda-tests.local` |
| supervisor | `e2e_supervisor` | `e2e_supervisor@joda-tests.local` |
| agent | `e2e_agent` | `e2e_agent@joda-tests.local` |
| user | `e2e_user` | `e2e_user@joda-tests.local` |
| student | `e2e_student` | `e2e_student@students.joda.app` |

Toutes les données de test sont préfixées `e2e_` pour faciliter le nettoyage automatique.

## Rapports

Après une exécution :
- **HTML** : `tests/.report/index.html` (ouvre dans le navigateur)
- **JSON** : `tests/.report/results.json`
- **CSV** : `tests/.report/summary.csv` (synthèse module par module, runner PS uniquement)
- **Artefacts** (screenshots, traces, vidéos d'échecs) : `tests/.artifacts/`

## data-testid ajoutés à l'app

Voir [`TESTIDS.md`](./TESTIDS.md) pour la liste complète. Composants instrumentés :

- **LoginPage** : `login-identifier`, `login-password`, `login-submit`, `login-forgot-btn`, `forgot-input`, `forgot-submit`, `forgot-cancel`, `theme-toggle`, `lang-switcher`, `lang-option-{fr|en}`
- **AppShell** : `nav-{routeId}` (home/clients/reservations/dossiers/facturation/com/newsletter/chambres/cours_langues/comptabilite/users/activity_logs/fee_config/storage/performance), `btn-logout`, `btn-notifications`, `notif-badge`, `mobile-menu-toggle`, `page-title`
- **ConfirmDialog** : `confirm-dialog`, `confirm-title`, `confirm-description`, `confirm-yes`, `confirm-cancel`
- **Portail étudiant** : `portal-bell`, `portal-bell-badge`, `portal-theme-toggle`, `portal-logout`, `portal-tab-{dashboard|payments|documents|dossier|messaging}`

**Règle d'or** : lors d'un refactor UI, conserver ces `data-testid` ou mettre à jour `TESTIDS.md` + les `.spec.ts`.

## Limitations connues

- L'envoi réel d'emails/SMS n'est pas testé end-to-end (les routes API sont testées mais sans vérifier la réception). Pour aller plus loin, brancher MailHog/Mailpit local.
- Le PDF/Word généré n'est pas vérifié par OCR — seul le déclenchement du téléchargement est testé.
- Les boutons d'action CRUD spécifiques (ajouter étudiant, valider paiement, etc.) ne sont pas encore couverts par des testids — c'est l'extension naturelle de cette suite (voir section "À étendre" dans `TESTIDS.md`).

## Adapter / étendre

Pour ajouter un test :
1. Identifier le module concerné dans `TESTS_FONCTIONNELS.md`
2. Ouvrir le fichier `tests/e2e/XX-module.spec.ts`
3. Ajouter un `test('TC-XXX-NNN — …', async ({ adminPage|agentPage|studentPage }) => { … })`
4. Utiliser les fixtures `authenticated.ts` plutôt que de relogger manuellement
5. Préfixer toute donnée créée par `e2e_` pour le cleanup automatique
6. Privilégier `page.getByTestId('mon-id')` aux sélecteurs CSS / texte

Pour ajouter un testid sur un nouveau composant :
1. Ajouter `data-testid="xxx"` sur l'élément JSX
2. Documenter dans `TESTIDS.md`
3. Utiliser dans les tests
