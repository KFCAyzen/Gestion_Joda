/**
 * Journalisation des activités sensibles — miroir mobile de
 * `src/app/utils/activityLogger.ts` (web). Insère dans `activity_logs`.
 * Best-effort : ne jette jamais (l'action métier ne doit pas échouer pour un log).
 * Les actions des étudiants ne sont pas journalisées (comme côté web).
 */
import { supabase } from './supabase';

export type ActivityType =
  | 'student_create'
  | 'student_update'
  | 'student_delete'
  | 'dossier_status_change'
  | 'payment_validate'
  | 'document_validate'
  | 'document_reject'
  | 'accounting_entry'
  | 'accounting_expense'
  | 'application_status_change'
  | 'university_create'
  | 'university_update'
  | 'university_delete';

type Actor = { id?: string | null; name?: string | null; role?: string | null };

export async function logActivity(
  actor: Actor,
  activityType: ActivityType,
  entityType: string,
  entityId: string | null,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    if (!actor?.id || actor.role === 'student') return;
    const { error } = await supabase.from('activity_logs').insert({
      user_id: actor.id,
      user_name: actor.name ?? 'Agent',
      user_role: actor.role ?? 'agent',
      activity_type: activityType,
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata: metadata ?? {},
      created_at: new Date().toISOString(),
    });
    if (error) console.warn('[activity-log] insert error:', error.message);
  } catch (e) {
    console.warn('[activity-log] unexpected', e);
  }
}
