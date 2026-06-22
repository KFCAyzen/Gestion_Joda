import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { FileText } from 'lucide-react-native';

import { useStaffDossiers, type Bucket } from '@/lib/hooks/use-staff';
import { Avatar, Chip, GlassCard, ProgressBar, ScreenBackground, ScreenHeader, SegFilter, useText } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'now', label: 'À traiter' },
  { id: 'review', label: 'En revue' },
  { id: 'done', label: 'Complets' },
];

export default function AdminDossiers() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { data, isLoading } = useStaffDossiers();
  const [f, setF] = useState('all');
  const list = (data ?? []).filter((d) => f === 'all' || d.bucket === (f as Bucket));

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Workflow bourse" title="Dossiers" sm onBack={() => router.back()} />
        <SegFilter options={FILTERS} value={f} onChange={setF} style={{ marginBottom: 12 }} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {list.map((d) => (
              <Pressable key={d.id} onPress={() => router.navigate(`/(admin)/student/${d.id}` as Href)}>
                <GlassCard style={{ gap: 12 }}>
                  <View style={styles.row}>
                    <Avatar name={d.name} kind="student" size={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={T.t1} numberOfLines={1}>{d.name}</Text>
                      <Text style={T.t2} numberOfLines={1}>{d.stepLabel}</Text>
                    </View>
                    <Chip variant={d.chip} label={d.statusLabel} />
                  </View>
                  <View style={styles.progressRow}>
                    <ProgressBar pct={d.pct} style={{ flex: 1 }} />
                    <Text style={T.t3}>Étape {d.step}/6</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <FileText size={13} color={colors.ink50} />
                    <Text style={T.t3}>{d.docsDone}/{d.docsTotal} documents</Text>
                  </View>
                </GlassCard>
              </Pressable>
            ))}
            {!list.length ? <Text style={styles.empty}>Aucun dossier.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  });
