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
  payment_validate: "Validation paiement",
  accounting_entry: "Entrée comptable",
  accounting_expense: "Sortie comptable",
  document_upload: "Upload document",
  document_validate: "Validation document",
  document_reject: "Rejet document",
  user_create: "Création utilisateur",
  user_update: "Modification utilisateur",
  user_delete: "Suppression utilisateur",
  login: "Connexion",
  logout: "Déconnexion",
  config_update: "Modification configuration frais",
};
