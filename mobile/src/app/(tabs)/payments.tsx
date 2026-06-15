import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Clock, CreditCard, Lock, WalletCards } from 'lucide-react-native';

import { usePayments, type Payment } from '@/lib/hooks/use-payments';
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

  const rows = (data ?? []).filter((p) => !CANCELLED.has(p.status));
  const paidRows = rows.filter((p) => SETTLED.has(p.status));
  const dueRows = rows.filter((p) => !SETTLED.has(p.status));
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
              onPress={() => {}}
              style={{ marginTop: 12 }}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
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
});
