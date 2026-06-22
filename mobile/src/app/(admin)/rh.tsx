import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { Star } from 'lucide-react-native';

import { useAdminEmployees, useAdminLeaves, useAdminPayslips, useAdminPerformance, useReviewLeave } from '@/lib/hooks/use-admin';
import { useStaffReports, useReviewReport, isPendingReport } from '@/lib/hooks/use-staff';
import { Avatar, Button, Chip, GlassCard, ProgressBar, ScreenBackground, ScreenHeader, SegFilter, StatTile, text as T, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { fmtFCFA, shortDate } from '@/lib/format';

const TABS = [
  { id: 'employes', label: 'Employés' },
  { id: 'conges', label: 'Congés' },
  { id: 'paie', label: 'Paie' },
  { id: 'rapports', label: 'Rapports' },
  { id: 'evals', label: 'Évals' },
];

function scoreColor(s: number): string {
  return s >= 70 ? colors.mint : s >= 40 ? colors.amber : colors.crimsonVivid;
}
function Stars({ v }: { v: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={12} color={n <= Math.round(v) ? colors.amber : 'rgba(255,255,255,0.2)'} fill={n <= Math.round(v) ? colors.amber : 'transparent'} />
      ))}
    </View>
  );
}

const EMP_STATUS: Record<string, 'done' | 'due' | 'ghost'> = { actif: 'done', suspendu: 'due', inactif: 'ghost' };

