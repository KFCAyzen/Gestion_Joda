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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Check, Clock, CreditCard, Hourglass, Lock, Paperclip, WalletCards, X } from 'lucide-react-native';

import { usePayments, type Payment } from '@/lib/hooks/use-payments';
import { useDeclarePayment, type ProofFile } from '@/lib/hooks/use-declare-payment';
import { useAuth } from '@/lib/auth-context';
import { useStudentProfile } from '@/lib/hooks/use-student-portal';
import { isInternational } from '@/lib/payment-config';
import {
  Button,
  Chip,
  GlassCard,
  IconBox,
  useIconTint,
  ScreenBackground,
  ScreenHeader,
} from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const TYPE_LABEL: Record<Payment['type'], string> = {
  bourse: 'Procédure bourse',
  mandarin: 'Cours mandarin',
  anglais: 'Cours anglais',
  inscription: 'Inscription',
  autre: 'Paiement',
};

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

/** Montant avec devise : « $1,499 » (intl) ou « 1 499 F » / « 1 499 FCFA » (local). */
function money(n: number, isIntl: boolean, long = false): string {
  return isIntl ? `$${fmt(n)}` : `${fmt(n)} ${long ? 'FCFA' : 'F'}`;
}

function shortDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

const PENDING = new Set<Payment['status']>(['en_validation']);
const CANCELLED = new Set<Payment['status']>(['annule']);

const TYPE_ORDER: Payment['type'][] = ['bourse', 'mandarin', 'anglais', 'inscription', 'autre'];

/** Montant déjà validé / déclaré pour une tranche (colonnes ajoutées par migration). */
const settledOf = (p: Payment): number => Number(p.montant_paye ?? 0);
const pendingOf = (p: Payment): number => Number(p.montant_declare ?? 0);
const remainingOf = (p: Payment): number => Math.max(0, p.montant - settledOf(p));

/** Onglet Paiements — solde, progression réglée, échéancier (handoff §4 ScreenPay). */
export default function PaymentsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { data, isLoading, error } = usePayments();
  const { user } = useAuth();
  const { data: profile } = useStudentProfile(user?.id);
  // Étudiant international ⇒ montants en USD ($), sinon FCFA.
  const isIntl = isInternational(profile?.nationalite);
  const [declareOpen, setDeclareOpen] = useState(false);

  const rows = (data ?? []).filter((p) => !CANCELLED.has(p.status));
  // Échéances ordonnées par procédure puis tranche.
  const ordered = [...rows].sort((a, b) => {
    const d = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
    return d !== 0 ? d : (a.tranche ?? 0) - (b.tranche ?? 0);
  });

  const grand = rows.reduce((s, p) => s + p.montant, 0);
  const paidTotal = rows.reduce((s, p) => s + settledOf(p), 0);
  const pendingTotal = rows.reduce((s, p) => s + pendingOf(p), 0);
  const dueTotal = Math.max(0, grand - paidTotal); // reste réel à régler
  const pct = grand > 0 ? Math.round((paidTotal / grand) * 100) : 0;

  const paidRows = rows.filter((p) => settledOf(p) >= p.montant && p.montant > 0);
  const pendingRows = rows.filter((p) => PENDING.has(p.status) || pendingOf(p) > 0);
  // Déclarables : il reste à régler ET rien n'est déjà en validation.
  const declarable = rows.filter((p) => remainingOf(p) > 0 && !PENDING.has(p.status) && pendingOf(p) === 0);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Mes paiements" title="Solde" right={<NotificationBell />} />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>Erreur : {(error as Error).message}</Text>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            {/* Hero solde */}
            <GlassCard variant="strong" style={styles.hero}>
              <WalletCards size={120} color={colors.watermark} strokeWidth={1} style={styles.filigree} />
              <Text style={styles.eyebrowMuted}>Reste à régler</Text>
              <View style={styles.amountRow}>
                <Text style={styles.bigAmount}>{fmt(dueTotal)}</Text>
                <Text style={styles.bigCurrency}>{isIntl ? 'USD' : 'FCFA'}</Text>
              </View>
              <View style={styles.chips}>
                {pendingRows.length > 0 ? (
                  <Chip variant="due" label={`${pendingRows.length} en validation · ${money(pendingTotal, isIntl)}`} />
                ) : null}
                <Chip variant="ghost" label={`${paidRows.length} payé${paidRows.length > 1 ? 's' : ''} · ${money(paidTotal, isIntl)}`} />
              </View>
              <View style={styles.progressHead}>
                <Text style={styles.metaText}>Réglé {money(paidTotal, isIntl)}</Text>
                <Text style={styles.metaText}>{pct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                {pct > 0 ? <View style={[styles.segPaid, { width: `${pct}%` }]} /> : null}
              </View>
            </GlassCard>

            <Text style={styles.sectionEyebrow}>Échéancier</Text>
            <View style={{ gap: spacing.cardGap }}>
              {ordered.length === 0 ? (
                <Text style={styles.subtitle}>Aucune échéance.</Text>
              ) : (
                ordered.map((p) => <PaymentCard key={p.id} payment={p} isIntl={isIntl} />)
              )}
            </View>

            <Button
              label="Déclarer un paiement"
              fullWidth
              icon={<CreditCard size={18} color="#fff" />}
              onPress={() =>
                declarable.length > 0
                  ? setDeclareOpen(true)
                  : Alert.alert('Aucune échéance', "Tu n'as aucun paiement à déclarer pour le moment.")
              }
              style={{ marginTop: 12 }}
            />
          </ScrollView>
        )}

        <DeclareModal visible={declareOpen} payments={declarable} isIntl={isIntl} onClose={() => setDeclareOpen(false)} />
      </SafeAreaView>
    </ScreenBackground>
  );
}

