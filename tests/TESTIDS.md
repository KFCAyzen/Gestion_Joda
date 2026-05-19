# Inventaire des `data-testid`

Référence centralisée des `data-testid` utilisés par la suite E2E. Lors d'un refactor UI, **garder ces attributs intacts** ou mettre à jour la suite de tests.

## Convention

- `kebab-case`
- Préfixé par contexte (`login-`, `nav-`, `portal-`, `confirm-`, etc.)
- Verbe d'action sur les boutons (`btn-`, `submit`, `cancel`)

## LoginPage (`src/app/components/LoginPage.tsx`)

| testid | Élément |
|--------|---------|
| `login-identifier` | Input identifiant (email ou username étudiant) |
| `login-password` | Input mot de passe |
| `login-submit` | Bouton "Se connecter" |
| `login-forgot-btn` | Lien "Mot de passe oublié" |
| `forgot-input` | Input email/username dans la modal forgot |
| `forgot-submit` | Bouton "Envoyer" dans la modal forgot |
| `forgot-cancel` | Bouton "Annuler" dans la modal forgot |
| `theme-toggle` | Toggle thème light/dark sur la page login |
| `lang-switcher` | Bouton ouvre le menu de langues |
| `lang-option-fr` / `lang-option-en` | Option de langue |

## AppShell (`src/app/[locale]/(app)/layout.tsx`)

| testid | Élément |
|--------|---------|
| `nav-home` | Menu Tableau de bord |
| `nav-performance` | Menu Performances |
| `nav-reservations` | Menu Candidatures |
| `nav-clients` | Menu Étudiants |
| `nav-dossiers` | Menu Dossiers |
| `nav-com` | Menu Communication |
| `nav-newsletter` | Menu Newsletter |
| `nav-chambres` | Menu Universités |
| `nav-facturation` | Menu Frais |
| `nav-cours_langues` | Menu Cours langues |
| `nav-comptabilite` | Menu Comptabilité |
| `nav-users` | Menu Utilisateurs |
| `nav-activity_logs` | Menu Logs activités |
| `nav-fee_config` | Menu Configuration frais |
| `nav-storage` | Menu Stockage |
| `nav-notifications` | (via bouton header) |
| `btn-logout` | Bouton déconnexion (sidebar) |
| `btn-notifications` | Cloche notifications (header) |
| `notif-badge` | Badge nombre non lus |
| `mobile-menu-toggle` | Bouton burger mobile |
| `page-title` | Titre H1 de la page courante |

## ConfirmDialog (`src/app/components/ConfirmDialog.tsx`)

| testid | Élément |
|--------|---------|
| `confirm-dialog` | Overlay du dialog |
| `confirm-title` | Titre |
| `confirm-description` | Description |
| `confirm-yes` | Bouton confirmer |
| `confirm-cancel` | Bouton annuler |

## Portail étudiant

### StudentHeader (`src/app/components/student/StudentHeader.tsx`)
| testid | Élément |
|--------|---------|
| `portal-theme-toggle` | Toggle thème |
| `portal-bell` | Cloche notifications |
| `portal-bell-badge` | Badge non lus |
| `portal-logout` | Item "Déconnexion" du menu utilisateur |

### BottomTabs (`src/app/components/student/BottomTabs.tsx`)
| testid | Élément |
|--------|---------|
| `portal-tab-dashboard` | Onglet "Mon espace" |
| `portal-tab-payments` | Onglet "Paiements" |
| `portal-tab-documents` | Onglet "Documents" |
| `portal-tab-dossier` | Onglet "Dossier" |
| `portal-tab-messaging` | Onglet "Messagerie" |

## À étendre

Pour fiabiliser davantage la suite, ajouter (au fil des refactors UI) :

- `btn-add-student`, `btn-edit-student`, `btn-delete-student` dans `StudentManagement.tsx`
- `search-students`, `filter-students-status`
- `btn-add-application`, `btn-add-university`, `btn-add-user`
- `btn-validate-payment`, `btn-reject-payment`, `btn-declare-payment` (portail)
- `btn-upload-document`, `btn-validate-document`
- `btn-add-entree`, `btn-add-sortie` dans `LivreComptable.tsx`
- `tab-payments-{statut}` (À valider, En retard, Validés)

## Bonnes pratiques

1. **Ne pas localiser** : `data-testid` ne doit pas dépendre de la langue affichée.
2. **Stabilité** : ne pas refléter l'état (utiliser `aria-current`, `data-state` pour ça).
3. **Granularité** : un testid par bouton d'action critique, pas un par décoration.
4. **Pas dans CSS** : les testids ne sont pas pour le styling.
