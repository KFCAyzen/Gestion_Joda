import { useState } from 'react';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ArrowRight, Check, FileText, MessageSquare, Pencil, Phone, Plane, Undo2, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useStaffStudentDetail, useChangeDossierStatus, useUpdateStudent } from '@/lib/hooks/use-staff';
import { DOSSIER_TRANSITIONS, DOSSIER_STATUS_LABEL } from '@/lib/dossier-milestones';
import type { DossierStatus } from '@/lib/hooks/use-student-portal';
import {
  Button,
  Chip,
  GlassCard,
  IconBox,
  ListCard,
  ListRow,
  ProgressBar,
  Ring,
  ScreenBackground,
  ScreenHeader,
  SectionLabel,
  useIconTint,
  useText,
  useToast,
} from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtFCFA } from '@/lib/format';

export default function StaffStudentDetail() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: s, isLoading } = useStaffStudentDetail(id);
  const change = useChangeDossierStatus(user ?? undefined);
  const update = useUpdateStudent(user ?? undefined);
  const toast = useToast();

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '', niveau: '' });

  if (isLoading || !s) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <ScreenHeader eyebrow="Dossier" title="Fiche étudiant" sm onBack={() => router.back()} />
          {isLoading ? <ActivityIndicator style={{ marginTop: 40 }} /> : <Text style={styles.empty}>Étudiant introuvable.</Text>}
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const totalPay = s.paid + s.due;
  const payPct = totalPay > 0 ? Math.round((s.paid / totalPay) * 100) : 100;

  function call() {
    if (!s) return;
    if (s.phone) Linking.openURL(`tel:${s.phone}`).catch(() => toast('Impossible de lancer l’appel'));
    else toast('Aucun numéro renseigné');
  }
  function message() {
    if (!s?.peerUserId) {
      toast('Cet étudiant n’a pas encore de compte');
      return;
    }
    router.navigate(`/(staff)/chat/${s.peerUserId}?name=${encodeURIComponent(s.name)}` as Href);
  }

  const nextStatuses: DossierStatus[] = s.status ? DOSSIER_TRANSITIONS[s.status] ?? [] : [];
  // Statuts « en arrière » (régression) — affichés en glass, le reste en avance.
  const REGRESS: DossierStatus[] = ['document_manquant', 'admission_rejetee', 'en_attente'];

  function openEdit() {
    if (!s) return;
    setForm({ prenom: s.firstName, nom: s.lastName, telephone: s.phone ?? '', niveau: s.level });
    setEdit(true);
  }

  async function saveEdit() {
    if (!s) return;
    if (!form.prenom.trim() || !form.nom.trim()) {
      toast('Prénom et nom sont requis');
      return;
    }
    try {
      await update.mutateAsync({
        studentId: s.id,
        prenom: form.prenom,
        nom: form.nom,
        telephone: form.telephone,
        niveau: form.niveau,
      });
      setEdit(false);
      toast('Fiche mise à jour ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de la mise à jour');
    }
  }

  function advance(to: DossierStatus) {
    if (!s?.dossierId || !s.status || change.isPending) return;
    Alert.alert('Changer le statut', `Passer le dossier à « ${DOSSIER_STATUS_LABEL[to]} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          try {
            await change.mutateAsync({
              dossierId: s.dossierId!,
              studentId: s.id,
              fromStatus: s.status!,
              toStatus: to,
              studentName: s.name,
            });
            toast('Statut du dossier mis à jour ✓');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Échec de la mise à jour');
          }
        },
      },
    ]);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow={`Dossier · ${s.ref}`}
          title={s.name}
          sm
          onBack={() => router.back()}
          right={
            <Pressable onPress={openEdit} hitSlop={8} style={styles.editBtn}>
              <Pencil size={17} color={colors.ink70} />
            </Pressable>
          }
        />

        <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          {/* HERO */}
          <GlassCard variant="strong" style={styles.hero}>
            <Plane size={120} color={colors.watermark} strokeWidth={1} style={styles.filigree} />
            <View style={styles.heroRow}>
              <Ring pct={s.pct} size={92} strokeWidth={10}>
                <Text style={styles.ringValue}>
                  {s.pct}
                  <Text style={styles.ringPct}>%</Text>
                </Text>
                <Text style={styles.ringLabel}>Dossier</Text>
              </Ring>
              <View style={{ flex: 1 }}>
                <Text style={T.eyebrow}>Destination</Text>
                <Text style={styles.dest} numberOfLines={1}>{s.dest}</Text>
                <Text style={T.t2} numberOfLines={2}>{s.program}</Text>
                <View style={{ marginTop: 10 }}>
                  <Chip variant="live" label={`Étape ${s.step} / 6 · ${s.stepLabel}`} />
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Quick actions */}
          <View style={styles.actions}>
            <Button label="Message" size="sm" icon={<MessageSquare size={16} color="#fff" />} onPress={message} style={{ flex: 1 }} />
            <Button label="Appeler" size="sm" variant="glass" icon={<Phone size={16} color={colors.ink70} />} onPress={call} style={{ flex: 1 }} />
          </View>

          {/* Parcours */}
          <SectionLabel title="Parcours" />
          <GlassCard>
            {s.milestones.map((m, i) => {
              const isDone = m.state === 'done';
              const isNow = m.state === 'now';
              return (
                <View key={m.key} style={styles.mRow}>
                  <View style={styles.mColLeft}>
                    <View
                      style={[
                        styles.mDot,
                        isDone && styles.mDotDone,
                        isNow && styles.mDotNow,
                      ]}>
                      {isDone ? (
                        <Check size={13} color={colors.mint} strokeWidth={3} />
                      ) : (
                        <Text style={[styles.mNum, isNow && { color: '#fff' }]}>{i + 1}</Text>
                      )}
                    </View>
                    {i < s.milestones.length - 1 ? <View style={[styles.mLine, isDone && styles.mLineDone]} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: i < s.milestones.length - 1 ? 16 : 0 }}>
                    <Text style={[styles.mLabel, m.state === 'lock' && { color: colors.ink50 }]}>{m.label}</Text>
                    {isNow ? <Text style={styles.mNow}>En cours</Text> : null}
                  </View>
                </View>
              );
            })}
          </GlassCard>

          {/* Avancement du dossier — parité web DossierWorkflow */}
          {s.dossierId ? (
            <>
              <SectionLabel title="Faire avancer le dossier" />
              <GlassCard>
                {nextStatuses.length ? (
                  <View style={{ gap: 9 }}>
                    {nextStatuses.map((st) => {
                      const regress = REGRESS.includes(st);
                      return (
                        <Button
                          key={st}
                          label={DOSSIER_STATUS_LABEL[st]}
                          size="sm"
                          variant={regress ? 'glass' : 'primary'}
                          loading={change.isPending}
                          icon={
                            regress ? (
                              <Undo2 size={15} color={colors.ink70} />
                            ) : (
                              <ArrowRight size={15} color="#fff" />
                            )
                          }
                          onPress={() => advance(st)}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[T.t2, { textAlign: 'center', paddingVertical: 6 }]}>
                    Dossier au statut final — aucune transition.
                  </Text>
                )}
              </GlassCard>
            </>
          ) : null}

          {/* Documents */}
          <SectionLabel title={`Documents · ${s.docsDone}/${s.docsTotal}`} />
          <ListCard>
            {s.docs.map((d, i, arr) => (
              <ListRow key={d.key} last={i === arr.length - 1}>
                <IconBox tone={d.ok ? 'mint' : 'ghost'} size={38}>
                  <FileText size={17} color={d.ok ? iconTint.mint : colors.ink50} />
                </IconBox>
                <View style={{ flex: 1 }}>
                  <Text style={[T.t1, { fontSize: 13.5 }]}>{d.label}</Text>
                </View>
                <Chip variant={d.ok ? 'done' : 'ghost'} label={d.ok ? 'Reçu' : d.optional ? 'Optionnel' : 'Manquant'} />
              </ListRow>
            ))}
          </ListCard>

          {/* Paiements */}
          <SectionLabel title="Paiements" />
          <GlassCard>
            <View style={styles.payRow}>
              <View>
                <Text style={T.t3}>Total encaissé</Text>
                <Text style={styles.payBig}>
                  {fmtFCFA(s.paid)} <Text style={styles.payUnit}>FCFA</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={T.t3}>Restant</Text>
                <Text style={[styles.payBig, { fontSize: 16, color: colors.amber }]}>{fmtFCFA(s.due)}</Text>
              </View>
            </View>
            <ProgressBar pct={payPct} style={{ marginTop: 12 }} />
          </GlassCard>
        </ScrollView>
      </SafeAreaView>

      {/* Modal édition fiche — parité web StudentManagement (sous-ensemble) */}
      <Modal visible={edit} transparent animationType="slide" onRequestClose={() => setEdit(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setEdit(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={[T.t1, { fontSize: 17 }]}>Modifier la fiche</Text>
              <Pressable style={styles.closeBtn} onPress={() => setEdit(false)}>
                <X size={18} color={colors.ink70} />
              </Pressable>
            </View>

            <Field label="Prénom" value={form.prenom} onChange={(v) => setForm((f) => ({ ...f, prenom: v }))} colors={colors} T={T} />
            <Field label="Nom" value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} colors={colors} T={T} />
            <Field
              label="Téléphone"
              value={form.telephone}
              onChange={(v) => setForm((f) => ({ ...f, telephone: v }))}
              colors={colors}
              T={T}
              keyboardType="phone-pad"
            />
            <Field label="Niveau / destination" value={form.niveau} onChange={(v) => setForm((f) => ({ ...f, niveau: v }))} colors={colors} T={T} />

            <View style={styles.modalBtns}>
              <Button label="Annuler" variant="glass" onPress={() => setEdit(false)} style={{ flex: 1 }} />
              <Button label="Enregistrer" loading={update.isPending} onPress={saveEdit} style={{ flex: 1.4 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

function Field({
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
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[T.t3, { marginBottom: 6 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
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
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
    hero: { overflow: 'hidden' },
    filigree: { position: 'absolute', top: -22, right: -16 },
    heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    ringValue: { color: colors.text, fontSize: 22, fontWeight: '600' },
    ringPct: { fontSize: 12, color: colors.ink50 },
    ringLabel: { color: colors.ink50, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1 },
    dest: { color: colors.text, fontSize: 19, fontWeight: '600', marginTop: 2 },
    actions: { flexDirection: 'row', gap: 10 },

    mRow: { flexDirection: 'row', gap: 12 },
    mColLeft: { alignItems: 'center' },
    mDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
    },
    mDotDone: { backgroundColor: 'rgba(52,217,168,0.13)', borderColor: 'rgba(52,217,168,0.32)' },
    mDotNow: { backgroundColor: colors.crimsonDeep, borderColor: 'transparent' },
    mNum: { fontSize: 11, fontWeight: '700', color: colors.ink35 },
    mLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: colors.glassLine, marginTop: 2 },
    mLineDone: { backgroundColor: 'rgba(52,217,168,0.32)' },
    mLabel: { color: colors.text, fontSize: 13.5, fontWeight: '500', paddingTop: 1 },
    mNow: { color: colors.redIcon, fontSize: 11.5, marginTop: 1 },

    payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    payBig: { color: colors.text, fontSize: 21, fontWeight: '600', marginTop: 2 },
    payUnit: { fontSize: 12, color: colors.ink50, fontWeight: '400' },

    editBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassLine,
      backgroundColor: colors.glass2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
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
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
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
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6 },
  });
