# Handoff: Joda — Apps mobiles Agent & Admin

## Overview
Conception hi-fi de **deux applications mobiles** pour Joda Company, dans le **design system mobile existant** (`mobile/` — Expo / React Native, thème sombre glassmorphique crimson) :

1. **App Agent** (`Staff Mobile.html`) — l'agent/conseiller qui traite ses dossiers étudiants au quotidien.
2. **App Admin** (`Admin Mobile.html`) — le directeur d'agence qui pilote l'activité, les finances, l'équipe et l'administration.

Ces apps **étendent** l'app mobile actuelle (aujourd'hui côté **étudiant** : onglets Accueil / Parcours / Documents / Paiements / Messages). Elles réutilisent strictement les mêmes tokens et primitives UI.

> Les écrans mobiles ont été **alignés sur les fonctionnalités réelles de la version web** (`src/app/components/*`). Chaque écran admin reprend les métriques, statuts, types et actions du module web correspondant — voir la table de correspondance plus bas.

## About the Design Files
Les fichiers de ce bundle (`*.html`, `*.jsx`, `*.css`) sont des **références de design réalisées en HTML/React via Babel** — ils illustrent apparence, structure, navigation et comportement souhaités. **Ce n'est pas du code de production.**

La tâche : **recréer ces écrans dans `mobile/`** (Expo Router + React Native + les composants de `mobile/src/components/ui/*` et les tokens de `mobile/src/theme/tokens.ts`), branchés sur les vraies données Supabase / React Query déjà utilisées par la web app.

> ⚠️ Chaque app du prototype est rendue dans un **châssis de téléphone (phone frame)** centré et mis à l'échelle (`.stage`, `.phone`, `.notch`, `StatusBar`). C'est un échafaudage de présentation web — **à ignorer**. Sur mobile, le contenu remplit nativement l'écran (Expo `Stack`/`Tabs` + `SafeAreaView`).

## Fidelity
**High-fidelity.** Couleurs, typo, espacements, rayons, glass, dégradés crimson, anneaux, chips et barre d'onglets flottante sont définitifs et déjà tokenisés dans le DS. Reproduire fidèlement ; les valeurs sont dans la section *Design Tokens*.

---

## Design System (port mobile existant)

> Source de vérité : `mobile/src/theme/tokens.ts` et `mobile/src/components/ui/*`. Le prototype reproduit ce DS dans `staff.css` + `staff-ds.jsx`. **Utiliser les composants RN existants** plutôt que de réimplémenter.

### Couleurs (tokens)
| Rôle | Valeur |
|---|---|
| Fond app | `#100307` (deep `#0c0205`) + 3 halos radiaux crimson (`ScreenBackground`) |
| Crimson vif → profond | `#ff5a5f` → `#d11a2a` (dégradé primaire) · accent `#ef4444` |
| Rose (avatar agent) | `#fb7185` → `#e11d2a` · Bleu (avatar étudiant) `#60a5fa` → `#2563eb` |
| Mint (succès) | `#34d9a8` / lignes `rgba(52,217,168,.32)` |
| Amber (attention) | `#fbbf24` |
| Texte | `#fff`, `ink70/50/35` = `rgba(255,255,255,.70/.50/.35)` |
| Verre | fond `rgba(255,255,255,.055)`, bord `rgba(255,255,255,.12)` ; fort `.085` / `.18` |

### Formes & profondeur
- Rayons : cartes `22`, cartes fortes `30`, médium `16`, small `12`, pill `999`.
- Marge écran horizontale : `18px`.
- Ombres : carte `0 8px 16px rgba(0,0,0,.25)` ; bouton primaire `0 10px 15px rgba(239,68,68,.4)` ; barre d'onglets `0 18px 25px rgba(0,0,0,.5)`.
- Police : système (San Francisco / Roboto). Titres d'écran 25px/600, eyebrow 10.5px/700 uppercase tracking 1.6, cartes 14.5px/600.

### Primitives (mapping prototype → RN existant)
| Prototype (`staff-ds.jsx`) | Composant RN (`mobile/src/components/ui`) |
|---|---|
| `Icon` (SVG stroke 1.7–2) | `lucide-react-native` (les tracés du proto en sont dérivés) |
| `Avatar` (initiales, dégradé par rôle) | `Avatar.tsx` |
| `Chip` (live/done/due/ghost + role/purple) | `Chip.tsx` |
| `IconBox` (tons red/mint/amber/ghost/blue) | `IconBox.tsx` |
| `Ring` / `MiniRing` (arc dégradé crimson) | `Ring.tsx` |
| `PHeader` (eyebrow + titre + actions + back) | `ScreenHeader.tsx` |
| `BottomTabs` (flottante, blur, pill crimson actif, badges) | `BottomTabs.tsx` |
| glass card | `GlassCard.tsx` · fond `ScreenBackground.tsx` |
| boutons primaire/glass/mint/danger | `Button.tsx` (ajouter variantes si absentes) |

---

## App AGENT (`Staff Mobile.html`)

