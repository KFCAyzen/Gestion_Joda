import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, Plus, Star, Trash2, UserPlus, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';

import {
  useAdminEmployees,
  useAdminLeaves,
  useAdminPayslips,
  useAdminPerformance,
  useReviewLeave,
  useUpsertEmployee,
  useSetEmployeeStatus,
  useGeneratePayslips,
  useDeleteAdminPayslip,
  useCreateEvaluation,
  type EvaluationNotes,
} from '@/lib/hooks/use-admin';
import { useStaffReports, useReviewReport, isPendingReport } from '@/lib/hooks/use-staff';
import { Avatar, Button, Chip, GlassCard, ProgressBar, ScreenBackground, ScreenHeader, SegFilter, StatTile, useText, useToast } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtFCFA, shortDate } from '@/lib/format';

const TABS = [
  { id: 'employes', label: 'Employés' },
  { id: 'conges', label: 'Congés' },
  { id: 'paie', label: 'Paie' },
  { id: 'rapports', label: 'Rapports' },
  { id: 'evals', label: 'Évals' },
];

function scoreColor(s: number, colors: Palette): string {
  return s >= 70 ? colors.mint : s >= 40 ? colors.amber : colors.crimsonVivid;
}
function Stars({ v }: { v: number }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={12} color={n <= Math.round(v) ? colors.amber : colors.track} fill={n <= Math.round(v) ? colors.amber : 'transparent'} />
      ))}
    </View>
  );
}

const EMP_STATUS: Record<string, 'done' | 'due' | 'ghost'> = { actif: 'done', suspendu: 'due', inactif: 'ghost' };

const EVAL_LABELS: { key: keyof EvaluationNotes; label: string }[] = [
  { key: 'qualite', label: 'Qualité' },
  { key: 'productivite', label: 'Productivité' },
  { key: 'ponctualite', label: 'Ponctualité' },
  { key: 'equipe', label: 'Esprit d’équipe' },
  { key: 'communication', label: 'Communication' },
  { key: 'initiative', label: 'Initiative' },
  { key: 'discipline', label: 'Discipline' },
];
const DEFAULT_NOTES: EvaluationNotes = { qualite: 3, productivite: 3, ponctualite: 3, equipe: 3, communication: 3, initiative: 3, discipline: 3 };

function StarPick({ value, onChange, colors }: { value: number; onChange: (v: number) => void; colors: Palette }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={4}>
          <Star size={20} color={n <= value ? colors.amber : colors.track} fill={n <= value ? colors.amber : 'transparent'} />
        </Pressable>
      ))}
    </View>
  );
}

