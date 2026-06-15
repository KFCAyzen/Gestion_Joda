import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';
import { usePayments, type Payment } from '@/lib/hooks/use-payments';
import { Avatar, Button, Chip, GlassCard, Ring, ScreenBackground } from '@/components/ui';
import { colors, fontSize, spacing } from '@/theme/tokens';

const statusChip: Record<Payment['status'], { variant: 'live' | 'done' | 'due' | 'ghost'; label: string }> = {
  paye: { variant: 'done', label: 'Payé' },
  en_validation: { variant: 'live', label: 'En validation' },
  retard: { variant: 'due', label: 'En retard' },
  attente: { variant: 'ghost', label: 'En attente' },
  annule: { variant: 'ghost', label: 'Annulé' },
};

/**
 * Accueil authentifié — pré-version de l'écran « Accueil » du handoff,
 * branché sur le design system (étape 3) et les vraies données.
 */
export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = usePayments();

  const total = data?.length ?? 0;
  const paid = data?.filter((p) => p.status === 'paye').length ?? 0;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Bonjour 👋</Text>
            <Text style={styles.title}>{user?.name ?? user?.username}</Text>
          </View>
          <Avatar name={user?.name ?? user?.username ?? '?'} kind="student" />
        </View>

        <GlassCard variant="strong" style={styles.hero}>
          <Ring pct={pct} size={96} strokeWidth={10}>
            <Text style={styles.ringValue}>{pct}%</Text>
          </Ring>
          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>Paiements réglés</Text>
            <Text style={styles.heroBig}>
              {paid}/{total}
            </Text>
            <Chip variant={pct === 100 ? 'done' : 'live'} label={pct === 100 ? 'À jour' : 'En cours'} />
          </View>
        </GlassCard>

        <Text style={styles.sectionTitle}>Mes paiements</Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : error ? (
          <Text style={styles.error}>Erreur : {(error as Error).message}</Text>
        ) : total === 0 ? (
          <Text style={styles.subtitle}>Aucun paiement pour le moment.</Text>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(p) => p.id}
            refreshing={isRefetching}
            onRefresh={refetch}
            renderItem={({ item }) => <PaymentRow payment={item} />}
            contentContainerStyle={{ gap: spacing.rowGap, paddingBottom: 24 }}
          />
        )}

        <Button label="Se déconnecter" variant="glass" size="sm" onPress={logout} style={styles.logout} />
      </SafeAreaView>
    </ScreenBackground>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const chip = statusChip[payment.status];
  return (
    <GlassCard style={styles.row}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={styles.rowTitle}>
          {payment.type}
          {payment.tranche ? ` · T${payment.tranche}` : ''}
        </Text>
        <Chip variant={chip.variant} label={chip.label} />
      </View>
      <Text style={styles.rowAmount}>{payment.montant.toLocaleString('fr-FR')} F</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 16, gap: 12 },
  eyebrow: {
    color: colors.crimsonVivid,
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  title: { color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '600' },
  subtitle: { color: colors.ink50, fontSize: 14 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  heroText: { flex: 1, gap: 6 },
  heroBig: { color: colors.text, fontSize: 30, fontWeight: '600' },
  ringValue: { color: colors.text, fontSize: 20, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600', textTransform: 'capitalize' },
  rowAmount: { color: colors.text, fontSize: 16, fontWeight: '600' },
  logout: { marginTop: 8, marginBottom: 8 },
  error: { color: colors.crimsonVivid, fontSize: 13 },
});
