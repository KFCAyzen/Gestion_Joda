import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send, Users } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { Button, GlassCard, IconBox, ListCard, ListRow, ScreenBackground, ScreenHeader, iconTint, text as T, useToast } from '@/components/ui';
import { colors, spacing } from '@/theme/tokens';

function useAudiences() {
  return useQuery({
    queryKey: ['admin', 'newsletter', 'audiences'],
    queryFn: async () => {
      const [all, enCours, retards] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('dossier_bourses').select('id', { count: 'exact', head: true }).in('status', ['en_cours', 'en_attente_universite', 'visa_en_cours']),
        supabase.from('payments').select('student_id').eq('status', 'retard'),
      ]);
      const lateStudents = new Set(((retards.data as { student_id: string }[]) ?? []).map((p) => p.student_id)).size;
      return [
        { label: 'Tous les étudiants', count: all.count ?? 0 },
        { label: 'Dossier en cours', count: enCours.count ?? 0 },
        { label: 'Paiements en retard', count: lateStudents },
      ];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export default function AdminNewsletter() {
  const { data, isLoading } = useAudiences();
  const toast = useToast();

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Communication" title="Newsletter" sm onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          <GlassCard variant="strong" style={styles.compose}>
            <IconBox tone="purple" size={48}>
              <Mail size={22} color={iconTint.purple} />
            </IconBox>
            <View style={{ flex: 1 }}>
              <Text style={T.t1}>Composer une campagne</Text>
              <Text style={T.t2}>Push ou e-mail vers une audience ciblée.</Text>
            </View>
          </GlassCard>

          <Button label="Nouvelle campagne" icon={<Send size={16} color="#fff" />} onPress={() => toast('Composition disponible sur le web')} />

          <Text style={styles.section}>Audiences</Text>
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : (
            <ListCard>
              {(data ?? []).map((a, i, arr) => (
                <ListRow key={a.label} last={i === arr.length - 1}>
                  <IconBox tone="blue" size={38}>
                    <Users size={17} color={iconTint.blue} />
                  </IconBox>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.t1, { fontSize: 14 }]}>{a.label}</Text>
                  </View>
                  <Text style={styles.count}>{a.count}</Text>
                </ListRow>
              ))}
            </ListCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  compose: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  section: { color: colors.ink70, fontSize: 12.5, fontWeight: '700', marginTop: 4 },
  count: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
