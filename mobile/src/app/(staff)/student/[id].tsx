import { useMemo } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Check, FileText, MessageSquare, Phone, Plane } from 'lucide-react-native';

import { useStaffStudentDetail } from '@/lib/hooks/use-staff';
import {
  Button,
  Chip,
  GlassCard,
  IconBox,
  ListCard,
  ListRow,
  ProgressBar,
  Ring,
  ScreenBackground,
  ScreenHeader,
  SectionLabel,
  useIconTint,
  useText,
  useToast,
} from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtFCFA } from '@/lib/format';

export default function StaffStudentDetail() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: s, isLoading } = useStaffStudentDetail(id);
  const toast = useToast();

  if (isLoading || !s) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <ScreenHeader eyebrow="Dossier" title="Fiche étudiant" sm onBack={() => router.back()} />
          {isLoading ? <ActivityIndicator style={{ marginTop: 40 }} /> : <Text style={styles.empty}>Étudiant introuvable.</Text>}
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const totalPay = s.paid + s.due;
  const payPct = totalPay > 0 ? Math.round((s.paid / totalPay) * 100) : 100;

  function call() {
    if (!s) return;
    if (s.phone) Linking.openURL(`tel:${s.phone}`).catch(() => toast('Impossible de lancer l’appel'));
    else toast('Aucun numéro renseigné');
  }
  function message() {
    if (!s?.peerUserId) {
      toast('Cet étudiant n’a pas encore de compte');
      return;
    }
    router.navigate(`/(staff)/chat/${s.peerUserId}?name=${encodeURIComponent(s.name)}` as Href);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={`Dossier · ${s.ref}`} title={s.name} sm onBack={() => router.back()} />

        <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          {/* HERO */}
          <GlassCard variant="strong" style={styles.hero}>
            <Plane size={120} color={colors.watermark} strokeWidth={1} style={styles.filigree} />
            <View style={styles.heroRow}>
              <Ring pct={s.pct} size={92} strokeWidth={10}>
                <Text style={styles.ringValue}>
                  {s.pct}
                  <Text style={styles.ringPct}>%</Text>
                </Text>
                <Text style={styles.ringLabel}>Dossier</Text>
              </Ring>
              <View style={{ flex: 1 }}>
                <Text style={T.eyebrow}>Destination</Text>
                <Text style={styles.dest} numberOfLines={1}>{s.dest}</Text>
                <Text style={T.t2} numberOfLines={2}>{s.program}</Text>
                <View style={{ marginTop: 10 }}>
                  <Chip variant="live" label={`Étape ${s.step} / 6 · ${s.stepLabel}`} />
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Quick actions */}
          <View style={styles.actions}>
            <Button label="Message" size="sm" icon={<MessageSquare size={16} color="#fff" />} onPress={message} style={{ flex: 1 }} />
            <Button label="Appeler" size="sm" variant="glass" icon={<Phone size={16} color={colors.ink70} />} onPress={call} style={{ flex: 1 }} />
          </View>

          {/* Parcours */}
          <SectionLabel title="Parcours" />
          <GlassCard>
            {s.milestones.map((m, i) => {
              const isDone = m.state === 'done';
              const isNow = m.state === 'now';
              return (
                <View key={m.key} style={styles.mRow}>
                  <View style={styles.mColLeft}>
                    <View
                      style={[
                        styles.mDot,
                        isDone && styles.mDotDone,
                        isNow && styles.mDotNow,
                      ]}>
                      {isDone ? (
                        <Check size={13} color={colors.mint} strokeWidth={3} />
                      ) : (
                        <Text style={[styles.mNum, isNow && { color: '#fff' }]}>{i + 1}</Text>
                      )}
                    </View>
                    {i < s.milestones.length - 1 ? <View style={[styles.mLine, isDone && styles.mLineDone]} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: i < s.milestones.length - 1 ? 16 : 0 }}>
                    <Text style={[styles.mLabel, m.state === 'lock' && { color: colors.ink50 }]}>{m.label}</Text>
                    {isNow ? <Text style={styles.mNow}>En cours</Text> : null}
                  </View>
                </View>
              );
            })}
          </GlassCard>

          {/* Documents */}
          <SectionLabel title={`Documents · ${s.docsDone}/${s.docsTotal}`} />
          <ListCard>
            {s.docs.map((d, i, arr) => (
              <ListRow key={d.key} last={i === arr.length - 1}>
                <IconBox tone={d.ok ? 'mint' : 'ghost'} size={38}>
                  <FileText size={17} color={d.ok ? iconTint.mint : colors.ink50} />
                </IconBox>
                <View style={{ flex: 1 }}>
                  <Text style={[T.t1, { fontSize: 13.5 }]}>{d.label}</Text>
                </View>
                <Chip variant={d.ok ? 'done' : 'ghost'} label={d.ok ? 'Reçu' : d.optional ? 'Optionnel' : 'Manquant'} />
              </ListRow>
            ))}
          </ListCard>

          {/* Paiements */}
          <SectionLabel title="Paiements" />
          <GlassCard>
            <View style={styles.payRow}>
              <View>
                <Text style={T.t3}>Total encaissé</Text>
                <Text style={styles.payBig}>
                  {fmtFCFA(s.paid)} <Text style={styles.payUnit}>FCFA</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={T.t3}>Restant</Text>
                <Text style={[styles.payBig, { fontSize: 16, color: colors.amber }]}>{fmtFCFA(s.due)}</Text>
              </View>
            </View>
            <ProgressBar pct={payPct} style={{ marginTop: 12 }} />
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },
    hero: { overflow: 'hidden' },
    filigree: { position: 'absolute', top: -22, right: -16 },
    heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    ringValue: { color: colors.text, fontSize: 22, fontWeight: '600' },
    ringPct: { fontSize: 12, color: colors.ink50 },
    ringLabel: { color: colors.ink50, fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 1 },
    dest: { color: colors.text, fontSize: 19, fontWeight: '600', marginTop: 2 },
    actions: { flexDirection: 'row', gap: 10 },

    mRow: { flexDirection: 'row', gap: 12 },
    mColLeft: { alignItems: 'center' },
    mDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
    },
    mDotDone: { backgroundColor: 'rgba(52,217,168,0.13)', borderColor: 'rgba(52,217,168,0.32)' },
    mDotNow: { backgroundColor: colors.crimsonDeep, borderColor: 'transparent' },
    mNum: { fontSize: 11, fontWeight: '700', color: colors.ink35 },
    mLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: colors.glassLine, marginTop: 2 },
    mLineDone: { backgroundColor: 'rgba(52,217,168,0.32)' },
    mLabel: { color: colors.text, fontSize: 13.5, fontWeight: '500', paddingTop: 1 },
    mNow: { color: colors.redIcon, fontSize: 11.5, marginTop: 1 },

    payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    payBig: { color: colors.text, fontSize: 21, fontWeight: '600', marginTop: 2 },
    payUnit: { fontSize: 12, color: colors.ink50, fontWeight: '400' },
  });
