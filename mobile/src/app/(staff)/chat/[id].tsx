import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useMarkThreadRead, useSendStaffMessage, useStaffThread } from '@/lib/hooks/use-staff-chat';
import { Avatar, ScreenBackground, useText } from '@/components/ui';
import { radius, spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

function msgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function StaffChat() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const { data: msgs, isLoading } = useStaffThread(user?.id, id);
  const send = useSendStaffMessage(user?.id, id);
  const markRead = useMarkThreadRead(user?.id, id);
  const [txt, setTxt] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (msgs?.length) markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs?.length]);

  function onSend() {
    const v = txt.trim();
    if (!v) return;
    setTxt('');
    send.mutate(v);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.head}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <ChevronLeft size={20} color={colors.text} />
          </Pressable>
          <Avatar name={name || 'Étudiant'} kind="student" size={42} />
          <View style={{ flex: 1 }}>
            <Text style={[T.t1, { fontSize: 15.5 }]} numberOfLines={1}>{name || 'Étudiant'}</Text>
            <Text style={T.t3}>Conversation</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}>
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} />
          ) : (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
              {(msgs ?? []).map((m) => {
                const out = m.from_user_id === user?.id;
                return (
                  <View key={m.id} style={[styles.bub, out ? styles.bubOut : styles.bubIn]}>
                    <Text style={out ? styles.bubTextOut : styles.bubTextIn}>{m.content}</Text>
                    <Text style={out ? styles.bubTimeOut : styles.bubTimeIn}>{msgTime(m.created_at)}</Text>
                  </View>
                );
              })}
              {!msgs?.length ? <Text style={styles.empty}>Démarrez la conversation.</Text> : null}
            </ScrollView>
          )}

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              placeholder="Votre message…"
              placeholderTextColor={colors.ink35}
              value={txt}
              onChangeText={setTxt}
              onSubmitEditing={onSend}
              returnKeyType="send"
            />
            <Pressable style={styles.sendBtn} onPress={onSend} disabled={send.isPending}>
              <Send size={19} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) => {
  const light = colors.bgBase !== '#100307';
  return StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingBottom: 12 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassLine,
      backgroundColor: colors.glass2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { paddingVertical: 8, gap: 8 },
    bub: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
    bubIn: {
      alignSelf: 'flex-start',
      backgroundColor: colors.glass2,
      borderWidth: light ? 1 : 0,
      borderColor: colors.glassLine,
      borderTopLeftRadius: 6,
    },
    // Sombre : tuile crimson translucide. Clair : crimson plein pour garder le texte blanc lisible.
    bubOut: {
      alignSelf: 'flex-end',
      backgroundColor: light ? colors.crimsonDeep : 'rgba(209,26,42,0.30)',
      borderTopRightRadius: 6,
    },
    bubTextIn: { color: colors.text, fontSize: 14, lineHeight: 19 },
    bubTextOut: { color: '#fff', fontSize: 14, lineHeight: 19 },
    bubTimeIn: { color: colors.ink50, fontSize: 10, alignSelf: 'flex-end', marginTop: 3 },
    bubTimeOut: { color: light ? 'rgba(255,255,255,0.85)' : colors.ink50, fontSize: 10, alignSelf: 'flex-end', marginTop: 3 },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
    composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    input: {
      flex: 1,
      height: 46,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.glassLine,
      backgroundColor: colors.glass,
      color: colors.text,
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
  });
};
