import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../supabase';

/* ============================================================
   Messagerie côté Agent — fils groupés par interlocuteur, sur
   la même table `messages` que le portail étudiant.
   ============================================================ */

export type ChatMessage = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type StaffThread = {
  userId: string;
  name: string;
  last: string;
  time: string;
  unread: number;
  lastAt: string;
};

const SELECT = 'id, from_user_id, to_user_id, content, read, created_at';

function shortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days === 1) return 'hier';
  if (days < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

/** Liste des conversations de l'agent (un fil par interlocuteur). */
export function useStaffThreads(userId?: string) {
  return useQuery({
    queryKey: ['staff', 'threads', userId],
    queryFn: async (): Promise<StaffThread[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(SELECT)
        .or(`to_user_id.eq.${userId},from_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data as ChatMessage[]) ?? [];
      const byPeer = new Map<string, { last: ChatMessage; unread: number }>();
      for (const m of rows) {
        const peer = m.from_user_id === userId ? m.to_user_id : m.from_user_id;
        if (!peer) continue;
        const entry = byPeer.get(peer);
        if (!entry) byPeer.set(peer, { last: m, unread: 0 });
        if (m.to_user_id === userId && !m.read) {
          const e = byPeer.get(peer)!;
          e.unread += 1;
        }
      }
      const peerIds = [...byPeer.keys()];
      const names = new Map<string, string>();
      if (peerIds.length) {
        const { data: users } = await supabase.from('users').select('id, name').in('id', peerIds);
        for (const u of (users as { id: string; name: string }[]) ?? []) names.set(u.id, u.name);
      }
      return peerIds
        .map((id) => {
          const e = byPeer.get(id)!;
          return {
            userId: id,
            name: names.get(id) || 'Étudiant',
            last: e.last.content,
            time: shortTime(e.last.created_at),
            unread: e.unread,
            lastAt: e.last.created_at,
          };
        })
        .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
    },
    enabled: !!userId,
    staleTime: 20 * 1000,
  });
}

/** Fil d'une conversation (ancien → récent). */
export function useStaffThread(userId?: string, peerId?: string) {
  return useQuery({
    queryKey: ['staff', 'thread', userId, peerId],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select(SELECT)
        .or(
          `and(from_user_id.eq.${userId},to_user_id.eq.${peerId}),and(from_user_id.eq.${peerId},to_user_id.eq.${userId})`,
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as ChatMessage[]) ?? [];
    },
    enabled: !!userId && !!peerId,
    staleTime: 10 * 1000,
  });
}

/** Envoi d'un message agent → étudiant (insertion directe + marque comme lus). */
export function useSendStaffMessage(userId?: string, peerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from('messages').insert({
        from_user_id: userId,
        to_user_id: peerId,
        subject: 'Message',
        content,
        read: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', 'thread', userId, peerId] });
      qc.invalidateQueries({ queryKey: ['staff', 'threads', userId] });
    },
  });
}

/** Marque comme lus les messages reçus d'un interlocuteur. */
export function useMarkThreadRead(userId?: string, peerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId || !peerId) return;
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('to_user_id', userId)
        .eq('from_user_id', peerId)
        .eq('read', false);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', 'threads', userId] });
      qc.invalidateQueries({ queryKey: ['staff', 'badges', userId] });
    },
  });
}
