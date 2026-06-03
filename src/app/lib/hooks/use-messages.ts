import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';

const supabase = createClient();

// ── Query keys ───────────────────────────────────────────────────────────────

export const STUDENT_INBOX_KEY = ['student_inbox'] as const;
export const STUDENT_CHAT_KEY  = ['student_chat']  as const;

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const MSG_SELECT = 'id, from_user_id, to_user_id, subject, content, read, created_at, metadata';

function dedupMessages(msgs: ChatMessage[], userId: string): ChatMessage[] {
  const seen = new Set<string>();
  return msgs.filter((m) => {
    if (m.to_user_id === userId) return true;
    const key = `${m.content}-${m.created_at.substring(0, 16)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Messages inbox (newest first) — pour la vue liste */
export function useStudentInbox(userId: string) {
  return useQuery({
    queryKey: [...STUDENT_INBOX_KEY, userId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(MSG_SELECT)
        .or(`to_user_id.eq.${userId},from_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as ChatMessage[]) ?? [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/** Messages chat (oldest first, dédupliqués) — pour la vue conversation */
export function useStudentChat(userId: string) {
  return useQuery({
    queryKey: [...STUDENT_CHAT_KEY, userId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(MSG_SELECT)
        .or(`to_user_id.eq.${userId},from_user_id.eq.${userId}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return dedupMessages((data as ChatMessage[]) ?? [], userId);
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Marque un message comme lu — met à jour le cache inbox en place */
export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('messages').update({ read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.setQueriesData(
        { queryKey: STUDENT_INBOX_KEY },
        (old: ChatMessage[] | undefined) => old?.map((m) => (m.id === id ? { ...m, read: true } : m)),
      );
    },
  });
}

/** Marque plusieurs messages comme lus en une seule requête */
export function useMarkMessagesRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from('messages').update({ read: true }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      const idSet = new Set(ids);
      queryClient.setQueriesData(
        { queryKey: STUDENT_CHAT_KEY },
        (old: ChatMessage[] | undefined) =>
          old?.map((m) => (idSet.has(m.id) ? { ...m, read: true } : m)),
      );
    },
  });
}

/** Envoie un message via l'API route */
export function useSendStudentMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ subject, content }: { subject: string; content: string }) => {
      const res = await fetch('/api/student-send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content }),
      });
      if (!res.ok) throw new Error('Erreur envoi message');
    },
    onSuccess: (_, { subject: _s }, ctx) => {
      void ctx;
      queryClient.invalidateQueries({ queryKey: STUDENT_INBOX_KEY });
    },
  });
}

/** Envoie un message de chat avec mise à jour optimiste */
export function useSendChatMessage(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      agentUserId,
      faqId,
      locale,
    }: {
      content: string;
      agentUserId: string | null;
      faqId?: string;
      locale?: string;
    }): Promise<ChatMessage | null> => {
      // Tous les messages passent par l'API route : elle notifie le staff
      // ET déclenche la réponse automatique (FAQ ciblée ou détection sur message libre).
      // agentUserId permet de cibler l'agent actif sans rediffuser à tout le staff.
      const res = await fetch('/api/student-send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: faqId ? 'Question étudiant' : 'Message étudiant',
          content,
          faq_id: faqId ?? null,
          locale: locale ?? 'fr',
          agent_user_id: agentUserId ?? null,
        }),
      });
      if (!res.ok) throw new Error('Erreur envoi message');
      return null;
    },

    onMutate: async ({ content }) => {
      await queryClient.cancelQueries({ queryKey: [...STUDENT_CHAT_KEY, userId] });
      const previous = queryClient.getQueryData<ChatMessage[]>([...STUDENT_CHAT_KEY, userId]);
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData<ChatMessage[]>([...STUDENT_CHAT_KEY, userId], (old) => [
        ...(old ?? []),
        {
          id: tempId,
          from_user_id: userId,
          to_user_id: '',
          subject: 'Message',
          content,
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);
      return { previous, tempId };
    },

    onSuccess: (data, _, context) => {
      if (!context) return;
      if (data) {
        queryClient.setQueryData<ChatMessage[]>([...STUDENT_CHAT_KEY, userId], (old) =>
          old?.map((m) => (m.id === context.tempId ? data : m)) ?? [],
        );
      } else {
        queryClient.invalidateQueries({ queryKey: [...STUDENT_CHAT_KEY, userId] });
      }
    },

    onError: (_, __, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData([...STUDENT_CHAT_KEY, userId], context.previous);
      }
    },
  });
}