Barre d'onglets : **Accueil · Dossiers · Paiements · Messages · Profil** (+ écrans de détail empilés).

| Écran | Contenu | Module web source |
|---|---|---|
| **Accueil** | Activité du jour (anneau de progression), KPIs (dossiers actifs, encaissé, à valider), files paiements / rapports / dossiers récents | tableau-de-bord (vue agent) |
| **Dossiers** | Liste filtrable + recherche (À traiter / En revue / Complets) → **Fiche étudiant** | dossiers / ScholarshipFileManagement |
| **Fiche étudiant** | Parcours en 6 jalons, documents reçus/manquants, paiements (encaissé/restant), actions Message/Appeler | etudiants / DossierWorkflow |
| **Paiements** | File de validation, aperçu justificatif (sheet), Valider/Rejeter | frais / PaymentsPage |
| **Messages → Chat** | Conversations + chat avec composer | communication / ComPage |
| **Rapports** | Validation des rapports journaliers de l'équipe | rh (reports) / PublicReportPage |
| **Profil** | Identité, stats, accès validation, préférences, déconnexion | layout / compte |

Statuts paiement : `paye`, `attente`/`en_validation`, `retard`. Limite : 2 rapports / jour / employé.

---

## App ADMIN (`Admin Mobile.html`)

Navigation : **4 onglets** (Bord · Perfs · Compta · Plus) + un hub **Plus** vers tous les modules secondaires + écrans de détail empilés. Badge sur **Plus** = nombre de rapports RH en attente.

### Correspondance écran ↔ module web (1:1)
| Écran mobile | Composant web | Détails repris |
|---|---|---|
| **Tableau de bord** | `AdminOperationalDashboard.tsx` | Toggle Hier/Aujourd'hui/Semaine/Mois · **À traiter** (dossiers `document_manquant`,`en_attente`,`en_attente_universite`) · **Dossiers ouverts** (+N ce mois) · **Encaissé ce mois** (compact FCFA, +% vs M-1) · **Flux 7 jours** (barres candidatures/jour, aujourd'hui en rouge) · **Top 3 universités · semaine** · **Journal d'activité** groupé (MATIN/APRÈS-MIDI/SOIR) avec badges *À valider / Prêt à examiner / Admission / Visa* et entrées d'alerte rouges |
| **Performances** | `PerformanceHistory.tsx` | 3 vues **Par agent / Employés / Journalier** · période semaine/mois/trim./année · **score composite /100** (couleur ≥70 mint, ≥40 amber, sinon crimson) = Revenu 40% + Activité 25% + Rapidité 20% + Dossier 15% · médailles 🥇🥈🥉 · badges rôle (agent/superviseur/utilisateur) · répartition **bourse(violet)/mandarin(rose)/anglais(bleu)** count+montant · alertes *en validation / en attente / en retard* · vue Employés = indice RH (étoiles/5 + rapports + heures) · vue Journalier = cours(bleu)/procédures(mint)+total |
| **Comptabilité** | `LivreComptable.tsx` | Vues jour/sem/mois/trim./année · **solde** = entrées − sorties · entrées (vert, types Procédure/Cours/Divers) · sorties (rouge, catégories Loyer/Salaires/Fonctionnement/Matériels/Fournitures/Transports/Communication/Partenaires/Divers) · sorties **à valider** · filtre Tout/Entrées/Sorties |
| **Candidatures** | `ApplicationManagement.tsx` | Statuts `en_attente`/`document_recu`/`document_manquant`/`en_cours` · filtre À traiter/Toutes → fiche |
| **Étudiants** | `StudentManagement.tsx` | Liste + recherche → **fiche détaillée** (anneau dossier, 6 jalons, documents, paiements encaissé/restant) |
| **Dossiers** | `ScholarshipFileManagement.tsx` | Filtre par statut workflow (`document_manquant`,`en_attente_universite`,`visa_en_cours`,`admission_validee`) · progression étape /6 |
| **Frais** | `PaymentsPage.tsx` | Tranches par étudiant, statut payé/attente/retard, totaux encaissé/retard, pénalités |
| **Cours de langues** | `CoursLangues.tsx` | Onglets Mandarin/Anglais · inscrits actifs, revenu cumulé, inscriptions |
| **Messagerie → Chat** | `ComPage.tsx` | Conversations étudiants + chat |
| **Newsletter** | `NewsletterPage.tsx` | Composer push/e-mail, audiences, campagnes (Envoyée/Programmée + taux d'ouverture) |
| **Universités** | `UniversityManagement.tsx` | Partenaires par pays (drapeau), programmes, étudiants, actif/suspendu |
| **RH** | `HRManagement.tsx` | Stats (actifs / congés en attente / fiches de paie / rapports) · onglets **Employés** (matricule EMP-000N, poste, statut actif/suspendu/inactif, salaire) / **Congés** (types annuel/maladie/… approuver-refuser) / **Paie** (bulletins net) / **Rapports** (valider/signaler) / **Évaluations** (indice + étoiles/5) |
| **Utilisateurs** | `UserManagement.tsx` | Onglets **Comptes** (rôle, actif/inactif, PIN rapport, *doit changer MDP*, réinit MDP, activer/désactiver) / **Rôles & permissions** (par rôle) · rôles super_admin/admin/supervisor/agent/user |
| **Logs d'activités** | `ActivityLogsPage.tsx` | Flux typé avec pastilles colorées (create=mint, delete/reject=crimson, validate=vert, update=bleu, login=indigo, upload=teal, payment=violet, accounting=amber, config=gris) · badges rôle · groupé par jour · filtres |
| **Config. frais** | `FeeConfigManagement.tsx` | Par type de frais : montant, nombre de tranches, pénalité %, délai (jours) |
| **Stockage** | `StorageMonitoring.tsx` | Anneau % utilisé, répartition par bucket (documents/justificatifs/paie/autres), taille BDD |
| **Notifications** | `NotificationsPage.tsx` | Centre d'alertes groupé par jour, lu/non-lu, *Tout lire* |

### Accès par rôle (depuis `(app)/layout.tsx`)
Reproduire les sections de menu web et leurs restrictions de rôle :
- **Pilotage** : Tableau de bord (tous), Performances (supervisor+), Mes rapports (user/agent/supervisor)
- **Opérations** : Candidatures, Étudiants, Dossiers (permission-based)
- **Communication** (agent+) : Messagerie, Newsletter
- **Ressources** : Universités, Frais, Cours de langues
- **Finance** (agent/admin+) : Comptabilité
- **RH** (supervisor+) : RH
- **Administration** (admin+) : Utilisateurs, Logs, Config. frais
- **Système** (super_admin) : Stockage

Brancher les permissions via le hook `usePermissions` / `rolePermissions` existant. Le hub **Plus** du mobile doit masquer les modules non autorisés selon le rôle connecté (comme la sidebar web masque les sections).

---

## Interactions & State
- **Navigation** : onglets primaires (state) + pile de détail (Expo Router `Stack`). `back` revient au hub/onglet. Transitions : entrée de détail = slide-in (transform only), changement d'onglet = fade ; **état de base toujours visible** (pas d'`opacity:0` bloquant — voir `staff.css` `.scr-inner` + `prefers-reduced-motion`).
- **Actions optimistes** (prototype = state local ; prod = mutations React Query) : valider/rejeter paiement, valider/signaler rapport, approuver/refuser congé, activer/désactiver compte, régénérer PIN (→ `/api/hr/employees/:id/regenerate-pin`, envoi SMS/e-mail), marquer notifications lues.
- **Badges** dérivés en direct (rapports en attente, paiements à valider, messages non lus) — reproduire avec les compteurs React Query déjà présents dans `(app)/layout.tsx` (`menu-badges`, `unread-notifications`).
- **Toasts** de confirmation après action.
- **Formats** : montants `Intl.NumberFormat("fr-FR")` + « F »/« FCFA » ; compact `8,4M` / `250K` ; i18n via `next-intl`/équivalent mobile (FR par défaut).

