import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';
import { usePayments, type Payment } from '@/lib/hooks/use-payments';

/**
 * Accueil authentifié (placeholder de l'étape 1/2). Le vrai écran "Accueil"
 * (anneau de progression + prochaine action) arrive à l'étape Design.
 * Ici on prouve la chaîne complète : session → profil → requête réelle.
 */
export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { data, isLoading, error, refetch, isRefetching } = usePayments();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Bonjour 👋</Text>
          <Text style={styles.title}>{user?.name ?? user?.username}</Text>
        </View>
        <Pressable style={styles.signOut} onPress={logout}>
          <Text style={styles.signOutText}>Déconnexion</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>
        Mes paiements{data ? ` · ${data.length}` : ''}
      </Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.error}>Erreur : {(error as Error).message}</Text>
      ) : data && data.length === 0 ? (
        <Text style={styles.subtitle}>Aucun paiement pour le moment.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => <PaymentRow payment={item} />}
          contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>
          {payment.type}
          {payment.tranche ? ` · T${payment.tranche}` : ''}
        </Text>
        <Text style={styles.rowMeta}>{payment.status}</Text>
      </View>
      <Text style={styles.rowAmount}>{payment.montant.toLocaleString('fr-FR')} F</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#100307', paddingHorizontal: 18 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 20 },
  eyebrow: {
    color: '#ff5a5f',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '600' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  signOut: {
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  sectionTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  rowTitle: { color: '#fff', fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  rowMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  rowAmount: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#ff5a5f', fontSize: 13 },
});
