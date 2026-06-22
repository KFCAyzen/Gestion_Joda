import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useFrais } from '@/lib/hooks/use-admin';
import { Avatar, Chip, GlassCard, ScreenBackground, ScreenHeader, text as T } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { fmtFCFA, shortDate } from '@/lib/format';

const STATUS: Record<string, { label: string; chip: 'done' | 'due' | 'live' | 'ghost' }> = {
  paye: { label: 'Payé', chip: 'done' },
  attente: { label: 'En attente', chip: 'due' },
  en_validation: { label: 'En validation', chip: 'live' },
  retard: { label: 'En retard', chip: 'live' },
  annule: { label: 'Annulé', chip: 'ghost' },
};

export default function AdminFrais() {
  const { data, isLoading } = useFrais();
  const totalCollected = (data ?? []).reduce((s, f) => s + f.collected, 0);
  const totalLate = (data ?? []).reduce((s, f) => s + f.late, 0);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Suivi des paiements" title="Frais" sm onBack={() => router.back()} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <GlassCard variant="strong" style={{ flex: 1 }}>
                <Text style={T.t3}>Encaissé</Text>
                <Text style={[styles.kpi, { color: colors.mint }]}>{fmtFCFA(totalCollected)}</Text>
              </GlassCard>
              <GlassCard variant="strong" style={{ flex: 1 }}>
                <Text style={T.t3}>En retard</Text>
                <Text style={[styles.kpi, { color: colors.crimsonVivid }]}>{fmtFCFA(totalLate)}</Text>
              </GlassCard>
            </View>

            {(data ?? []).map((f) => (
              <GlassCard key={f.studentId} style={{ gap: 11 }}>
                <View style={styles.row}>
                  <Avatar name={f.name} kind="student" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{f.name}</Text>
                    <Text style={T.t3}>{f.tranches.length} tranche{f.tranches.length > 1 ? 's' : ''}</Text>
                  </View>
                </View>
                {f.tranches.map((tr) => {
                  const st = STATUS[tr.status] ?? { label: tr.status, chip: 'ghost' as const };
                  return (
                    <View key={tr.id} style={styles.tranche}>
                      <View style={{ flex: 1 }}>
                        <Text style={[T.t2, { color: '#fff' }]} numberOfLines={1}>{tr.label}</Text>
                        <Text style={T.t3}>{tr.dateLimite ? `Échéance ${shortDate(tr.dateLimite)}` : '—'}</Text>
                      </View>
                      <Text style={styles.amount}>{fmtFCFA(tr.montant)}</Text>
                      <Chip variant={st.chip} label={st.label} />
                    </View>
                  );
                })}
              </GlassCard>
            ))}
            {!data?.length ? <Text style={styles.empty}>Aucun frais.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  kpi: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tranche: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  amount: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
});
