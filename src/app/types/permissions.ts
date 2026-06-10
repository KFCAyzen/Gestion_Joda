// Système de permissions granulaires

export type Permission = 
  // Étudiants
  | 'students.view'
  | 'students.create'
  | 'students.edit'
  | 'students.delete'
  
  // Candidatures
  | 'applications.view'
  | 'applications.create'
  | 'applications.edit'
  | 'applications.delete'
  
  // Dossiers
  | 'dossiers.view'
  | 'dossiers.create'
  | 'dossiers.edit'
  | 'dossiers.delete'
  | 'dossiers.validate'
  
  // Universités
  | 'universities.view'
  | 'universities.create'
  | 'universities.edit'
  | 'universities.delete'
  
  // Paiements
  | 'payments.view'
  | 'payments.create'
  | 'payments.edit'
  | 'payments.delete'
  | 'payments.validate'
  
  // Comptabilité
  | 'accounting.view'
  | 'accounting.create'
  | 'accounting.edit'
  | 'accounting.delete'
  | 'accounting.validate'
  | 'accounting.export'
  
  // Utilisateurs
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.manage_permissions'
  
  // Rapports
  | 'reports.view'
  | 'reports.export'
  
  // Logs
  | 'logs.view'
  
  // Stockage
  | 'storage.view'
  | 'storage.manage';

export interface UserPermissions {
  userId: string;
  permissions: Permission[];
  customPermissions?: Permission[];
  deniedPermissions?: Permission[];
}

// Permissions par défaut par rôle
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  student: [
    'applications.view',
    'dossiers.view',
    'payments.view',
  ],
  
  agent: [
    'students.view',
    'students.create',
    'students.edit',
    // Candidatures : réservées au super_admin (ou comptes explicitement autorisés)
    'dossiers.view',
    'dossiers.create',
    'dossiers.edit',
    'universities.view',
    'payments.view',
    'payments.create',
    'payments.edit',
  ],

  supervisor: [
    'students.view',
    'students.create',
    'students.edit',
    'students.delete',
    // Candidatures : réservées au super_admin (ou comptes explicitement autorisés)
    'dossiers.view',
    'dossiers.create',
    'dossiers.edit',
    'dossiers.delete',
    'dossiers.validate',
    'universities.view',
    'universities.create',
    'universities.edit',
    'payments.view',
    'payments.create',
    'payments.edit',
    'payments.validate',
    // Comptabilité : réservée à admin/super_admin (ou comptes explicitement autorisés)
    'reports.view',
    'reports.export',
  ],

  admin: [
    'students.view',
    'students.create',
    'students.edit',
    'students.delete',
    // Candidatures : réservées au super_admin (ou comptes explicitement autorisés)
    'dossiers.view',
    'dossiers.create',
    'dossiers.edit',
    'dossiers.delete',
    'dossiers.validate',
    'universities.view',
    'universities.create',
    'universities.edit',
    'universities.delete',
    'payments.view',
    'payments.create',
    'payments.edit',
    'payments.delete',
    'payments.validate',
    'accounting.view',
    'accounting.create',
    'accounting.edit',
    'accounting.delete',
    'accounting.validate',
    'accounting.export',
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.manage_permissions',
    'reports.view',
    'reports.export',
    'logs.view',
    'storage.view',
    'storage.manage',
  ],
  
  super_admin: [
    'students.view',
    'students.create',
    'students.edit',
    'students.delete',
    'applications.view',
    'applications.create',
    'applications.edit',
    'applications.delete',
    'dossiers.view',
    'dossiers.create',
    'dossiers.edit',
    'dossiers.delete',
    'dossiers.validate',
    'universities.view',
    'universities.create',
    'universities.edit',
    'universities.delete',
    'payments.view',
    'payments.create',
    'payments.edit',
    'payments.delete',
    'payments.validate',
    'accounting.view',
    'accounting.create',
    'accounting.edit',
    'accounting.delete',
    'accounting.validate',
    'accounting.export',
    'users.view',
    'users.create',
    'users.edit',
    'users.delete',
    'users.manage_permissions',
    'reports.view',
    'reports.export',
    'logs.view',
    'storage.view',
    'storage.manage',
  ],
};

