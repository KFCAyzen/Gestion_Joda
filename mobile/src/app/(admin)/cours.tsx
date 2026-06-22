import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GraduationCap, Users } from 'lucide-react-native';

import { useLanguageCourses } from '@/lib/hooks/use-admin';
import { GlassCard, IconBox, ScreenBackground, ScreenHeader, SegFilter, StatTile, text as T } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';
import { fmtFCFA } from '@/lib/format';

export default function AdminCours() {
  const { data, isLoading } = useLanguageCourses();
  const [tab, setTab] = useState('mandarin');
  const stats = tab === 'mandarin' ? data?.mandarin : data?.anglais;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Cours de langues" title="Cours" sm onBack={() => router.back()} />
        <SegFilter
          options={[
            { id: 'mandarin', label: 'Mandarin' },
            { id: 'anglais', label: 'Anglais' },
          ]}
          value={tab}
          onChange={setTab}
          style={{ marginBottom: 12 }}
        />
        {isLoading || !data ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            <GlassCard variant="strong" style={styles.hero}>
              <IconBox tone={tab === 'mandarin' ? 'red' : 'blue'} size={48}>
                <GraduationCap size={22} color={tab === 'mandarin' ? '#ffb3b3' : '#a9cdfb'} />
              </IconBox>
              <View style={{ flex: 1 }}>
                <Text style={T.eyebrow}>{tab === 'mandarin' ? 'Cours de mandarin' : 'Cours d’anglais'}</Text>
                <Text style={styles.revenue}>{fmtFCFA(stats?.revenue ?? 0)} <Text style={styles.unit}>FCFA</Text></Text>
                <Text style={T.t3}>revenu cumulé</Text>
              </View>
            </GlassCard>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <StatTile value={String(stats?.active ?? 0)} label="Inscrits actifs" />
              <StatTile value={fmtFCFA(stats?.revenue ?? 0)} label="Revenu" valueColor={colors.mint} />
            </View>

            <GlassCard style={styles.infoRow}>
              <Users size={18} color={colors.ink50} />
              <Text style={T.t2}>
                {stats?.active ?? 0} étudiant{(stats?.active ?? 0) > 1 ? 's' : ''} inscrit{(stats?.active ?? 0) > 1 ? 's' : ''} au cours de{' '}
                {tab === 'mandarin' ? 'mandarin' : 'anglais'}.
              </Text>
            </GlassCard>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  revenue: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 4 },
  unit: { fontSize: 12, color: colors.ink50, fontWeight: '400' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
