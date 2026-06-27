# MODULES & FONCTIONNALITÉS — Joda Company

## Rôles utilisateurs

| Rôle | Accès |
|---|---|
| `super_admin` | Accès complet à tous les modules + gestion utilisateurs + monitoring stockage + purge données |
| `admin` | Tous les modules sauf monitoring stockage. Peut créer/modifier/supprimer étudiants, candidatures, universités, valider paiements, gérer comptabilité |
| `agent` | **Accès limité** : Consultation (Dashboard, Étudiants, Candidatures, Dossiers, Universités, Frais). Peut créer/modifier étudiants et candidatures. **Pas de suppression, pas de gestion utilisateurs, pas de comptabilité** |
| `student` | Portail étudiant uniquement (lecture de son propre dossier + upload documents) |

---

## Matrice des permissions détaillée

| Module | super_admin | admin | agent | student |
|---|---|---|---|---|
| **Dashboard** | ✅ Lecture | ✅ Lecture | ✅ Lecture | ❌ |
| **Étudiants** | ✅ CRUD complet | ✅ CRUD complet | ✅ Créer/Modifier<br>❌ Supprimer | ❌ |
| **Candidatures** | ✅ CRUD complet | ✅ CRUD complet | ✅ Créer/Modifier<br>✅ Changer statut<br>❌ Supprimer | ❌ |
| **Dossiers** | ✅ CRUD complet | ✅ CRUD complet | ✅ Lecture<br>✅ Changer statut<br>✅ Ajouter notes<br>❌ Supprimer | ❌ |
| **Universités** | ✅ CRUD complet | ✅ CRUD complet | ✅ Lecture uniquement | ❌ |
| **Frais** | ✅ CRUD complet | ✅ CRUD complet | ✅ Lecture uniquement | ❌ |
| **Comptabilité** | ✅ CRUD complet | ✅ CRUD complet | ❌ Aucun accès | ❌ |
| **Cours de Langues** | ✅ CRUD complet | ✅ CRUD complet | ✅ Lecture + inscription | ❌ |
| **Communication** | ✅ Email + SMS | ✅ Email + SMS | ✅ Email + SMS | ❌ |
| **Config. Frais** | ✅ CRUD complet | ✅ CRUD complet | ❌ | ❌ |
| **Ressources Humaines** | ✅ CRUD complet | ✅ CRUD complet | ❌ Aucun accès | ❌ |
| **Utilisateurs** | ✅ CRUD complet | ✅ Créer/Lire<br>❌ Supprimer | ❌ Aucun accès | ❌ |
| **Logs Activités** | ✅ Lecture | ✅ Lecture | ❌ Aucun accès | ❌ |
| **Performances** | ✅ Lecture | ✅ Lecture | ✅ Lecture | ❌ |
| **Monitoring Stockage** | ✅ Lecture | ❌ | ❌ | ❌ |
| **Portail Étudiant** | ❌ | ❌ | ❌ | ✅ Accès complet |

> **Rôle `supervisor`** (non listé en colonne) : accès **lecture/écriture au module Ressources Humaines** (`requiredRole="supervisor"`), en plus des accès de consultation communs. C'est le rôle minimal pour gérer employés, congés, paie et rapports.

---

## 1. AUTHENTIFICATION

### Composants
- `LoginPage.tsx` — Page de connexion principale
- `ChangePasswordModal.tsx` — Changement de mot de passe obligatoire (première connexion)
- `ChangePassword.tsx` — Changement de mot de passe volontaire (depuis la sidebar)
- `ProtectedRoute.tsx` — Garde de route par rôle
- `AuthContext.tsx` — Contexte global d'authentification

