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
| **Utilisateurs** | ✅ CRUD complet | ✅ Créer/Lire<br>❌ Supprimer | ❌ Aucun accès | ❌ |
| **Logs Activités** | ✅ Lecture | ✅ Lecture | ❌ Aucun accès | ❌ |
| **Performances** | ✅ Lecture | ✅ Lecture | ✅ Lecture | ❌ |
| **Monitoring Stockage** | ✅ Lecture | ❌ | ❌ | ❌ |
| **Portail Étudiant** | ❌ | ❌ | ❌ | ✅ Accès complet |

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

**Mot de passe oublié (étudiant)**
1. Saisie du username sur la page de login
2. `POST /api/forgot-password` → génère un lien de réinitialisation Supabase
3. Envoi email HTML avec le lien (expiration 1h)
4. Redirection vers la page de reset

**Changement de mot de passe obligatoire**
1. Détection de `must_change_password = true` après login
2. Affichage de `ChangePasswordModal` (bloque l'accès)
3. Saisie nouveau mot de passe + confirmation
4. Indicateur de force (Faible/Moyen/Bon/Fort)
5. `supabase.auth.updateUser({ password })`
6. Mise à jour `must_change_password = false` dans `users`
7. Accès débloqué

**Déconnexion**
1. `supabase.auth.signOut()`
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
- `PaymentManagement.tsx` — Gestion et validation des paiements

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

### Tables Supabase
- `payments` (type `mandarin` ou `anglais`)
- `cours_langues` (inscriptions aux cours)

### Fonctionnalités
- Inscription d'un étudiant à un cours (mandarin ou anglais)
- Création automatique du premier paiement (tranche 1) selon la configuration des frais
- Liste des paiements de cours avec statut
- Validation d'un paiement de cours (admin)
- Calcul et affichage des pénalités de retard
- Suppression d'une inscription avec confirmation

### Flow d'inscription
1. Sélection de l'étudiant et du type de cours
2. Vérification qu'il n'est pas déjà inscrit (même type actif)
3. Insertion dans `cours_langues`
4. Création du paiement initial dans `payments` (tranche 1, `status = attente`)

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

### Fonctionnalités
- Historique des performances de l'équipe
- Indicateurs de suivi

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

## API Routes

| Route | Méthode | Description | Auth requise |
|---|---|---|---|
| `/api/create-user` | POST | Crée compte Auth + `users` + email/SMS bienvenue | Service Role Key |
| `/api/delete-user` | DELETE | Supprime compte Auth + `users` | Service Role Key |
| `/api/reset-password` | POST | Réinitialise le mot de passe d'un utilisateur | Service Role Key |
| `/api/forgot-password` | POST | Génère lien de réinitialisation pour étudiant | Public |
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

---

## Navigation (Sidebar)

| Section | Modules | Rôles |
|---|---|---|
| Pilotage | Dashboard, Performances | Tous |
| Opérations | Candidatures, Étudiants, Dossiers | Tous |
| Ressources | Universités, Frais, Cours de Langues | Tous (lecture) |
| Finance | Comptabilité | `admin`, `super_admin` |
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

## Comptes de test

| Email | Mot de passe | Rôle |
|---|---|---|
| `superadmin@joda.com` | `Joda@Admin9` | `super_admin` |
| `admin@joda.com` | `Joda@Admin9` | `admin` |
| `agent@joda.com` | `Joda@Agent9` | `agent` |
