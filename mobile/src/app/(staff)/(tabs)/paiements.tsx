import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, CheckCheck, ChevronRight, Clock, FileText, RotateCcw, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useStaffPayments, useValidatePayment, useCancelValidation, type StaffPayment } from '@/lib/hooks/use-staff';
import {
  Avatar,
  Button,
  Chip,
  CountUp,
  GlassCard,
  ScreenBackground,
  ScreenHeader,
  SegFilter,
  useText,
  useToast,
} from '@/components/ui';
import { radius, spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtFCFA, relTime } from '@/lib/format';

export default function StaffPaiements() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { user } = useAuth();
  const { data: payments, isLoading } = useStaffPayments();
  const validate = useValidatePayment(user?.id);
  const cancelValidation = useCancelValidation();
  const toast = useToast();

  const [tab, setTab] = useState('pending');
  const [proof, setProof] = useState<StaffPayment | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const pending = useMemo(() => (payments ?? []).filter((p) => p.status === 'en_validation'), [payments]);
  const treated = useMemo(() => (payments ?? []).filter((p) => p.status !== 'en_validation'), [payments]);
  const total = pending.reduce((s, p) => s + p.amount, 0);
  const list = tab === 'pending' ? pending : treated;

  async function act(p: StaffPayment, ok: boolean) {
    setProof(null);
    try {
      await validate.mutateAsync({ paymentId: p.id, isValid: ok });
      toast(ok ? 'Paiement validé ✓' : 'Paiement rejeté');
    } catch {
      toast('Échec de l’opération');
    }
  }

  // Annuler une validation : supprime l'écriture comptable liée et remet la
  // tranche « en attente ». Confirmation obligatoire (opération irréversible).
  function confirmCancelValidation(p: StaffPayment) {
    Alert.alert(
      'Annuler la validation ?',
      `La validation du paiement de ${p.student} sera annulée : l'écriture comptable liée sera supprimée et le paiement repassera « en attente ».`,
      [
        { text: 'Retour', style: 'cancel' },
        {
          text: 'Annuler la validation',
          style: 'destructive',
          onPress: async () => {
            try {
              const r = await cancelValidation.mutateAsync(p.id);
              toast((r?.deletedEntries ?? 0) > 0 ? 'Validation annulée ✓' : 'Validation annulée');
            } catch (e) {
              toast((e as Error).message || 'Échec de l’annulation');
            }
          },
        },
      ],
    );
  }

  // Parité web `handleValidateAll` : valide en série toutes les déclarations en
  // attente (chacune passe par la même logique — compta + notif étudiant).
  function confirmValidateAll() {
    if (!pending.length || bulkBusy) return;
    Alert.alert(
      'Tout valider',
      `Valider les ${pending.length} déclaration${pending.length > 1 ? 's' : ''} en attente (${fmtFCFA(total)} FCFA) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Tout valider', style: 'default', onPress: validateAll },
      ],
    );
  }

  async function validateAll() {
    setBulkBusy(true);
    let ok = 0;
    // Snapshot : la liste se vide au fur et à mesure des invalidations.
    const ids = pending.map((p) => p.id);
    for (const id of ids) {
      try {
        await validate.mutateAsync({ paymentId: id, isValid: true });
        ok += 1;
      } catch {
        /* on continue : un échec isolé ne doit pas bloquer le lot */
      }
    }
    setBulkBusy(false);
    toast(ok === ids.length ? `${ok} paiement${ok > 1 ? 's' : ''} validé${ok > 1 ? 's' : ''} ✓` : `${ok}/${ids.length} validés`);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Comptabilité" title="Paiements" />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: 11 }} showsVerticalScrollIndicator={false}>
            <GlassCard variant="strong">
              <Text style={[T.eyebrow, { color: colors.amberIcon }]}>En attente de validation</Text>
              <View style={styles.summaryRow}>
                <CountUp to={total} format={(n) => fmtFCFA(Math.round(n))} style={styles.summaryAmount} />
                <Chip variant="due" label={`${pending.length} déclaration${pending.length > 1 ? 's' : ''}`} />
              </View>
              <Text style={T.t3}>FCFA · à vérifier puis valider</Text>
              {pending.length > 1 ? (
                <Button
                  label={bulkBusy ? 'Validation…' : 'Tout valider'}
                  size="sm"
                  variant="mint"
                  icon={<CheckCheck size={16} color="#fff" strokeWidth={2.4} />}
                  onPress={confirmValidateAll}
                  disabled={bulkBusy}
                  style={{ marginTop: 12 }}
                />
              ) : null}
            </GlassCard>

            <SegFilter
              options={[
                { id: 'pending', label: 'En attente', count: pending.length },
                { id: 'treated', label: 'Traités', count: treated.length },
              ]}
              value={tab}
              onChange={setTab}
              style={{ marginVertical: 2 }}
            />

            {list.map((p) => (
              <GlassCard key={p.id} style={{ padding: 14 }}>
                <View style={styles.payTop}>
                  <Avatar name={p.student} kind="student" size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{p.student}</Text>
                    <Text style={T.t2} numberOfLines={1}>
                      {p.type}
                      {p.tranche ? ` · T${p.tranche}` : ''}
                    </Text>
                    <View style={styles.declRow}>
                      <Clock size={12} color={colors.ink50} />
                      <Text style={T.t3}>
                        Déclaré {relTime(p.declaredAt)}
                        {p.method ? ` · ${p.method}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={T.amount}>{fmtFCFA(p.amount)}</Text>
                    <Text style={T.t3}>FCFA</Text>
                  </View>
                </View>

                {p.status === 'en_validation' ? (
                  <>
                    <Pressable style={styles.proofRow} onPress={() => setProof(p)}>
                      <View style={styles.proofThumb}>
                        <FileText size={20} color={colors.ink50} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={T.t2}>Justificatif joint</Text>
                        <Text style={T.t3} numberOfLines={1}>{p.proof ? 'Voir le justificatif' : 'Aucun fichier'}</Text>
                      </View>
                      <ChevronRight size={18} color={colors.ink35} />
                    </Pressable>
                    <View style={styles.btnRow}>
                      <Button label="Rejeter" size="sm" variant="danger" icon={<X size={16} color="#fff" />} onPress={() => act(p, false)} style={{ flex: 1 }} />
                      <Button label="Valider" size="sm" variant="mint" icon={<Check size={16} color="#fff" strokeWidth={2.6} />} onPress={() => act(p, true)} style={{ flex: 1.4 }} />
                    </View>
                  </>
                ) : (
                  <View style={{ marginTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <Chip variant={p.status === 'paye' ? 'done' : 'ghost'} label={p.status === 'paye' ? 'Validé' : p.status === 'retard' ? 'Rejeté' : p.status} />
                    {p.status === 'paye' ? (
                      <Button
                        label="Annuler la validation"
                        size="sm"
                        variant="glass"
                        icon={<RotateCcw size={15} color={colors.amberIcon} />}
                        onPress={() => confirmCancelValidation(p)}
                        disabled={cancelValidation.isPending}
                      />
                    ) : null}
                  </View>
                )}
              </GlassCard>
            ))}
            {!list.length ? <Text style={styles.empty}>Rien ici. ✦</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Proof sheet */}
      <Modal visible={!!proof} transparent animationType="slide" onRequestClose={() => setProof(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setProof(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            {proof ? (
              <>
                <View style={styles.sheetHead}>
                  <Avatar name={proof.student} kind="student" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1}>{proof.student}</Text>
                    <Text style={T.t2}>{proof.type} · {fmtFCFA(proof.amount)} FCFA</Text>
                  </View>
                  <Pressable style={styles.closeBtn} onPress={() => setProof(null)}>
                    <X size={18} color={colors.ink70} />
                  </Pressable>
                </View>
                <View style={styles.proofBig}>
                  <FileText size={44} color={colors.ink35} />
                  <Text style={[T.t2, { marginTop: 8 }]}>{proof.proof ? 'Justificatif joint' : 'Aucun justificatif'}</Text>
                  {proof.method ? <Text style={T.t3}>{proof.method}</Text> : null}
                </View>
                <View style={styles.btnRow}>
                  <Button label="Rejeter" variant="danger" icon={<X size={17} color="#fff" />} onPress={() => act(proof, false)} style={{ flex: 1 }} />
                  <Button label="Valider le paiement" variant="mint" icon={<Check size={17} color="#fff" strokeWidth={2.6} />} onPress={() => act(proof, true)} style={{ flex: 1.4 }} />
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    summaryRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8, marginBottom: 2 },
    summaryAmount: { color: colors.text, fontSize: 34, fontWeight: '600', letterSpacing: -1 },
    payTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    declRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    proofRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
    proofThumb: {
      width: 46,
      height: 46,
      borderRadius: radius.sm,
      backgroundColor: colors.glass2,
      borderWidth: 1,
      borderColor: colors.glassLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },

    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.glassLine2,
      padding: 18,
      paddingBottom: 34,
    },
    grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.glassLine2, marginBottom: 14 },
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
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
    proofBig: {
      height: 220,
      borderRadius: radius.md,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
  });
