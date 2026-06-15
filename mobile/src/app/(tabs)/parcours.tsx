import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, Lock, Plane, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useStudentProfile, useStudentDossier } from '@/lib/hooks/use-student-portal';
import { buildMilestones, type Milestone } from '@/lib/dossier-milestones';
import { Button, Chip, GlassCard, ScreenBackground } from '@/components/ui';
import { colors, fontSize, spacing } from '@/theme/tokens';

/** Onglet Parcours — timeline verticale 6 jalons (handoff §2). */
export default function ParcoursScreen() {
  const { user } = useAuth();
  const { data: profile } = useStudentProfile(user?.id);
  const { data: dossier, isLoading, error } = useStudentDossier(profile?.id);

  const milestones = buildMilestones(dossier?.status);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Text style={styles.eyebrow}>Mon parcours vers</Text>
        <Text style={styles.title}>{dossier?.desired_program || 'la Chine'}</Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>Erreur : {(error as Error).message}</Text>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}>
            <GlassCard variant="strong" style={styles.journey}>
              <View>
                <Text style={styles.journeyCity}>Bamako</Text>
                <Text style={styles.journeyMeta}>Aujourd’hui</Text>
              </View>
              <Plane size={22} color={colors.crimsonVivid} style={{ transform: [{ rotate: '45deg' }] }} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.journeyCity}>Pékin</Text>
                <Text style={styles.journeyMeta}>Sept. 2026</Text>
              </View>
            </GlassCard>

            <View style={styles.timeline}>
              {milestones.map((m, i) => (
                <TimelineRow key={m.key} milestone={m} isLast={i === milestones.length - 1} index={i} />
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function TimelineRow({ milestone, isLast, index }: { milestone: Milestone; isLast: boolean; index: number }) {
  const { state } = milestone;
  const lineColor = state === 'done' ? colors.mint : colors.glassLine;

  return (
    <View style={styles.row}>
      <View style={styles.gutter}>
        <Node state={state} index={index} />
        {!isLast ? <View style={[styles.line, { backgroundColor: lineColor }]} /> : null}
      </View>

      <View style={styles.content}>
        {state === 'now' ? (
          <GlassCard variant="strong" accentLeft>
            <Chip variant="live" label="En cours" />
            <Text style={styles.label}>{milestone.label}</Text>
            <Button
              label="Voir le message de l’agent"
              variant="glass"
              size="sm"
              onPress={() => router.navigate('/messages')}
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
            />
          </GlassCard>
        ) : (
          <View style={styles.plainContent}>
            <Text style={[styles.label, (state === 'lock' || state === 'next') && styles.labelMuted]}>
              {milestone.label}
            </Text>
            {state === 'blocked' ? <Chip variant="due" label="Bloqué" /> : null}
            {state === 'done' ? <Text style={styles.doneMeta}>Terminé</Text> : null}
          </View>
        )}
      </View>
    </View>
  );
}

function Node({ state, index }: { state: Milestone['state']; index: number }) {
  if (state === 'done') {
    return (
      <View style={[styles.node, styles.nodeDone]}>
        <Check size={18} color={colors.mint} strokeWidth={3} />
      </View>
    );
  }
  if (state === 'now') {
    return (
      <View style={[styles.node, styles.nodeNow]}>
        <View style={styles.nodeNowDot} />
      </View>
    );
  }
  if (state === 'blocked') {
    return (
      <View style={[styles.node, styles.nodeBlocked]}>
        <X size={18} color={colors.crimsonVivid} strokeWidth={3} />
      </View>
    );
  }
  if (state === 'next') {
    return (
      <View style={[styles.node, styles.nodeNext]}>
        <Text style={styles.nodeNum}>{String(index + 1).padStart(2, '0')}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.node, styles.nodeLock]}>
      <Lock size={15} color={colors.ink35} strokeWidth={2.2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  eyebrow: {
    color: colors.crimsonVivid,
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginTop: 12,
  },
  title: { color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '600' },
  journey: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  journeyCity: { color: colors.text, fontSize: 15, fontWeight: '600' },
  journeyMeta: { color: colors.ink50, fontSize: fontSize.meta, marginTop: 2 },
  timeline: { marginTop: 18 },
  row: { flexDirection: 'row', gap: 14 },
  gutter: { alignItems: 'center', width: 44 },
  line: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  node: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  nodeDone: { backgroundColor: 'rgba(52,217,168,0.13)', borderColor: colors.mint },
  nodeNow: { backgroundColor: colors.crimsonDeep, borderColor: colors.crimsonVivid },
  nodeNowDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  nodeBlocked: { backgroundColor: colors.redGlass, borderColor: colors.redLine },
  nodeNext: { backgroundColor: colors.glass, borderColor: colors.glassLine },
  nodeLock: { backgroundColor: colors.glass, borderColor: colors.glassLine },
  nodeNum: { color: colors.ink70, fontSize: 13, fontWeight: '700' },
  content: { flex: 1, paddingBottom: 18 },
  plainContent: { paddingTop: 10, gap: 6 },
  label: { color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' },
  labelMuted: { color: colors.ink35 },
  doneMeta: { color: colors.mint, fontSize: fontSize.meta, fontWeight: '600' },
  error: { color: colors.crimsonVivid, fontSize: 13 },
});