// Labels des permissions
export const PERMISSION_LABELS: Record<Permission, string> = {
  'students.view': 'Voir les étudiants',
  'students.create': 'Créer des étudiants',
  'students.edit': 'Modifier les étudiants',
  'students.delete': 'Supprimer les étudiants',
  
  'applications.view': 'Voir les candidatures',
  'applications.create': 'Créer des candidatures',
  'applications.edit': 'Modifier les candidatures',
  'applications.delete': 'Supprimer les candidatures',
  
  'dossiers.view': 'Voir les dossiers',
  'dossiers.create': 'Créer des dossiers',
  'dossiers.edit': 'Modifier les dossiers',
  'dossiers.delete': 'Supprimer les dossiers',
  'dossiers.validate': 'Valider les dossiers',
  
  'universities.view': 'Voir les universités',
  'universities.create': 'Créer des universités',
  'universities.edit': 'Modifier les universités',
  'universities.delete': 'Supprimer les universités',
  
  'payments.view': 'Voir les paiements',
  'payments.create': 'Créer des paiements',
  'payments.edit': 'Modifier les paiements',
  'payments.delete': 'Supprimer les paiements',
  'payments.validate': 'Valider les paiements',
  
  'accounting.view': 'Voir la comptabilité',
  'accounting.create': 'Créer des écritures',
  'accounting.edit': 'Modifier la comptabilité',
  'accounting.delete': 'Supprimer des écritures',
  'accounting.validate': 'Valider la comptabilité',
  'accounting.export': 'Exporter la comptabilité',
  
  'users.view': 'Voir les utilisateurs',
  'users.create': 'Créer des utilisateurs',
  'users.edit': 'Modifier les utilisateurs',
  'users.delete': 'Supprimer les utilisateurs',
  'users.manage_permissions': 'Gérer les permissions',
  
  'reports.view': 'Voir les rapports',
  'reports.export': 'Exporter les rapports',
  
  'logs.view': 'Voir les logs',
  
  'storage.view': 'Voir le stockage',
  'storage.manage': 'Gérer le stockage',
};

// Descriptions : ce que chaque permission autorise concrètement, affiché en
// info-bulle/aide dans l'écran de gestion des permissions.
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'students.view': "Consulter la liste des étudiants et leurs fiches détaillées.",
  'students.create': "Enregistrer de nouveaux étudiants dans le système.",
  'students.edit': "Modifier les informations d'un étudiant existant.",
  'students.delete': "Supprimer définitivement la fiche d'un étudiant.",

  'applications.view': "Consulter les candidatures déposées.",
  'applications.create': "Créer une nouvelle candidature.",
  'applications.edit': "Modifier une candidature et changer son statut.",
  'applications.delete': "Supprimer définitivement une candidature.",

  'dossiers.view': "Consulter les dossiers de bourse et leur avancement.",
  'dossiers.create': "Ouvrir un nouveau dossier de bourse.",
  'dossiers.edit': "Modifier un dossier, ses notes et son statut.",
  'dossiers.delete': "Supprimer définitivement un dossier de bourse.",
  'dossiers.validate': "Valider officiellement un dossier (étape de contrôle).",

  'universities.view': "Consulter les universités partenaires.",
  'universities.create': "Ajouter une nouvelle université partenaire.",
  'universities.edit': "Modifier une université ou l'activer/désactiver.",
  'universities.delete': "Supprimer définitivement une université.",

  'payments.view': "Consulter les frais et l'historique des paiements.",
  'payments.create': "Enregistrer un nouveau paiement de frais.",
  'payments.edit': "Modifier un paiement existant.",
  'payments.delete': "Supprimer définitivement un paiement.",
  'payments.validate': "Valider un paiement et lever les pénalités de retard.",

  'accounting.view': "Accéder au livre comptable (entrées et sorties).",
  'accounting.create': "Saisir une nouvelle écriture comptable.",
  'accounting.edit': "Modifier une écriture comptable existante.",
  'accounting.delete': "Supprimer définitivement une écriture comptable.",
  'accounting.validate': "Valider une sortie comptable (contrôle financier).",
  'accounting.export': "Exporter les données comptables (Excel/PDF).",

  'users.view': "Consulter la liste des comptes utilisateurs.",
  'users.create': "Créer de nouveaux comptes utilisateurs.",
  'users.edit': "Modifier un compte (rôle, infos, statut).",
  'users.delete': "Supprimer définitivement un compte utilisateur.",
  'users.manage_permissions': "Accorder ou retirer les permissions des comptes (cet écran).",

  'reports.view': "Consulter les rapports et indicateurs.",
  'reports.export': "Exporter les rapports générés.",

  'logs.view': "Consulter les journaux d'activité sensibles.",

  'storage.view': "Voir le monitoring du stockage et de la base de données.",
  'storage.manage': "Gérer le stockage (nettoyage, opérations de maintenance).",
};

// Groupes de permissions
export const PERMISSION_GROUPS = {
  'Étudiants': ['students.view', 'students.create', 'students.edit', 'students.delete'],
  'Candidatures': ['applications.view', 'applications.create', 'applications.edit', 'applications.delete'],
  'Dossiers': ['dossiers.view', 'dossiers.create', 'dossiers.edit', 'dossiers.delete', 'dossiers.validate'],
  'Universités': ['universities.view', 'universities.create', 'universities.edit', 'universities.delete'],
  'Paiements': ['payments.view', 'payments.create', 'payments.edit', 'payments.delete', 'payments.validate'],
  'Comptabilité': ['accounting.view', 'accounting.create', 'accounting.edit', 'accounting.delete', 'accounting.validate', 'accounting.export'],
  'Utilisateurs': ['users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_permissions'],
  'Rapports': ['reports.view', 'reports.export'],
  'Système': ['logs.view', 'storage.view', 'storage.manage'],
} as const;
