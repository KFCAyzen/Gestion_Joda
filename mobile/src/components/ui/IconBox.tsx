import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors as defaultColors, radius, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export type IconTone = 'red' | 'mint' | 'amber' | 'ghost' | 'blue' | 'purple';

const tones = (colors: Palette): Record<IconTone, { bg: string; border: string }> => ({
  red: { bg: colors.redGlass, border: colors.redLine },
  mint: { bg: 'rgba(52,217,168,0.13)', border: 'rgba(52,217,168,0.28)' },
  amber: { bg: 'rgba(251,191,36,0.13)', border: 'rgba(251,191,36,0.28)' },
  ghost: { bg: colors.softFill, border: colors.glassLine },
  blue: { bg: 'rgba(96,165,250,0.13)', border: 'rgba(96,165,250,0.28)' },
  purple: { bg: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.28)' },
});

/** Teinte de l'icône à passer en `color`, dérivée de la palette (port des `.picon`). */
const tints = (colors: Palette): Record<IconTone, string> => ({
  red: colors.redIcon,
  mint: colors.mintIcon,
  amber: colors.amberIcon,
  ghost: colors.ink70,
  blue: colors.blueIcon,
  purple: colors.purpleIcon,
});

/** Teintes d'icône statiques (sombre) — pour le code non thémé (Agent/Admin). */
export const iconTint: Record<IconTone, string> = tints(defaultColors);

/** Teintes d'icône réactives au thème (écrans étudiant). */
export function useIconTint(): Record<IconTone, string> {
  return tints(useColors());
}

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
  const colors = useColors();
  const t = tones(colors)[tone];
  return (
    <View style={[styles.box, { width: size, height: size, backgroundColor: t.bg, borderColor: t.border }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