export default function AdminRH() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
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
  const upsertEmp = useUpsertEmployee();
  const setEmpStatus = useSetEmployeeStatus();
  const genPayslips = useGeneratePayslips();
  const deletePayslip = useDeleteAdminPayslip(user ?? undefined);
  const createEval = useCreateEvaluation(user ?? undefined);

  const canManage = user?.role === 'admin' || user?.role === 'super_admin';
  const canPayroll = ['supervisor', 'admin', 'super_admin'].includes(user?.role ?? '');

  async function generatePayroll() {
    try {
      const r = await genPayslips.mutateAsync(undefined);
      toast(r.count > 0 ? `${r.count} bulletin(s) généré(s) ✓` : 'Aucun bulletin dû');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de la génération');
    }
  }

  function confirmDeletePayslip(p: any) {
    Alert.alert(
      'Supprimer le bulletin',
      `Supprimer le bulletin de ${p.employeeName} (${p.mois}/${p.annee}) ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayslip.mutateAsync(p.id);
              toast('Bulletin supprimé ✓');
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Échec de la suppression');
            }
          },
        },
      ],
    );
  }

  const emptyEmp = { id: undefined as string | undefined, matricule: '', prenom: '', nom: '', poste: '', departement: '', telephone: '', email: '', salaireBase: '', statut: 'actif' };
  const [empModal, setEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState(emptyEmp);

  const pendingReports = useMemo(() => (reports ?? []).filter((r) => isPendingReport(r.status)), [reports]);
  const pendingLeaves = (leaves ?? []).filter((l: any) => (l.status ?? 'en_attente') === 'en_attente');

  function openCreateEmp() {
    setEmpForm(emptyEmp);
    setEmpModal(true);
  }
  function openEditEmp(e: any) {
    setEmpForm({
      id: e.id,
      matricule: e.matricule ?? '',
      prenom: e.prenom ?? '',
      nom: e.nom ?? '',
      poste: e.poste ?? '',
      departement: e.departement ?? '',
      telephone: e.telephone ?? '',
      email: e.email ?? '',
      salaireBase: String(e.salaire_base ?? e.salaire ?? ''),
      statut: e.statut ?? 'actif',
    });
    setEmpModal(true);
  }
  async function saveEmp() {
    if (!empForm.prenom.trim() || !empForm.nom.trim() || !empForm.poste.trim()) {
      toast('Prénom, nom et poste requis');
      return;
    }
    try {
      await upsertEmp.mutateAsync({
        id: empForm.id,
        matricule: empForm.matricule,
        prenom: empForm.prenom,
        nom: empForm.nom,
        poste: empForm.poste,
        departement: empForm.departement,
        telephone: empForm.telephone,
        email: empForm.email,
        salaireBase: parseInt(empForm.salaireBase || '0', 10) || 0,
        statut: empForm.statut,
      });
      setEmpModal(false);
      toast(empForm.id ? 'Employé mis à jour ✓' : 'Employé créé ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de l’enregistrement');
    }
  }
  async function toggleEmpStatus(e: any) {
    const next = e.statut === 'actif' ? 'suspendu' : 'actif';
    try {
      await setEmpStatus.mutateAsync({ id: e.id, statut: next });
      toast(next === 'actif' ? 'Employé réactivé' : 'Employé suspendu');
    } catch {
      toast('Échec');
    }
  }

  const [evalModal, setEvalModal] = useState(false);
  const [evalEmp, setEvalEmp] = useState('');
  const [evalNotes, setEvalNotes] = useState<EvaluationNotes>(DEFAULT_NOTES);
  const [evalComment, setEvalComment] = useState('');

  function openCreateEval() {
    setEvalEmp((employees ?? [])[0]?.id ?? '');
    setEvalNotes(DEFAULT_NOTES);
    setEvalComment('');
    setEvalModal(true);
  }
  async function saveEval() {
    if (!evalEmp) {
      toast('Sélectionnez un employé');
      return;
    }
    try {
      await createEval.mutateAsync({ employeeId: evalEmp, notes: evalNotes, commentaire: evalComment });
      setEvalModal(false);
      toast('Évaluation enregistrée ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de l’enregistrement');
    }
  }

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
            {tab === 'employes' ? (
              <>
                {canManage ? (
                  <Button label="Nouvel employé" icon={<UserPlus size={16} color="#fff" />} onPress={openCreateEmp} />
                ) : null}
                {(employees ?? []).map((e: any) => (
                  <Pressable key={e.id} onPress={() => (canManage ? openEditEmp(e) : undefined)} disabled={!canManage}>
                    <GlassCard style={styles.card}>
                      <Avatar name={`${e.prenom ?? ''} ${e.nom ?? ''}`} kind="agent" size={42} />
                      <View style={{ flex: 1 }}>
                        <Text style={T.t1} numberOfLines={1}>{`${e.prenom ?? ''} ${e.nom ?? ''}`.trim()}</Text>
                        <Text style={T.t3}>{e.poste ?? e.matricule ?? '—'}{e.departement ? ` · ${e.departement}` : ''}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 5 }}>
                        {canManage ? (
                          <Pressable onPress={() => toggleEmpStatus(e)} style={[styles.statusPill, e.statut === 'actif' ? styles.statusOn : styles.statusOff]}>
                            <Text style={[styles.statusTxt, { color: e.statut === 'actif' ? colors.mint : colors.amber }]}>{e.statut === 'actif' ? 'Actif' : e.statut === 'suspendu' ? 'Suspendu' : (e.statut ?? '—')}</Text>
                          </Pressable>
                        ) : (
                          <Chip variant={EMP_STATUS[e.statut] ?? 'ghost'} label={e.statut ?? '—'} />
                        )}
                        {e.salaire_base ?? e.salaire ? <Text style={T.t3}>{fmtFCFA(Number(e.salaire_base ?? e.salaire))} F</Text> : null}
                      </View>
                    </GlassCard>
                  </Pressable>
                ))}
                {!(employees ?? []).length ? <Text style={styles.empty}>Aucun employé.</Text> : null}
              </>
            ) : null}

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

            {tab === 'paie' && canPayroll ? (
              <Button label="Générer la paie due" loading={genPayslips.isPending} icon={<Plus size={16} color="#fff" />} onPress={generatePayroll} />
            ) : null}
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
                    {canManage ? (
                      <Pressable onPress={() => confirmDeletePayslip(p)} hitSlop={8} style={styles.delPayslipBtn}>
                        <Trash2 size={16} color={colors.crimsonVivid} />
                      </Pressable>
                    ) : null}
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

            {tab === 'evals' && canManage ? (
              <Button label="Nouvelle évaluation" icon={<Star size={16} color="#fff" />} onPress={openCreateEval} />
            ) : null}
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
                      <Text style={[styles.indexNum, { color: scoreColor(e.index, colors) }]}>{e.index}</Text>
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

      {/* Modal employé — parité HRManagement (sous-ensemble de champs) */}
      <Modal visible={empModal} transparent animationType="slide" onRequestClose={() => setEmpModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setEmpModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={[T.t1, { fontSize: 17 }]}>{empForm.id ? 'Modifier l’employé' : 'Nouvel employé'}</Text>
              <Pressable style={styles.closeBtn} onPress={() => setEmpModal(false)}>
                <X size={18} color={colors.ink70} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 430 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <RHField label="Prénom" value={empForm.prenom} onChange={(v) => setEmpForm((f) => ({ ...f, prenom: v }))} colors={colors} T={T} />
                </View>
                <View style={{ flex: 1 }}>
                  <RHField label="Nom" value={empForm.nom} onChange={(v) => setEmpForm((f) => ({ ...f, nom: v }))} colors={colors} T={T} />
                </View>
              </View>
              <RHField label="Poste" value={empForm.poste} onChange={(v) => setEmpForm((f) => ({ ...f, poste: v }))} colors={colors} T={T} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <RHField label="Département" value={empForm.departement} onChange={(v) => setEmpForm((f) => ({ ...f, departement: v }))} colors={colors} T={T} />
                </View>
                <View style={{ flex: 1 }}>
                  <RHField label="Matricule" value={empForm.matricule} onChange={(v) => setEmpForm((f) => ({ ...f, matricule: v }))} colors={colors} T={T} />
                </View>
              </View>
              <RHField label="Téléphone" value={empForm.telephone} onChange={(v) => setEmpForm((f) => ({ ...f, telephone: v }))} colors={colors} T={T} keyboardType="phone-pad" />
              <RHField label="Email" value={empForm.email} onChange={(v) => setEmpForm((f) => ({ ...f, email: v }))} colors={colors} T={T} />
              <RHField label="Salaire de base (FCFA)" value={empForm.salaireBase} onChange={(v) => setEmpForm((f) => ({ ...f, salaireBase: v.replace(/[^0-9]/g, '') }))} colors={colors} T={T} keyboardType="number-pad" />

              <Text style={[T.t3, { marginBottom: 8, marginTop: 4 }]}>Statut</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['actif', 'suspendu', 'inactif'].map((st) => (
                  <Pressable key={st} onPress={() => setEmpForm((f) => ({ ...f, statut: st }))} style={[styles.chip, empForm.statut === st && styles.chipOn]}>
                    <Text style={[styles.chipTxt, empForm.statut === st && { color: '#fff' }]}>{st}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalBtns}>
              <Button label="Annuler" variant="glass" onPress={() => setEmpModal(false)} style={{ flex: 1 }} />
              <Button label={empForm.id ? 'Enregistrer' : 'Créer'} loading={upsertEmp.isPending} onPress={saveEmp} style={{ flex: 1.4 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal évaluation — parité HRManagement (7 critères /5 + note globale) */}
      <Modal visible={evalModal} transparent animationType="slide" onRequestClose={() => setEvalModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setEvalModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={[T.t1, { fontSize: 17 }]}>Nouvelle évaluation</Text>
              <Pressable style={styles.closeBtn} onPress={() => setEvalModal(false)}>
                <X size={18} color={colors.ink70} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <Text style={[T.t3, { marginBottom: 8 }]}>Employé</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 4 }}>
                {(employees ?? []).map((e: any) => {
                  const name = `${e.prenom ?? ''} ${e.nom ?? ''}`.trim();
                  return (
                    <Pressable key={e.id} onPress={() => setEvalEmp(e.id)} style={[styles.chip, evalEmp === e.id && styles.chipOn]}>
                      <Text style={[styles.chipTxt, { textTransform: 'none' }, evalEmp === e.id && { color: '#fff' }]}>{name || 'Employé'}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={{ height: 12 }} />
              {EVAL_LABELS.map(({ key, label }) => (
                <View key={key} style={styles.evalRow}>
                  <Text style={[T.t2, { color: colors.text, flex: 1 }]}>{label}</Text>
                  <StarPick value={evalNotes[key]} onChange={(v) => setEvalNotes((n) => ({ ...n, [key]: v }))} colors={colors} />
                </View>
              ))}

              <Text style={[T.t3, { marginTop: 10, marginBottom: 6 }]}>Commentaire (optionnel)</Text>
              <TextInput
                value={evalComment}
                onChangeText={setEvalComment}
                placeholder="Remarques…"
                placeholderTextColor={colors.ink35}
                multiline
                style={{
                  backgroundColor: colors.glass2,
                  borderWidth: 1,
                  borderColor: colors.glassLine,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  color: colors.text,
                  fontSize: 14.5,
                  height: 80,
                  textAlignVertical: 'top',
                }}
              />
            </ScrollView>

            <View style={styles.modalBtns}>
              <Button label="Annuler" variant="glass" onPress={() => setEvalModal(false)} style={{ flex: 1 }} />
              <Button label="Enregistrer" loading={createEval.isPending} onPress={saveEval} style={{ flex: 1.4 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

function RHField({
  label,
  value,
  onChange,
  colors,
  T,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: Palette;
  T: ReturnType<typeof useText>;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[T.t3, { marginBottom: 6 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        placeholderTextColor={colors.ink35}
        style={{
          backgroundColor: colors.glass2,
          borderWidth: 1,
          borderColor: colors.glassLine,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 11,
          color: colors.text,
          fontSize: 14.5,
        }}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    statRow: { flexDirection: 'row', gap: 10 },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    btnRow: { flexDirection: 'row', gap: 9 },
    pos: { width: 20, fontWeight: '700', color: colors.ink50, textAlign: 'center' },
    indexNum: { fontSize: 18, fontWeight: '700' },
    evalMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 30 },

    delPayslipBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.redGlass,
      borderWidth: 1,
      borderColor: colors.redLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
    statusOn: { backgroundColor: 'rgba(52,217,168,0.13)', borderColor: 'rgba(52,217,168,0.32)' },
    statusOff: { backgroundColor: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.30)' },
    statusTxt: { fontSize: 11.5, fontWeight: '600' },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      borderWidth: 1,
      borderColor: colors.glassLine2,
      padding: 18,
      paddingBottom: 34,
    },
    grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.glassLine2, marginBottom: 14 },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.glass2,
      borderWidth: 1,
      borderColor: colors.glassLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
    },
    chipOn: { backgroundColor: colors.crimsonDeep, borderColor: 'transparent' },
    chipTxt: { color: colors.ink70, fontSize: 12.5, fontWeight: '500', textTransform: 'capitalize' },
    evalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  });
