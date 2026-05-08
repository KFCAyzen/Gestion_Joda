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
    'applications.view',
    'applications.create',
    'applications.edit',
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
    'payments.view',
    'payments.create',
    'payments.edit',
    'payments.validate',
    'accounting.view',
    'reports.view',
    'reports.export',
  ],
  
  admin: [
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
