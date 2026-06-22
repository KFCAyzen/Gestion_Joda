import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';

import { useUniversities, flagFor } from '@/lib/hooks/use-admin';
import { Chip, GlassCard, ScreenBackground, ScreenHeader, SearchBar, useText } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export default function AdminUniversites() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { data, isLoading } = useUniversities();
  const [q, setQ] = useState('');
  const list = (data ?? []).filter((u) => !q || `${u.nom} ${u.pays ?? ''} ${u.ville ?? ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={`${(data ?? []).length} partenaires`} title="Universités" sm onBack={() => router.back()} />
        <SearchBar value={q} onChange={setQ} placeholder="Rechercher une université…" style={{ marginBottom: 12 }} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {list.map((u) => (
              <GlassCard key={u.id} style={styles.card}>
                <Text style={styles.flag}>{flagFor(u.pays)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={T.t1} numberOfLines={1}>{u.nom}</Text>
                  <View style={styles.metaRow}>
                    <MapPin size={12} color={colors.ink50} />
                    <Text style={T.t3}>{[u.ville, u.pays].filter(Boolean).join(', ') || '—'}</Text>
                  </View>
                  {u.programme ? <Text style={T.t3} numberOfLines={1}>{u.programme}</Text> : null}
                </View>
                <Chip variant={u.active ? 'done' : 'ghost'} label={u.active ? 'Actif' : 'Suspendu'} />
              </GlassCard>
            ))}
            {!list.length ? <Text style={styles.empty}>Aucune université.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    flag: { fontSize: 30 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  });