function DeclareModal({
  visible,
  payments,
  isIntl,
  onClose,
}: {
  visible: boolean;
  payments: Payment[];
  isIntl: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const declare = useDeclarePayment();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'complet' | 'avance'>('complet');
  const [avance, setAvance] = useState('');
  const [proof, setProof] = useState<ProofFile | null>(null);

  // (Ré)initialise à chaque ouverture : présélectionne la 1ʳᵉ échéance.
  const selected = useMemo(
    () => payments.find((p) => p.id === selectedId) ?? payments[0] ?? null,
    [payments, selectedId],
  );

  function reset() {
    setSelectedId(null);
    setMode('complet');
    setAvance('');
    setProof(null);
  }

  function close() {
    if (declare.isPending) return;
    reset();
    onClose();
  }

  async function pickImage(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorise l'accès pour joindre une preuve.");
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setProof({
      uri: a.uri,
      name: a.fileName ?? 'preuve.jpg',
      mimeType: a.mimeType ?? 'image/jpeg',
      base64: a.base64 ?? undefined,
    });
  }

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    setProof({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/pdf' });
  }

  function promptProof() {
    Alert.alert('Joindre une preuve', undefined, [
      { text: 'Prendre une photo', onPress: () => pickImage(true) },
      { text: 'Choisir une image', onPress: () => pickImage(false) },
      { text: 'Choisir un fichier (PDF)', onPress: () => pickFile() },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function submit() {
    if (!selected) return;
    const montantTranche = selected.montant;
    const remaining = remainingOf(selected); // reste réel à régler sur la tranche
    const montantDeclare =
      mode === 'complet' ? remaining : Math.max(1, parseInt(avance.replace(/\D/g, ''), 10) || 0);

    if (montantDeclare < 1 || montantDeclare > remaining) {
      Alert.alert('Montant invalide', `Saisis un montant entre 1 et ${money(remaining, isIntl, true)}.`);
      return;
    }

    try {
      await declare.mutateAsync({
        studentId: selected.student_id,
        payment_id: selected.id,
        type: selected.type,
        tranche_num: selected.tranche ?? 1,
        montant_tranche: montantTranche,
        montant_declare: montantDeclare,
        is_avance: mode === 'avance',
        proof,
      });
      reset();
      onClose();
      Alert.alert('Déclaration envoyée', 'Ton paiement est en attente de validation par notre équipe.');
    } catch (e) {
      Alert.alert('Échec', (e as Error).message || 'La déclaration a échoué.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        <View style={styles.sheetHead}>
          <View>
            <Text style={styles.sheetEyebrow}>Déclarer un paiement</Text>
            <Text style={styles.sheetTitle}>Confirme ton règlement</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={close} hitSlop={8}>
            <X size={18} color={colors.ink70} />
          </Pressable>
        </View>

        {/* Choix de l'échéance (si plusieurs) */}
        {payments.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
            {payments.map((p) => {
              const on = p.id === selected?.id;
              return (
                <Pressable key={p.id} onPress={() => setSelectedId(p.id)} style={[styles.trancheChip, on && styles.trancheChipOn]}>
                  <Text style={[styles.trancheChipText, on && styles.trancheChipTextOn]}>
                    {TYPE_LABEL[p.type]}
                    {p.tranche ? ` · T${p.tranche}` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {/* Reste à régler sur la tranche (montant total - déjà validé) */}
        <View style={styles.expectedRow}>
          <Text style={styles.expectedLabel}>
            {selected && settledOf(selected) > 0 ? 'Reste sur la tranche' : 'Montant attendu'}
          </Text>
          <Text style={styles.expectedAmount}>{selected ? money(remainingOf(selected), isIntl, true) : '—'}</Text>
        </View>

        {/* Mode complet / acompte */}
        <View style={styles.modeRow}>
          <Pressable style={[styles.modeBtn, mode === 'complet' && styles.modeBtnOn]} onPress={() => setMode('complet')}>
            <Text style={[styles.modeText, mode === 'complet' && styles.modeTextOn]}>Paiement complet</Text>
          </Pressable>
          <Pressable style={[styles.modeBtn, mode === 'avance' && styles.modeBtnOn]} onPress={() => setMode('avance')}>
            <Text style={[styles.modeText, mode === 'avance' && styles.modeTextOn]}>Acompte</Text>
          </Pressable>
        </View>

        {mode === 'avance' ? (
          <TextInput
            style={styles.avanceInput}
            placeholder={`Montant versé (${isIntl ? 'USD' : 'FCFA'})`}
            placeholderTextColor={colors.ink35}
            keyboardType="number-pad"
            value={avance}
            onChangeText={setAvance}
          />
        ) : null}

        {/* Preuve */}
        <Pressable style={styles.proofBtn} onPress={promptProof}>
          <Paperclip size={17} color={colors.ink70} />
          <Text style={styles.proofText} numberOfLines={1}>
            {proof ? proof.name : 'Joindre une preuve (facultatif)'}
          </Text>
          {proof ? (
            <Pressable onPress={() => setProof(null)} hitSlop={8}>
              <X size={15} color={colors.ink50} />
            </Pressable>
          ) : null}
        </Pressable>

        <Button
          label="Déclarer le paiement"
          fullWidth
          loading={declare.isPending}
          disabled={!selected}
          onPress={submit}
          style={{ marginTop: 4 }}
        />
      </View>
    </Modal>
  );
}

/**
 * Carte d'une échéance avec SA propre barre de progression :
 *   vert (réglé / montant_paye) · ambre (en validation / montant_declare) · reste.
 */
function PaymentCard({ payment, isIntl }: { payment: Payment; isIntl: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const iconTint = useIconTint();
  const total = payment.montant;
  const settled = settledOf(payment);
  const pending = pendingOf(payment);
  const settledPct = total > 0 ? Math.min(100, Math.round((settled / total) * 100)) : 0;
  const pendingPct = total > 0 ? Math.min(100 - settledPct, Math.round((pending / total) * 100)) : 0;
  const remaining = Math.max(0, total - settled - pending);

  const fullyPaid = payment.status === 'paye' || settled >= total;
  const isPending = !fullyPaid && (PENDING.has(payment.status) || pending > 0);
  const overdue = !fullyPaid && !isPending && payment.status === 'retard';

  const tone = fullyPaid ? 'mint' : isPending ? 'amber' : overdue || payment.date_limite ? 'amber' : 'ghost';
  const Icon = fullyPaid ? Check : isPending ? Hourglass : overdue || payment.date_limite ? Clock : Lock;

  const sub = fullyPaid
    ? payment.date_paiement
      ? `Réglé · ${shortDate(payment.date_paiement)}`
      : 'Réglé'
    : isPending
      ? `${money(pending, isIntl)} en attente de validation`
      : payment.date_limite
        ? `Dû le ${shortDate(payment.date_limite)} · ${Math.max(0, daysUntil(payment.date_limite))}j`
        : 'À venir';

  return (
    <GlassCard style={[styles.pcard, isPending && styles.pcardPending]}>
      <View style={styles.pcardHead}>
        <IconBox tone={tone} size={38}>
          <Icon size={17} color={iconTint[tone]} strokeWidth={2.2} />
        </IconBox>
        <View style={{ flex: 1 }}>
          <Text style={styles.pcardTitle}>
            {TYPE_LABEL[payment.type]}
            {payment.tranche ? ` · T${payment.tranche}` : ''}
          </Text>
          <Text style={[styles.pcardMeta, (isPending || overdue) && { color: colors.amber }]}>{sub}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {fullyPaid ? (
            <Chip variant="done" label="Réglé" />
          ) : isPending ? (
            <Chip variant="due" label="En validation" />
          ) : null}
          <Text style={[styles.pcardAmount, !fullyPaid && { marginTop: 4 }]}>{money(total, isIntl)}</Text>
        </View>
      </View>

      {/* Barre de progression de la tranche */}
      <View style={styles.pTrack}>
        {settledPct > 0 ? <View style={[styles.segPaid, { width: `${settledPct}%` }]} /> : null}
        {pendingPct > 0 ? <View style={[styles.segPending, { width: `${pendingPct}%` }]} /> : null}
      </View>
      <View style={styles.pLegend}>
        <Text style={styles.legendText}>{settled > 0 ? `Réglé ${money(settled, isIntl)}` : 'Rien réglé'}</Text>
        <Text style={[styles.legendText, !fullyPaid && remaining > 0 ? { color: colors.amber } : null]}>
          {fullyPaid ? '100 %' : `Reste ${money(remaining, isIntl)}`}
        </Text>
      </View>
    </GlassCard>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    eyebrowMuted: {
      color: colors.ink50,
      fontSize: fontSize.eyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.6,
    },
    hero: { overflow: 'hidden', paddingTop: spacing.heroPad, paddingBottom: 18 },
    filigree: { position: 'absolute', top: -22, right: -22 },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
    bigAmount: { color: colors.text, fontSize: fontSize.bigAmount, fontWeight: '600', letterSpacing: -1 },
    bigCurrency: { color: colors.ink50, fontSize: 14, fontWeight: '600' },
    chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 7 },
    metaText: { color: colors.ink50, fontSize: 11.5 },
    progressTrack: { flexDirection: 'row', height: 7, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
    sectionEyebrow: {
      color: colors.ink50,
      fontSize: fontSize.eyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.6,
      marginTop: 16,
      marginBottom: 9,
      marginLeft: 4,
    },
    subtitle: { color: colors.ink50, fontSize: 14 },

    // ── Carte d'échéance (en-tête + barre de progression par tranche) ──
    pcard: { paddingVertical: 13, paddingHorizontal: 14 },
    pcardPending: { backgroundColor: 'rgba(251,191,36,0.07)', borderColor: 'rgba(251,191,36,0.28)' },
    pcardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pcardTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
    pcardMeta: { color: colors.ink50, fontSize: 11.5, marginTop: 2 },
    pcardAmount: { color: colors.text, fontSize: 14.5, fontWeight: '700' },
    pTrack: {
      flexDirection: 'row',
      height: 7,
      borderRadius: radius.pill,
      backgroundColor: colors.track,
      overflow: 'hidden',
      marginTop: 12,
    },
    segPaid: { height: '100%', backgroundColor: colors.mint },
    segPending: { height: '100%', backgroundColor: colors.amber },
    pLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
    legendText: { color: colors.ink50, fontSize: 11 },
    error: { color: colors.crimsonVivid, fontSize: 13 },

    // ── Modal déclaration ──
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.glassLine,
      paddingHorizontal: spacing.screenX,
      paddingTop: 18,
      gap: 12,
    },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    sheetEyebrow: {
      color: colors.ink50,
      fontSize: fontSize.eyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.6,
    },
    sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '600', marginTop: 2 },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trancheChip: {
      paddingHorizontal: 13,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
    },
    trancheChipOn: { backgroundColor: colors.redGlass, borderColor: colors.redLine },
    trancheChipText: { color: colors.ink70, fontSize: 12, fontWeight: '600' },
    trancheChipTextOn: { color: colors.text },
    expectedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.redGlass,
      borderWidth: 1,
      borderColor: colors.redLine,
      borderRadius: radius.md,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    expectedLabel: { color: colors.ink70, fontSize: 13 },
    expectedAmount: { color: colors.text, fontSize: 15, fontWeight: '700' },
    modeRow: { flexDirection: 'row', gap: 8 },
    modeBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: radius.sm,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
      alignItems: 'center',
    },
    modeBtnOn: { backgroundColor: colors.redGlass, borderColor: colors.redLine },
    modeText: { color: colors.ink50, fontSize: 12.5, fontWeight: '600' },
    modeTextOn: { color: colors.text },
    avanceInput: {
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
      borderRadius: radius.sm,
      paddingHorizontal: 16,
      paddingVertical: 13,
      color: colors.text,
      fontSize: 15,
    },
    proofBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
      borderStyle: 'dashed',
      borderRadius: radius.sm,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    proofText: { flex: 1, color: colors.ink70, fontSize: 13 },
  });
