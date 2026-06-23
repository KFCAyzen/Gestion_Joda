import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Paperclip, Phone, Send } from 'lucide-react-native';

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
import { colors, gradients, spacing } from '@/theme/tokens';

type Row = { kind: 'sep'; id: string; label: string } | { kind: 'msg'; id: string; message: ChatMessage };

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Aujourd'hui";
  if (sameDay(d, yest)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
}

/** Onglet Messages — chat temps réel avec l'agent (handoff §5 ScreenChat). */
export default function MessagesScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  // Pas de tabbar sur le chat (masquée) : on ne dégage que la zone sûre du bas.
  const composerPad = Math.max(insets.bottom, 12) + 8;

  const { data: messages, isLoading, error } = useStudentChat(userId);
  const send = useSendChatMessage(userId);
  const markRead = useMarkMessagesRead(userId);

  const [draft, setDraft] = useState('');
  const markedRef = useRef<Set<string>>(new Set());
  const listRef = useRef<FlatList<Row>>(null);

  const agentUserId = useMemo(
    () => messages?.find((m) => m.to_user_id === userId)?.from_user_id ?? null,
    [messages, userId],
  );

  // Insère un séparateur de jour avant le 1er message de chaque journée.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = '';
    for (const m of messages ?? []) {
      const day = new Date(m.created_at).toDateString();
      if (day !== lastDay) {
        out.push({ kind: 'sep', id: `sep-${day}`, label: dayLabel(m.created_at) });
        lastDay = day;
      }
      out.push({ kind: 'msg', id: m.id, message: m });
    }
    return out;
  }, [messages]);

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

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header chat */}
        <View style={styles.header}>
          <Pressable style={styles.iconBtn} onPress={() => router.navigate('/')} hitSlop={6}>
            <ChevronLeft size={20} color={colors.text} />
          </Pressable>
          <Avatar name="Agent" kind="agent" size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>Ton agent</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>en ligne</Text>
            </View>
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={() => Alert.alert('Appel', "L'appel direct sera bientôt disponible.")}
            hitSlop={6}>
            <Phone size={18} color={colors.text} />
          </Pressable>
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
              ref={listRef}
              data={rows}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) =>
                item.kind === 'sep' ? (
                  <Text style={styles.daySep}>— {item.label} —</Text>
                ) : (
                  <Bubble message={item.message} own={item.message.from_user_id === userId} />
                )
              }
              contentContainerStyle={{ paddingVertical: 12, gap: 9 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={<Text style={styles.empty}>Écris à ton agent pour démarrer la conversation.</Text>}
            />

            <View style={[styles.composer, { paddingBottom: composerPad }]}>
              <Pressable
                style={styles.clipBtn}
                onPress={() => Alert.alert('Pièce jointe', 'Ajoute tes documents depuis l’onglet Documents.')}
                hitSlop={4}>
                <Paperclip size={19} color={colors.ink70} />
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="Écris à ton agent…"
                placeholderTextColor={colors.ink35}
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
  if (own) {
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowOwn]}>
        <LinearGradient
          colors={gradients.crimson}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleOwn]}>
          <Text style={styles.bubbleText}>{message.content}</Text>
        </LinearGradient>
      </View>
    );
  }
  return (
    <View style={[styles.bubbleRow, styles.bubbleRowThem]}>
      <View style={[styles.bubble, styles.bubbleThem]}>
        <Text style={styles.bubbleText}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.glassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { color: colors.text, fontSize: 15.5, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint },
  statusText: { color: colors.mint, fontSize: 11.5 },
  daySep: {
    color: colors.ink35,
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    textAlign: 'center',
    marginVertical: 2,
  },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowOwn: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20 },
  bubbleOwn: {
    borderBottomRightRadius: 6,
    shadowColor: colors.crimson,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  bubbleThem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.glassLine,
    borderBottomLeftRadius: 6,
  },
  bubbleText: { color: '#fff', fontSize: 13.5, lineHeight: 20 },
  empty: { color: colors.ink50, fontSize: 14, textAlign: 'center', marginTop: 40 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingTop: 8 },
  clipBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.glassLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    backgroundColor: colors.glass,
    borderColor: colors.glassLine,
    borderWidth: 1,
    borderRadius: 23,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#fff',
    fontSize: 14,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.crimsonDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.5 },
  error: { color: colors.crimsonVivid, fontSize: 13 },
});
