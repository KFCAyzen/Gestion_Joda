import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { usePaymentConfigs } from '@/lib/hooks/use-admin';
import { GlassCard, ScreenBackground, ScreenHeader, useText } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtFCFA } from '@/lib/format';

export default function AdminConfigFrais() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { data, isLoading } = usePaymentConfigs();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Paramètres" title="Config. frais" sm onBack={() => router.back()} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.note}>Grille par type de frais — l&apos;édition se fait depuis l&apos;interface web.</Text>
            {(data ?? []).map((c) => {
              const total = c.tranches.reduce((s, tr) => s + Number(tr.montant || 0), 0);
              return (
                <GlassCard key={c.service_type} style={{ gap: 10 }}>
                  <View style={styles.head}>
                    <View style={{ flex: 1 }}>
                      <Text style={T.t1}>{c.label}</Text>
                      <Text style={T.t3}>{c.service_type}</Text>
                    </View>
                    <Text style={styles.amount}>{fmtFCFA(total)} F</Text>
                  </View>
                  <View style={styles.grid}>
                    <Cell label="Tranches" value={String(c.tranches.length)} />
                    <Cell label="Pénalité/j" value={`${c.daily_penalty}%`} />
                    <Cell label="Grâce" value={`${c.grace_days} j`} />
                    <Cell label="Délai" value={`${c.deadline_offset_days} j`} />
                  </View>
                </GlassCard>
              );
            })}
            {!data?.length ? <Text style={styles.empty}>Aucune configuration de frais.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>{value}</Text>
      <Text style={T.t3}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    note: { color: colors.ink50, fontSize: 12, lineHeight: 17 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    amount: { color: colors.text, fontSize: 15, fontWeight: '700' },
    grid: { flexDirection: 'row', gap: 8 },
    cell: { flex: 1, backgroundColor: colors.softFill, borderWidth: 1, borderColor: colors.glassLine, borderRadius: 12, padding: 9, alignItems: 'center' },
    cellValue: { color: colors.text, fontSize: 15, fontWeight: '700' },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  });
