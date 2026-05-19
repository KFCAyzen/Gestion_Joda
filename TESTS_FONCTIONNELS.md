# Cas de Tests Fonctionnels — Gestion Joda Company

> **Projet :** Application Next.js de gestion des bourses d'études (Joda Company)
> **Date :** 2026-05-18
> **Environnement cible :** Staging / Production

---

## Conventions

| Colonne | Description |
|---------|-------------|
| **ID** | Identifiant unique du test (TC-MODULE-NNN) |
| **Rôle** | Rôle minimum requis pour exécuter l'action |
| **Prérequis** | État de la base et de la session avant le test |
| **Étapes** | Actions séquentielles à réaliser |
| **Résultat attendu** | Comportement observable confirmant le succès |

**Hiérarchie des rôles :** `student < user < agent < supervisor < admin < super_admin`

---

## MODULE 1 — AUTHENTIFICATION

### TC-AUTH-001 — Connexion réussie (admin)
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Compte admin actif en base (`is_active = true`) |

**Étapes**
1. Naviguer vers `/login`
2. Saisir un email valide et le mot de passe correct
3. Cliquer sur "Se connecter"

**Résultat attendu**
- Redirection vers `/tableau-de-bord`
- Sidebar avec tous les menus admin visible
- Aucune erreur dans la console

---

### TC-AUTH-002 — Connexion réussie (étudiant)
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Compte étudiant actif (`email = <username>@students.joda.app`) |

**Étapes**
1. Naviguer vers `/login`
2. Saisir le nom d'utilisateur étudiant et le mot de passe
3. Cliquer sur "Se connecter"

**Résultat attendu**
- Redirection vers `/etudiant`
- Interface portail étudiant affichée (pas la sidebar admin)

---

### TC-AUTH-003 — Connexion échouée (mauvais mot de passe)
| Champ | Valeur |
|-------|--------|
| **Rôle** | — |
| **Prérequis** | Compte existant |

**Étapes**
1. Naviguer vers `/login`
2. Saisir un email valide avec un mot de passe incorrect
3. Cliquer sur "Se connecter"

**Résultat attendu**
- Aucune redirection
- Message d'erreur affiché (toast ou inline)
- Champ mot de passe ne révèle pas le mot de passe en clair

---

### TC-AUTH-004 — Compte inactif refusé
| Champ | Valeur |
|-------|--------|
| **Rôle** | — |
| **Prérequis** | Compte avec `is_active = false` |

**Étapes**
1. Tenter de se connecter avec les identifiants d'un compte désactivé

**Résultat attendu**
- Connexion refusée
- Message explicatif affiché

---

### TC-AUTH-005 — Accès route protégée sans session
| Champ | Valeur |
|-------|--------|
| **Rôle** | — |
| **Prérequis** | Aucune session active |

**Étapes**
1. Naviguer directement vers `/tableau-de-bord` sans être connecté

**Résultat attendu**
- Redirection automatique vers `/login`
- L'URL cible n'est pas accessible

---

### TC-AUTH-006 — Déconnexion
| Champ | Valeur |
|-------|--------|
| **Rôle** | Tout rôle |
| **Prérequis** | Session active |

**Étapes**
1. Cliquer sur le bouton de déconnexion dans la sidebar/header
2. Confirmer si une confirmation est demandée

**Résultat attendu**
- Session supprimée
- Redirection vers `/login`
- Navigation arrière du navigateur ne redonne pas accès au dashboard

---

### TC-AUTH-007 — Mot de passe oublié (email)
| Champ | Valeur |
|-------|--------|
| **Rôle** | — |
| **Prérequis** | Compte existant avec `contact_email` renseigné |

**Étapes**
1. Sur `/login`, cliquer sur "Mot de passe oublié"
2. Saisir l'adresse email
3. Valider

**Résultat attendu**
- Email de réinitialisation envoyé à `contact_email`
- Message de confirmation affiché dans l'UI
- Lien dans l'email pointe vers `/auth/callback`

---

### TC-AUTH-008 — Réinitialisation mot de passe via lien
| Champ | Valeur |
|-------|--------|
| **Rôle** | — |
| **Prérequis** | Lien de réinitialisation valide reçu par email |

**Étapes**
1. Cliquer sur le lien dans l'email (redirige vers `/auth/callback?code=...`)
2. Saisir un nouveau mot de passe
3. Confirmer

**Résultat attendu**
- Mot de passe mis à jour en base
- Connexion automatique ou redirection vers `/login`
- Ancien mot de passe ne fonctionne plus

---

### TC-AUTH-009 — Changement obligatoire au premier login
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Compte avec `must_change_password = true` |

**Étapes**
1. Se connecter avec le compte étudiant fraîchement créé
2. Observer l'UI du portail étudiant

**Résultat attendu**
- `ChangePasswordModal` bloquant s'affiche immédiatement
- Impossible d'accéder aux autres onglets avant changement
- Après changement : modal se ferme, `must_change_password = false`

---

### TC-AUTH-010 — Inscription autonome étudiant
| Champ | Valeur |
|-------|--------|
| **Rôle** | — (public) |
| **Prérequis** | Aucun compte existant avec cet email |

**Étapes**
1. Naviguer vers `/register`
2. Remplir le formulaire multi-étapes (nom, email, téléphone, etc.)
3. Valider chaque étape
4. Soumettre

**Résultat attendu**
- Compte créé avec `is_active = false` (en attente activation)
- Email de confirmation envoyé
- Message indiquant que l'activation est en attente d'un admin

---

