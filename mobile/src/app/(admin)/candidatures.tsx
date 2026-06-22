import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { useCandidatures } from '@/lib/hooks/use-admin';
import type { DossierStatus } from '@/lib/hooks/use-student-portal';
import { Avatar, Chip, GlassCard, ScreenBackground, ScreenHeader, SegFilter, useText } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { relTime } from '@/lib/format';

const TODO: DossierStatus[] = ['document_manquant', 'en_attente', 'document_recu', 'en_attente_universite'];
const STATUS_LABEL: Record<string, string> = {
  document_manquant: 'Document manquant',
  en_attente: 'En attente',
  document_recu: 'Document reçu',
  en_cours: 'En cours',
  en_attente_universite: 'Attente université',
  admission_validee: 'Admission validée',
  admission_rejetee: 'Rejeté',
  visa_en_cours: 'Visa en cours',
  termine: 'Terminé',
};
const STATUS_CHIP: Record<string, 'live' | 'due' | 'done' | 'ghost'> = {
  document_manquant: 'due',
  en_attente: 'live',
  document_recu: 'live',
  en_attente_universite: 'due',
  en_cours: 'live',
  admission_validee: 'done',
  termine: 'done',
};

export default function AdminCandidatures() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { data, isLoading } = useCandidatures();
  const [f, setF] = useState('todo');
  const list = (data ?? []).filter((c) => (f === 'todo' ? TODO.includes(c.status) : true));

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={`${(data ?? []).length} candidatures`} title="Candidatures" sm onBack={() => router.back()} />
        <SegFilter
          options={[
            { id: 'todo', label: 'À traiter', count: (data ?? []).filter((c) => TODO.includes(c.status)).length },
            { id: 'all', label: 'Toutes', count: (data ?? []).length },
          ]}
          value={f}
          onChange={setF}
          style={{ marginBottom: 12 }}
        />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {list.map((c) => (
              <Pressable key={c.id} onPress={() => router.navigate(`/(admin)/student/${c.studentId}` as Href)}>
                <GlassCard style={styles.card}>
                  <Avatar name={c.name} kind="student" size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{c.name}</Text>
                    <Text style={T.t2} numberOfLines={1}>{c.program}</Text>
                    <Text style={T.t3}>{relTime(c.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Chip variant={STATUS_CHIP[c.status] ?? 'ghost'} label={STATUS_LABEL[c.status] ?? c.status} />
                    <ChevronRight size={16} color={colors.ink35} />
                  </View>
                </GlassCard>
              </Pressable>
            ))}
            {!list.length ? <Text style={styles.empty}>Aucune candidature.</Text> : null}
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
