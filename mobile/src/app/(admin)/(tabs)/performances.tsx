import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { BookOpen, FileText, Star, Users } from 'lucide-react-native';

import { useAdminPerformance, type AgentPerf } from '@/lib/hooks/use-admin';
import {
  Avatar,
  Chip,
  GlassCard,
  MiniRing,
  ProgressBar,
  ScreenBackground,
  ScreenHeader,
  SegFilter,
  text as T,
} from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { fmtCompact, fmtFCFA } from '@/lib/format';

const MODES = [
  { id: 'agents', label: 'Par agent' },
  { id: 'employes', label: 'Employés' },
  { id: 'jour', label: 'Journalier' },
];
const PERIODS = [
  { id: 'semaine', label: 'Sem.' },
  { id: 'mois', label: 'Mois' },
  { id: 'trimestre', label: 'Trim.' },
  { id: 'annee', label: 'Année' },
];
const MEDALS = ['🥇', '🥈', '🥉'];

function scoreColor(s: number): string {
  return s >= 70 ? colors.mint : s >= 40 ? colors.amber : colors.crimsonVivid;
}

const ROLE_CHIP: Record<string, 'done' | 'live' | 'due' | 'ghost'> = {
  supervisor: 'due',
  admin: 'live',
  super_admin: 'live',
  agent: 'ghost',
  user: 'ghost',
};
const ROLE_LABEL: Record<string, string> = { supervisor: 'Superviseur', admin: 'Admin', agent: 'Agent', user: 'Utilisateur', super_admin: 'Super admin' };

function Stars({ v }: { v: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={13} color={n <= Math.round(v) ? colors.amber : 'rgba(255,255,255,0.2)'} fill={n <= Math.round(v) ? colors.amber : 'transparent'} />
      ))}
    </View>
  );
}

