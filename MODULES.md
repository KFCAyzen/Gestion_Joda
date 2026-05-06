# MODULES & FONCTIONNALITÉS — Joda Company

## Rôles utilisateurs

| Rôle | Accès |
|---|---|
| `super_admin` | Accès complet à tous les modules + gestion utilisateurs + purge données |
| `admin` | Tous les modules sauf configuration système |
| `agent` | Opérations, dossiers, paiements, comptabilité |
| `student` | Portail étudiant uniquement (lecture de son propre dossier) |

---

## 1. AUTHENTIFICATION

### Composants
- `LoginPage.tsx` — Page de connexion principale
- `ChangePasswordModal.tsx` — Changement de mot de passe obligatoire (première connexion)
- `ChangePassword.tsx` — Changement de mot de passe volontaire (depuis la sidebar)
- `ProtectedRoute.tsx` — Garde de route par rôle
- `AuthContext.tsx` — Contexte global d'authentification

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

**Changement de mot de passe obligatoire**
1. Détection de `must_change_password = true` après login
2. Affichage de `ChangePasswordModal` (bloque l'accès)
3. Saisie nouveau mot de passe + confirmation
4. Indicateur de force (Faible/Moyen/Bon/Fort)
5. `supabase.auth.updateUser({ password })`
6. Mise à jour `must_change_password = false` dans `users`
7. Mise à jour `localStorage`
8. Accès débloqué

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

### Flow de rafraîchissement
1. Chargement initial au montage
2. Écoute des événements `dashboardUpdate` et `dataChanged`
3. Bouton "Actualiser" manuel

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
9. Envoi email de bienvenue (Gmail SMTP)
10. Affichage modal avec username + mot de passe temporaire

### Accès
- Lecture : tous les rôles connectés
- Création/Modification/Suppression : `admin`, `super_admin`, `agent`

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
   - Nom de l'université
   - Programme souhaité
   - Niveau d'études
   - Type de bourse
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

### Flow CRUD
1. **Chargement** : `loadData()` récupère depuis `dossier_bourses` avec jointures
2. **Mise à jour statut** : `updateStatus(id, newStatus)` met à jour le statut
3. **Mise à jour notes** : `updateNotes(id, notes)` sauvegarde les notes internes
4. **Suppression** : `deleteFile(id)` supprime avec confirmation

---

## 6. UNIVERSITÉS PARTENAIRES

### Composant
- `UniversityManagement.tsx`

### Table Supabase
- `universities`

### Fonctionnalités
- Liste de toutes les universités (actives + inactives)
- Ajout d'une université
- Modification d'une université
- Activation / Désactivation
- Suppression
- Seed des 8 universités prédéfinies si la liste est vide

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

### Accès
- Lecture : tous
- Création/Modification/Suppression : `admin`, `super_admin`

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
- Délai de grâce : 3 jours (procédure) / 30 jours (cours de langue)
- Pénalité : 10 000 FCFA/jour (procédure) / 1 000 FCFA/jour (cours)

### Flow de validation d'un paiement
1. Agent/Admin consulte la liste des paiements en attente
2. Filtre par étudiant ou statut
3. Clic "Valider" → `status = paye`, `validated_by = userId`, `validated_at = now`
4. Clic "Rejeter" → `status = retard`

### Flow d'enregistrement d'un frais
1. Sélection étudiant
2. Saisie montant + motif + date
3. Insertion dans `payments` avec `status = paye` (paiement immédiat)

---

## 8. COMPTABILITÉ

### Composant
- `AccountingPage.tsx`

### Tables Supabase
- `entrees_comptables`
- `sorties_comptables`

### Fonctionnalités
- Rapport journalier (sélection de date)
- Liste des entrées avec total
- Liste des sorties avec total et validation
- Solde global (entrées - sorties)
- Solde du jour

### Types d'entrées
- `paiement_procedure`
- `paiement_cours`
- `revenus_divers`

### Catégories de sorties
- Loyer, Salaires, Fonctionnement, Matériels, Fournitures, Transports, Communication, Partenaires, Divers

### Flow d'ajout d'une entrée (admin uniquement)
1. Saisie montant + type + date + description
2. Insertion dans `entrees_comptables`

### Flow de validation d'une sortie
1. Agent crée une sortie
2. Admin valide → `validated_by = userId`, `validated_at = now`

---

## 9. NOTIFICATIONS

### Composant
- `NotificationsPage.tsx`

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
- Marquer comme lu (clic sur la notification)
- Marquer tout comme lu
- Génération automatique des alertes de retard (admin)
- Rafraîchissement automatique toutes les 60 secondes

### Accès
- `admin`/`super_admin` : toutes les notifications
- Autres rôles : uniquement leurs propres notifications

---

## 10. PERFORMANCES

### Composant
- `PerformanceHistory.tsx`

### Fonctionnalités
- Historique des performances de l'équipe
- Indicateurs de suivi

---

## 11. HISTORIQUE D'ACTIVITÉ

### Composant
- `ActivityHistory.tsx`

### Accès
- `admin`, `super_admin` uniquement

---

## 12. GESTION DES UTILISATEURS

### Composant
- `UserManagement.tsx`

### Table Supabase
- `users`

### Fonctionnalités
- Liste de tous les utilisateurs avec rôle
- Création d'un utilisateur (via `/api/create-user`)
- Suppression d'un utilisateur (via `/api/delete-user`)
- Vue des permissions par rôle

### Flow de création d'un utilisateur
1. Saisie username, nom, email, mot de passe temporaire, rôle
2. `POST /api/create-user` → création Auth + insertion `users`
3. Envoi email de bienvenue
4. `must_change_password = true` → l'utilisateur devra changer son mot de passe

### Accès
- Lecture : `admin`, `super_admin`
- Création : `admin`, `super_admin`
- Suppression : `super_admin` uniquement (ne peut pas se supprimer soi-même)

---

## 13. PORTAIL ÉTUDIANT

### Composants
- `StudentPortal.tsx`
- `student/StudentDashboard.tsx`
- `student/StudentApplicationsList.tsx`
- `student/StudentDocumentsList.tsx`
- `student/StudentPaymentsList.tsx`
- `student/StudentStatsCard.tsx`
- `DocumentUpload.tsx` — Upload de documents avec compression automatique

### Fonctionnalités
- Vue personnelle de l'étudiant sur son dossier
- Suivi de ses candidatures
- Suivi de ses paiements
- Upload de documents avec :
  - **Compression automatique des images** (max 2 MB)
  - **Validation stricte de taille** (max 2 MB par fichier)
  - Formats acceptés : PDF, JPG, PNG
  - Barre de progression de complétion
  - Statut de validation par document
- Notifications personnelles

### Documents requis
1. Passeport (copie des pages d'identité)
2. Casier judiciaire (bulletin n°3 de moins de 3 mois)
3. Photo d'identité (photo récente fond blanc)
4. Relevé de notes (derniers relevés officiels)
5. Diplôme (diplôme le plus élevé obtenu)
6. Lettre de motivation (rédigée en français ou anglais)
7. Lettre de recommandation (d'un professeur ou employeur)
8. Certificat HSK (si disponible - optionnel)

### Accès
- `student` uniquement (interface séparée du dashboard admin)

---

## 14. DEMANDES DE SERVICES

### Composant
- `ServiceRequestManagement.tsx`

### Source de données
- Table `notifications` (les demandes sont mappées depuis les notifications)

### Fonctionnalités
- Liste des demandes en attente de validation
- Traitement d'une demande avec note
- Approbation → marque la notification comme lue

---

## API Routes

| Route | Méthode | Description | Auth requise |
|---|---|---|---|
| `/api/create-user` | POST | Crée un compte Auth + entrée `users` + envoie email | Service Role Key |
| `/api/delete-user` | DELETE | Supprime un compte Auth + entrée `users` | Service Role Key |
| `/api/reset-password` | POST | Réinitialise le mot de passe d'un utilisateur | Service Role Key |
| `/api/send-welcome` | POST | Envoie l'email de bienvenue | Service Role Key |
| `/api/send-application` | POST | Envoie l'email de demande de documents à l'étudiant | Service Role Key |
| `/api/validate-file` | POST | Valide un fichier côté serveur (type, taille, nom) | Service Role Key |

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
| `payments` | Paiements et frais |
| `cours_langues` | Inscriptions aux cours de langues |
| `entrees_comptables` | Entrées financières |
| `sorties_comptables` | Sorties financières |
| `notifications` | Notifications et alertes |
| `messages` | Messagerie interne |

---

## Navigation (Sidebar)

| Section | Modules | Rôles |
|---|---|---|
| Pilotage | Dashboard, Performances | Tous |
| Opérations | Candidatures, Étudiants, Dossiers | Tous |
| Ressources | Universités, Frais | Tous |
| Finance | Comptabilité | `agent`, `admin`, `super_admin` |
| Administration | Utilisateurs, Historique | `admin`, `super_admin` |
| Système | **Stockage** (monitoring) | `super_admin` uniquement |

---

## 15. MONITORING DU STOCKAGE (Super Admin)

### Composant
- `StorageMonitoring.tsx`

### Fonctionnalités
- **Barre de progression** de l'utilisation du stockage (500 MB max plan gratuit)
- **Alertes automatiques** :
  - Warning à 400 MB (80%)
  - Critique à 450 MB (90%)
- **Statistiques détaillées** :
  - Total de fichiers uploadés
  - Taille moyenne par fichier
  - Limite par fichier (2 MB)
  - Espace restant disponible
- **Statistiques de la base de données** :
  - Nombre d'étudiants
  - Nombre de candidatures
  - Nombre de documents
  - Nombre d'universités
  - Nombre d'utilisateurs
- **Recommandations d'optimisation** :
  - Compression automatique activée
  - Validation stricte en place
  - Pagination activée
  - Conseil de passage au plan Pro
- Bouton "Actualiser" pour rafraîchir les données
- Affichage de la dernière mise à jour

### Accès
- `super_admin` uniquement

### Objectif
- Surveiller l'utilisation du stockage Supabase
- Anticiper le passage au plan Pro (25$/mois)
- Éviter une base en lecture seule

---

## 16. OPTIMISATIONS DE STOCKAGE

### Compression d'Images
- **Fichier** : `utils/imageCompression.ts`
- **Fonction** : `compressImage(file, maxSizeMB, maxWidthOrHeight, quality)`
- **Fonctionnalités** :
  - Compression automatique des images JPEG/PNG
  - Redimensionnement si > 1920px
  - Qualité ajustable (80% par défaut)
  - Réduction récursive jusqu'à 2 MB max
  - Logs de compression (avant → après)

### Validation de Fichiers
- **Fichier** : `utils/fileValidation.ts`
- **Configuration** : `FILE_LIMITS`
  - Taille max : 2 MB
  - Types MIME autorisés : PDF, JPEG, PNG
  - Extensions autorisées : .pdf, .jpg, .jpeg, .png
- **Fonction** : `validateFile(file)` → `{ valid: boolean, error?: string }`
- **Validation** :
  - Côté client (avant upload)
  - Côté serveur (API `/api/validate-file`)
  - Nom de fichier sécurisé (regex)

### Pagination
- **Hook** : `hooks/usePagination.ts`
- **Composant** : `components/Pagination.tsx`
- **Implémentation** :
  - StudentManagement : 20 étudiants/page
  - ApplicationManagement : 10 candidatures/page
  - ScholarshipFileManagement : 10 dossiers/page (prévu)
- **Fonctionnalités** :
  - Navigation page suivante/précédente
  - Affichage "X à Y sur Z résultats"
  - Reset automatique lors des filtres
  - Responsive (mobile + desktop)

### Impact
- **Avant optimisations** : ~50-100 étudiants sur plan gratuit
- **Après optimisations** : ~200-300 étudiants sur plan gratuit
- **Réduction taille moyenne** : 3-5 MB → 1-1.5 MB par fichier
