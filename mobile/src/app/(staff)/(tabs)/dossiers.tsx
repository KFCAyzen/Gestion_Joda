import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { FileText, MapPin, WalletCards } from 'lucide-react-native';

import { useStaffDossiers, type Bucket } from '@/lib/hooks/use-staff';
import {
  Avatar,
  Chip,
  ProgressBar,
  ScreenBackground,
  ScreenHeader,
  SearchBar,
  SegFilter,
  text as T,
} from '@/components/ui';
import { colors, radius, spacing } from '@/theme/tokens';
import { fmtCompact } from '@/lib/format';

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'now', label: 'À traiter' },
  { id: 'review', label: 'En revue' },
  { id: 'done', label: 'Complets' },
];

export default function StaffDossiers() {
  const { data: dossiers, isLoading } = useStaffDossiers();
  const [f, setF] = useState('all');
  const [q, setQ] = useState('');

  const counts = useMemo(() => {
    const list = dossiers ?? [];
    return {
      now: list.filter((d) => d.bucket === 'now').length,
      review: list.filter((d) => d.bucket === 'review').length,
    } as Record<string, number>;
  }, [dossiers]);

  const list = (dossiers ?? []).filter((d) => {
    const okF = f === 'all' || d.bucket === (f as Bucket);
    const okQ = !q || `${d.name} ${d.program}`.toLowerCase().includes(q.toLowerCase());
    return okF && okQ;
  });

  const options = FILTERS.map((x) => ({ ...x, count: counts[x.id] ?? null }));

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={`${(dossiers ?? []).length} étudiants suivis`} title="Dossiers" />
        <SearchBar value={q} onChange={setQ} placeholder="Rechercher un étudiant…" style={{ marginBottom: 10 }} />
        <SegFilter options={options} value={f} onChange={setF} style={{ marginBottom: 12 }} />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: 11 }} showsVerticalScrollIndicator={false}>
            {list.map((d) => (
              <Pressable key={d.id} style={styles.card} onPress={() => router.navigate(`/(staff)/student/${d.id}` as Href)}>
                <View style={styles.row}>
                  <Avatar name={d.name} kind="student" size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{d.name}</Text>
                    <Text style={T.t2} numberOfLines={1}>{d.program}</Text>
                  </View>
                  <Chip variant={d.chip} label={d.statusLabel} />
                </View>
                <View style={styles.progressRow}>
                  <ProgressBar pct={d.pct} style={{ flex: 1 }} />
                  <Text style={T.t3}>Étape {d.step}/6</Text>
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <FileText size={13} color={colors.ink50} />
                    <Text style={T.t3}>{d.docsDone}/{d.docsTotal} docs</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <WalletCards size={13} color={colors.ink50} />
                    <Text style={T.t3}>{d.due === 0 ? 'Soldé' : `${fmtCompact(d.paid)} payés`}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <MapPin size={13} color={colors.ink50} />
                    <Text style={T.t3} numberOfLines={1}>{d.dest}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
            {!list.length ? <Text style={styles.empty}>Aucun dossier.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  card: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
    borderRadius: radius.lg,
    padding: 14,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
});