export default function AdminPerf() {
  const { data, isLoading } = useAdminPerformance();
  const [mode, setMode] = useState('agents');
  const [period, setPeriod] = useState('mois');

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Indicateurs de l'équipe" title="Performances" />

        {isLoading || !data ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: 11 }} showsVerticalScrollIndicator={false}>
            <SegFilter options={MODES} value={mode} onChange={setMode} />
            <SegFilter options={PERIODS} value={period} onChange={setPeriod} />

            {mode === 'agents' ? (
              <>
                <GlassCard variant="strong" style={styles.headCard}>
                  <View>
                    <Text style={[T.eyebrow, { color: '#8bf0d2' }]}>Revenu encaissé · {period}</Text>
                    <Text style={styles.headAmt}>
                      {fmtFCFA(data.revenue)} <Text style={styles.headUnit}>F</Text>
                    </Text>
                  </View>
                </GlassCard>
                {data.agents.map((a) => (
                  <AgentCard key={a.id} a={a} onPress={() => router.navigate(`/(admin)/agent/${a.id}` as Href)} />
                ))}
                {!data.agents.length ? <Text style={styles.empty}>Aucune donnée agent.</Text> : null}
              </>
            ) : null}

            {mode === 'employes' ? (
              <>
                <GlassCard variant="strong" style={styles.headCard}>
                  <View>
                    <Text style={[T.eyebrow, { color: '#8bf0d2' }]}>Indice de performance moyen</Text>
                    <Text style={styles.headAmt}>
                      {data.avgIndex}
                      <Text style={styles.headUnit}> / 100</Text>
                    </Text>
                  </View>
                  <MiniRing size={56} strokeWidth={6} pct={data.avgIndex} color={colors.mint}>
                    <Text style={{ color: colors.mint, fontWeight: '700', fontSize: 12 }}>{data.avgIndex}</Text>
                  </MiniRing>
                </GlassCard>
                {data.employees.map((e) => (
                  <GlassCard key={e.rank} style={{ gap: 9 }}>
                    <View style={styles.row}>
                      <Text style={styles.pos}>{e.rank}</Text>
                      <Avatar name={e.name} kind="agent" size={38} />
                      <View style={{ flex: 1 }}>
                        <Text style={T.t1} numberOfLines={1}>{e.name}</Text>
                        <Text style={T.t3}>{e.dept || '—'}</Text>
                      </View>
                      <Text style={[styles.scoreNum, { color: scoreColor(e.index) }]}>{e.index}</Text>
                    </View>
                    <ProgressBar pct={e.index} />
                    <View style={styles.rowBetween}>
                      {e.evals > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Stars v={e.rating} />
                          <Text style={T.t3}>{e.rating.toFixed(1)}/5</Text>
                        </View>
                      ) : (
                        <Text style={T.t3}>Pas de notation</Text>
                      )}
                      <Text style={T.t3}>{e.reports} rapports</Text>
                    </View>
                  </GlassCard>
                ))}
                {!data.employees.length ? <Text style={styles.empty}>Aucun employé.</Text> : null}
              </>
            ) : null}

            {mode === 'jour' ? (
              <>
                {data.daily.map((d, i) => (
                  <GlassCard key={i}>
                    <View style={[styles.rowBetween, { marginBottom: 11 }]}>
                      <Text style={[T.t1, { fontSize: 13.5 }]}>{d.date}</Text>
                      <Chip variant="live" label={`${fmtFCFA(d.total)} F`} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={[styles.dayBox, styles.dayBlue]}>
                        <View style={styles.dayHead}>
                          <BookOpen size={12} color="#bcd6ff" />
                          <Text style={[T.t3, { color: '#bcd6ff' }]}>Cours</Text>
                        </View>
                        <Text style={T.t3}>{d.courses.c} paiements</Text>
                        <Text style={[styles.dayAmt, { color: '#bcd6ff' }]}>{fmtCompact(d.courses.a)}</Text>
                      </View>
                      <View style={[styles.dayBox, styles.dayMint]}>
                        <View style={styles.dayHead}>
                          <FileText size={12} color={colors.mint} />
                          <Text style={[T.t3, { color: colors.mint }]}>Procédures</Text>
                        </View>
                        <Text style={T.t3}>{d.proc.c} paiements</Text>
                        <Text style={[styles.dayAmt, { color: colors.mint }]}>{fmtCompact(d.proc.a)}</Text>
                      </View>
                    </View>
                  </GlassCard>
                ))}
              </>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function AgentCard({ a, onPress }: { a: AgentPerf; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <GlassCard style={{ gap: 11 }}>
        <View style={styles.row}>
          <View>
            <Avatar name={a.name} kind="agent" size={44} />
            {a.rank <= 3 ? <Text style={styles.medal}>{MEDALS[a.rank - 1]}</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.t1} numberOfLines={1}>{a.name}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <Chip variant={ROLE_CHIP[a.role] ?? 'ghost'} label={ROLE_LABEL[a.role] ?? a.role} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Users size={11} color={colors.ink50} />
                <Text style={T.t3}>{a.students}</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.scoreNum, { color: scoreColor(a.score) }]}>{a.score}</Text>
            <Text style={T.t3}>/100</Text>
          </View>
        </View>
        <ProgressBar pct={a.score} />
        <View style={styles.rowBetween}>
          <Text style={T.t3}>{a.dossiers} dossiers</Text>
          <Text style={[T.t2, { color: '#fff' }]}>{fmtFCFA(a.revenue)} F</Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  headCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headAmt: { color: colors.text, fontSize: 24, fontWeight: '600', marginTop: 5 },
  headUnit: { fontSize: 12, color: colors.ink50, fontWeight: '400' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pos: { width: 20, fontWeight: '700', color: colors.ink50, textAlign: 'center' },
  scoreNum: { fontSize: 19, fontWeight: '700' },
  medal: { position: 'absolute', bottom: -4, right: -4, fontSize: 15 },
  empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 30 },
  dayBox: { flex: 1, borderRadius: 12, padding: 10, borderWidth: 1, gap: 2 },
  dayBlue: { backgroundColor: 'rgba(96,165,250,0.10)', borderColor: 'rgba(96,165,250,0.25)' },
  dayMint: { backgroundColor: 'rgba(52,217,168,0.10)', borderColor: 'rgba(52,217,168,0.25)' },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dayAmt: { fontSize: 14, fontWeight: '700', marginTop: 2 },
});
