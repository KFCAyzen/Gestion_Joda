/**
 * Système de logging des activités sensibles
 */

import { createClient } from "../lib/supabase/client";

export type ActivityType =
  | "student_create"
  | "student_update"
  | "student_delete"
  | "application_create"
  | "application_update"
  | "application_delete"
  | "application_status_change"
  | "dossier_update"
  | "dossier_delete"
  | "dossier_status_change"
  | "university_create"
  | "university_update"
  | "university_delete"
  | "payment_create"
  | "payment_update"
  | "payment_delete"
  | "payment_validate"
  | "accounting_entry"
  | "accounting_expense"
  | "document_upload"
  | "document_validate"
  | "document_reject"
  | "staff_document_sent"
  | "staff_document_deleted"
  | "user_create"
  | "user_update"
  | "user_delete"
  | "login"
  | "logout"
  | "config_update";

export interface ActivityLog {
  id?: string;
  user_id: string;
  user_name: string;
  user_role: string;
  activity_type: ActivityType;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at?: string;
}

/**
 * Enregistre une activité dans les logs
 */
export async function logActivity(
  userId: string,
  userName: string,
  userRole: string,
  activityType: ActivityType,
  entityType: string,
  entityId: string | null,
  description: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // Ne pas logger les actions des étudiants.
    if (userRole === "student") return;

    const supabase = createClient();
    await supabase.from("activity_logs").insert({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      activity_type: activityType,
      entity_type: entityType,
      entity_id: entityId,
      description: description,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du log:", error);
  }
}

/**
 * Récupère les logs d'activités avec filtres
 */
export async function getActivityLogs(filters?: {
  userId?: string;
  userRole?: string;
  activityType?: ActivityType;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  try {
    const supabase = createClient();
    let query = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.userId) {
      query = query.eq("user_id", filters.userId);
    }

    if (filters?.userRole) {
      query = query.eq("user_role", filters.userRole);
    }

    if (filters?.activityType) {
      query = query.eq("activity_type", filters.activityType);
    }

    if (filters?.entityType) {
      query = query.eq("entity_type", filters.entityType);
    }

    if (filters?.startDate) {
      query = query.gte("created_at", filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte("created_at", filters.endDate);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des logs:", error);
    return [];
  }
}

export interface ActivityLogFilters {
  userId?: string;
  userRole?: string;
  activityType?: ActivityType;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  /** Recherche plein texte sur user_name / description / entity_type */
  search?: string;
}

// Applique les filtres communs (mêmes critères que getActivityLogs) à une requête.
// Générique pour servir aussi bien la requête paginée que les requêtes de comptage.
function applyActivityLogFilters<T>(query: T, filters: ActivityLogFilters): T {
  let q = query as any;
  if (filters.userId) q = q.eq("user_id", filters.userId);
  if (filters.userRole) q = q.eq("user_role", filters.userRole);
  if (filters.activityType) q = q.eq("activity_type", filters.activityType);
  if (filters.entityType) q = q.eq("entity_type", filters.entityType);
  if (filters.startDate) q = q.gte("created_at", filters.startDate);
  if (filters.endDate) q = q.lte("created_at", filters.endDate);
  const s = filters.search?.trim();
  if (s) {
    q = q.or(`user_name.ilike.%${s}%,description.ilike.%${s}%,entity_type.ilike.%${s}%`);
  }
  return q as T;
}

/**
 * Récupère une page de logs (tri created_at DESC) + le total filtré, le tout
 * côté serveur (range + count). Évite de charger toute la table activity_logs.
 */
export async function getActivityLogsPaginated(
  filters: ActivityLogFilters,
  page: number,
  pageSize: number,
): Promise<{ rows: ActivityLog[]; total: number }> {
  try {
    const supabase = createClient();
    const from = page * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from("activity_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    query = applyActivityLogFilters(query, filters);
    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: (data ?? []) as ActivityLog[], total: count ?? 0 };
  } catch (error) {
    console.error("Erreur lors de la récupération paginée des logs:", error);
    return { rows: [], total: 0 };
  }
}

/**
 * Compteurs des cartes de stats (head count, aucune ligne transférée).
 * Applique les mêmes filtres rôle/action/période que la liste (PAS la recherche,
 * pour rester cohérent avec l'ancien calcul fait sur le jeu non recherché).
 */
export async function getActivityLogsStats(
  filters: ActivityLogFilters,
): Promise<{ total: number; agents: number; admins: number; today: number }> {
  try {
    const supabase = createClient();
    const base = () =>
      applyActivityLogFilters(
        supabase.from("activity_logs").select("id", { count: "exact", head: true }),
        { ...filters, search: undefined },
      );
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [total, agents, admins, today] = await Promise.all([
      base(),
      base().eq("user_role", "agent"),
      base().in("user_role", ["admin", "super_admin"]),
      base().gte("created_at", todayStart.toISOString()),
    ]);
    return {
      total: total.count ?? 0,
      agents: agents.count ?? 0,
      admins: admins.count ?? 0,
      today: today.count ?? 0,
    };
  } catch (error) {
    console.error("Erreur lors du comptage des logs:", error);
    return { total: 0, agents: 0, admins: 0, today: 0 };
  }
}

/**
 * Labels pour les types d'activités
 */
export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  student_create: "Création étudiant",
  student_update: "Modification étudiant",
  student_delete: "Suppression étudiant",
  application_create: "Création candidature",
  application_update: "Modification candidature",
  application_delete: "Suppression candidature",
  application_status_change: "Changement statut candidature",
  dossier_update: "Modification dossier",
  dossier_delete: "Suppression dossier",
  dossier_status_change: "Changement statut dossier",
  university_create: "Création université",
  university_update: "Modification université",
  university_delete: "Suppression université",
  payment_create: "Création paiement",
  payment_update: "Modification paiement",
  payment_delete: "Suppression paiement",
  payment_validate: "Validation paiement",
  accounting_entry: "Entrée comptable",
  accounting_expense: "Sortie comptable",
  document_upload: "Upload document",
  document_validate: "Validation document",
  document_reject: "Rejet document",
  staff_document_sent: "Envoi document au personnel",
  staff_document_deleted: "Suppression document du personnel",
  user_create: "Création utilisateur",
  user_update: "Modification utilisateur",
  user_delete: "Suppression utilisateur",
  login: "Connexion",
  logout: "Déconnexion",
  config_update: "Modification configuration frais",
};
