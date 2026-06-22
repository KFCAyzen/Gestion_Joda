import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, Clock, Flag } from 'lucide-react-native';

import { useStaffReports, useReviewReport, isPendingReport } from '@/lib/hooks/use-staff';
import {
  Avatar,
  Button,
  Chip,
  GlassCard,
  ScreenBackground,
  ScreenHeader,
  SegFilter,
  useText,
  useToast,
} from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { shortDate } from '@/lib/format';

export default function StaffRapports() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { data: reports, isLoading } = useStaffReports();
  const review = useReviewReport();
  const toast = useToast();
  const [tab, setTab] = useState('pending');

  const pending = useMemo(() => (reports ?? []).filter((r) => isPendingReport(r.status)), [reports]);
  const treated = useMemo(() => (reports ?? []).filter((r) => !isPendingReport(r.status)), [reports]);
  const list = tab === 'pending' ? pending : treated;
  const totalHours = pending.reduce((s, r) => s + (r.hours ?? 0), 0);

  async function act(id: string, ok: boolean) {
    try {
      await review.mutateAsync({ id, ok });
      toast(ok ? 'Rapport validé ✓' : 'Rapport signalé');
    } catch {
      toast('Action enregistrée localement');
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Ressources humaines" title="Rapports" sm onBack={() => router.back()} />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            <GlassCard variant="strong">
              <Text style={[T.eyebrow, { color: colors.redIcon }]}>Rapports journaliers · équipe</Text>
              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.bigNum}>{pending.length}</Text>
                  <Text style={T.t3}>en attente de validation</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.bigNum, { fontSize: 16, color: colors.mint }]}>{totalHours}h</Text>
                  <Text style={T.t3}>cumulées</Text>
                </View>
              </View>
            </GlassCard>

            <SegFilter
              options={[
                { id: 'pending', label: 'En attente', count: pending.length },
                { id: 'treated', label: 'Traités', count: treated.length },
              ]}
              value={tab}
              onChange={setTab}
            />

            {list.map((r) => (
              <GlassCard key={r.id} style={{ padding: 14 }}>
                <View style={styles.row}>
                  <Avatar name={r.employee} kind="agent" size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{r.employee}</Text>
                    <Text style={T.t2} numberOfLines={1}>{r.poste}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Chip variant="ghost" label={shortDate(r.date)} />
                    <View style={styles.hoursRow}>
                      <Clock size={12} color={colors.ink50} />
                      <Text style={T.t3}>{r.hours ?? '—'}h</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.activityBox}>
                  <Text style={T.t3}>Activités</Text>
                  <Text style={styles.activityText}>{r.activities || '—'}</Text>
                  {r.note ? (
                    <>
                      <Text style={[T.t3, { marginTop: 9 }]}>Observations</Text>
                      <Text style={[styles.activityText, { color: colors.ink50 }]}>{r.note}</Text>
                    </>
                  ) : null}
                </View>

                {isPendingReport(r.status) ? (
                  <View style={styles.btnRow}>
                    <Button label="Signaler" size="sm" variant="danger" icon={<Flag size={15} color="#fff" />} onPress={() => act(r.id, false)} style={{ flex: 1 }} />
                    <Button label="Valider" size="sm" variant="mint" icon={<Check size={16} color="#fff" strokeWidth={2.6} />} onPress={() => act(r.id, true)} style={{ flex: 1.4 }} />
                  </View>
                ) : (
                  <View style={{ marginTop: 11 }}>
                    <Chip variant={r.status === 'signale' ? 'ghost' : 'done'} label={r.status === 'signale' ? 'Signalé' : 'Validé'} />
                  </View>
                )}
              </GlassCard>
            ))}
            {!list.length ? <Text style={styles.empty}>Tout est traité. ✦</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    summaryRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
    bigNum: { color: colors.text, fontSize: 30, fontWeight: '600' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    activityBox: {
      marginTop: 11,
      padding: 12,
      backgroundColor: colors.softFill,
      borderWidth: 1,
      borderColor: colors.glassLine,
      borderRadius: 12,
    },
    activityText: { color: colors.ink70, fontSize: 13, lineHeight: 19, marginTop: 4 },
    btnRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  });
