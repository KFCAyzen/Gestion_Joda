import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { GlassCard, ScreenBackground, ScreenHeader, text as T } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { fmtFCFA } from '@/lib/format';

/**
 * Référence de configuration des frais (valeurs canoniques
 * `DEFAULT_PAYMENT_CONFIGS` du web — source de vérité côté serveur).
 * L'édition reste sur le web ; l'app mobile affiche la grille en lecture.
 */
const CONFIGS = [
  { label: 'Frais de dossier', scope: 'Tous dossiers', amount: 175000, tranches: 1, penalty: 5, delay: 7 },
  { label: 'Procédure / Bourse', scope: 'Local & international', amount: 800000, tranches: 2, penalty: 10, delay: 30 },
  { label: 'Cours de mandarin', scope: 'Destination Chine', amount: 250000, tranches: 3, penalty: 5, delay: 15 },
  { label: "Cours d'anglais", scope: 'Destination anglophone', amount: 250000, tranches: 3, penalty: 5, delay: 15 },
];

export default function AdminConfigFrais() {
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Paramètres" title="Config. frais" sm onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.note}>Grille de référence — l'édition se fait depuis l'interface web.</Text>
          {CONFIGS.map((c, i) => (
            <GlassCard key={i} style={{ gap: 10 }}>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Text style={T.t1}>{c.label}</Text>
                  <Text style={T.t3}>{c.scope}</Text>
                </View>
                <Text style={styles.amount}>{fmtFCFA(c.amount)} F</Text>
              </View>
              <View style={styles.grid}>
                <Cell label="Tranches" value={String(c.tranches)} />
                <Cell label="Pénalité" value={`${c.penalty}%`} />
                <Cell label="Délai" value={`${c.delay} j`} />
              </View>
            </GlassCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellValue}>{value}</Text>
      <Text style={T.t3}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  note: { color: colors.ink50, fontSize: 12, lineHeight: 17 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amount: { color: colors.text, fontSize: 15, fontWeight: '700' },
  grid: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.glassLine, borderRadius: 12, padding: 10, alignItems: 'center' },
  cellValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
