import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, ScreenBackground } from '@/components/ui';
import { colors, fontSize, spacing } from '@/theme/tokens';

/** Écran d'onglet en attente de branchement (étapes 4 suivantes). */
export function ComingSoon({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <GlassCard variant="strong" style={styles.card}>
          <Text style={styles.note}>{note}</Text>
        </GlassCard>
      </SafeAreaView>
    </ScreenBackground>
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
  card: { marginTop: 20 },
  note: { color: colors.ink70, fontSize: 14, lineHeight: 21 },
});
