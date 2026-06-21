import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/tokens';

export type IconTone = 'red' | 'mint' | 'amber' | 'ghost' | 'blue' | 'purple';

const tones: Record<IconTone, { bg: string; border: string }> = {
  red: { bg: colors.redGlass, border: colors.redLine },
  mint: { bg: 'rgba(52,217,168,0.13)', border: 'rgba(52,217,168,0.28)' },
  amber: { bg: 'rgba(251,191,36,0.13)', border: 'rgba(251,191,36,0.28)' },
  ghost: { bg: 'rgba(255,255,255,0.06)', border: colors.glassLine },
  blue: { bg: 'rgba(96,165,250,0.13)', border: 'rgba(96,165,250,0.28)' },
  purple: { bg: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.28)' },
};

/** Teinte de l'icône à passer en `color` (port des `.picon` du handoff). */
export const iconTint: Record<IconTone, string> = {
  red: '#ffb3b3',
  mint: '#8bf0d2',
  amber: '#ffe09a',
  ghost: colors.ink70,
  blue: '#a9cdfb',
  purple: '#cabffc',
};

/** Boîte-icône `.picon` — carré arrondi teinté (rows documents/paiements/PJ chat). */
export function IconBox({
  tone = 'ghost',
  size = 40,
  children,
  style,
}: {
  tone?: IconTone;
  size?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = tones[tone];
  return (
    <View style={[styles.box, { width: size, height: size, backgroundColor: t.bg, borderColor: t.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
