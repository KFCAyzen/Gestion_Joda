import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, GraduationCap, Users } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useLanguageCourses, useMarkCoursePaid } from '@/lib/hooks/use-admin';
import { Avatar, Chip, GlassCard, IconBox, ScreenBackground, ScreenHeader, SectionLabel, SegFilter, StatTile, useIconTint, useText, useToast } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtFCFA } from '@/lib/format';

const PAY_LABEL: Record<string, { label: string; chip: 'done' | 'due' | 'live' | 'ghost' }> = {
  paye: { label: 'Payé', chip: 'done' },
  attente: { label: 'En attente', chip: 'due' },
  en_validation: { label: 'En validation', chip: 'live' },
  retard: { label: 'En retard', chip: 'due' },
};

export default function AdminCours() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { user } = useAuth();
  const { data, isLoading } = useLanguageCourses();
  const markPaid = useMarkCoursePaid(user ?? undefined);
  const toast = useToast();
  const [tab, setTab] = useState('mandarin');
  const stats = tab === 'mandarin' ? data?.mandarin : data?.anglais;

  const canMark = ['agent', 'supervisor', 'admin', 'super_admin'].includes(user?.role ?? '');

  async function onMarkPaid(id: string) {
    try {
      await markPaid.mutateAsync(id);
      toast('Paiement validé ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec');
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Cours de langues" title="Cours" sm onBack={() => router.back()} />
        <SegFilter
          options={[
            { id: 'mandarin', label: 'Mandarin' },
            { id: 'anglais', label: 'Anglais' },
          ]}
          value={tab}
          onChange={setTab}
          style={{ marginBottom: 12 }}
        />
        {isLoading || !data ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            <GlassCard variant="strong" style={styles.hero}>
              <IconBox tone={tab === 'mandarin' ? 'red' : 'blue'} size={48}>
                <GraduationCap size={22} color={tab === 'mandarin' ? iconTint.red : iconTint.blue} />
              </IconBox>
              <View style={{ flex: 1 }}>
                <Text style={T.eyebrow}>{tab === 'mandarin' ? 'Cours de mandarin' : 'Cours d’anglais'}</Text>
                <Text style={styles.revenue}>{fmtFCFA(stats?.revenue ?? 0)} <Text style={styles.unit}>FCFA</Text></Text>
                <Text style={T.t3}>revenu cumulé</Text>
              </View>
            </GlassCard>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatTile value={String(stats?.active ?? 0)} label="Inscrits actifs" />
              <StatTile value={fmtFCFA(stats?.revenue ?? 0)} label="Revenu" valueColor={colors.mint} />
            </View>

            <GlassCard style={styles.infoRow}>
              <Users size={18} color={colors.ink50} />
              <Text style={T.t2}>
                {stats?.active ?? 0} étudiant{(stats?.active ?? 0) > 1 ? 's' : ''} inscrit{(stats?.active ?? 0) > 1 ? 's' : ''} au cours de{' '}
                {tab === 'mandarin' ? 'mandarin' : 'anglais'}.
              </Text>
            </GlassCard>

            <SectionLabel title={`Paiements · ${stats?.payments.length ?? 0}`} />
            {(stats?.payments ?? []).map((p) => {
              const meta = PAY_LABEL[p.status] ?? { label: p.status, chip: 'ghost' as const };
              const settled = p.status === 'paye';
              return (
                <GlassCard key={p.id} style={styles.payCard}>
                  <Avatar name={p.studentName} kind="student" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{p.studentName}</Text>
                    <Text style={T.t3}>
                      {p.tranche ? `Tranche ${p.tranche} · ` : ''}{fmtFCFA(p.amount)} FCFA
                    </Text>
                  </View>
                  {settled || !canMark ? (
                    <Chip variant={meta.chip} label={meta.label} />
                  ) : (
                    <Pressable onPress={() => onMarkPaid(p.id)} disabled={markPaid.isPending} style={styles.markBtn}>
                      <Check size={13} color={colors.mint} strokeWidth={2.6} />
                      <Text style={styles.markTxt}>Marquer payé</Text>
                    </Pressable>
                  )}
                </GlassCard>
              );
            })}
            {!stats?.payments.length ? <Text style={styles.empty}>Aucun paiement de cours.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    revenue: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 4 },
    unit: { fontSize: 12, color: colors.ink50, fontWeight: '400' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    payCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    markBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(52,217,168,0.13)',
      borderWidth: 1,
      borderColor: 'rgba(52,217,168,0.32)',
    },
    markTxt: { color: colors.mint, fontSize: 12, fontWeight: '600' },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 30 },
  });
