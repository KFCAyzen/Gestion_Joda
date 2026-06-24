import { useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, Clock, CreditCard, Plane } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { usePayments, type Payment } from '@/lib/hooks/use-payments';
import { useStudentProfile, useStudentDossier } from '@/lib/hooks/use-student-portal';
import { useDocuments } from '@/lib/hooks/use-documents';
import { REQUIRED_KEYS } from '@/lib/required-docs';
import { buildMilestones } from '@/lib/dossier-milestones';
import { Avatar, Button, Chip, GlassCard, MiniRing, Ring, ScreenBackground, ScreenHeader, ThemeToggle } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const TYPE_LABEL: Record<Payment['type'], string> = {
  bourse: 'Procédure bourse',
  mandarin: 'Cours mandarin',
  anglais: 'Cours anglais',
  inscription: 'Inscription',
  autre: 'Paiement',
};

function fmtAmount(n: number): string {
  return n.toLocaleString('fr-FR');
}

function shortDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

/** Onglet Accueil — hero dossier + prochaine action (handoff §1 ScreenHome). */
export default function HomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, logout } = useAuth();
  const { data: profile, isLoading: loadingProfile } = useStudentProfile(user?.id);
  const { data: dossier } = useStudentDossier(profile?.id);
  const { data: docs } = useDocuments(profile?.id);
  const { data: payments } = usePayments();

  const name = user?.name ?? user?.username ?? '';

  // Anneau « Dossier » + étape, dérivés des jalons.
  const milestones = buildMilestones(dossier?.status);
  const doneCount = milestones.filter((m) => m.state === 'done').length;
  const nowIndex = milestones.findIndex((m) => m.state === 'now');
  const etape = nowIndex >= 0 ? nowIndex + 1 : milestones.length;
  const dossierPct = Math.round((doneCount / milestones.length) * 100);
  const nowLabel = milestones.find((m) => m.state === 'now')?.label ?? 'Dossier complété';

  // Mini-anneaux.
  const byType = new Map((docs ?? []).map((d) => [d.type, d]));
  const docDone = REQUIRED_KEYS.filter((k) => byType.has(k)).length;
  const docTotal = REQUIRED_KEYS.length;
  const docComplete = docDone === docTotal;
  const inscDone = milestones[0]?.state === 'done';

  const open = (payments ?? []).filter((p) => p.status !== 'paye' && p.status !== 'annule');
  const dueCount = open.length;
  const nextDue = open
    .filter((p) => p.date_limite)
    .sort((a, b) => new Date(a.date_limite!).getTime() - new Date(b.date_limite!).getTime())[0];

  const metrics = [
    { pct: inscDone ? 100 : 0, color: colors.mint, big: inscDone ? 'OK' : '—', lbl: 'Inscrit.' },
    { pct: docTotal ? Math.round((docDone / docTotal) * 100) : 0, color: docComplete ? colors.mint : colors.crimsonVivid, big: `${docDone}/${docTotal}`, lbl: 'Documents' },
    { pct: dueCount > 0 ? 60 : 100, color: colors.amber, big: String(dueCount), lbl: 'Échéance' },
  ];

  function confirmLogout() {
    Alert.alert('Se déconnecter', 'Veux-tu te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ]);
  }

  if (loadingProfile) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <ActivityIndicator style={{ marginTop: 60 }} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow="Bonjour 👋"
          title={name}
          right={
            <View style={styles.headerRight}>
              <ThemeToggle />
              <NotificationBell />
              <Pressable onLongPress={confirmLogout} delayLongPress={400}>
                <Avatar name={name || '?'} kind="student" />
              </Pressable>
            </View>
          }
        />

        <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          {/* HERO — anneau dossier + destination */}
          <GlassCard variant="strong" style={styles.hero}>
            <Plane size={130} color={colors.watermark} strokeWidth={1} style={styles.filigree} />
            <View style={styles.heroTop}>
              <Ring pct={dossierPct} size={120} strokeWidth={12}>
                <Text style={styles.ringValue}>
                  {dossierPct}
                  <Text style={styles.ringPct}>%</Text>
                </Text>
                <Text style={styles.ringLabel}>Dossier</Text>
              </Ring>
              <View style={styles.heroText}>
                <Text style={styles.eyebrowMuted}>Destination</Text>
                <Text style={styles.heroDest} numberOfLines={1}>
                  {dossier?.desired_program || 'Ton dossier'}
                </Text>
                {dossier?.study_level ? <Text style={styles.heroSub}>{dossier.study_level}</Text> : null}
                <View style={{ marginTop: 12 }}>
                  <Chip variant="live" label={`Étape ${etape} / ${milestones.length}`} />
                </View>
              </View>
            </View>

            <View style={styles.metricsRow}>
              {metrics.map((m) => (
                <View key={m.lbl} style={styles.metricCard}>
                  <MiniRing pct={m.pct} size={46} strokeWidth={5} color={m.color}>
                    <Text style={styles.metricBig}>{m.big}</Text>
                  </MiniRing>
                  <Text style={styles.metricLbl}>{m.lbl}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* EN COURS — carte agent */}
          <Pressable onPress={() => router.navigate('/messages')}>
            <GlassCard accentLeft style={styles.agentCard}>
              <Avatar name="Agent" kind="agent" size={42} />
              <View style={{ flex: 1 }}>
                <Text style={styles.agentEyebrow}>En cours · maintenant</Text>
                <Text style={styles.agentTitle}>{nowLabel}</Text>
                <Text style={styles.agentSub}>Ton agent suit ton dossier</Text>
              </View>
              <ChevronRight size={20} color={colors.ink35} />
            </GlassCard>
          </Pressable>

          {/* PROCHAINE ÉCHÉANCE */}
          {nextDue ? (
            <GlassCard style={styles.dueCard}>
              <View style={styles.dueTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrowMuted}>Prochaine échéance</Text>
                  <Text style={styles.dueTitle}>
                    {TYPE_LABEL[nextDue.type]}
                    {nextDue.tranche ? ` · T${nextDue.tranche}` : ''}
                  </Text>
                  {nextDue.date_limite ? (
                    <View style={styles.dueDateRow}>
                      <Clock size={14} color={colors.amber} />
                      <Text style={styles.dueDate}>
                        Dû dans {Math.max(0, daysUntil(nextDue.date_limite))} jours · {shortDate(nextDue.date_limite)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.dueAmount}>{fmtAmount(nextDue.montant)}</Text>
                  <Text style={styles.dueCurrency}>FCFA</Text>
                </View>
              </View>
              <Button
                label="Déclarer le paiement"
                fullWidth
                icon={<CreditCard size={17} color="#fff" />}
                onPress={() => router.navigate('/payments')}
                style={{ marginTop: 15 }}
              />
            </GlassCard>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    eyebrowMuted: {
      color: colors.ink50,
      fontSize: fontSize.eyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.6,
    },

    hero: { overflow: 'hidden', paddingTop: spacing.heroPad, paddingBottom: 18 },
    filigree: { position: 'absolute', top: -28, right: -18 },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    ringValue: { color: colors.text, fontSize: 30, fontWeight: '600', lineHeight: 32 },
    ringPct: { fontSize: 16, color: colors.ink50 },
    ringLabel: { color: colors.ink50, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 2 },
    heroText: { flex: 1 },
    heroDest: { color: colors.text, fontSize: 21, fontWeight: '600', marginTop: 2 },
    heroSub: { color: colors.ink70, fontSize: fontSize.body, marginTop: 2 },

    metricsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    metricCard: {
      flex: 1,
      backgroundColor: colors.softFill,
      borderWidth: 1,
      borderColor: colors.glassLine,
      borderRadius: radius.md,
      paddingVertical: 11,
      alignItems: 'center',
      gap: 6,
    },
    metricBig: { color: colors.text, fontSize: 13, fontWeight: '600' },
    metricLbl: { color: colors.ink50, fontSize: 10.5, fontWeight: '600' },

    agentCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    agentEyebrow: {
      color: colors.redIcon,
      fontSize: fontSize.eyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.4,
    },
    agentTitle: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 1 },
    agentSub: { color: colors.ink70, fontSize: fontSize.meta, marginTop: 2 },

    dueCard: {},
    dueTop: { flexDirection: 'row', alignItems: 'flex-start' },
    dueTitle: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 4 },
    dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    dueDate: { color: colors.amber, fontSize: fontSize.meta, fontWeight: '600' },
    dueAmount: { color: colors.text, fontSize: 23, fontWeight: '600' },
    dueCurrency: { color: colors.ink50, fontSize: 11 },
  });
