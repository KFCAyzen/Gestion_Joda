import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useActivityLogs, type ActivityLog } from '@/lib/hooks/use-admin';
import { Chip, GlassCard, ScreenBackground, ScreenHeader, text as T } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { relTime } from '@/lib/format';

const TYPE_COLOR: Record<string, string> = {
  create: colors.mint,
  delete: colors.crimsonVivid,
  reject: colors.crimsonVivid,
  validate: '#34d9a8',
  payment_validate: '#34d9a8',
  update: colors.blue,
  login: '#818cf8',
  upload: '#2dd4bf',
  payment: colors.purple,
  accounting_entry: colors.amber,
};

function colorFor(type: string): string {
  for (const key of Object.keys(TYPE_COLOR)) if (type.includes(key)) return TYPE_COLOR[key];
  return colors.ink50;
}

function groupByDay(list: ActivityLog[]) {
  const groups: Record<string, ActivityLog[]> = {};
  for (const l of list) {
    const d = new Date(l.created_at);
    const today = new Date();
    const yest = new Date(Date.now() - 86_400_000);
    const key =
      d.toDateString() === today.toDateString()
        ? "AUJOURD'HUI"
        : d.toDateString() === yest.toDateString()
          ? 'HIER'
          : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }).toUpperCase();
    (groups[key] ||= []).push(l);
  }
  return groups;
}

export default function AdminLogs() {
  const { data, isLoading } = useActivityLogs();
  const groups = groupByDay(data ?? []);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Audit" title="Logs d'activités" sm onBack={() => router.back()} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            {Object.entries(groups).map(([day, items]) => (
              <View key={day} style={{ gap: 8 }}>
                <Text style={styles.dayLabel}>{day}</Text>
                <GlassCard>
                  {items.map((l, i) => (
                    <View key={l.id} style={[styles.row, i < items.length - 1 && styles.rowBorder]}>
                      <View style={[styles.dot, { backgroundColor: colorFor(l.activity_type) }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[T.t1, { fontSize: 13.5 }]}>
                          <Text style={{ fontWeight: '700' }}>{l.user_name}</Text> {l.description}
                        </Text>
                        <View style={styles.metaRow}>
                          <Chip variant="ghost" label={l.user_role} />
                          <Text style={T.t3}>{relTime(l.created_at)}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </GlassCard>
              </View>
            ))}
            {!data?.length ? <Text style={styles.empty}>Aucune activité enregistrée.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  dayLabel: { color: colors.ink35, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.4 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
});
