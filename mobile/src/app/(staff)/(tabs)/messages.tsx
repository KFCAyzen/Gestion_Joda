import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import { useStaffThreads } from '@/lib/hooks/use-staff-chat';
import {
  Avatar,
  CountBadge,
  ListCard,
  ListRow,
  ScreenBackground,
  ScreenHeader,
  SearchBar,
  text as T,
} from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

export default function StaffMessages() {
  const { user } = useAuth();
  const { data: threads, isLoading } = useStaffThreads(user?.id);
  const [q, setQ] = useState('');

  const unread = (threads ?? []).reduce((s, t) => s + t.unread, 0);
  const list = (threads ?? []).filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={`${unread} non lus`} title="Messages" />
        <SearchBar value={q} onChange={setQ} placeholder="Rechercher une conversation…" style={{ marginBottom: 12 }} />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
            {list.length ? (
              <ListCard>
                {list.map((t, i, arr) => (
                  <ListRow
                    key={t.userId}
                    last={i === arr.length - 1}
                    onPress={() => router.navigate(`/(staff)/chat/${t.userId}?name=${encodeURIComponent(t.name)}` as Href)}>
                    <Avatar name={t.name} kind="student" size={48} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.rowTop}>
                        <Text style={[T.t1, { flex: 1 }]} numberOfLines={1}>{t.name}</Text>
                        <Text style={T.t3}>{t.time}</Text>
                      </View>
                      <View style={styles.rowBottom}>
                        <Text
                          style={[T.t2, { flex: 1 }, t.unread ? styles.unreadText : null]}
                          numberOfLines={1}>
                          {t.last}
                        </Text>
                        {t.unread ? <CountBadge count={t.unread} /> : null}
                      </View>
                    </View>
                  </ListRow>
                ))}
              </ListCard>
            ) : (
              <Text style={styles.empty}>Aucune conversation.</Text>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  unreadText: { color: '#fff', fontWeight: '600' },
  empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
});
