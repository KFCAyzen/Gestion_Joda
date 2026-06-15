import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, eyebrow as eyebrowToken, fontSize } from '@/theme/tokens';

/** En-tête d'écran `PHeader` — eyebrow muted + titre 25px, action à droite (handoff §Composants). */
export function ScreenHeader({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingBottom: 16 },
  left: { flex: 1 },
  eyebrow: eyebrowToken,
  title: { color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '600', marginTop: 3, letterSpacing: -0.5 },
});
