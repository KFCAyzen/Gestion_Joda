import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../supabase';

/** Types de notifications — alignés sur la contrainte CHECK de la table web. */
export type NotificationType =
  | 'document_manquant'
  | 'paiement_en_attente'
  | 'paiement_valide'
  | 'paiement_rejete'
  | 'retard_paiement'
  | 'mise_a_jour_dossier'
  | 'message_recu'
  | 'info';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  titre: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export const NOTIFICATIONS_KEY = ['notifications'] as const;
const NOTIF_SELECT = 'id, user_id, type, titre, message, read, metadata, created_at';
const MAX_NOTIFICATIONS = 50;

/** Liste des notifications de l'utilisateur (plus récentes d'abord). */
export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, userId],
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select(NOTIF_SELECT)
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);
      if (error) throw error;
      return (data as AppNotification[]) ?? [];
    },
    enabled: !!userId,
    // Filet de sécurité si le temps réel n'est pas dispo (RLS / réseau).
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}

/** Nombre de non-lues, dérivé de la liste déjà chargée (pas de requête en plus). */
export function useUnreadCount(userId?: string): number {
  const { data } = useNotifications(userId);
  return (data ?? []).filter((n) => !n.read).length;
}

/** Abonnement temps réel aux notifications de l'utilisateur (à monter une fois). */
export function useNotificationsRealtime(userId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY, userId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}

/** Marque une notification comme lue (mise à jour optimiste). */
export function useMarkNotificationRead(userId?: string) {
  const qc = useQueryClient();
  const key = [...NOTIFICATIONS_KEY, userId];
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AppNotification[]>(key);
      if (prev) {
        qc.setQueryData<AppNotification[]>(
          key,
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Marque toutes les notifications non lues comme lues. */
export function useMarkAllNotificationsRead(userId?: string) {
  const qc = useQueryClient();
  const key = [...NOTIFICATIONS_KEY, userId];
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId!)
        .eq('read', false);
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AppNotification[]>(key);
      if (prev) {
        qc.setQueryData<AppNotification[]>(
          key,
          prev.map((n) => ({ ...n, read: true })),
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

/** Supprime une notification. */
export function useDeleteNotification(userId?: string) {
  const qc = useQueryClient();
  const key = [...NOTIFICATIONS_KEY, userId];
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AppNotification[]>(key);
      if (prev) {
        qc.setQueryData<AppNotification[]>(
          key,
          prev.filter((n) => n.id !== id),
        );
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
