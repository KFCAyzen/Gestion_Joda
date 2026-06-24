import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { ChevronRight, TrendingUp, WalletCards } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useStaffDossiers, useStaffPayments, useStaffReports, isPendingReport } from '@/lib/hooks/use-staff';
import {
  Avatar,
  BellBtn,
  Chip,
  GlassCard,
  IconBox,
  ListCard,
  ListRow,
  Ring,
  ScreenBackground,
  ScreenHeader,
  SectionLabel,
  StatTile,
  useIconTint,
  useText,
} from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtCompact, fmtFCFA, relTime } from '@/lib/format';

export default function StaffHome() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { user } = useAuth();
  const first = (user?.name ?? user?.username ?? '').split(' ')[0] || 'Agent';

  const { data: dossiers, isLoading } = useStaffDossiers();
  const { data: payments } = useStaffPayments();
  const { data: reports } = useStaffReports();

  const stats = useMemo(() => {
    const list = dossiers ?? [];
    const active = list.filter((d) => d.bucket !== 'done').length;
    const pendingPayments = (payments ?? []).filter((p) => p.status === 'en_validation');
    const pendingReports = (reports ?? []).filter((r) => isPendingReport(r.status));
    const collected = (payments ?? []).filter((p) => p.status === 'paye').reduce((s, p) => s + p.amount, 0);
    const handled = (payments ?? []).filter((p) => p.status !== 'en_validation').length;
    const target = handled + pendingPayments.length + pendingReports.length;
    const dayPct = target ? Math.round((handled / target) * 100) : 0;
    return { active, pendingPayments, pendingReports, collected, handled, target, dayPct };
  }, [dossiers, payments, reports]);

  if (isLoading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <ActivityIndicator style={{ marginTop: 60 }} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow="Tableau de bord"
          title={`Bonjour, ${first}`}
          right={
            <View style={styles.headerRight}>
              <BellBtn hasUnread={!!stats.pendingPayments.length} />
              <Avatar name={user?.name || 'Agent'} kind="staff" size={42} />
            </View>
          }
        />

        <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          {/* HERO — activité du jour */}
          <GlassCard variant="strong" style={styles.hero}>
            <TrendingUp size={140} color={colors.watermark} strokeWidth={1} style={styles.filigree} />
            <Text style={[T.eyebrow, { color: colors.redIcon }]}>Activité du jour</Text>
            <View style={styles.heroRow}>
              <Ring pct={stats.dayPct} size={104} strokeWidth={11}>
                <Text style={styles.ringValue}>
                  {stats.dayPct}
                  <Text style={styles.ringPct}>%</Text>
                </Text>
                <Text style={styles.ringLabel}>Traité</Text>
              </Ring>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroBig}>
                  {stats.handled} action{stats.handled > 1 ? 's' : ''} sur {stats.target}
                </Text>
                <Text style={[T.t2, { marginTop: 3 }]}>Paiements & rapports traités aujourd&apos;hui.</Text>
                <View style={styles.chipRow}>
                  <Chip variant="live" label={`${stats.pendingPayments.length + stats.pendingReports.length} en attente`} />
                  <Chip variant="done" label={`${stats.handled} faits`} />
                </View>
              </View>
            </View>
          </GlassCard>

          {/* KPIs */}
          <View style={styles.kgrid}>
            <StatTile value={String(stats.active)} label="Dossiers actifs" />
            <StatTile value={fmtCompact(stats.collected)} label="FCFA encaissés" valueColor={colors.mint} />
          </View>
          <View style={styles.kgrid}>
            <StatTile value={String(stats.pendingPayments.length)} label="Paiements à valider" valueColor={colors.amber} />
            <StatTile value={String(stats.pendingReports.length)} label="Rapports à valider" valueColor={colors.crimsonVivid} />
          </View>

          {/* À valider — paiements */}
          <SectionLabel title="À valider — paiements" action="Tout voir" onAction={() => router.navigate('/(staff)/(tabs)/paiements' as Href)} />
          {stats.pendingPayments.length ? (
            <ListCard>
              {stats.pendingPayments.slice(0, 2).map((p, i, arr) => (
                <ListRow key={p.id} last={i === arr.length - 1} onPress={() => router.navigate('/(staff)/(tabs)/paiements' as Href)}>
                  <IconBox tone="amber" size={42}>
                    <WalletCards size={19} color={iconTint.amber} />
                  </IconBox>
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{p.student}</Text>
                    <Text style={T.t2} numberOfLines={1}>{p.type} · déclaré {relTime(p.declaredAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={T.amount}>{fmtFCFA(p.amount)}</Text>
                    <Text style={T.t3}>FCFA</Text>
                  </View>
                </ListRow>
              ))}
            </ListCard>
          ) : (
            <Text style={styles.empty}>Aucun paiement en attente. ✦</Text>
          )}

          {/* À valider — rapports */}
          <SectionLabel title="À valider — rapports employés" action="Tout voir" onAction={() => router.navigate('/(staff)/rapports' as Href)} />
          {stats.pendingReports.length ? (
            <ListCard>
              {stats.pendingReports.slice(0, 2).map((r, i, arr) => (
                <ListRow key={r.id} last={i === arr.length - 1} onPress={() => router.navigate('/(staff)/rapports' as Href)}>
                  <Avatar name={r.employee} kind="agent" size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{r.employee}</Text>
                    <Text style={T.t2} numberOfLines={1}>{r.poste} · {r.hours ?? '—'}h</Text>
                  </View>
                  <ChevronRight size={18} color={colors.ink35} />
                </ListRow>
              ))}
            </ListCard>
          ) : (
            <Text style={styles.empty}>Aucun rapport en attente. ✦</Text>
          )}

          {/* Dossiers récents */}
          <SectionLabel title="Dossiers récents" action="Tout voir" onAction={() => router.navigate('/(staff)/(tabs)/dossiers' as Href)} />
          <ListCard>
            {(dossiers ?? []).slice(0, 3).map((d, i, arr) => (
              <ListRow key={d.id} last={i === arr.length - 1} onPress={() => router.navigate(`/(staff)/student/${d.id}` as Href)}>
                <Avatar name={d.name} kind="student" size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={T.t1} numberOfLines={1}>{d.name}</Text>
                  <Text style={T.t2} numberOfLines={1}>{d.program}</Text>
                </View>
                <Chip variant={d.chip} label={d.statusLabel} />
              </ListRow>
            ))}
          </ListCard>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    hero: { overflow: 'hidden' },
    filigree: { position: 'absolute', top: -30, right: -24 },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12 },
    ringValue: { color: colors.text, fontSize: 26, fontWeight: '600', lineHeight: 28 },
    ringPct: { fontSize: 14, color: colors.ink50 },
    ringLabel: { color: colors.ink50, fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 1.1, marginTop: 2 },
    heroBig: { color: colors.text, fontSize: 15, fontWeight: '600' },
    chipRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
    kgrid: { flexDirection: 'row', gap: 10 },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 18 },
  });