## Données / API (prod)
Le prototype utilise des mocks. Brancher sur les tables/hooks Supabase déjà en place :
`dossier_bourses`, `payments` (status `paye`/`en_validation`/`attente`/`retard`, type `bourse`/`mandarin`/`anglais`/`inscription`), `students`, `users`, `employees`, `daily_reports`, `employee_evaluations`, `leave_requests`, `payslips`, `entrees_comptables` / `sorties_comptables`, `activity_logs`, `notifications`, `universities`. Hooks existants : `use-payments`, `use-students`, `use-users`, `use-hr`, `use-accounting`, `use-universities`, `use-applications`, `utils/activityLogger`, `lib/hrPerformance`.

## Files (bundle)
**App Agent** : `Staff Mobile.html` (entrée) · `staff-ds.jsx` (primitives + icônes, partagé) · `staff.css` (tokens + styles, partagé) · `staff-screens-a.jsx` · `staff-screens-b.jsx` · `staff-app.jsx`.
**App Admin** : `Admin Mobile.html` (entrée) · `admin.css` (graphiques/classements/journal/ledger en plus) · `admin-screens-a.jsx` (Bord/Perfs/Compta) · `admin-screens-b.jsx` (Plus + Utilisateurs/RH/Candidatures/Logs/Messagerie/Newsletter/Universités) · `admin-screens-c.jsx` (Étudiants/Dossiers/Frais/Cours/Config/Stockage/Notifications) · `admin-app.jsx` (nav + données).
Partagés entre les deux : `staff-ds.jsx`, `staff.css`. Ignorer les classes `.stage*/.phone/.notch` (châssis de présentation).

## Assets
- Icônes : SVG inline stroke (objet `ICONS` dans `staff-ds.jsx`) → remplacer par `lucide-react-native` en prod.
- Drapeaux pays : emoji (🇨🇳🇨🇦🇫🇷🇲🇦).
- Pas d'images bitmap ; tout est vectoriel / tokens.
