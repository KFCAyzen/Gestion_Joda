import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CreditCard, Database, FileText, Receipt } from 'lucide-react-native';

import { useStorageStats } from '@/lib/hooks/use-admin';
import { GlassCard, IconBox, ScreenBackground, ScreenHeader, text as T } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

export default function AdminStockage() {
  const { data, isLoading } = useStorageStats();

  const buckets = [
    { label: 'Documents étudiants', count: data?.documents ?? 0, color: colors.crimson, icon: FileText },
    { label: 'Justificatifs paiement', count: data?.justificatifs ?? 0, color: colors.amber, icon: CreditCard },
    { label: 'Fiches de paie', count: data?.payslips ?? 0, color: colors.mint, icon: Receipt },
  ];
  const total = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Système" title="Stockage" sm onBack={() => router.back()} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            <GlassCard variant="strong">
              <Text style={T.eyebrow}>Fichiers stockés</Text>
              <Text style={styles.bigNum}>{total.toLocaleString('fr-FR')}</Text>
              <Text style={T.t3}>répartis par catégorie</Text>
              <View style={styles.barTrack}>
                {buckets.map((b, i) =>
                  total > 0 ? <View key={i} style={{ width: `${(b.count / total) * 100}%`, backgroundColor: b.color }} /> : null,
                )}
              </View>
            </GlassCard>

            <GlassCard>
              {buckets.map((b, i) => {
                const Icon = b.icon;
                return (
                  <View key={i} style={[styles.row, i < buckets.length - 1 && styles.rowBorder]}>
                    <IconBox tone="ghost" size={40}>
                      <Icon size={18} color={b.color} />
                    </IconBox>
                    <View style={{ flex: 1 }}>
                      <Text style={[T.t1, { fontSize: 14 }]}>{b.label}</Text>
                      <Text style={T.t3}>{b.count.toLocaleString('fr-FR')} fichiers</Text>
                    </View>
                    <View style={[styles.swatch, { backgroundColor: b.color }]} />
                  </View>
                );
              })}
            </GlassCard>

            <GlassCard style={styles.dbRow}>
              <IconBox tone="blue" size={40}>
                <Database size={18} color={colors.blue} />
              </IconBox>
              <View style={{ flex: 1 }}>
                <Text style={[T.t1, { fontSize: 14 }]}>Base de données</Text>
                <Text style={T.t3}>Tables Supabase actives</Text>
              </View>
            </GlassCard>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  bigNum: { color: colors.text, fontSize: 34, fontWeight: '700', letterSpacing: -1, marginTop: 6 },
  barTrack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.track, marginTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  dbRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