### Refresh token
- `proxy.ts` (middleware) : `getUser()` — valide le token côté serveur Supabase et déclenche le refresh automatique.
- `AuthContext` :
  - `checkCurrentUser()` utilise `getUser()` (non `getSession()`) pour forcer la validation.
  - `loadUserProfile(authUserId)` : helper partagé entre init et listener.
  - `onAuthStateChange` gère `SIGNED_OUT` (vide l'état) et `TOKEN_REFRESHED` (recharge le profil depuis `users`).

### Flows

**Login admin/agent**
1. Saisie username ou email + mot de passe
2. Vérification dans les comptes hardcodés (fallback local)
3. Si non trouvé → `supabase.auth.signInWithPassword(email, password)`
4. Récupération du profil dans la table `users`
5. Stockage dans `localStorage.currentUser`
6. Si `must_change_password = true` → redirection vers `ChangePasswordModal`
7. Si `role = student` → redirection vers `StudentPortal`
8. Sinon → accès au dashboard principal

**Login étudiant**
1. Saisie du username (ex: `jean.dupont`)
2. Construction de l'email Auth : `jean.dupont@students.joda.app`
3. `supabase.auth.signInWithPassword(authEmail, password)`
4. Récupération du profil → redirection vers `StudentPortal`

**Mot de passe oublié (staff ou étudiant)**
1. Saisie de l'email (staff) ou du username (étudiant) sur la page de login
2. `POST /api/forgot-password` → génère un mot de passe temporaire `Joda@XXXXX` et le persiste
3. Envoi email HTML (staff/étudiant) ou SMS (étudiant) avec l'identifiant + mdp temporaire
4. Mise à jour `must_change_password = true` → le user devra changer son mdp au prochain login
5. **Rate-limit anti-DoS** : 1 réinitialisation max par utilisateur toutes les 5 minutes (in-memory, retourne 200 silencieusement si cooldown actif pour empêcher l'énumération)

**Changement de mot de passe obligatoire**
1. Détection de `must_change_password = true` après login
2. Affichage de `ChangePasswordModal` (bloque l'accès)
3. Saisie nouveau mot de passe + confirmation
4. Indicateur de force (Faible/Moyen/Bon/Fort)
5. `supabase.auth.updateUser({ password })`
6. Mise à jour `must_change_password = false` dans `users`
7. Accès débloqué

**Déconnexion**
1. `supabase.auth.signOut({ scope: 'local' })` — ne tue **que la session du navigateur courant** (les autres onglets / appareils restent connectés). Les `signOut()` automatiques en cas de profil invalide ou compte désactivé restent en `scope: 'global'` par sécurité.
2. Suppression `localStorage.currentUser`
3. Retour à `LoginPage`

---

## 2. DASHBOARD (Pilotage)

### Composant
- `ScholarshipDashboard.tsx`

### Données chargées depuis Supabase
- `universities` (id, nom, active)
- `students` (id, created_at)
- `dossier_bourses` (id, status, created_at, university_id)
- `payments` (id, montant, status, created_at, date_paiement, date_limite)
- `notifications` (id, type, read, created_at)

### Métriques calculées
- Dossiers actifs dans le pipeline
- Taux d'admission (admis / admis+refusés)
- Encaissements du mois en cours
- Taux de collecte global
- Nombre d'alertes (paiements en retard + notifications risque)
- Croissance candidatures (30 jours glissants)
- Croissance revenus (mois vs mois précédent)

### Graphiques
- Performance mensuelle sur 6 mois (candidatures + admissions + encaissements)
- Flux hebdomadaire 7 jours (dossiers ouverts + paiements reçus)
- Pipeline par statut (barres horizontales)
- Top 5 universités (volume + taux d'admission)
- Mix programmes (camembert)
- Répartition des risques (camembert)
- Jauges : taux d'admission + pression opérationnelle

### Actions (super_admin uniquement)
- Injecter des données de démonstration
- Purger les données de démonstration

---

## 3. GESTION DES ÉTUDIANTS

### Composant
- `StudentManagement.tsx`

### Table Supabase
- `students`

### Fonctionnalités
- Liste avec recherche (nom, email, téléphone, filière, niveau)
- Filtre par sexe (Tous / Homme / Femme)
- **Pagination** : 20 étudiants par page
- Statistiques : total, femmes, hommes, profils avec langue
- Modale "Détails" pour consulter la fiche complète
- Création d'un étudiant avec création automatique d'un compte Auth
- Modification d'un étudiant existant
- Suppression avec confirmation

### Flow de création d'un étudiant
1. Remplissage du formulaire (prénom, nom, email, téléphone, âge, sexe, niveau, filière, diplôme, langue, procédure)
2. Vérification des doublons (même prénom + nom)
3. Génération du username : `prenom.nom` (ex: `jean.dupont`)
4. Génération du mot de passe temporaire : `Joda@XXXX9`
5. Appel `POST /api/create-user` avec `authEmail = username@students.joda.app`
6. Création du compte Supabase Auth
7. Insertion dans `users` (upsert)
8. Insertion dans `students` avec `created_by = userId`
9. Envoi email de bienvenue + SMS si numéro renseigné
10. Affichage modal avec username + mot de passe temporaire

---

## 4. CANDIDATURES

### Composant
- `ApplicationManagement.tsx`

### Table Supabase
- `dossier_bourses`

### Fonctionnalités
- Liste de toutes les candidatures avec statut
- **Pagination** : 10 candidatures par page
- Création d'une nouvelle candidature
- Changement de statut en ligne (select)
- Suppression de candidature avec confirmation
- Envoi automatique d'email à l'étudiant lors de la création

### Statuts disponibles
| Statut | Label |
|---|---|
| `document_recu` | Document reçu |
| `en_attente` | En attente |
| `en_cours` | En cours |
| `document_manquant` | Document manquant |
| `admission_validee` | Acceptée |
| `admission_rejetee` | Refusée |
| `en_attente_universite` | En attente université |
| `visa_en_cours` | Visa en cours |
| `termine` | Terminé |

### Flow de création
1. Sélection étudiant (depuis `students`)
2. Sélection université (depuis `universities` actives)
3. Saisie programme souhaité, niveau d'études, niveau chinois, type de bourse
4. Insertion dans `dossier_bourses` avec `status = document_manquant`
5. Création d'une notification pour l'étudiant
6. Envoi d'un email via `/api/send-application` avec :
   - Nom de l'université, programme, niveau, type de bourse
   - Liste des 5 documents requis

---

## 5. DOSSIERS DE BOURSE

### Composant
- `ScholarshipFileManagement.tsx`

### Sources de données (TanStack Query)
- `useApplications()` — dossiers (`notes_internes` et `updated_at` inclus dans le SELECT)
- `useStudents()` — noms étudiants (fusion via `useMemo`)
- `useUniversities(false)` — noms universités (fusion via `useMemo`)

### Table Supabase
- `dossier_bourses` (avec jointures sur `students` et `universities`)

### Fonctionnalités
- Liste des dossiers avec informations étudiant et université
- Changement de statut du dossier
- Ajout/modification de notes internes
- Suppression de dossier avec confirmation
- Recherche par nom, université, programme
- Filtre par statut
- **Pagination** : 10 dossiers par page

### Statuts dossier
- `document_manquant` — En attente de documents
- `document_recu` — Documents reçus
- `en_attente` — En attente de traitement
- `en_cours` — Dossier en cours de traitement
- `admission_validee` — Admission acceptée
- `admission_rejetee` — Admission refusée
- `en_attente_universite` — En attente réponse université
- `visa_en_cours` — Visa en cours
- `termine` — Dossier terminé

---

## 6. UNIVERSITÉS PARTENAIRES

### Composant
- `UniversityManagement.tsx`

### Table Supabase
- `universities`

### Universités prédéfinies
| Université | Code | Ville |
|---|---|---|
| Université de Pékin | PKU | Pékin |
| Université Tsinghua | THU | Pékin |
| Université Fudan | FDN | Shanghai |
| Université Zhejiang | ZJU | Hangzhou |
| Université Nankai | NKU | Tianjin |
| Université de Wuhan | WHU | Wuhan |
| Université Sun Yat-sen | SYS | Canton |
| Université Tongji | TJU | Shanghai |

---

## 7. FRAIS & PAIEMENTS

### Composants
- `ApplicationFeeManagement.tsx` — Enregistrement des frais de candidature
- `PaymentsPage.tsx` — Vue caisse du jour (à valider/rejeter, acomptes, encaissements, comptabilité journalière)

### Sources de données (TanStack Query)
- `usePayments()` + `useStudents()` dans `ApplicationFeeManagement`, `PaymentsPage`
- `useEntreesComptables()` + `useSortiesComptables()` dans `PaymentsPage` (filtrées sur `todayStr` via `useMemo`)
- Sync pénalités : exécutée une seule fois au montage via `syncedRef`, puis `invalidateQueries(PAYMENTS_KEY)`

### Table Supabase
- `payments`

### Types de paiements
- `bourse` — Frais de procédure bourse
- `mandarin` — Cours de mandarin
- `anglais` — Cours d'anglais

### Statuts
- `attente` — En attente de paiement
- `paye` — Payé et validé
- `retard` — En retard (pénalités applicables)

### Calcul des pénalités
- Délai de grâce configurable par service (`PaymentConfigContext`)
- Pénalité configurable par service (montant fixe/jour)

### Flow de validation d'un paiement
1. Admin consulte la liste des paiements en attente
2. Clic "Valider" → `status = paye`, `validated_by = userId`, `validated_at = now`
3. Envoi email + SMS de confirmation au student via `/api/notify-payment-result`

---

## 8. COMPTABILITÉ

### Composant
- `AccountingPage.tsx`

### Tables Supabase
- `entrees_comptables` — Entrées financières
- `sorties_comptables` — Sorties financières avec validation
- `budgets` — Budgets prévisionnels par catégorie
- `custom_categories` — Catégories personnalisées (entrées & sorties)

### Onglets
| Onglet | Contenu |
|---|---|
| **Rapport** | KPI période + tableaux entrées/sorties + statistiques par catégorie |
| **Entrées** | Liste complète des entrées avec recherche, détails, reçu, suppression |
| **Sorties** | Liste complète des sorties avec validation admin, détails, suppression |
| **Budgets** | Gestion des budgets prévisionnels par catégorie et période |
| **Catégories** | Gestion des catégories personnalisées d'entrées et sorties |

### Filtres de période
`Aujourd'hui` / `Semaine` / `Mois` / `Année` / `Personnalisé` (plage de dates)

### Portée du rapport
`Entrées & Sorties` / `Entrées uniquement` / `Sorties uniquement`

### Types d'entrées
- `paiement_procedure` — Frais de procédure bourse
- `paiement_cours` — Cours de langue
- `revenus_divers` — Autres revenus
- + catégories personnalisées (table `custom_categories`, type `entree`)

### Catégories de sorties
`loyer`, `salaires`, `fonctionnement`, `materiels`, `fournitures`, `transports`, `communication`, `partenaires`, `divers` + catégories personnalisées

### Exports
- **Rapport HTML** → `utils/accountingReportPrinter.ts` (ouvre fenêtre d'impression)
- **Export Excel/CSV** → fichier `.csv` avec toutes les opérations de la période
- **Export PDF** → `lib/pdfGenerator.ts` (génération PDF client-side)

### Reçu de paiement
- **Fichier** : `utils/thermalReceipt.ts`
- **Format** : Reçu bancaire A5 (Inter + JetBrains Mono, format professionnel)
- **Contenu** : référence, date/heure, bénéficiaire, service, montant, pénalité, code d'autorisation

---

## 9. COURS DE LANGUES

### Composant
- `CoursLangues.tsx`

### Sources de données (TanStack Query)
- `usePayments()` — tous les paiements, filtrés client-side sur `type === 'mandarin' || type === 'anglais'`
- `useStudents()` — liste des étudiants

### Tables Supabase
- `payments` (type `mandarin` ou `anglais`)
- `cours_langues` (inscriptions aux cours)

### Fonctionnalités
- Inscription d'un étudiant à un cours (mandarin ou anglais)
- Création de 4 tranches de paiement à l'inscription (T1 Inscription 10K, T2 Livre 11K, T3 + T4 selon langue)
- Liste des paiements de cours avec statut et colonne tranche
- Validation d'un paiement de cours (admin)
- Calcul et affichage des pénalités de retard
- Suppression d'une inscription avec confirmation

### Flow d'inscription
1. Sélection de l'étudiant et du type de cours
2. Vérification qu'il n'est pas déjà inscrit (même type actif)
3. Insertion dans `cours_langues`
4. Création des 4 tranches de paiement dans `payments` (`status = attente`)
5. `invalidateQueries(PAYMENTS_KEY)` pour rafraîchissement immédiat

---

## 10. COMMUNICATION

### Composant
- `ComPage.tsx`

### Onglets
| Onglet | Fonctionnalité |
|---|---|
| **Messages** | Envoi d'emails individuels ou groupés aux étudiants |
| **SMS** | Envoi de SMS via API smsvas (160 caractères, numéros camerounais) |

### Fonctionnalités — Messages
- Sélection multiple d'étudiants (avec case à cocher)
- Saisie sujet + corps du message
- Envoi via `POST /api/send-student-message`
- Email HTML responsive + SMS simultané si numéro disponible
- Compteur de caractères pour les SMS

### Fonctionnalités — SMS
- Liste de tous les étudiants avec numéro de téléphone
- Envoi SMS à une sélection ou à tous
- Affichage du solde SMS disponible (via `/api/sms-balance`)
- Normalisation automatique des numéros camerounais (237XXXXXXXXX)

---

## 11. CONFIGURATION DES FRAIS

### Composant
- `FeeConfigManagement.tsx`

### Contexte
- `PaymentConfigContext.tsx` — Configuration chargée une fois au démarrage et injectée dans toute l'app

### Onglets
- **Bourse Bachelor** — Tranches et montants pour la procédure bourse licence
- **Bourse Master** — Tranches et montants pour la procédure bourse master
- **Mandarin** — Tranches et montants pour les cours de mandarin
- **Anglais** — Tranches et montants pour les cours d'anglais

### Fonctionnalités
- Définition des tranches de paiement (label + montant)
- Ajout/suppression de tranches
- Affichage du total automatique
- Sauvegarde de la configuration (locale/BDD)
- Réinitialisation aux valeurs par défaut

---

## 12. NOTIFICATIONS

### Composant
- `NotificationsPage.tsx`

### Contexte
- `NotificationContext.tsx` — Toasts et notifications in-app globaux

### Table Supabase
- `notifications`

### Types de notifications
| Type | Label |
|---|---|
| `document_manquant` | Document manquant |
| `paiement_valide` | Paiement validé |
| `retard_paiement` | Retard de paiement |
| `mise_a_jour_dossier` | Mise à jour dossier |

### Fonctionnalités
- Liste filtrée (toutes / non lues / par type)
- Marquer comme lu, marquer tout comme lu
- Génération automatique des alertes de retard
- Rafraîchissement automatique toutes les 60 secondes

---

## 13. PERFORMANCES

### Composant
- `PerformanceHistory.tsx`

### Sources de données (TanStack Query)
- `usePayments()` — tous les paiements
- `useStudents()` — liste des étudiants
- `useUsers()` — liste des utilisateurs (agents/superviseurs)
- `useQuery` custom sur `dossier_bourses`, `activity_logs`, `dossier_history`

### Onglets
| Onglet | Contenu |
|---|---|
| **Par agent** | Classement des agents avec score composite + podium |
| **Vue journalière** | Historique quotidien (ancien comportement) |

### Classement des agents (`AgentStats`)
- Score composite 0-100 sur 4 axes normalisés par rapport au meilleur agent :
  - `revenueScore` — CA encaissé (payé)
  - `activityScore` — Nombre de logs d'activité
  - `speedScore` — Délai moyen de validation des paiements
  - `dossierScore` — Nombre de dossiers gérés
- Affichage badge rôle (Agent / Superviseur / Commercial / Admin)
- Statuts visibles : paiements encaissés (bourse / mandarin / anglais), à valider, en attente, en retard, pénalités
- Cartes expandables : détail journalier au clic
- Agents inactifs (score = 0, aucun paiement) affichés séparément

### Filtres de période
`7 jours` / `30 jours` / `3 mois` / `Cette année` / `Tout`

---

## 14. LOGS D'ACTIVITÉS

### Composant
- `ActivityLogsPage.tsx`

### Table Supabase
- `activity_logs`

### Fonctionnalités
- **Traçabilité complète** des actions sensibles
- **Statistiques** : total activités, agents, admins, aujourd'hui
- **Filtres** : utilisateur, rôle, type d'activité, période
- **Pagination** : 20 logs par page
- **Détails JSON** expandables

### Utilitaire
- **Fichier** : `utils/activityLogger.ts`
- **Fonction** : `logActivity(userId, userName, userRole, activityType, entityType, entityId, description, metadata?)`

### Accès
- `admin`, `super_admin` : voient tous les logs
- `agent` : voit uniquement ses propres logs (via RLS)

---

## 15. GESTION DES UTILISATEURS

### Composant
- `UserManagement.tsx`

### Table Supabase
- `users`

### Flow de création d'un utilisateur
1. Saisie username, nom, email, mot de passe temporaire, rôle
2. `POST /api/create-user` → création Auth + insertion `users`
3. Envoi email de bienvenue + SMS si numéro renseigné
4. `must_change_password = true` → l'utilisateur devra changer son mot de passe

### Accès
- Lecture : `admin`, `super_admin`
- Création : `admin`, `super_admin`
- Suppression : `super_admin` uniquement

---

## 16. PORTAIL ÉTUDIANT

### Architecture composants
- `StudentShell.tsx` — Shell principal (layout, navigation, routing)
- `StudentHeader.tsx` — Header avec titre, cloche notifications, menu
- `StudentSidebarNav.tsx` — Navigation latérale (desktop)
- `BottomTabs.tsx` — Navigation bas de page (mobile)
- `StudentDashboard.tsx` — Tableau de bord étudiant
- `StudentApplicationsList.tsx` — Liste des candidatures de l'étudiant
- `StudentPaymentsList.tsx` — Liste des paiements et solde dû
- `StudentDocumentsList.tsx` — Liste et upload des documents
- `StudentMessaging.tsx` / `StudentChatFull.tsx` — Messagerie staff → étudiant
- `StudentNotifications.tsx` — Notifications (accessible via la cloche)
- `DossierRoadmap.tsx` — Timeline visuelle d'avancement du dossier
- `ActivityRings.tsx` — Visualisation de l'activité
- `StudentStatsCard.tsx` — Cartes de statistiques

### Navigation (4 sections)
- **Tableau de bord** — Vue synthétique (statut dossier, prochaine échéance, avancement)
- **Mes Candidatures** — Liste des dossiers en cours
- **Paiements** — Historique et paiements en attente
- **Documents** — Upload et suivi des 8 documents requis

### Fonctionnalités clés
- **DossierRoadmap** : timeline des 6 étapes avec cases cochées selon l'avancement
- **Upload documents** : compression auto (cible 3 MB), formats PDF/JPG/PNG, 10 MB max
- **Déclaration paiement** : l'étudiant peut déclarer un paiement effectué (`POST /api/declare-payment`)
- **Messagerie** : lecture des messages envoyés par le staff
- **Bouton "Envoyer à l'équipe"** : notifie tous les admin/agent via `/api/notify-staff`

### Documents requis
1. Passeport (copie des pages d'identité)
2. Casier judiciaire (bulletin n°3 de moins de 3 mois)
3. Photo d'identité (fond blanc)
4. Relevé de notes (derniers relevés officiels)
5. Diplôme (diplôme le plus élevé obtenu)
6. Lettre de motivation (français ou anglais)
7. Lettre de recommandation (professeur ou employeur)
8. Certificat HSK (optionnel)

---

## 17. MONITORING DU STOCKAGE

### Composant
- `StorageMonitoring.tsx`

### Fonctionnalités
- Barre de progression (500 MB max plan gratuit)
- Alertes : warning à 400 MB (80%), critique à 450 MB (90%)
- Statistiques fichiers + base de données
- Recommandations d'optimisation

### Accès
- `super_admin` uniquement

---

## 18. SYSTÈME NOTIFICATIONS EMAIL & SMS

### Fichiers
- `lib/emailService.ts` — Fonctions d'envoi email (nodemailer + Gmail SMTP)
- `lib/smsService.ts` — Envoi SMS via API smsvas.com

### Fonctions email exportées
| Fonction | Déclencheur |
|---|---|
| `sendPaymentReminder` | Cron check-late-payments (retard détecté) |
| `sendPaymentResultEmail` | Validation ou rejet d'un paiement (admin) |
| `sendPaymentDeclarationEmail` | Déclaration de paiement par l'étudiant |
| `sendDocumentSubmissionEmail` | Soumission de documents par l'étudiant |
| `sendStudentMessageEmail` | Message envoyé via le module Communication |
| `sendWelcomeEmail` | Création d'un compte étudiant ou utilisateur |

### SMS (`sendSmsToPhone`)
- Provider : smsvas.com (API REST)
- Normalisation automatique numéros camerounais (237XXXXXXXXX)
- Envoyé en parallèle de l'email sur tous les événements clés
- Sender ID configurable (`SMS_SENDER_ID` env var)

### Cron Job
- **Route** : `/api/cron/check-late-payments` (GET, protégé par `x-api-key`)
- **Fréquence** : configurable (quotidien recommandé)
- Détecte les paiements en retard → mise à jour statut `retard` → envoi email + SMS de rappel

### Templates email
- Design HTML responsive (rouge/blanc, header Joda Company)
- Bilingue FR/EN selon la langue de l'étudiant (`getLang(langue)`)

---

## RESSOURCES HUMAINES (RH / PAIE)

### Composants
- `HRManagement.tsx` — Conteneur principal du module (route `/rh`), garde `ProtectedRoute requiredRole="supervisor"`
- `components/rh/EmployeeDetail.tsx` — Fiche employé détaillée affichée sur une **page dédiée** (route `/rh/employes/[id]`), pas une modale ; profil étendu (état civil, identité, adresse, contact d'urgence, contrat) + onglets historique/paye/évaluations/bilan
- `[locale]/(app)/rh/employes/[id]/page.tsx` — Route de la page profil employé (garde `ProtectedRoute requiredRole="supervisor"`)
- `components/rh/HRConfigPanel.tsx` — Configuration de la paie (règles de retenue, échéanciers, config par employé)
- `PublicReportPage.tsx` — Portail public de saisie de rapport journalier (route `/rapport`, sans session, accès par PIN employé)

### Sources de données (TanStack Query — `lib/hooks/use-hr.ts`)
- `useEmployees()` / `useCreateEmployee()` / `useUpdateEmployee()` / `useDeleteEmployee()`
- `useLeaveRequests()` / `useCreateLeaveRequest()` / `useReviewLeaveRequest()` / `useDeleteLeaveRequest()`
- `usePayslips()` / `useCreatePayslip()` / `useUpdatePayslip()` / `useDeletePayslip()` / `useGenerateDuePayslips()`
- `useDailyReports()` / `useCreateDailyReport()` / `useUpdateDailyReport()` / `useDeleteDailyReport()`
- `useDeductionRules()`, `useDeductionOccurrences()`, `usePaymentSchedules()`, `useEmployeePayConfigs()` (+ mutations associées)

> Le CRUD employés/congés/paie/rapports passe **directement par le client Supabase** (RLS), pas par des routes API. Seules la génération automatique, le portail public et la régénération de PIN sont des routes serveur (service-role / RPC).

### Tables Supabase
- `employees` — Fiches employés (profil étendu, `report_pin_hash`, `salaire_base`, `statut`)
- `leave_requests` — Demandes de congé (type, dates, statut `en_attente`/`approuve`/`rejete`, reviewer)
- `payslips` — Fiches de paie (mois/année, salaire base, primes, déductions, net à payer, `auto_generated`, `schedule_id`)
- `daily_reports` — Rapports journaliers d'activité (saisis par le staff ou via le portail public)
- `hr_deduction_rules` — Règles de retenue (code, type, montant fixe ou % du salaire de base)
- `hr_deduction_occurrences` — Occurrences de retenue appliquées à un employé (liées à une fiche de paie)
- `hr_payment_schedules` — Échéanciers de paie (portée `all`/`department`/`employee`, jour du mois)
- `hr_employee_pay_config` — Config de paie par employé (primes récurrentes, salaire personnalisé)

### Onglets (`HRManagement`)
| Onglet (`tab`) | Contenu |
|---|---|
| **Employés** (`employees`) | Liste + stats (actifs), création/édition, fiche détaillée, régénération du PIN de rapport |
| **Congés** (`leaves`) | Demandes de congé, validation/rejet avec commentaire reviewer |
| **Paie** (`payroll`) | Fiches de paie + génération automatique des paies dues |
| **Rapports** (`reports`) | Rapports journaliers d'activité (heures travaillées, activités, observations) |
| **Configuration** (`config`) | Règles de retenue, échéanciers de paie, config de paie par employé (`HRConfigPanel`) |

### Génération automatique des fiches de paie
1. `POST /api/hr/generate-payslips` (`requireRole(['supervisor','admin','super_admin'])`)
2. Appel RPC `hr_generate_due_payslips(target_user, target_year, target_month)` — génère les paies dues selon les échéanciers (`hr_payment_schedules`), applique les retenues, et calcule le net à payer
3. Sans `year`/`month` dans le corps → génère **toutes** les paies dues ; avec → cible un mois précis
4. Chaque fiche de paie crée une **sortie comptable** liée (migration `link_payslips_to_sorties.sql`)

### Portail public de rapport journalier (`/rapport`)
Permet à un employé sans compte de soumettre son rapport quotidien via un PIN :
1. `GET /api/hr/public/employees` + `/api/hr/public/list` — liste des employés actifs (sélection)
2. `POST /api/hr/public/verify` — vérifie `employee_id` + `pin` via RPC `hr_verify_report_pin` (401 si invalide)
3. `POST /api/hr/public/submit` — enregistre le rapport journalier
4. PIN régénérable côté admin : `POST /api/hr/employees/[id]/regenerate-pin`

### Migrations associées
`add_hr_module.sql`, `add_hr_employee_profile_fields.sql`, `add_hr_payroll_config.sql`, `add_report_pin_to_employees.sql`, `link_payslips_to_sorties.sql`, `update_hr_generate_due_payslips_targeted.sql`

---

## API Routes

| Route | Méthode | Description | Auth requise |
|---|---|---|---|
| `/api/create-user` | POST | Crée compte Auth + `users` + email/SMS bienvenue | Service Role Key |
| `/api/delete-user` | DELETE | Supprime compte Auth + `users` | Service Role Key |
| `/api/reset-password` | POST | Réinitialise le mot de passe d'un utilisateur | Service Role Key |
| `/api/forgot-password` | POST | Génère un mdp temporaire (envoi email/SMS). Rate-limit 5 min par user. Toujours 200 (anti-énumération) | Public |
| `/api/clear-password-flag` | POST | Efface `must_change_password` après changement | `requireAuth` |
| `/api/send-welcome` | POST | Envoie email de bienvenue | Service Role Key |
| `/api/send-application` | POST | Envoie email de demande de documents | Service Role Key |
| `/api/send-student-message` | POST | Envoi email + SMS de masse aux étudiants | `requireAuth` (agent+) |
| `/api/send-sms` | POST | Envoi SMS direct à un ou plusieurs numéros | `requireAuth` (agent+) |
| `/api/sms-balance` | GET | Solde de crédits SMS disponibles | `requireAuth` (agent+) |
| `/api/validate-file` | POST | Valide un fichier côté serveur (type, taille) | `requireAuth` |
| `/api/notify-staff` | POST | Notifie admin/agent d'une soumission de documents | `requireAuth` |
| `/api/declare-payment` | POST | Étudiant déclare un paiement effectué | `requireAuth` |
| `/api/notify-payment-result` | POST | Notifie l'étudiant du résultat de validation | `requireAuth` (agent+) |
| `/api/student-payments` | GET | Récupère les paiements de l'étudiant connecté | `requireAuth` |
| `/api/cron/check-late-payments` | GET | Détecte retards + notifie + met à jour statuts | `x-api-key` header |
| `/api/auth/exchange` | POST | Échange tokens OAuth (callback Supabase) | Public |
| `/api/hr/generate-payslips` | POST | Génère les fiches de paie dues (RPC `hr_generate_due_payslips`) | `requireRole` (supervisor+) |
| `/api/hr/employees/[id]/regenerate-pin` | POST | Régénère le PIN de saisie de rapport d'un employé | `requireRole` (supervisor+) |
| `/api/hr/public/employees` | GET | Liste publique des employés actifs (portail rapport) | Public |
| `/api/hr/public/list` | GET | Liste publique des employés (sélection portail) | Public |
| `/api/hr/public/verify` | POST | Vérifie le PIN employé (RPC `hr_verify_report_pin`) | Public (PIN) |
| `/api/hr/public/submit` | POST | Soumet un rapport journalier depuis le portail public | Public (PIN) |

---

## Structure des données Supabase

| Table | Description |
|---|---|
| `users` | Profils utilisateurs (liés à Supabase Auth) |
| `students` | Profils étudiants candidats |
| `universities` | Universités partenaires chinoises |
| `documents` | Documents soumis par les étudiants |
| `dossier_bourses` | Dossiers de candidature à une bourse |
| `dossier_history` | Historique des changements de statut des dossiers |
| `activity_logs` | Logs d'audit des actions sensibles |
| `payments` | Paiements et frais (bourse, mandarin, anglais) |
| `cours_langues` | Inscriptions aux cours de langues |
| `entrees_comptables` | Entrées financières comptabilité |
| `sorties_comptables` | Sorties financières comptabilité |
| `budgets` | Budgets prévisionnels par catégorie et période |
| `custom_categories` | Catégories personnalisées (entrées & sorties) |
| `notifications` | Notifications et alertes in-app |
| `messages` | Messages staff → étudiant |
| `employees` | Fiches employés (profil RH étendu, PIN de rapport, salaire) |
| `leave_requests` | Demandes de congé des employés |
| `payslips` | Fiches de paie (liées aux sorties comptables) |
| `daily_reports` | Rapports journaliers d'activité des employés |
| `hr_deduction_rules` | Règles de retenue sur salaire |
| `hr_deduction_occurrences` | Retenues appliquées à un employé |
| `hr_payment_schedules` | Échéanciers de génération automatique des paies |
| `hr_employee_pay_config` | Configuration de paie par employé |

---

## Navigation (Sidebar)

| Section | Modules | Rôles |
|---|---|---|
| Pilotage | Dashboard, Performances | Tous |
| Opérations | Candidatures, Étudiants, Dossiers | Tous |
| Ressources | Universités, Frais, Cours de Langues | Tous (lecture) |
| Finance | Comptabilité | `admin`, `super_admin` |
| RH | Ressources Humaines (employés, congés, paie, rapports) | `supervisor`, `admin`, `super_admin` |
| Communication | Messages & SMS | `agent`, `admin`, `super_admin` |
| Configuration | Config. Frais | `admin`, `super_admin` |
| Administration | Utilisateurs, Logs Activités | `admin`, `super_admin` |
| Système | Stockage (monitoring) | `super_admin` uniquement |

---

## 19. OPTIMISATIONS DE STOCKAGE

### Compression d'Images
- **Fichier** : `utils/imageCompression.ts`
- Compression auto JPEG/PNG, redimensionnement si > 2048px, qualité 85%
- Cible : 3 MB (`TARGET_COMPRESSED_SIZE_MB`)

### Validation de Fichiers
- **Fichier** : `utils/fileValidation.ts`
- `MAX_FILE_SIZE_MB` : 10 MB (entrée brute)
- Types MIME : PDF, JPEG, PNG
- Validation côté client + côté serveur (`/api/validate-file`)

### Pagination
- **Hook** : `hooks/usePagination.ts`
- StudentManagement : 20/page — ApplicationManagement : 10/page

---

## 20. TESTS E2E (PLAYWRIGHT)

### Fichiers et structure
```
tests/
├── e2e/                         # 23 fichiers .spec.ts (un par module métier)
│   ├── 01-auth.spec.ts          # Authentification + i18n + thème
│   ├── 02-etudiants.spec.ts     # Gestion étudiants
│   ├── ...                      # 03-22 : un par module
│   └── 23-rh.spec.ts            # Ressources humaines (employés, paie, portail PIN)
├── fixtures/
│   └── authenticated.ts         # Fixtures `adminPage`, `agentPage`, `studentPage`, … (storageState)
├── helpers/
│   ├── auth-utils.ts            # `loginAs(page, role)`, `logout(page)`
│   ├── seed.ts                  # ensureTestAccounts/Student/University + cleanup
│   ├── sidebar-nav.ts           # `clickSidebarNav` (ouvre la section parente si repliée)
│   └── supabase-admin.ts        # Client service-role + helpers `tagEmail`, `tagStudentUsername`
├── global-setup.ts              # Seed comptes, warmup routes, sauvegarde storageState/rôle
├── global-teardown.ts           # Cleanup données préfixées `e2e_` (skippé si E2E_KEEP_DATA=1)
├── run-all-tests.ps1            # Runner PowerShell séquentiel module par module
├── README.md                    # Guide d'utilisation et bonnes pratiques
├── RAPPORT_EXECUTION.md         # Historique des runs et métriques
└── TESTIDS.md                   # Référence des `data-testid` ajoutés à l'app
```

### Lancement

```powershell
npm run test:all                        # Tous les modules (sequentiel)
.\tests\run-all-tests.ps1 -Module 7     # Un seul module
.\tests\run-all-tests.ps1 -Headed       # Voir le navigateur
.\tests\run-all-tests.ps1 -KeepData     # Ne pas nettoyer la DB après
.\tests\run-all-tests.ps1 -OpenReport   # Ouvrir le rapport HTML à la fin

npm run test:e2e                        # Lance Playwright directement
npm run test:e2e:headed                 # Mode UI
npm run test:e2e:report                 # Affiche le dernier rapport HTML
```

### Architecture & optimisations

- **Mode build** : `playwright.config.ts` lance `npm run start` (Next.js prod build) au lieu de `npm run dev` — élimine les recompilations Turbopack à chaud (override avec `E2E_DEV=1`).
- **storageState** : `global-setup.ts` fait **5 logins UI au démarrage** (super_admin, admin, supervisor, agent, student), sauvegarde les sessions dans `tests/.auth/<role>.json`. Les fixtures réutilisent ces sessions au lieu de re-loggeur à chaque test → **0 risque de rate-limit Supabase auth** + suite **3× plus rapide** (~5,5 min pour 80 tests).
- **Warmup routes** : pré-compilation côté serveur des 18 routes principales après seed.
- **Retries 1** : absorbe les rares flakys (animation sidebar) sans masquer les vrais bugs.

### Comptes de test E2E (créés au setup, préfixés `e2e_`)

| Username | Rôle |
|---|---|
| `e2e_superadmin` | `super_admin` |
| `e2e_admin` | `admin` |
| `e2e_supervisor` | `supervisor` |
| `e2e_agent` | `agent` |
| `e2e.student` | `student` (auth email `e2e.student@students.joda.app`) |

Mot de passe commun : `TestJoda!2026` (constante `TEST_PASSWORD` dans `tests/helpers/seed.ts`).

### data-testid instrumentés

Ajoutés dans le code app pour fiabiliser les sélecteurs E2E (indépendants de la langue et du style) :

- **LoginPage** : `login-identifier`, `login-password`, `login-submit`, `login-forgot-btn`, `forgot-input`, `forgot-submit`, `forgot-cancel`, `theme-toggle`, `lang-switcher`, `lang-option-{fr|en}`
- **AppShell** : `nav-{routeId}` × 16 (dont `nav-hr`), `sidebar-section-{sectionId}` × 8 (dont `sidebar-section-rh`), `btn-logout`, `btn-notifications`, `notif-badge`, `page-title`, `mobile-menu-toggle`
- **ConfirmDialog** : `confirm-dialog`, `confirm-title`, `confirm-description`, `confirm-yes`, `confirm-cancel`
- **Portail étudiant** : `portal-bell`, `portal-bell-badge`, `portal-theme-toggle`, `portal-logout`, `portal-tab-{dashboard|payments|documents|dossier|messaging}`

Liste complète dans [`tests/TESTIDS.md`](tests/TESTIDS.md).

### Couverture

23 modules couverts, ~88 cas de tests :

| # | Module testé | Tests | # | Module testé | Tests |
|---|---|---|---|---|---|
| 1 | Authentification | 9 | 13 | Logs activités | 3 |
| 2 | Étudiants | 5 | 14 | Notifications | 3 |
| 3 | Candidatures | 3 | 15 | Performances | 3 |
| 4 | Universités | 4 | 16 | Stockage | 3 |
| 5 | Utilisateurs staff | 3 | 17 | Portail étudiant | 5 |
| 6 | Dossiers | 3 | 18 | Documents (staff) | 1 |
| 7 | Paiements | 4 | 19 | Tableau de bord | 4 |
| 8 | Cours langues | 3 | 20 | i18n & thème | 2 |
| 9 | Comptabilité | 3 | 21 | Sécurité / RBAC | 6 |
| 10 | Configuration frais | 2 | 22 | Cron / API | 2 |
| 11 | Communication | 5 | 23 | Ressources humaines | 8 |
| 12 | Newsletter | 3 | | | |

Documentation détaillée : [`TESTS_FONCTIONNELS.md`](TESTS_FONCTIONNELS.md) (cas de tests métier), [`tests/RAPPORT_EXECUTION.md`](tests/RAPPORT_EXECUTION.md) (résultats des runs).

### Bugs réels découverts via les tests E2E

1. **`/api/forgot-password` vulnérable au DoS par spam-reset** → fix : rate-limit 5 min par user
2. **`logout()` invalidait toutes les sessions du user** (signOut global par défaut) → fix : `scope: 'local'`

---

## Comptes de test (dev)

| Email | Mot de passe | Rôle |
|---|---|---|
| `superadmin@joda.com` | `Joda@Admin9` | `super_admin` |
| `admin@joda.com` | `Joda@Admin9` | `admin` |
| `agent@joda.com` | `Joda@Agent9` | `agent` |

---

## 21. DOCUMENTATION

### Manuels utilisateur (`docs/manuels/`)

| Fichier | Audience | Sections | Format |
|---|---|---|---|
| `Manuel-Etudiant.html` | Étudiants | 11 sections : connexion (+ mot de passe oublié), tableau de bord, dossier, documents, paiements, notifications, messagerie | Word (HTML Office XML) |
| `Manuel-Agent-Superviseur.html` | Agents & Superviseurs | 14 sections : étudiants, candidatures, dossiers, paiements, universités, performances, cours de langues, communication, workflows | Word (HTML Office XML) |
| `Manuel-Admin-SuperAdmin.html` | Admins & Super Admins | 17 sections : comptabilité complète (budgets, catégories, exports), utilisateurs, logs, stockage, sécurité, config frais, communication, workflows avancés | Word (HTML Office XML) |
| `Manuel-Complet.html` | Tous profils | 26 sections en 6 parties : présentation, portail étudiant, gestion agents, administration, référence, modules complémentaires | Word (HTML Office XML) |
| `Documentation-Technique.html` | Développeurs & DevOps | 10 parties : architecture, auth, BDD, API, composants, Electron, env, email/SMS, tests, conventions | Word (HTML Office XML) |

### Ouverture dans Microsoft Word

Clic droit sur le fichier `.html` → **Ouvrir avec** → **Microsoft Word**.

### Documentation complémentaire

| Fichier | Contenu |
|---|---|
| `TESTS_FONCTIONNELS.md` | Cas de tests métier détaillés |
| `tests/README.md` | Guide d'utilisation Playwright |
| `tests/RAPPORT_EXECUTION.md` | Résultats des runs E2E |
| `tests/TESTIDS.md` | Référence des `data-testid` ajoutés à l'app |
| `migrations/` | Migrations SQL Supabase (voir section 3.3 de la doc technique) |
