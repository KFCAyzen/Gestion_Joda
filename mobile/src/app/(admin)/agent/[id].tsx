import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { useAdminPerformance } from '@/lib/hooks/use-admin';
import { roleLabel } from '@/lib/access';
import type { UserRole } from '@/lib/auth-context';
import { Avatar, Chip, GlassCard, Ring, ScreenBackground, ScreenHeader, StatTile, useText } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtFCFA } from '@/lib/format';

function scoreColor(s: number, colors: Palette): string {
  return s >= 70 ? colors.mint : s >= 40 ? colors.amber : colors.crimsonVivid;
}

export default function AdminAgentDetail() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
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
              <Text style={[styles.scoreNum, { color: scoreColor(a.score, colors) }]}>{a.score}</Text>
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
            <StatTile value={a.avgValidationDays !== null ? `${a.avgValidationDays.toFixed(1)}j` : '—'} label="Délai valid." />
          </View>

          {/* Décomposition du score */}
          <View style={styles.brk}>
            {[
              ['Revenu', a.breakdown.revenue],
              ['Activité', a.breakdown.activity],
              ['Rapidité', a.breakdown.speed],
              ['Dossier', a.breakdown.dossier],
            ].map(([k, v]) => (
              <View key={k as string} style={styles.brkCell}>
                <Text style={styles.brkLabel}>{k}</Text>
                <Text style={[styles.brkValue, { color: scoreColor(v as number, colors) }]}>{v}%</Text>
              </View>
            ))}
          </View>

          <GlassCard>
            <View style={styles.revRow}>
              <Text style={[T.t1, { fontSize: 14 }]}>Revenu encaissé</Text>
              <Text style={styles.revAmt}>{fmtFCFA(a.revenue)} F</Text>
            </View>
            <View style={styles.typeRow}>
              {([['Bourse', colors.purpleIcon, a.types.bourse], ['Mandarin', colors.crimsonVivid, a.types.mandarin], ['Anglais', colors.blueIcon, a.types.anglais]] as const).map(([label, color, st]) => (
                <View key={label} style={styles.typeCell}>
                  <Text style={[styles.typeLabel, { color }]}>{label}</Text>
                  <Text style={styles.typeAmt}>{fmtFCFA(st.a)}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {a.alerts.validation + a.alerts.attente + a.alerts.retard > 0 ? (
            <View style={styles.tagRow}>
              {a.alerts.validation > 0 ? <Text style={[styles.tag, styles.tagVal]}>{a.alerts.validation} en validation</Text> : null}
              {a.alerts.attente > 0 ? <Text style={[styles.tag, styles.tagAtt]}>{a.alerts.attente} en attente</Text> : null}
              {a.alerts.retard > 0 ? <Text style={[styles.tag, styles.tagRet]}>{a.alerts.retard} en retard</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
    hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    scoreNum: { fontSize: 22, fontWeight: '700' },
    scoreLabel: { fontSize: 8.5, color: colors.ink50, textTransform: 'uppercase', letterSpacing: 1 },
    revRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    revAmt: { color: colors.text, fontSize: 16, fontWeight: '700' },
    brk: { flexDirection: 'row', gap: 8 },
    brkCell: { flex: 1, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.glassLine, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    brkLabel: { color: colors.ink35, fontSize: 8.5, fontWeight: '700', textTransform: 'uppercase' },
    brkValue: { fontSize: 16, fontWeight: '700', marginTop: 3 },
    typeRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.glassLine, marginTop: 12, paddingTop: 12 },
    typeCell: { flex: 1, alignItems: 'center' },
    typeLabel: { fontSize: 10.5, fontWeight: '700' },
    typeAmt: { color: colors.ink70, fontSize: 12.5, fontWeight: '700', marginTop: 3 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: { fontSize: 11, fontWeight: '600', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, overflow: 'hidden' },
    tagVal: { color: colors.mintIcon, backgroundColor: 'rgba(52,217,168,0.13)' },
    tagAtt: { color: colors.amberIcon, backgroundColor: 'rgba(251,191,36,0.13)' },
    tagRet: { color: colors.redIcon, backgroundColor: 'rgba(239,68,68,0.13)' },
  });
