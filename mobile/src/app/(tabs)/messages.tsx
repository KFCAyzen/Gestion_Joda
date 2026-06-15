import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import {
  STUDENT_CHAT_KEY,
  useMarkMessagesRead,
  useSendChatMessage,
  useStudentChat,
  type ChatMessage,
} from '@/lib/hooks/use-messages';
import { supabase } from '@/lib/supabase';
import { Avatar, ScreenBackground } from '@/components/ui';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';

/** Onglet Messages — chat temps réel avec l'agent (handoff §5). */
export default function MessagesScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();

  const { data: messages, isLoading, error } = useStudentChat(userId);
  const send = useSendChatMessage(userId);
  const markRead = useMarkMessagesRead(userId);

  const [draft, setDraft] = useState('');
  const markedRef = useRef<Set<string>>(new Set());

  const agentUserId = useMemo(
    () => messages?.find((m) => m.to_user_id === userId)?.from_user_id ?? null,
    [messages, userId],
  );

  // Realtime : nouveaux messages reçus → rafraîchit le fil.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`chat-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: [...STUDENT_CHAT_KEY, userId] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  // Marque les messages reçus non lus comme lus (une fois chacun).
  useEffect(() => {
    if (!messages || !userId) return;
    const toMark = messages
      .filter((m) => m.to_user_id === userId && !m.read && !markedRef.current.has(m.id))
      .map((m) => m.id);
    if (toMark.length > 0) {
      toMark.forEach((id) => markedRef.current.add(id));
      markRead.mutate(toMark);
    }
  }, [messages, userId, markRead]);

  function handleSend() {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    send.mutate({ content, agentUserId });
  }

  const reversed = useMemo(() => (messages ? [...messages].reverse() : []), [messages]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Avatar name="Agent" kind="agent" size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>Ton agent</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>en ligne</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>Erreur : {(error as Error).message}</Text>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}>
            <FlatList
              data={reversed}
              inverted
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => <Bubble message={item} own={item.from_user_id === userId} />}
              contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={<Text style={styles.empty}>Écris à ton agent pour démarrer la conversation.</Text>}
            />

            <View style={styles.composer}>
              <TextInput
                style={styles.input}
                placeholder="Écris à ton agent…"
                placeholderTextColor={colors.ink50}
                value={draft}
                onChangeText={setDraft}
                multiline
              />
              <Pressable
                style={[styles.sendBtn, (!draft.trim() || send.isPending) && styles.sendBtnOff]}
                onPress={handleSend}
                disabled={!draft.trim() || send.isPending}>
                <Send size={18} color="#fff" strokeWidth={2.2} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Bubble({ message, own }: { message: ChatMessage; own: boolean }) {
  return (
    <View style={[styles.bubbleRow, own ? styles.bubbleRowOwn : styles.bubbleRowThem]}>
      <View style={[styles.bubble, own ? styles.bubbleOwn : styles.bubbleThem]}>
        <Text style={styles.bubbleText}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  headerName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.mint },
  statusText: { color: colors.ink50, fontSize: fontSize.meta },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowOwn: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md },
  bubbleOwn: { backgroundColor: colors.crimsonDeep, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: colors.glass2,
    borderWidth: 1,
    borderColor: colors.glassLine,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  empty: { color: colors.ink50, fontSize: 14, textAlign: 'center', marginTop: 40, transform: [{ scaleY: -1 }] },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingVertical: 8, paddingBottom: 90 },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: colors.glass,
    borderColor: colors.glassLine,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    color: '#fff',
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.crimsonDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.5 },
  error: { color: colors.crimsonVivid, fontSize: 13 },
});