### TC-AUTH-011 — Activation compte par admin
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Compte étudiant en attente (`is_active = false`) |

**Étapes**
1. Dans `/utilisateurs`, localiser le compte en attente
2. Cliquer sur "Activer" (ou l'action équivalente)
3. Confirmer dans le `ConfirmDialog`

**Résultat attendu**
- `is_active = true` en base
- Notification de succès (toast)
- Étudiant peut désormais se connecter

---

### TC-AUTH-012 — Redirection étudiant vers portail depuis `/login`
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Session étudiant active, tenter d'accéder à `/login` |

**Étapes**
1. Être connecté en tant qu'étudiant
2. Naviguer manuellement vers `/login`

**Résultat attendu**
- Redirection automatique vers `/etudiant` (middleware détecte la session)

---

## MODULE 2 — GESTION DES ÉTUDIANTS

### TC-ETU-001 — Création d'un étudiant
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Aucun étudiant avec le même email |

**Étapes**
1. Naviguer vers `/etudiants`
2. Cliquer sur "Ajouter un étudiant"
3. Remplir tous les champs obligatoires (nom, prénom, email, téléphone, nationalité, choix)
4. Valider

**Résultat attendu**
- Étudiant créé en base (table `students`)
- Compte auth Supabase créé (`<username>@students.joda.app`)
- `user_id` stocké dans `students`
- Invitation email envoyée
- Étudiant apparaît dans la liste
- Log d'activité créé

---

### TC-ETU-002 — Modification d'un étudiant
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant existant |

**Étapes**
1. Dans `/etudiants`, localiser l'étudiant
2. Ouvrir le menu d'actions → "Modifier"
3. Changer le numéro de téléphone
4. Sauvegarder

**Résultat attendu**
- Données mises à jour en base
- Toast de confirmation
- Liste rafraîchie avec les nouvelles données

---

### TC-ETU-003 — Suppression d'un étudiant (admin uniquement)
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Étudiant existant avec `user_id` renseigné |

**Étapes**
1. Dans `/etudiants`, localiser l'étudiant
2. Menu → "Supprimer"
3. Confirmer dans le `ConfirmDialog`

**Résultat attendu**
- Compte auth Supabase supprimé via `/api/delete-user`
- Entrée `students` supprimée
- Toast de confirmation
- Étudiant disparaît de la liste
- Un agent ne voit pas le bouton supprimer

---

### TC-ETU-004 — Suppression refusée pour un admin/super_admin
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Tentative de suppression d'un compte admin |

**Étapes**
1. Appeler `/api/delete-user` avec l'ID d'un admin

**Résultat attendu**
- API retourne une erreur 403
- Aucune suppression en base

---

### TC-ETU-005 — Recherche par nom/prénom
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Au moins 5 étudiants en base |

**Étapes**
1. Dans `/etudiants`, saisir un nom dans la barre de recherche

**Résultat attendu**
- Liste filtrée en temps réel (debounce)
- Seuls les étudiants correspondant au nom s'affichent

---

### TC-ETU-006 — Affichage détail étudiant
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant avec paiements et documents |

**Étapes**
1. Cliquer sur un étudiant dans la liste
2. Ouvrir le panneau de détail

**Résultat attendu**
- Profil complet (nom, téléphone, nationalité, choix, statut)
- Liste des paiements avec statuts
- Documents uploadés visibles
- Bouton "Imprimer reçu" disponible

---

### TC-ETU-007 — Impression reçu étudiant (PDF)
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant avec paiements validés |

**Étapes**
1. Dans le détail étudiant, cliquer sur "Imprimer reçu"

**Résultat attendu**
- PDF généré et téléchargé (via `pdfGenerator.ts`)
- Logo Joda affiché correctement (36×24mm en paysage)
- Montants en FCFA corrects
- Aucun emoji dans le PDF (Helvetica)

---

### TC-ETU-008 — Pagination de la liste
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Plus de 20 étudiants en base |

**Étapes**
1. Naviguer vers `/etudiants`
2. Cliquer sur "Page suivante"

**Résultat attendu**
- Affichage des étudiants suivants
- Indicateur de page courant mis à jour

---

## MODULE 3 — GESTION DES CANDIDATURES

### TC-CAND-001 — Création d'une candidature
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant existant, université disponible |

**Étapes**
1. Naviguer vers `/candidatures`
2. Cliquer sur "Nouvelle candidature"
3. Sélectionner l'étudiant, l'université, le niveau d'études
4. Définir type de bourse, niveau de langue
5. Valider

**Résultat attendu**
- Candidature créée en base
- Apparaît dans la liste avec statut initial
- Log d'activité créé

---

### TC-CAND-002 — Modification d'une candidature
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Candidature existante |

**Étapes**
1. Dans `/candidatures`, ouvrir une candidature
2. Modifier l'université assignée
3. Sauvegarder

**Résultat attendu**
- Données mises à jour
- Toast de confirmation

---

### TC-CAND-003 — Suppression d'une candidature (admin)
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Candidature existante |

**Étapes**
1. Ouvrir la candidature
2. Cliquer "Supprimer"
3. Confirmer dans le `ConfirmDialog`

**Résultat attendu**
- Candidature supprimée
- Un agent ne voit pas le bouton supprimer

---

### TC-CAND-004 — Filtrage par statut
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Candidatures avec différents statuts |

**Étapes**
1. Dans `/candidatures`, sélectionner un filtre de statut (ex. "En cours")

**Résultat attendu**
- Seules les candidatures avec ce statut s'affichent

---

### TC-CAND-005 — Assignation université
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Candidature sans université, universités actives en base |

**Étapes**
1. Ouvrir une candidature sans université
2. Sélectionner une université dans le dropdown
3. Sauvegarder

**Résultat attendu**
- `university_id` mis à jour dans la candidature
- Dossier bourse lié mis à jour si applicable

---

## MODULE 4 — GESTION DES UNIVERSITÉS

### TC-UNIV-001 — Création d'une université
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Aucune université avec le même nom |

**Étapes**
1. Naviguer vers `/universites`
2. Cliquer sur "Ajouter une université"
3. Remplir nom, ville, pays
4. Valider

**Résultat attendu**
- Université créée en base
- Apparaît dans la liste avec statut "active"

---

### TC-UNIV-002 — Seed des universités prédéfinies
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Base vide ou partiellement remplie |

**Étapes**
1. Dans `/universites`, cliquer sur "Importer les universités prédéfinies"
2. Confirmer

**Résultat attendu**
- 8 universités prédéfinies insérées (sans doublon)
- Toast de confirmation

---

### TC-UNIV-003 — Désactivation d'une université
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Université active |

**Étapes**
1. Dans `/universites`, toggler l'université sur "Inactive"
2. Confirmer dans le `ConfirmDialog`

**Résultat attendu**
- `is_active = false` en base
- Université n'apparaît plus dans les dropdowns de candidature

---

### TC-UNIV-004 — Filtrage par statut actif/inactif
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Universités actives et inactives en base |

**Étapes**
1. Sélectionner le filtre "Inactives"

**Résultat attendu**
- Seules les universités inactives s'affichent

---

### TC-UNIV-005 — Recherche par nom
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Plusieurs universités |

**Étapes**
1. Saisir un nom partiel dans la barre de recherche

**Résultat attendu**
- Filtrage en temps réel par nom

---

## MODULE 5 — GESTION DES UTILISATEURS (STAFF)

### TC-USR-001 — Création d'un utilisateur staff
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Email non utilisé |

**Étapes**
1. Naviguer vers `/utilisateurs`
2. Cliquer sur "Ajouter un utilisateur"
3. Remplir nom, email, rôle (agent/supervisor/admin)
4. Valider

**Résultat attendu**
- Compte créé dans Supabase Auth + table `users`
- `contact_email` = vrai email saisi
- Email de bienvenue envoyé via `/api/create-user`
- `must_change_password = true`

---

### TC-USR-002 — Un admin ne peut pas créer un super_admin
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | — |

**Étapes**
1. Dans le formulaire de création utilisateur, vérifier les rôles disponibles dans le dropdown

**Résultat attendu**
- Le rôle `super_admin` n'est pas dans la liste (ou est grisé)

---

### TC-USR-003 — Modification du rôle
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Utilisateur agent existant |

**Étapes**
1. Ouvrir l'utilisateur agent
2. Changer le rôle vers "supervisor"
3. Sauvegarder

**Résultat attendu**
- Rôle mis à jour en base
- Permissions appliquées immédiatement à la prochaine session

---

### TC-USR-004 — Gestion des permissions granulaires
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Utilisateur existant |

**Étapes**
1. Ouvrir l'utilisateur
2. Dans l'onglet Permissions, activer/désactiver une permission spécifique
3. Sauvegarder

**Résultat attendu**
- Permission stockée dans la table `user_permissions`
- Utilisateur affecté voit ses accès modifiés à la prochaine session

---

### TC-USR-005 — Réinitialisation mot de passe staff
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Utilisateur existant |

**Étapes**
1. Ouvrir l'utilisateur
2. Cliquer "Réinitialiser le mot de passe"
3. Saisir un nouveau mot de passe
4. Confirmer

**Résultat attendu**
- Mot de passe mis à jour via Supabase Admin
- `must_change_password = true` si configuré

---

### TC-USR-006 — Désactivation d'un compte
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Compte actif |

**Étapes**
1. Toggler le compte sur "Inactif"
2. Confirmer dans le `ConfirmDialog`

**Résultat attendu**
- `is_active = false` en base
- L'utilisateur ne peut plus se connecter

---

### TC-USR-007 — Suppression de compte staff (admin)
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Compte agent ou user |

**Étapes**
1. Cliquer "Supprimer" sur l'utilisateur
2. Confirmer dans le `ConfirmDialog`

**Résultat attendu**
- Compte supprimé de Supabase Auth et de la table `users`
- Un admin ne peut pas supprimer un autre admin ou super_admin

---

## MODULE 6 — GESTION DES DOSSIERS BOURSES

### TC-DOS-001 — Ouverture d'un dossier
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Candidature existante sans dossier |

**Étapes**
1. Naviguer vers `/dossiers`
2. Localiser l'étudiant
3. Cliquer "Ouvrir le dossier"

**Résultat attendu**
- Entrée créée dans `dossier_bourses`
- Statut initial `en_attente`

---

### TC-DOS-002 — Changement de statut du dossier
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Dossier existant |

**Étapes**
1. Ouvrir le dossier
2. Changer le statut vers `en_cours`
3. Sauvegarder

**Résultat attendu**
- Statut mis à jour
- Historique dossier enregistré (`dossier_history`)
- Notification temps réel reçue côté portail étudiant

---

### TC-DOS-003 — Ajout de notes internes
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Dossier existant |

**Étapes**
1. Ouvrir le dossier
2. Saisir une note dans le champ `notes_internes`
3. Sauvegarder

**Résultat attendu**
- Note sauvegardée
- Visible par le staff
- Visible côté étudiant dans le portail (vue dossier)

---

### TC-DOS-004 — Statut `document_manquant`
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Dossier en cours |

**Étapes**
1. Passer le statut à `document_manquant`

**Résultat attendu**
- Statut affiché avec badge coloré approprié
- Côté étudiant : timeline progressive affiche les étapes précédentes cochées

---

### TC-DOS-005 — Statut `admission_rejetee`
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Dossier en cours |

**Étapes**
1. Passer le statut à `admission_rejetee`

**Résultat attendu**
- Côté portail étudiant : croix rouge à l'étape 3 (pas de coche verte)
- Étapes précédentes toutes cochées (héritage via `STATUS_STEP_MAP`)

---

### TC-DOS-006 — Saut vers un statut avancé
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Dossier en attente |

**Étapes**
1. Passer directement le statut à `admission_validee` sans passer par les étapes intermédiaires

**Résultat attendu**
- Côté portail étudiant : toutes les étapes précédentes s'affichent cochées automatiquement

---

### TC-DOS-007 — Validation de documents depuis le dossier
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Documents uploadés par l'étudiant |

**Étapes**
1. Dans la vue dossier, ouvrir `DocumentManagement`
2. Passer un document de `en_attente` à `valide`

**Résultat attendu**
- Statut document mis à jour en base
- Étudiant reçoit une notification temps réel (abonnement `postgres_changes`)

---

### TC-DOS-008 — Recherche et filtres dossiers
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Plusieurs dossiers |

**Étapes**
1. Utiliser la barre de recherche et les filtres de statut

**Résultat attendu**
- Liste filtrée dynamiquement
- Combinaison recherche + filtre statut fonctionne

---

## MODULE 7 — GESTION DES PAIEMENTS (FRAIS)

### TC-PAY-001 — Validation d'un paiement en attente
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Paiement avec statut `attente` |

**Étapes**
1. Naviguer vers `/frais`
2. Onglet "À valider"
3. Cliquer "Valider" sur un paiement
4. Confirmer dans le `ConfirmDialog`

**Résultat attendu**
- Statut paiement → `paye`
- Entrée créée dans `entrees_comptables`
- Toast de confirmation
- Notification envoyée à l'étudiant via `/api/notify-payment-result`

---

### TC-PAY-002 — Rejet d'un paiement déclaré par étudiant
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Paiement avec statut `en_validation` (déclaré par étudiant) |

**Étapes**
1. Onglet "À valider", localiser le paiement marqué "Déclaré par l'étudiant"
2. Cliquer "Rejeter"
3. Saisir un motif de rejet
4. Confirmer

**Résultat attendu**
- Statut → `attente` (ou `retard` selon la date)
- Motif de rejet stocké (`rejection_reason`)
- Notification envoyée à l'étudiant

---

### TC-PAY-003 — Calcul des pénalités de retard
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Paiements avec dates échues dépassées |

**Étapes**
1. Ouvrir `/frais`, onglet "En retard"
2. Observer les montants affichés

**Résultat attendu**
- Pénalités calculées : 10 000 FCFA/j (bourse), 500 FCFA/j (inscription cours), 1 000 FCFA/j (tranche cours)
- Montant total = montant de base + pénalités cumulées

---

### TC-PAY-004 — Téléchargement reçu paiement (PDF)
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Paiement validé |

**Étapes**
1. Dans le détail paiement, cliquer "Télécharger le reçu"

**Résultat attendu**
- Fichier PDF téléchargé
- Logo Joda en entête, montant en FCFA, dates

---

### TC-PAY-005 — Déclaration paiement par l'étudiant
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Tranche en attente dans le portail étudiant |

**Étapes**
1. Dans le portail étudiant, onglet Paiements
2. Cliquer "Déclarer ce paiement" sur une tranche
3. Remplir : montant, date, upload optionnel preuve
4. Soumettre

**Résultat attendu**
- Paiement passe à `en_validation` en base
- Badge "Déclaré par l'étudiant" visible côté staff
- Notification envoyée au staff via `/api/declare-payment`

---

### TC-PAY-006 — Preuve de paiement visible par le staff
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Paiement déclaré avec preuve uploadée |

**Étapes**
1. Dans `/frais`, ouvrir le paiement `en_validation`
2. Cliquer "Voir la preuve"

**Résultat attendu**
- Fichier preuve s'ouvre (image ou PDF)

---

### TC-PAY-007 — Filtrage des paiements par onglets
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Paiements dans tous les statuts |

**Étapes**
1. Cliquer successivement sur les onglets "À valider", "En retard", "Validés"

**Résultat attendu**
- Chaque onglet n'affiche que les paiements du statut correspondant

---

### TC-PAY-008 — Frais de cours (4 tranches Mandarin/Anglais)
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant avec `choix = procedure_cours` ou `cours_seuls` |

**Étapes**
1. Inscrire l'étudiant à un cours via `/cours-langues`

**Résultat attendu**
- 4 paiements créés automatiquement :
  - T1 Inscription : 10 000 FCFA
  - T2 Livre : 11 000 FCFA
  - T3 1re tranche : 50 000 FCFA (Mandarin) ou 30 000 FCFA (Anglais)
  - T4 2e tranche : 50 000 FCFA (Mandarin) ou 40 000 FCFA (Anglais)

---

### TC-PAY-009 — Sync pénalités (un seul appel au montage)
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Paiements en retard |

**Étapes**
1. Ouvrir `/frais`
2. Observer la console réseau

**Résultat attendu**
- La sync des pénalités est appelée exactement une fois au montage (`syncedRef`)
- Pas d'appels répétés lors des re-renders

---

## MODULE 8 — COURS DE LANGUES

### TC-CRS-001 — Inscription à un cours Mandarin
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant sans cours Mandarin inscrit |

**Étapes**
1. Naviguer vers `/cours-langues`
2. Cliquer "Inscrire" pour un étudiant
3. Sélectionner "Mandarin"
4. Valider

**Résultat attendu**
- 4 entrées paiements mandarin créées en base
- Total Mandarin = 121 000 FCFA

---

### TC-CRS-002 — Inscription à un cours Anglais
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant sans cours Anglais inscrit |

**Résultat attendu**
- 4 entrées paiements anglais créées
- Total Anglais = 91 000 FCFA

---

### TC-CRS-003 — Affichage colonne "Tranche" dans le tableau
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Inscriptions en base |

**Étapes**
1. Ouvrir `/cours-langues`

**Résultat attendu**
- Colonne "Tranche" affichée pour chaque paiement (T1/T2/T3/T4)

---

### TC-CRS-004 — Détection dynamique cours depuis `PaymentOverview`
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Étudiant `procedure_seule` avec des paiements mandarin en base |

**Étapes**
1. Ouvrir le portail étudiant, onglet Paiements

**Résultat attendu**
- Les frais de cours mandarin/anglais apparaissent même si `choix = procedure_seule`
- `getExpectedServices()` les détecte dynamiquement

---

## MODULE 9 — COMPTABILITÉ (LIVRE COMPTABLE)

### TC-COMPT-001 — Ajout d'une entrée comptable (recette)
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | — |

**Étapes**
1. Naviguer vers `/comptabilite`
2. Cliquer "Nouvelle recette"
3. Remplir libellé, montant, catégorie, date
4. Valider

**Résultat attendu**
- Entrée ajoutée dans `entrees_comptables`
- Solde total mis à jour

---

### TC-COMPT-002 — Ajout d'une sortie comptable (dépense)
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | — |

**Étapes**
1. Cliquer "Nouvelle dépense"
2. Remplir libellé, montant, catégorie, date
3. Valider

**Résultat attendu**
- Entrée ajoutée dans `sorties_comptables`
- Solde total mis à jour en conséquence

---

### TC-COMPT-003 — Modification d'une écriture
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Écriture existante |

**Étapes**
1. Ouvrir une écriture
2. Modifier le montant
3. Sauvegarder

**Résultat attendu**
- Écriture mise à jour
- Solde recalculé

---

### TC-COMPT-004 — Suppression d'une écriture
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Écriture existante |

**Étapes**
1. Cliquer "Supprimer" sur une écriture
2. Confirmer dans le `ConfirmDialog`

**Résultat attendu**
- Écriture supprimée
- Solde recalculé

---

### TC-COMPT-005 — Export rapport comptable (PDF)
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Écritures en base |

**Étapes**
1. Cliquer "Exporter le rapport"

**Résultat attendu**
- PDF généré avec entête Joda (logo blanc sur fond coloré)
- Colonnes : date, libellé, catégorie, montant
- Totaux recettes/dépenses/solde affichés

---

### TC-COMPT-006 — Filtrage par catégorie et date
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Écritures de plusieurs catégories |

**Étapes**
1. Sélectionner une catégorie dans le filtre
2. Définir une plage de dates

**Résultat attendu**
- Liste filtrée, pagination recentrée sur la page 1

---

## MODULE 10 — CONFIGURATION DES FRAIS

### TC-CONF-001 — Modification montant tranche bourse Bachelor
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Configuration existante |

**Étapes**
1. Naviguer vers `/configuration-frais`
2. Modifier le montant d'une tranche Bachelor local
3. Sauvegarder

**Résultat attendu**
- Nouveau montant sauvegardé dans `payment_config`
- `PaymentConfigContext` rechargé → nouveaux montants visibles partout

---

### TC-CONF-002 — Réinitialisation aux valeurs par défaut
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Configuration modifiée |

**Étapes**
1. Cliquer "Réinitialiser aux valeurs par défaut"
2. Confirmer dans le `ConfirmDialog`

**Résultat attendu**
- Valeurs remises aux montants métier par défaut (100K / 500K / 1M / 1,39M)

---

### TC-CONF-003 — Configuration cours langues
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | — |

**Étapes**
1. Modifier le montant T3 Mandarin (1re tranche)
2. Sauvegarder

**Résultat attendu**
- Nouveau montant appliqué aux prochaines inscriptions cours

---

## MODULE 11 — COMMUNICATION (Chat / Email / SMS)

### TC-COM-001 — Envoi d'un message à un étudiant (staff)
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant existant |

**Étapes**
1. Naviguer vers `/communication`, onglet "Conversations"
2. Sélectionner ou ouvrir une conversation avec un étudiant
3. Saisir un message
4. Envoyer

**Résultat attendu**
- Message enregistré dans la table `messages`
- Visible dans la conversation côté staff ET côté étudiant en temps réel

---

### TC-COM-002 — Réponse de l'étudiant au staff
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Conversation existante |

**Étapes**
1. Dans le portail étudiant, onglet Messages
2. Répondre à un message du staff

**Résultat attendu**
- Message enregistré et visible côté staff

---

### TC-COM-003 — Envoi email massif
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Étudiants avec emails |

**Étapes**
1. Onglet "Messages"
2. Rédiger un email (objet + corps)
3. Sélectionner les destinataires (ou "Tous")
4. Envoyer

**Résultat attendu**
- Emails envoyés via API
- Confirmation du nombre de destinataires

---

### TC-COM-004 — Envoi SMS massif
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Solde SMS disponible (smsvas.com) |

**Étapes**
1. Onglet "SMS"
2. Rédiger le SMS (max 160 caractères)
3. Sélectionner destinataires
4. Envoyer via `/api/send-sms`

**Résultat attendu**
- SMS envoyés
- Dépassement 160 caractères : erreur affichée ou compteur visible

---

### TC-COM-005 — Vérification solde SMS
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | API smsvas.com configurée |

**Étapes**
1. Consulter l'indicateur de solde SMS dans l'UI

**Résultat attendu**
- Solde affiché via `/api/sms-balance`

---

## MODULE 12 — NEWSLETTER

### TC-NEWS-001 — Création d'une campagne email ciblée
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Étudiants en base |

**Étapes**
1. Naviguer vers `/newsletter`
2. Créer une nouvelle campagne email
3. Sélectionner le filtre "Dossier en attente"
4. Rédiger le contenu
5. Envoyer

**Résultat attendu**
- Emails envoyés uniquement aux étudiants ayant un dossier `en_attente`
- Confirmation nombre de destinataires

---

### TC-NEWS-002 — Campagne SMS ciblée (paiements en retard)
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Paiements en retard en base |

**Étapes**
1. Créer une campagne SMS
2. Filtre : "Paiements en retard"
3. Envoyer

**Résultat attendu**
- SMS envoyés uniquement aux étudiants concernés

---

### TC-NEWS-003 — Relance automatique dossiers inactifs (cron)
| Champ | Valeur |
|-------|--------|
| **Rôle** | système |
| **Prérequis** | Dossiers inactifs en base, cron configuré |

**Étapes**
1. Déclencher `/api/cron/newsletter-auto` (ou attendre l'heure planifiée)

**Résultat attendu**
- Étudiants avec dossiers inactifs reçoivent un email/SMS de relance
- Log de l'envoi créé

---

## MODULE 13 — LOGS D'ACTIVITÉS

### TC-LOG-001 — Visualisation des logs
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Actions effectuées en base |

**Étapes**
1. Naviguer vers `/logs-activites`

**Résultat attendu**
- Liste chronologique des actions (créer, modifier, valider, rejeter, connexion…)
- Chaque log : date, heure, action, auteur, cible

---

### TC-LOG-002 — Filtrage par type d'action
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Logs de types variés |

**Étapes**
1. Sélectionner le filtre "validation"

**Résultat attendu**
- Seuls les logs de type "validation" s'affichent

---

### TC-LOG-003 — Recherche dans les logs
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Logs existants |

**Étapes**
1. Saisir un nom dans la barre de recherche

**Résultat attendu**
- Logs filtrés par le nom de l'auteur ou de la cible

---

### TC-LOG-004 — Groupement par date
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Logs sur plusieurs jours |

**Étapes**
1. Observer le groupement dans `/logs-activites`

**Résultat attendu**
- Logs groupés par journée avec en-tête de date visible

---

## MODULE 14 — NOTIFICATIONS

### TC-NOTIF-001 — Réception notification staff
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant envoie une action déclenchant une notif |

**Étapes**
1. L'étudiant déclare un paiement (TC-PAY-005)
2. Se connecter en tant qu'agent

**Résultat attendu**
- Badge rouge sur la cloche/notif dans la sidebar/header
- Notification visible dans `/notifications`

---

### TC-NOTIF-002 — Badge non lus en temps réel
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Session agent active |

**Étapes**
1. L'étudiant envoie un message pendant que l'agent est connecté

**Résultat attendu**
- Badge se met à jour sans rechargement de page

---

### TC-NOTIF-003 — Marquer comme lu
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Notifications non lues |

**Étapes**
1. Ouvrir `/notifications`
2. Cliquer sur une notification

**Résultat attendu**
- Notification marquée comme lue
- Badge décrémenté

---

### TC-NOTIF-004 — Notification étudiant (portail)
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Staff valide un document ou change le statut du dossier |

**Étapes**
1. Se connecter dans le portail étudiant

**Résultat attendu**
- Badge rouge sur la cloche dans le header du portail
- Notification visible en cliquant la cloche (vue `notifications`)

---

## MODULE 15 — PERFORMANCES

### TC-PERF-001 — Vue classement agents (onglet "Par agent")
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Agents avec activité en base |

**Étapes**
1. Naviguer vers `/performances`
2. Sélectionner l'onglet "Par agent"

**Résultat attendu**
- Classement avec podium Trophy
- Chaque agent : score composite (0-100) calculé sur 4 axes (revenue, activité, vitesse, dossiers)
- Agents inactifs séparés des agents actifs

---

### TC-PERF-002 — Filtre de période
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Données sur plusieurs périodes |

**Étapes**
1. Sélectionner successivement : 7j / 30j / 3 mois / Année / Tout

**Résultat attendu**
- Statistiques recalculées pour chaque période
- Classement mis à jour

---

### TC-PERF-003 — Vue journalière (onglet "Vue journalière")
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Activité récente |

**Étapes**
1. Sélectionner l'onglet "Vue journalière"

**Résultat attendu**
- Graphique ou tableau jour par jour
- Filtres de période applicables

---

### TC-PERF-004 — Carte agent expandable
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Agent avec activité |

**Étapes**
1. Cliquer sur une carte agent pour l'expandre

**Résultat attendu**
- Détail journalier de l'agent visible
- Badge rôle, pénalités, statuts à valider/attente/retard affichés

---

## MODULE 16 — SURVEILLANCE STOCKAGE

### TC-STOCK-001 — Vue utilisation stockage
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Documents uploadés |

**Étapes**
1. Naviguer vers `/stockage`

**Résultat attendu**
- Utilisation actuelle en MB affichée
- Stats : nombre étudiants, candidatures, documents, universités
- Barre de progression vers la limite

---

### TC-STOCK-002 — Alerte dépassement seuil
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Stockage > 400 MB |

**Étapes**
1. Ouvrir `/stockage`

**Résultat attendu**
- Alerte orange (400 MB) ou rouge (500 MB) affichée
- Message explicite sur le risque de dépassement

---

## MODULE 17 — PORTAIL ÉTUDIANT

### TC-PORT-001 — Dashboard étudiant (carte statut dossier cliquable)
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Dossier bourse existant |

**Étapes**
1. Se connecter dans le portail
2. Sur le dashboard, cliquer la carte "Statut dossier"

**Résultat attendu**
- Navigation vers la vue `dossier`
- Détail : statut, université, date création, notes internes, timeline 6 étapes

---

### TC-PORT-002 — Timeline progressive dossier
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Dossier avec statut `visa_en_cours` |

**Étapes**
1. Ouvrir la vue dossier dans le portail

**Résultat attendu**
- Étapes 1 à 4 cochées (cases vertes)
- Étape 5 ("Visa") en cours ou cochée selon statut
- Étape 6 non cochée

---

### TC-PORT-003 — Upload document (max 10 MB)
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | — |

**Étapes**
1. Onglet Documents, cliquer "Uploader"
2. Sélectionner un fichier de 8 MB

**Résultat attendu**
- Fichier uploadé avec succès
- Visible dans la liste des documents

---

### TC-PORT-004 — Upload document refusé (> 10 MB)
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | — |

**Étapes**
1. Sélectionner un fichier de 15 MB

**Résultat attendu**
- Erreur affichée : fichier trop volumineux
- Aucun upload en base

---

### TC-PORT-005 — Compression image (> 3 MB)
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Image de 5 MB |

**Étapes**
1. Uploader une image de 5 MB

**Résultat attendu**
- Image compressée avant envoi (cible 3 MB, résolution 2048px, qualité 85%)
- Taille finale < 10 MB (limite Supabase)

---

### TC-PORT-006 — Bouton "Envoyer à l'équipe" post-upload
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Document uploadé |

**Étapes**
1. Uploader un document
2. Observer l'UI

**Résultat attendu**
- Bouton "Envoyer à l'équipe" apparaît dès l'upload
- Clic → `/api/notify-staff` notifie les admin/agent/supervisor
- Bouton se réinitialise après le prochain upload

---

### TC-PORT-007 — Rafraîchissement auto document (temps réel)
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Portail ouvert, staff valide un document |

**Étapes**
1. Avoir le portail ouvert dans un onglet (abonnement `postgres_changes` actif)
2. Dans un autre onglet staff, valider un document

**Résultat attendu**
- Liste documents dans le portail se met à jour sans rechargement manuel

---

### TC-PORT-008 — Rafraîchissement statut dossier (temps réel)
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Portail ouvert |

**Étapes**
1. Le staff change le statut du dossier

**Résultat attendu**
- Statut mis à jour dans le portail étudiant en temps réel

---

### TC-PORT-009 — FAQ prédéfinies dans le chat étudiant
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | — |

**Étapes**
1. Ouvrir le chat dans le portail étudiant
2. Observer les chips de suggestion (FAQ)

**Résultat attendu**
- 8 questions prédéfinies affichées
- Cliquer sur un chip prérempli la question dans le champ de saisie

---

### TC-PORT-010 — Navigation cloche notifications (portail)
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Notification non lue |

**Étapes**
1. Cliquer sur l'icône cloche dans le header du portail

**Résultat attendu**
- Navigation vers la vue `notifications`
- Badge rouge affiché avec le nombre non lus
- Retour en arrière rafraîchit le badge

---

## MODULE 18 — GESTION DOCUMENTS (STAFF)

### TC-DOC-001 — Upload document pour un étudiant (staff)
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Étudiant existant |

**Étapes**
1. Dans le détail étudiant ou le dossier, ouvrir `DocumentManagement`
2. Cliquer "Ajouter un document"
3. Sélectionner le type (passeport, casier judiciaire, photo, relevé bac, diplôme bac, lettre, HSK)
4. Uploader le fichier

**Résultat attendu**
- Document créé dans la table `documents` avec statut `en_attente`
- Visible dans la liste documents

---

### TC-DOC-002 — Validation document
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Document `en_attente` |

**Étapes**
1. Cliquer "Valider" sur un document

**Résultat attendu**
- Statut → `valide`
- Badge vert dans l'UI

---

### TC-DOC-003 — Rejet document
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Document `en_attente` |

**Étapes**
1. Cliquer "Rejeter" sur un document

**Résultat attendu**
- Statut → `non_conforme`
- Badge rouge dans l'UI

---

## MODULE 19 — TABLEAU DE BORD ADMINISTRATEUR

### TC-DASH-001 — Affichage KPIs
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Données en base |

**Étapes**
1. Naviguer vers `/tableau-de-bord`

**Résultat attendu**
- KPIs affichés : nb dossiers à traiter, dossiers ouverts, revenus encaissés
- Graphique flux 7 jours avec barres adaptatives (light/dark)
- Barres à 0 affichées avec `minPointSize` (pas absentes)

---

### TC-DASH-002 — Alertes en cours
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Paiements en retard ou dossiers bloqués |

**Étapes**
1. Observer la section "Alertes" sur le dashboard

**Résultat attendu**
- Alertes listées avec type, étudiant concerné, ancienneté

---

### TC-DASH-003 — Logs d'activité récents sur le dashboard
| Champ | Valeur |
|-------|--------|
| **Rôle** | admin |
| **Prérequis** | Actions effectuées récemment |

**Étapes**
1. Observer la section "Activité récente" sur le dashboard

**Résultat attendu**
- 5 à 10 derniers logs affichés avec date, action, auteur

---

## MODULE 20 — INTERNATIONALISATION

### TC-I18N-001 — Basculement langue FR → EN
| Champ | Valeur |
|-------|--------|
| **Rôle** | Tout rôle |
| **Prérequis** | Session active |

**Étapes**
1. Cliquer sur le `LanguageSwitcher`
2. Sélectionner "English"

**Résultat attendu**
- Toute l'UI traduite en anglais (labels, boutons, messages)
- URL reflète le locale (ex. `/en/tableau-de-bord`)

---

### TC-I18N-002 — Basculement thème Light → Dark
| Champ | Valeur |
|-------|--------|
| **Rôle** | Tout rôle |
| **Prérequis** | — |

**Étapes**
1. Cliquer sur `ThemeToggle`

**Résultat attendu**
- Thème bascule (classes Tailwind dark: appliquées)
- Préférence persistée (localStorage ou cookie)

---

## MODULE 21 — SÉCURITÉ ET CONTRÔLE D'ACCÈS

### TC-SEC-001 — Agent ne peut pas accéder à `/utilisateurs`
| Champ | Valeur |
|-------|--------|
| **Rôle** | agent |
| **Prérequis** | Session agent active |

**Étapes**
1. Naviguer vers `/utilisateurs`

**Résultat attendu**
- Redirection ou affichage "Accès refusé" (via `ProtectedRoute` ou permissions)

---

### TC-SEC-002 — Étudiant ne peut pas accéder au dashboard admin
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Session étudiant active |

**Étapes**
1. Tenter de naviguer vers `/tableau-de-bord`

**Résultat attendu**
- Redirection vers `/etudiant` (middleware ou route guard)

---

### TC-SEC-003 — Route API protégée sans session
| Champ | Valeur |
|-------|--------|
| **Rôle** | — |
| **Prérequis** | Aucune session |

**Étapes**
1. Appeler `/api/declare-payment` sans cookie de session

**Résultat attendu**
- Réponse 401 Unauthorized

---

### TC-SEC-004 — Étudiant ne peut déclarer que ses propres paiements
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | Paiement appartenant à un autre étudiant |

**Étapes**
1. Appeler `/api/declare-payment` avec un `payment_id` d'un autre étudiant

**Résultat attendu**
- Réponse 403 Forbidden
- Aucune modification en base

---

### TC-SEC-005 — RLS : étudiant ne voit que ses propres données
| Champ | Valeur |
|-------|--------|
| **Rôle** | student |
| **Prérequis** | RLS activé en base |

**Étapes**
1. Appeler directement Supabase depuis le portail

**Résultat attendu**
- Seules les lignes appartenant à l'étudiant sont retournées (filtrage RLS transparent)

---

### TC-SEC-006 — Zéro `confirm()` / `alert()` natif
| Champ | Valeur |
|-------|--------|
| **Rôle** | Tout rôle |
| **Prérequis** | — |

**Étapes**
1. Effectuer toutes les actions destructives (suppression, validation, rejet)

**Résultat attendu**
- Aucune boîte de dialogue native du navigateur (`window.confirm`, `window.alert`)
- Toujours un `ConfirmDialog` React ou un toast Notification

---

## MODULE 22 — CRON / AUTOMATISATIONS

### TC-CRON-001 — Vérification automatique paiements en retard
| Champ | Valeur |
|-------|--------|
| **Rôle** | système |
| **Prérequis** | Paiements dont la date est dépassée |

**Étapes**
1. Déclencher `/api/cron/check-late-payments`

**Résultat attendu**
- Paiements échus passent en statut `retard`
- Alertes/notifications créées pour les agents

---

### TC-CRON-002 — Newsletter automatique relance dossiers
| Champ | Valeur |
|-------|--------|
| **Rôle** | système |
| **Prérequis** | Dossiers inactifs, campagne programmée |

**Étapes**
1. Déclencher `/api/cron/newsletter-auto`

**Résultat attendu**
- Emails/SMS de relance envoyés aux étudiants concernés par le filtre configuré

---

## ANNEXE — MATRICE DES RÔLES ET ACCÈS

| Fonctionnalité | student | user | agent | supervisor | admin | super_admin |
|----------------|---------|------|-------|------------|-------|-------------|
| Portail étudiant | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tableau de bord | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Créer étudiant | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Supprimer étudiant | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Valider paiements | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Gérer utilisateurs | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Créer super_admin | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Comptabilité | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Config frais | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Logs activités | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Performances | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Stockage | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Newsletter | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

---

## ANNEXE — MONTANTS MÉTIER DE RÉFÉRENCE

| Service | Montant |
|---------|---------|
| Bourse procédure seule | 100 000 / 500 000 / 1 000 000 / 1 390 000 FCFA |
| Mandarin total | 121 000 FCFA (10K + 11K + 50K + 50K) |
| Anglais total | 91 000 FCFA (10K + 11K + 30K + 40K) |
| Pénalité bourse | 10 000 FCFA/jour |
| Pénalité inscription cours | 500 FCFA/jour |
| Pénalité tranche cours | 1 000 FCFA/jour |

---

*Total : **78 cas de tests fonctionnels** couvrant 22 modules.*
