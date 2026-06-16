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
import { Check, Clock, CreditCard, Lock, Paperclip, WalletCards, X } from 'lucide-react-native';

import { usePayments, type Payment } from '@/lib/hooks/use-payments';
import { useDeclarePayment, type ProofFile } from '@/lib/hooks/use-declare-payment';
import {
  BellBtn,
  Button,
  Chip,
  GlassCard,
  IconBox,
  iconTint,
  ScreenBackground,
  ScreenHeader,
} from '@/components/ui';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';

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

function shortDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

const SETTLED = new Set<Payment['status']>(['paye']);
const CANCELLED = new Set<Payment['status']>(['annule']);

/** Onglet Paiements — solde, progression réglée, échéancier (handoff §4 ScreenPay). */
export default function PaymentsScreen() {
  const { data, isLoading, error } = usePayments();
  const [declareOpen, setDeclareOpen] = useState(false);

  const rows = (data ?? []).filter((p) => !CANCELLED.has(p.status));
  const paidRows = rows.filter((p) => SETTLED.has(p.status));
  const dueRows = rows.filter((p) => !SETTLED.has(p.status));
  // Déclarables : tout sauf déjà payé / déjà en cours de validation.
  const declarable = dueRows.filter((p) => p.status !== 'en_validation');
  const paidTotal = paidRows.reduce((s, p) => s + p.montant, 0);
  const dueTotal = dueRows.reduce((s, p) => s + p.montant, 0);
  const grand = paidTotal + dueTotal;
  const pct = grand > 0 ? Math.round((paidTotal / grand) * 100) : 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Mes paiements" title="Solde" right={<BellBtn hasUnread />} />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>Erreur : {(error as Error).message}</Text>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            {/* Hero solde */}
            <GlassCard variant="strong" style={styles.hero}>
              <WalletCards size={120} color="rgba(255,255,255,0.05)" strokeWidth={1} style={styles.filigree} />
              <Text style={styles.eyebrowMuted}>Reste à régler</Text>
              <View style={styles.amountRow}>
                <Text style={styles.bigAmount}>{fmt(dueTotal)}</Text>
                <Text style={styles.bigCurrency}>FCFA</Text>
              </View>
              <View style={styles.chips}>
                {dueRows.length > 0 ? <Chip variant="due" label={`${dueRows.length} dû${dueRows.length > 1 ? 's' : ''} bientôt`} /> : null}
                <Chip variant="ghost" label={`${paidRows.length} payé${paidRows.length > 1 ? 's' : ''} · ${fmt(paidTotal)} F`} />
              </View>
              <View style={styles.progressHead}>
                <Text style={styles.metaText}>Réglé {fmt(paidTotal)} F</Text>
                <Text style={styles.metaText}>{pct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
            </GlassCard>

            <Text style={styles.sectionEyebrow}>Échéancier</Text>
            <View style={{ gap: spacing.rowGap }}>
              {rows.length === 0 ? (
                <Text style={styles.subtitle}>Aucune échéance.</Text>
              ) : (
                rows.map((p) => <ScheduleRow key={p.id} payment={p} />)
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

        <DeclareModal visible={declareOpen} payments={declarable} onClose={() => setDeclareOpen(false)} />
      </SafeAreaView>
    </ScreenBackground>
  );
}

function DeclareModal({
  visible,
  payments,
  onClose,
}: {
  visible: boolean;
  payments: Payment[];
  onClose: () => void;
}) {
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
    const montantDeclare =
      mode === 'complet' ? montantTranche : Math.max(1, parseInt(avance.replace(/\D/g, ''), 10) || 0);

    if (mode === 'avance' && (montantDeclare < 1 || montantDeclare > montantTranche)) {
      Alert.alert('Montant invalide', `Saisis un acompte entre 1 et ${fmt(montantTranche)} FCFA.`);
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

        {/* Montant attendu */}
        <View style={styles.expectedRow}>
          <Text style={styles.expectedLabel}>Montant attendu</Text>
          <Text style={styles.expectedAmount}>{selected ? `${fmt(selected.montant)} FCFA` : '—'}</Text>
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
            placeholder="Montant versé (FCFA)"
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

function ScheduleRow({ payment }: { payment: Payment }) {
  const paid = SETTLED.has(payment.status);
  // « due » = retard ou échéance proche ; sinon futur en attente.
  const due = !paid && (payment.status === 'retard' || payment.status === 'en_validation' || !!payment.date_limite);
  const tone = paid ? 'mint' : due ? 'amber' : 'ghost';
  const Icon = paid ? Check : due ? Clock : Lock;
  const dateStr = paid
    ? payment.date_paiement
      ? `Payé · ${shortDate(payment.date_paiement)}`
      : 'Payé'
    : payment.date_limite
      ? `Dû le ${shortDate(payment.date_limite)} · ${Math.max(0, daysUntil(payment.date_limite))}j`
      : 'À venir';

  return (
    <GlassCard style={[styles.row, due && styles.rowDue]}>
      <IconBox tone={tone} size={40}>
        <Icon size={18} color={iconTint[tone]} strokeWidth={2.2} />
      </IconBox>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>
          {TYPE_LABEL[payment.type]}
          {payment.tranche ? ` · T${payment.tranche}` : ''}
        </Text>
        <Text style={[styles.rowMeta, due && { color: colors.amber }]}>{dateStr}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.rowAmount, paid && styles.rowAmountPaid]}>{fmt(payment.montant)}</Text>
        <Text style={styles.rowCurrency}>FCFA</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
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
  progressTrack: { height: 7, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.mint },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  rowDue: { backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)' },
  rowTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
  rowMeta: { color: colors.ink50, fontSize: 11.5, marginTop: 1 },
  rowAmount: { color: colors.text, fontSize: 14.5, fontWeight: '600' },
  rowAmountPaid: { color: colors.ink50 },
  rowCurrency: { color: colors.ink35, fontSize: 10 },
  error: { color: colors.crimsonVivid, fontSize: 13 },

  // ── Modal déclaration ──
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#160409',
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
    color: '#fff',
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
