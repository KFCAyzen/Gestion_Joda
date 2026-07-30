# Joda Company — Plateforme de gestion des bourses d'études en Chine

Application web de gestion d'agence spécialisée dans l'accompagnement d'étudiants pour l'obtention de bourses d'études en Chine.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript 5 |
| Styles | Tailwind CSS 4 + CSS custom |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (cookies SSR via `@supabase/ssr`) |
| UI Components | Shadcn/UI + Lucide React |
| État global | Zustand + TanStack Query |
| Animations | Framer Motion |

## Fonctionnalités

### Gestion des Étudiants
- Enregistrement des candidats avec informations complètes (passeport, niveau, filière)
- Gestion des photos et documents
- Suivi du choix (procédure seule / cours seuls / procédure + cours)

### Candidatures & Dossiers
- Suivi des statuts de candidature
- Workflow des dossiers de bourse (documents reçus → admission → visa)
- Historique complet des actions par dossier

### Universités Partenaires
- Base de données des universités chinoises partenaires
- Programmes et critères d'admission

### Paiements
- Tranches de paiement (100K → 500K → 1M → 1,39M FCFA)
- Cours Mandarin (121K FCFA) et Anglais (91K FCFA)
- Pénalités automatiques de retard
- Génération de reçus

### Comptabilité
- Entrées et sorties comptables
- Budgets par catégorie
- Export rapports

### Administration
- Gestion des rôles : `student`, `user`, `agent`, `admin`, `super_admin`
- Logs d'activités sensibles
- Monitoring du stockage Supabase
- Portail étudiant dédié

## Structure du projet

```
src/
├── proxy.ts                        # Middleware auth (protection routes)
└── app/
    ├── layout.tsx                  # Layout racine (polices, providers)
    ├── page.tsx                    # Redirect → /tableau-de-bord
    ├── providers.tsx               # QueryProvider + AuthProvider
    ├── globals.css
    ├── login/
    │   └── page.tsx                # Page de connexion
    ├── etudiant/
    │   └── page.tsx                # Portail étudiant
    ├── (app)/                      # Routes protégées (sidebar + header)
    │   ├── layout.tsx              # AppShell (navigation, notifications)
    │   ├── tableau-de-bord/
    │   ├── candidatures/
    │   ├── etudiants/
    │   ├── dossiers/
    │   ├── universites/
    │   ├── frais/
    │   ├── comptabilite/
    │   ├── utilisateurs/
    │   ├── logs-activites/
    │   ├── stockage/
    │   ├── performances/
    │   └── notifications/
    ├── components/                 # Composants réutilisables
    ├── context/
    │   └── AuthContext.tsx         # Auth Supabase + gestion rôles
    ├── services/
    │   └── database.ts             # Couche d'accès Supabase
    ├── types/
    │   └── joda.ts                 # Types métier (Student, Payment, etc.)
    └── api/                        # Routes API Next.js (service role)
        ├── create-user/
        ├── delete-user/
        ├── reset-password/
        └── forgot-password/
```

## Installation

```bash
npm install
```

Configurer les variables d'environnement :

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Authentification

- Les agents/admins se connectent avec leur **email** Supabase Auth
- Les étudiants se connectent avec leur **nom d'utilisateur** (converti en email `<username>@students.joda.app`)
- Le middleware `proxy.ts` protège toutes les routes — les non-authentifiés sont redirigés vers `/login`
- Les sessions sont gérées par cookies SSR (pas de localStorage pour l'auth)

## Licence

Ce projet est développé pour Joda Company — Tous droits réservés.
