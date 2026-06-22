import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { useStaffDossiers } from '@/lib/hooks/use-staff';
import { Avatar, Chip, GlassCard, ProgressBar, ScreenBackground, ScreenHeader, SearchBar, useText } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export default function AdminEtudiants() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { data, isLoading } = useStaffDossiers();
  const [q, setQ] = useState('');
  const list = (data ?? []).filter((d) => !q || `${d.name} ${d.program}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={`${(data ?? []).length} étudiants`} title="Étudiants" sm onBack={() => router.back()} />
        <SearchBar value={q} onChange={setQ} placeholder="Rechercher un étudiant…" style={{ marginBottom: 12 }} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {list.map((d) => (
              <Pressable key={d.id} onPress={() => router.navigate(`/(admin)/student/${d.id}` as Href)}>
                <GlassCard style={styles.card}>
                  <Avatar name={d.name} kind="student" size={44} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={T.t1} numberOfLines={1}>{d.name}</Text>
                    <Text style={T.t2} numberOfLines={1}>{d.program}</Text>
                    <ProgressBar pct={d.pct} />
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Chip variant={d.chip} label={`${d.step}/6`} />
                    <ChevronRight size={16} color={colors.ink35} />
                  </View>
                </GlassCard>
              </Pressable>
            ))}
            {!list.length ? <Text style={styles.empty}>Aucun étudiant.</Text> : null}
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
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
  });
