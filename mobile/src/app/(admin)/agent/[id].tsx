import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { useAdminPerformance } from '@/lib/hooks/use-admin';
import { roleLabel } from '@/lib/access';
import type { UserRole } from '@/lib/auth-context';
import { Avatar, Chip, GlassCard, Ring, ScreenBackground, ScreenHeader, StatTile, text as T } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { fmtFCFA } from '@/lib/format';

function scoreColor(s: number): string {
  return s >= 70 ? colors.mint : s >= 40 ? colors.amber : colors.crimsonVivid;
}

export default function AdminAgentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading } = useAdminPerformance();
  const a = data?.agents.find((x) => x.id === id);

  if (isLoading || !a) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <ScreenHeader eyebrow="Performance" title="Agent" sm onBack={() => router.back()} />
          {isLoading ? <ActivityIndicator style={{ marginTop: 40 }} /> : <Text style={styles.empty}>Agent introuvable.</Text>}
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={roleLabel(a.role as UserRole)} title={a.name} sm onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          <GlassCard variant="strong" style={styles.hero}>
            <Ring pct={a.score} size={92} strokeWidth={10}>
              <Text style={[styles.scoreNum, { color: scoreColor(a.score) }]}>{a.score}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </Ring>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Avatar name={a.name} kind="agent" size={34} />
                <Chip variant="ghost" label={roleLabel(a.role as UserRole)} />
              </View>
              <Text style={[T.t2, { marginTop: 10 }]}>{a.students} étudiants · {a.dossiers} dossiers</Text>
            </View>
          </GlassCard>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatTile value={String(a.students)} label="Étudiants" />
            <StatTile value={String(a.dossiers)} label="Dossiers" />
          </View>

          <GlassCard>
            <View style={styles.revRow}>
              <Text style={[T.t1, { fontSize: 14 }]}>Revenu encaissé · mois</Text>
              <Text style={styles.revAmt}>{fmtFCFA(a.revenue)} F</Text>
            </View>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreNum: { fontSize: 22, fontWeight: '700' },
  scoreLabel: { fontSize: 8.5, color: colors.ink50, textTransform: 'uppercase', letterSpacing: 1 },
  revRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  revAmt: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
