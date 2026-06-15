import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../supabase';
import { apiFetch } from '../api';

export interface ChatMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  subject: string;
  content: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export const STUDENT_CHAT_KEY = ['student_chat'] as const;
const MSG_SELECT = 'id, from_user_id, to_user_id, subject, content, read, created_at, metadata';

/** Dédup des messages sortants rediffusés à plusieurs destinataires (port web). */
function dedup(msgs: ChatMessage[], userId: string): ChatMessage[] {
  const seen = new Set<string>();
  return msgs.filter((m) => {
    if (m.to_user_id === userId) return true;
    const key = `${m.content}-${m.created_at.substring(0, 16)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Fil de conversation (ancien → récent, dédupliqué). */
export function useStudentChat(userId?: string) {
  return useQuery({
    queryKey: [...STUDENT_CHAT_KEY, userId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(MSG_SELECT)
        .or(`to_user_id.eq.${userId},from_user_id.eq.${userId}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return dedup((data as ChatMessage[]) ?? [], userId!);
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/** Envoi via la route serveur (notifie le staff + réponse auto). */
export function useSendChatMessage(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, agentUserId }: { content: string; agentUserId: string | null }) => {
      const res = await apiFetch('/api/student-send-message', {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Message étudiant',
          content,
          locale: 'fr',
          agent_user_id: agentUserId,
        }),
      });
      if (!res.ok) throw new Error('Erreur envoi message');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...STUDENT_CHAT_KEY, userId] }),
  });
}

/** Marque des messages comme lus (remet le badge à 0). */
export function useMarkMessagesRead(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from('messages').update({ read: true }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...STUDENT_CHAT_KEY, userId] }),
  });
}
