import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type { Notification, CreateNotification } from '../schemas/notification.schema';
import { createNotificationSchema } from '../schemas/notification.schema';

const supabase = createClient();

export const NOTIFICATIONS_KEY = ['notifications'];

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, userId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useUnreadCount(userId: string) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread', userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateNotification) => {
      const parsed = createNotificationSchema.parse(data);
      const { data: notif, error } = await supabase
        .from('notifications')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return notif as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
