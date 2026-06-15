import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/theme/tokens';

type Props = {
  children: ReactNode;
  /** `strong` = surface verre plus marquée (hero cards). */
  variant?: 'glass' | 'strong';
  /** Bord gauche accentué crimson (carte « En cours »). */
  accentLeft?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Surface verre `.glass` / `.glass-strong` du handoff. */
export function GlassCard({ children, variant = 'glass', accentLeft, style }: Props) {
  return (
    <View
      style={[
        styles.base,
        variant === 'strong' ? styles.strong : styles.glass,
        accentLeft && styles.accentLeft,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.cardPad,
    ...shadow.card,
  },
  glass: {
    backgroundColor: colors.glass,
    borderColor: colors.glassLine,
  },
  strong: {
    backgroundColor: colors.glass2,
    borderColor: colors.glassLine2,
    borderRadius: radius.xl,
  },
  accentLeft: {
    borderLeftWidth: 3,
    borderLeftColor: colors.crimson,
  },
});