export default function AdminRH() {
  const { user } = useAuth();
  const [tab, setTab] = useState('employes');
  const toast = useToast();

  const { data: employees, isLoading: le } = useAdminEmployees();
  const { data: leaves } = useAdminLeaves();
  const { data: payslips } = useAdminPayslips();
  const { data: reports } = useStaffReports();
  const { data: perf } = useAdminPerformance();
  const reviewLeave = useReviewLeave();
  const reviewReport = useReviewReport();

  const pendingReports = useMemo(() => (reports ?? []).filter((r) => isPendingReport(r.status)), [reports]);
  const pendingLeaves = (leaves ?? []).filter((l: any) => (l.status ?? 'en_attente') === 'en_attente');

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Ressources humaines" title="RH" sm onBack={() => router.back()} />

        <View style={styles.statRow}>
          <StatTile value={String((employees ?? []).length)} label="Employés" />
          <StatTile value={String(pendingLeaves.length)} label="Congés à traiter" valueColor={colors.amber} />
          <StatTile value={String(pendingReports.length)} label="Rapports" valueColor={colors.crimsonVivid} />
        </View>

        <SegFilter options={TABS} value={tab} onChange={setTab} style={{ marginVertical: 12 }} />

        {le ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {tab === 'employes'
              ? (employees ?? []).map((e: any) => (
                  <GlassCard key={e.id} style={styles.card}>
                    <Avatar name={`${e.prenom ?? ''} ${e.nom ?? ''}`} kind="agent" size={42} />
                    <View style={{ flex: 1 }}>
                      <Text style={T.t1} numberOfLines={1}>{`${e.prenom ?? ''} ${e.nom ?? ''}`.trim()}</Text>
                      <Text style={T.t3}>{e.matricule ?? e.poste ?? '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 5 }}>
                      <Chip variant={EMP_STATUS[e.statut] ?? 'ghost'} label={e.statut ?? '—'} />
                      {e.salaire_base ?? e.salaire ? <Text style={T.t3}>{fmtFCFA(Number(e.salaire_base ?? e.salaire))} F</Text> : null}
                    </View>
                  </GlassCard>
                ))
              : null}

            {tab === 'conges'
              ? (leaves ?? []).map((l: any) => {
                  const pending = (l.status ?? 'en_attente') === 'en_attente';
                  return (
                    <GlassCard key={l.id} style={{ gap: 10 }}>
                      <View style={styles.card}>
                        <Avatar name={l.employeeName} kind="agent" size={40} />
                        <View style={{ flex: 1 }}>
                          <Text style={T.t1} numberOfLines={1}>{l.employeeName}</Text>
                          <Text style={T.t3}>{l.type ?? 'Congé'} · {l.nb_jours ?? l.days ?? '—'} j</Text>
                        </View>
                        <Chip variant={pending ? 'due' : l.status === 'approuve' ? 'done' : 'ghost'} label={pending ? 'En attente' : l.status === 'approuve' ? 'Approuvé' : 'Refusé'} />
                      </View>
                      {l.date_debut ? <Text style={T.t3}>{shortDate(l.date_debut)} → {shortDate(l.date_fin)}</Text> : null}
                      {pending ? (
                        <View style={styles.btnRow}>
                          <Button label="Refuser" size="sm" variant="danger" icon={<X size={15} color="#fff" />} onPress={async () => { await reviewLeave.mutateAsync({ id: l.id, approve: false, reviewerId: user?.id }); toast('Congé refusé'); }} style={{ flex: 1 }} />
                          <Button label="Approuver" size="sm" variant="mint" icon={<Check size={15} color="#fff" strokeWidth={2.6} />} onPress={async () => { await reviewLeave.mutateAsync({ id: l.id, approve: true, reviewerId: user?.id }); toast('Congé approuvé'); }} style={{ flex: 1.3 }} />
                        </View>
                      ) : null}
                    </GlassCard>
                  );
                })
              : null}

            {tab === 'paie'
              ? (payslips ?? []).map((p: any) => (
                  <GlassCard key={p.id} style={styles.card}>
                    <Avatar name={p.employeeName} kind="agent" size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={T.t1} numberOfLines={1}>{p.employeeName}</Text>
                      <Text style={T.t3}>{p.mois}/{p.annee}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={T.amount}>{fmtFCFA(Number(p.net_a_payer ?? 0))}</Text>
                      <Text style={T.t3}>net · FCFA</Text>
                    </View>
                  </GlassCard>
                ))
              : null}

            {tab === 'rapports'
              ? (reports ?? []).map((r) => (
                  <GlassCard key={r.id} style={{ gap: 10 }}>
                    <View style={styles.card}>
                      <Avatar name={r.employee} kind="agent" size={40} />
                      <View style={{ flex: 1 }}>
                        <Text style={T.t1} numberOfLines={1}>{r.employee}</Text>
                        <Text style={T.t3}>{shortDate(r.date)} · {r.hours ?? '—'}h</Text>
                      </View>
                      <Chip variant={isPendingReport(r.status) ? 'due' : r.status === 'signale' ? 'ghost' : 'done'} label={isPendingReport(r.status) ? 'À valider' : r.status === 'signale' ? 'Signalé' : 'Validé'} />
                    </View>
                    <Text style={T.t2} numberOfLines={3}>{r.activities || '—'}</Text>
                    {isPendingReport(r.status) ? (
                      <View style={styles.btnRow}>
                        <Button label="Signaler" size="sm" variant="danger" onPress={async () => { await reviewReport.mutateAsync({ id: r.id, ok: false }); toast('Rapport signalé'); }} style={{ flex: 1 }} />
                        <Button label="Valider" size="sm" variant="mint" onPress={async () => { await reviewReport.mutateAsync({ id: r.id, ok: true }); toast('Rapport validé'); }} style={{ flex: 1.3 }} />
                      </View>
                    ) : null}
                  </GlassCard>
                ))
              : null}

            {tab === 'evals'
              ? (perf?.employees ?? []).map((e) => (
                  <GlassCard key={e.rank} style={{ gap: 9 }}>
                    <View style={styles.card}>
                      <Text style={styles.pos}>{e.rank}</Text>
                      <Avatar name={e.name} kind="agent" size={40} />
                      <View style={{ flex: 1 }}>
                        <Text style={T.t1} numberOfLines={1}>{e.name}</Text>
                        <Text style={T.t3}>{e.dept || '—'}</Text>
                      </View>
                      <Text style={[styles.indexNum, { color: scoreColor(e.index) }]}>{e.index}</Text>
                    </View>
                    <ProgressBar pct={e.index} />
                    <View style={styles.evalMeta}>
                      {e.evals > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Stars v={e.rating} />
                          <Text style={T.t3}>{e.rating.toFixed(1)}/5</Text>
                        </View>
                      ) : (
                        <Text style={T.t3}>Pas de notation</Text>
                      )}
                      <Text style={T.t3}>{e.reports} rapports · {Math.round(e.hours)}h</Text>
                    </View>
                  </GlassCard>
                ))
              : null}
            {tab === 'evals' && !(perf?.employees ?? []).length ? <Text style={styles.empty}>Aucune évaluation.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  statRow: { flexDirection: 'row', gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btnRow: { flexDirection: 'row', gap: 9 },
  pos: { width: 20, fontWeight: '700', color: colors.ink50, textAlign: 'center' },
  indexNum: { fontSize: 18, fontWeight: '700' },
  evalMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 30 },
});
