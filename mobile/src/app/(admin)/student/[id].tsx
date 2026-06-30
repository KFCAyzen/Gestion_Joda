import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { ArrowRight, FileText, MessageSquare, Pencil, Plane, Smartphone, Trash2, Undo2, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useStaffStudentDetail, useChangeDossierStatus, useUpdateStudent, useDeleteStudent } from '@/lib/hooks/use-staff';
import { useSendSms } from '@/lib/hooks/use-admin';
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

const REGRESS: DossierStatus[] = ['document_manquant', 'admission_rejetee', 'en_attente'];

export default function AdminStudentDetail() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: s, isLoading } = useStaffStudentDetail(id);
  const change = useChangeDossierStatus(user ?? undefined);
  const update = useUpdateStudent(user ?? undefined);
  const remove = useDeleteStudent(user ?? undefined);
  const sms = useSendSms();
  const toast = useToast();

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ prenom: '', nom: '', telephone: '', niveau: '' });
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsText, setSmsText] = useState('');

  async function sendSms() {
    if (!s) return;
    if (!smsText.trim()) {
      toast('Message vide');
      return;
    }
    try {
      const r = await sms.mutateAsync({ studentIds: [s.id], message: smsText.trim() });
      setSmsOpen(false);
      setSmsText('');
      toast(r.sent > 0 ? 'SMS envoyé ✓' : 'Aucun numéro valide');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de l’envoi SMS');
    }
  }

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
  const nextStatuses: DossierStatus[] = s.status ? DOSSIER_TRANSITIONS[s.status] ?? [] : [];

  function message() {
    if (!s?.peerUserId) {
      toast('Cet étudiant n’a pas encore de compte');
      return;
    }
    router.navigate(`/(admin)/chat/${s.peerUserId}?name=${encodeURIComponent(s.name)}` as Href);
  }

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
      await update.mutateAsync({ studentId: s.id, prenom: form.prenom, nom: form.nom, telephone: form.telephone, niveau: form.niveau });
      setEdit(false);
      toast('Fiche mise à jour ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de la mise à jour');
    }
  }

  function confirmDelete() {
    if (!s) return;
    Alert.alert('Supprimer l’étudiant', `Supprimer définitivement ${s.name} et son compte lié ? Cette action est irréversible.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync({ studentId: s.id, name: s.name, userId: s.peerUserId });
            setEdit(false);
            toast('Étudiant supprimé');
            router.back();
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Échec de la suppression');
          }
        },
      },
    ]);
  }

  function advance(to: DossierStatus) {
    if (!s?.dossierId || !s.status || change.isPending) return;
    Alert.alert('Changer le statut', `Passer le dossier à « ${DOSSIER_STATUS_LABEL[to]} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          try {
            await change.mutateAsync({ dossierId: s.dossierId!, studentId: s.id, fromStatus: s.status!, toStatus: to, studentName: s.name });
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
        <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          <GlassCard variant="strong" style={styles.hero}>
            <Plane size={120} color={colors.watermark} strokeWidth={1} style={styles.filigree} />
            <View style={styles.heroRow}>
              <Ring pct={s.pct} size={92} strokeWidth={10}>
                <Text style={styles.ringValue}>{s.pct}<Text style={styles.ringPct}>%</Text></Text>
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

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Message" icon={<MessageSquare size={16} color="#fff" />} onPress={message} style={{ flex: 1 }} />
            {s.phone ? (
              <Button
                label="SMS"
                variant="glass"
                icon={<Smartphone size={16} color={colors.ink70} />}
                onPress={() => { setSmsText(''); setSmsOpen(true); }}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>

          {/* Avancement du dossier */}
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
                          icon={regress ? <Undo2 size={15} color={colors.ink70} /> : <ArrowRight size={15} color="#fff" />}
                          onPress={() => advance(st)}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[T.t2, { textAlign: 'center', paddingVertical: 6 }]}>Dossier au statut final — aucune transition.</Text>
                )}
              </GlassCard>
            </>
          ) : null}

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
                {d.ok ? <Chip variant="done" label="Reçu" /> : <Chip variant="ghost" label={d.optional ? 'Optionnel' : 'Manquant'} />}
              </ListRow>
            ))}
          </ListCard>

          <SectionLabel title="Paiements" />
          <GlassCard>
            <View style={styles.payRow}>
              <View>
                <Text style={T.t3}>Total encaissé</Text>
                <Text style={styles.payBig}>{fmtFCFA(s.paid)} <Text style={styles.payUnit}>FCFA</Text></Text>
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

      {/* Modal édition fiche — parité StudentManagement (sous-ensemble) */}
      <Modal visible={edit} transparent animationType="slide" onRequestClose={() => setEdit(false)}>
        <Pressable style={styles.overlay} onPress={() => setEdit(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={[T.t1, { fontSize: 17 }]}>Modifier la fiche</Text>
              <Pressable style={styles.closeBtn} onPress={() => setEdit(false)}>
                <X size={18} color={colors.ink70} />
              </Pressable>
            </View>

            <SField label="Prénom" value={form.prenom} onChange={(v) => setForm((f) => ({ ...f, prenom: v }))} colors={colors} T={T} />
            <SField label="Nom" value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} colors={colors} T={T} />
            <SField label="Téléphone" value={form.telephone} onChange={(v) => setForm((f) => ({ ...f, telephone: v }))} colors={colors} T={T} keyboardType="phone-pad" />
            <SField label="Niveau / destination" value={form.niveau} onChange={(v) => setForm((f) => ({ ...f, niveau: v }))} colors={colors} T={T} />

            <View style={styles.modalBtns}>
              <Pressable onPress={confirmDelete} style={styles.delBtn}>
                <Trash2 size={17} color={colors.crimsonVivid} />
              </Pressable>
              <Button label="Annuler" variant="glass" onPress={() => setEdit(false)} style={{ flex: 1 }} />
              <Button label="Enregistrer" loading={update.isPending} onPress={saveEdit} style={{ flex: 1.4 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Composer SMS — parité ComPage.handleSendSms via /api/send-sms */}
      <Modal visible={smsOpen} transparent animationType="slide" onRequestClose={() => setSmsOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setSmsOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={[T.t1, { fontSize: 17 }]}>SMS à {s.firstName}</Text>
              <Pressable style={styles.closeBtn} onPress={() => setSmsOpen(false)}>
                <X size={18} color={colors.ink70} />
              </Pressable>
            </View>
            <TextInput
              value={smsText}
              onChangeText={setSmsText}
              placeholder="Votre message (160 car. recommandé)…"
              placeholderTextColor={colors.ink35}
              multiline
              maxLength={500}
              style={{
                backgroundColor: colors.glass2,
                borderWidth: 1,
                borderColor: colors.glassLine,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 11,
                color: colors.text,
                fontSize: 14.5,
                height: 120,
                textAlignVertical: 'top',
              }}
            />
            <Text style={[T.t3, { textAlign: 'right', marginTop: 6 }]}>{smsText.length}/500</Text>
            <View style={styles.modalBtns}>
              <Button label="Annuler" variant="glass" onPress={() => setSmsOpen(false)} style={{ flex: 1 }} />
              <Button label="Envoyer le SMS" loading={sms.isPending} icon={<Smartphone size={15} color="#fff" />} onPress={sendSms} style={{ flex: 1.4 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

function SField({
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
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center' },
    delBtn: {
      width: 46,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.redGlass,
      borderWidth: 1,
      borderColor: colors.redLine,
    },
  });
