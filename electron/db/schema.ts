/**
 * Schéma SQLite local — mirror des tables Supabase + tables de sync.
 *
 * Chaque table métier ajoute 3 colonnes locales :
 *   - `_local_dirty`     (1 si modifié localement, à pousser au serveur)
 *   - `_local_deleted`   (soft delete, propagé via push)
 *   - `_last_synced_at`  (timestamp ms de la dernière sync OK avec Supabase)
 *
 * La sync utilise `updated_at` (ou `created_at` si absent) comme curseur pour
 * la stratégie Last-Write-Wins.
 */
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ─── Tables métier (mirror Supabase) ──────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username'),
  email: text('email'),
  password_hash: text('password_hash'),
  role: text('role'),
  name: text('name'),
  must_change_password: integer('must_change_password', { mode: 'boolean' }),
  is_active: integer('is_active', { mode: 'boolean' }),
  telephone: text('telephone'),
  contact_email: text('contact_email'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
  // local sync meta
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  nom: text('nom'),
  prenom: text('prenom'),
  email: text('email'),
  telephone: text('telephone'),
  age: integer('age'),
  sexe: text('sexe'),
  niveau: text('niveau'),
  filiere: text('filiere'),
  langue: text('langue'),
  diplome_acquis: text('diplome_acquis'),
  photo_url: text('photo_url'),
  passeport_numero: text('passeport_numero'),
  passeport_expiration: text('passeport_expiration'),
  passeport_url: text('passeport_url'),
  choix: text('choix'),
  user_id: text('user_id'),
  created_by: text('created_by'),
  nationalite: text('nationalite'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const universities = sqliteTable('universities', {
  id: text('id').primaryKey(),
  nom: text('nom'),
  pays: text('pays'),
  ville: text('ville'),
  programme: text('programme'),
  niveau_etude: text('niveau_etude'),
  criteres_admission: text('criteres_admission'),
  logo_url: text('logo_url'),
  active: integer('active', { mode: 'boolean' }),
  code: text('code'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  student_id: text('student_id'),
  type: text('type'),
  status: text('status'),
  url: text('url'),
  uploaded_at: text('uploaded_at'),
  validated_at: text('validated_at'),
  validated_by: text('validated_by'),
  rejection_reason: text('rejection_reason'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const dossier_bourses = sqliteTable('dossier_bourses', {
  id: text('id').primaryKey(),
  student_id: text('student_id'),
  status: text('status'),
  notes_internes: text('notes_internes'),
  university_id: text('university_id'),
  assigned_to: text('assigned_to'),
  desired_program: text('desired_program'),
  study_level: text('study_level'),
  language_level: text('language_level'),
  scholarship_type: text('scholarship_type'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const dossier_history = sqliteTable('dossier_history', {
  id: text('id').primaryKey(),
  dossier_id: text('dossier_id'),
  old_status: text('old_status'),
  new_status: text('new_status'),
  changed_by: text('changed_by'),
  notes: text('notes'),
  created_at: text('created_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  student_id: text('student_id'),
  type: text('type'),
  tranche: integer('tranche'),
  montant: real('montant'),
  status: text('status'),
  date_limite: text('date_limite'),
  date_paiement: text('date_paiement'),
  penalites: real('penalites'),
  facture_url: text('facture_url'),
  recu_url: text('recu_url'),
  validated_by: text('validated_by'),
  validated_at: text('validated_at'),
  initiated_by_student: integer('initiated_by_student', { mode: 'boolean' }),
  rejection_reason: text('rejection_reason'),
  rejected_at: text('rejected_at'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const cours_langues = sqliteTable('cours_langues', {
  id: text('id').primaryKey(),
  student_id: text('student_id'),
  langue: text('langue'),
  statut: text('statut'),
  inscrit_le: text('inscrit_le'),
  created_at: text('created_at'),
  updated_at: text('updated_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const entrees_comptables = sqliteTable('entrees_comptables', {
  id: text('id').primaryKey(),
  montant: real('montant'),
  date: text('date'),
  type: text('type'),
  description: text('description'),
  student_id: text('student_id'),
  payment_id: text('payment_id'),
  created_by: text('created_by'),
  created_at: text('created_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const sorties_comptables = sqliteTable('sorties_comptables', {
  id: text('id').primaryKey(),
  montant: real('montant'),
  date: text('date'),
  type: text('type'),
  description: text('description'),
  status: text('status').default('pending'),
  validated_by: text('validated_by'),
  validated_at: text('validated_at'),
  rejected_by: text('rejected_by'),
  rejected_at: text('rejected_at'),
  rejection_reason: text('rejection_reason'),
  created_by: text('created_by'),
  created_at: text('created_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  user_id: text('user_id'),
  type: text('type'),
  titre: text('titre'),
  message: text('message'),
  read: integer('read', { mode: 'boolean' }),
  metadata: text('metadata'), // JSON serialisé en TEXT
  created_at: text('created_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  from_user_id: text('from_user_id'),
  to_user_id: text('to_user_id'),
  subject: text('subject'),
  content: text('content'),
  read: integer('read', { mode: 'boolean' }),
  attachments: text('attachments'), // JSON
  metadata: text('metadata'), // JSON
  created_at: text('created_at'),
  _local_dirty: integer('_local_dirty').default(0),
  _local_deleted: integer('_local_deleted').default(0),
  _last_synced_at: integer('_last_synced_at'),
});

// ─── Tables de sync ───────────────────────────────────────────────────────────

/**
 * File de mutations locales en attente d'être poussées vers Supabase.
 * Traitée FIFO par le push worker dès que le réseau est disponible.
 */
export const mutations_queue = sqliteTable('mutations_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  created_at: integer('created_at').notNull(), // timestamp ms
  table_name: text('table_name').notNull(),
  record_id: text('record_id').notNull(),
  operation: text('operation', { enum: ['insert', 'update', 'delete'] }).notNull(),
  payload: text('payload').notNull(), // JSON serialisé
  retry_count: integer('retry_count').default(0),
  last_error: text('last_error'),
  last_attempt_at: integer('last_attempt_at'),
  status: text('status', { enum: ['pending', 'processing', 'failed', 'conflict'] }).default('pending'),
});

/**
 * Curseur de sync par table.
 * `last_pull_at` est utilisé pour `WHERE updated_at > ?` lors de la pull incrémentale.
 */
export const sync_meta = sqliteTable('sync_meta', {
  table_name: text('table_name').primaryKey(),
  last_pull_at: text('last_pull_at'), // ISO string (dernière updated_at observée)
  last_pull_run_at: integer('last_pull_run_at'), // timestamp ms du dernier run
  last_push_run_at: integer('last_push_run_at'),
  initial_pull_done: integer('initial_pull_done').default(0),
});

/**
 * Conflits détectés lors du push. Conservés pour audit + résolution manuelle
 * (en particulier pour les paiements où l'utilisateur doit trancher).
 */
export const sync_conflicts = sqliteTable('sync_conflicts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  detected_at: integer('detected_at').notNull(),
  table_name: text('table_name').notNull(),
  record_id: text('record_id').notNull(),
  local_payload: text('local_payload').notNull(),
  server_payload: text('server_payload').notNull(),
  resolution: text('resolution', { enum: ['pending', 'kept_local', 'kept_server', 'merged'] }).default('pending'),
  resolved_at: integer('resolved_at'),
  resolved_by: text('resolved_by'),
});

// ─── Export pour l'init ────────────────────────────────────────────────────────

export const ALL_BUSINESS_TABLES = [
  'users',
  'students',
  'universities',
  'documents',
  'dossier_bourses',
  'dossier_history',
  'payments',
  'cours_langues',
  'entrees_comptables',
  'sorties_comptables',
  'notifications',
  'messages',
] as const;

export type BusinessTable = (typeof ALL_BUSINESS_TABLES)[number];

/**
 * Pour les tables sans `updated_at` (notifications, messages, entrees/sorties
 * comptables, dossier_history), on utilise `created_at` comme curseur de sync.
 * Ces tables sont essentiellement append-only.
 */
export const TIMESTAMP_FIELD: Record<BusinessTable, 'updated_at' | 'created_at'> = {
  users: 'updated_at',
  students: 'updated_at',
  universities: 'updated_at',
  documents: 'updated_at',
  dossier_bourses: 'updated_at',
  dossier_history: 'created_at',
  payments: 'updated_at',
  cours_langues: 'updated_at',
  entrees_comptables: 'created_at',
  sorties_comptables: 'created_at',
  notifications: 'created_at',
  messages: 'created_at',
};

/**
 * Tables pour lesquelles un conflit déclenche un dialog de merge interactif
 * (l'utilisateur doit choisir manuellement). Pour les autres, LWW automatique.
 */
export const INTERACTIVE_MERGE_TABLES: BusinessTable[] = ['payments'];

/**
 * Métadonnées de typage pour la (dé)sérialisation côté handlers IPC :
 *   - Booleans  : SQLite stocke 0/1, on doit reconvertir en true/false avant le retour renderer
 *   - JSON      : on stocke en TEXT, on doit JSON.parse() avant le retour renderer
 */
export const BOOLEAN_COLUMNS: Record<BusinessTable, string[]> = {
  users: ['must_change_password', 'is_active'],
  students: [],
  universities: ['active'],
  documents: [],
  dossier_bourses: [],
  dossier_history: [],
  payments: ['initiated_by_student'],
  cours_langues: [],
  entrees_comptables: [],
  sorties_comptables: [],
  notifications: ['read'],
  messages: ['read'],
};

export const JSON_COLUMNS: Record<BusinessTable, string[]> = {
  users: [],
  students: [],
  universities: [],
  documents: [],
  dossier_bourses: [],
  dossier_history: [],
  payments: [],
  cours_langues: [],
  entrees_comptables: [],
  sorties_comptables: [],
  notifications: ['metadata'],
  messages: ['attachments', 'metadata'],
};

/**
 * Convertit une ligne brute SQLite vers le format attendu par le renderer
 * (booleans, JSON parsé).
 */
export function deserializeRow(table: BusinessTable, row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  // Les colonnes internes de sync ne doivent jamais remonter au renderer
  // (sinon elles polluent les objets métier et risquent d'être réinsérées).
  delete out._local_dirty;
  delete out._local_deleted;
  delete out._last_synced_at;
  for (const col of BOOLEAN_COLUMNS[table]) {
    const v = out[col];
    if (v === 0 || v === 1) out[col] = v === 1;
    else if (v === null) out[col] = null;
  }
  for (const col of JSON_COLUMNS[table]) {
    const v = out[col];
    if (typeof v === 'string' && v.length > 0) {
      try { out[col] = JSON.parse(v); } catch { /* keep raw if not valid JSON */ }
    }
  }
  return out;
}
