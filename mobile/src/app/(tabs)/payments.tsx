import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Clock, Lock } from 'lucide-react-native';

import { usePayments, type Payment } from '@/lib/hooks/use-payments';
import { Button, Chip, GlassCard, ScreenBackground } from '@/components/ui';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';

function fmt(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

const SETTLED = new Set<Payment['status']>(['paye']);
const CANCELLED = new Set<Payment['status']>(['annule']);

/** Onglet Paiements — solde, progression réglée, échéancier (handoff ScreenPay). */
export default function PaymentsScreen() {
  const { data, isLoading, error } = usePayments();

  const rows = (data ?? []).filter((p) => !CANCELLED.has(p.status));
  const paidTotal = rows.filter((p) => SETTLED.has(p.status)).reduce((s, p) => s + p.montant, 0);
  const dueTotal = rows.filter((p) => !SETTLED.has(p.status)).reduce((s, p) => s + p.montant, 0);
  const grand = paidTotal + dueTotal;
  const pct = grand > 0 ? Math.round((paidTotal / grand) * 100) : 0;
  const dueCount = rows.filter((p) => !SETTLED.has(p.status)).length;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Text style={styles.eyebrow}>Solde</Text>
        <Text style={styles.title}>Mes paiements</Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>Erreur : {(error as Error).message}</Text>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, gap: spacing.cardGap }}
            showsVerticalScrollIndicator={false}>
            <GlassCard variant="strong">
              <Text style={styles.eyebrow}>Reste à régler</Text>
              <Text style={styles.bigAmount}>{fmt(dueTotal)}</Text>
              <View style={styles.chips}>
                {dueCount > 0 ? <Chip variant="due" label={`${dueCount} dû${dueCount > 1 ? 's' : ''}`} /> : null}
                <Chip variant="ghost" label={`${fmt(paidTotal)} payés`} />
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.metaText}>Réglé {fmt(paidTotal)}</Text>
                <Text style={styles.metaText}>{pct}%</Text>
              </View>
            </GlassCard>

            <Text style={styles.sectionTitle}>Échéancier</Text>
            {rows.length === 0 ? (
              <Text style={styles.subtitle}>Aucune échéance.</Text>
            ) : (
              rows.map((p) => <ScheduleRow key={p.id} payment={p} />)
            )}

            <Button label="Déclarer un paiement" fullWidth onPress={() => {}} style={{ marginTop: 4 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function ScheduleRow({ payment }: { payment: Payment }) {
  const paid = SETTLED.has(payment.status);
  const late = payment.status === 'retard';
  const Icon = paid ? Check : late ? Clock : Lock;
  const tint = paid ? colors.mint : late ? colors.amber : colors.ink35;
  const date = paid ? payment.date_paiement : payment.date_limite;

  return (
    <GlassCard style={[styles.row, late && styles.rowLate]}>
      <View style={[styles.rowIcon, { borderColor: tint }]}>
        <Icon size={16} color={tint} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>
          {payment.type}
          {payment.tranche ? ` · T${payment.tranche}` : ''}
        </Text>
        <Text style={[styles.rowMeta, late && { color: colors.amber }]}>
          {paid ? 'Payé' : late ? 'En retard' : 'À venir'}
          {date ? ` · ${new Date(date).toLocaleDateString('fr-FR')}` : ''}
        </Text>
      </View>
      <Text style={[styles.rowAmount, paid && styles.rowAmountPaid]}>{fmt(payment.montant)}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  eyebrow: {
    color: colors.crimsonVivid,
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginTop: 12,
  },
  title: { color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '600' },
  bigAmount: { color: colors.text, fontSize: 36, fontWeight: '600', marginVertical: 6 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.mint },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaText: { color: colors.ink50, fontSize: fontSize.meta },
  sectionTitle: { color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginTop: 4 },
  subtitle: { color: colors.ink50, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLate: { backgroundColor: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.3)' },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', textTransform: 'capitalize' },
  rowMeta: { color: colors.ink50, fontSize: fontSize.meta, marginTop: 2 },
  rowAmount: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowAmountPaid: { color: colors.ink50 },
  error: { color: colors.crimsonVivid, fontSize: 13 },
});
