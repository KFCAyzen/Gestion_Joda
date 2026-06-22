import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import { useAdminDashboard, useActivityLogs, type ActivityLog } from '@/lib/hooks/use-admin';
import {
  Avatar,
  BellBtn,
  GlassCard,
  ProgressBar,
  ScreenBackground,
  ScreenHeader,
  SectionLabel,
  SegFilter,
  useText,
} from '@/components/ui';
import { darkColors, radius, spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtCompact } from '@/lib/format';

const VIEWS = [
  { id: 'aujourdhui', label: "Aujourd'hui" },
  { id: 'semaine', label: 'Semaine' },
  { id: 'mois', label: 'Mois' },
];

// Couleurs des pastilles du journal — accents vifs lisibles en clair comme en sombre.
const LOG_COLOR: Record<string, string> = {
  create: darkColors.mint,
  delete: darkColors.crimsonVivid,
  reject: darkColors.crimsonVivid,
  validate: '#34d9a8',
  payment: darkColors.amber,
  accounting: darkColors.amber,
  update: darkColors.blue,
  upload: '#2dd4bf',
};
function logColor(type: string): string {
  for (const k of Object.keys(LOG_COLOR)) if (type.includes(k)) return LOG_COLOR[k];
  return darkColors.ink50;
}

type JournalGroup = { period: string; entries: { id: string; time: string; actor: string; desc: string; color: string }[] };
function groupJournal(logs: ActivityLog[]): JournalGroup[] {
  const today = new Date().toDateString();
  const order = ['MATIN', 'APRÈS-MIDI', 'SOIR'];
  const groups: Record<string, JournalGroup['entries']> = {};
  for (const l of logs) {
    const d = new Date(l.created_at);
    if (d.toDateString() !== today) continue;
    const h = d.getHours();
    const period = h < 12 ? 'MATIN' : h < 17 ? 'APRÈS-MIDI' : 'SOIR';
    (groups[period] ||= []).push({
      id: l.id,
      time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      actor: l.user_name,
      desc: l.description,
      color: logColor(l.activity_type),
    });
  }
  return order.filter((p) => groups[p]?.length).map((p) => ({ period: p, entries: groups[p].slice(0, 6) }));
}

export default function AdminBord() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { user } = useAuth();
  const { data, isLoading } = useAdminDashboard();
  const { data: logs } = useActivityLogs();
  const [view, setView] = useState('aujourdhui');

  const journal = useMemo(() => groupJournal(logs ?? []), [logs]);

  const maxFlux = useMemo(() => Math.max(1, ...(data?.flux ?? []).map((b) => b.v)), [data]);
  const topMax = Math.max(1, data?.topUniv[0]?.count ?? 1);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow="Vue d'ensemble · Joda Company"
          title="Tableau de bord"
          right={
            <View style={styles.headerRight}>
              <Pressable onPress={() => router.navigate('/(admin)/notifications' as Href)}>
                <BellBtn hasUnread />
              </Pressable>
              <Avatar name={user?.name || 'Admin'} kind="staff" size={42} />
            </View>
          }
        />

        {isLoading || !data ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            <SegFilter options={VIEWS} value={view} onChange={setView} />

            {/* Stats opérationnelles */}
            <GlassCard variant="strong">
              <View style={styles.statRow}>
                <View style={[styles.statCol, styles.statColBorder]}>
                  <Text style={styles.statLabel}>À TRAITER</Text>
                  <Text style={styles.statBig}>{data.aTraiter}</Text>
                  <Text style={T.t3}>dossiers en attente</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>DOSSIERS OUVERTS</Text>
                  <Text style={styles.statBig}>{data.dossiersOuverts}</Text>
                  <Text style={[T.t3, { color: colors.mint }]}>+{data.dossiersGrowth} ce mois</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <Text style={styles.statLabel}>ENCAISSÉ CE MOIS</Text>
              <View style={styles.encaisseRow}>
                <Text style={styles.encaisse}>{fmtCompact(data.encaisseMois)}</Text>
                <Text style={T.t3}>FCFA</Text>
              </View>
            </GlassCard>

            {/* Flux 7 jours */}
            <GlassCard>
              <SectionLabel title="Flux 7 jours" action="candidatures" />
              <View style={styles.barchart}>
                {data.flux.map((b, i) => (
                  <View key={i} style={styles.barcol}>
                    {b.today && b.v > 0 ? <Text style={styles.barValue}>{b.v}</Text> : null}
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(4, (b.v / maxFlux) * 90) },
                        b.today ? styles.barToday : styles.barMuted,
                      ]}
                    />
                    <Text style={[styles.barLabel, b.today && { color: colors.text, fontWeight: '700' }]}>{b.l}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>

            {/* Top universités */}
            {data.topUniv.length ? (
              <GlassCard>
                <Text style={styles.topTitle}>Top 3 universités · semaine</Text>
                {data.topUniv.map((u, i) => (
                  <View key={i} style={{ marginBottom: i < data.topUniv.length - 1 ? 12 : 0 }}>
                    <View style={styles.topRow}>
                      <Text style={[T.t2, { color: colors.text, flex: 1 }]} numberOfLines={1}>{u.name}</Text>
                      <Text style={T.t1}>{u.count}</Text>
                    </View>
                    <ProgressBar pct={(u.count / topMax) * 100} style={{ marginTop: 6 }} />
                  </View>
                ))}
              </GlassCard>
            ) : null}

            {/* Journal d'activité */}
            <SectionLabel title="Journal d'activité" action="Tout voir" onAction={() => router.navigate('/(admin)/logs' as Href)} />
            <GlassCard>
              {journal.length ? (
                journal.map((grp) => (
                  <View key={grp.period}>
                    <Text style={styles.periodLabel}>{grp.period}</Text>
                    {grp.entries.map((e) => (
                      <View key={e.id} style={styles.jentry}>
                        <Text style={styles.jtime}>{e.time}</Text>
                        <View style={[styles.jdot, { backgroundColor: e.color }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[T.t2, { color: colors.text }]} numberOfLines={2}>
                            <Text style={{ fontWeight: '700' }}>{e.actor}</Text> {e.desc}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={T.t3}>Aucune activité aujourd'hui.</Text>
              )}
            </GlassCard>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statRow: { flexDirection: 'row' },
    statCol: { flex: 1, paddingHorizontal: 14 },
    statColBorder: { borderRightWidth: 1, borderRightColor: colors.glassLine, paddingLeft: 0 },
    statLabel: { color: colors.ink35, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4 },
    statBig: { color: colors.text, fontSize: 38, fontWeight: '600', letterSpacing: -1.5, marginTop: 4 },
    divider: { height: 1, backgroundColor: colors.glassLine, marginVertical: 14, marginHorizontal: -16 },
    encaisseRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
    encaisse: { color: colors.text, fontSize: 34, fontWeight: '600', letterSpacing: -1.5 },

    barchart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, marginTop: 8 },
    barcol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
    bar: { width: 18, borderRadius: 6 },
    barToday: { backgroundColor: colors.crimsonVivid },
    barMuted: { backgroundColor: colors.track },
    barValue: { color: colors.text, fontSize: 11, fontWeight: '700' },
    barLabel: { color: colors.ink50, fontSize: 11 },

    topTitle: { color: colors.ink50, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    periodLabel: { color: colors.ink35, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.4, marginTop: 10, marginBottom: 4 },
    jentry: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 7 },
    jtime: { color: colors.ink50, fontSize: 10.5, width: 38, marginTop: 1 },
    jdot: { width: 7, height: 7, borderRadius: 4, marginTop: 5 },
  });
