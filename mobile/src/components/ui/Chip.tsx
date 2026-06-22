import { StyleSheet, Text, View } from 'react-native';

import { radius, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

type Variant = 'live' | 'done' | 'due' | 'ghost';

const variants = (colors: Palette): Record<Variant, { bg: string; border: string; fg: string }> => ({
  live: { bg: colors.redGlass, border: colors.redLine, fg: colors.crimsonVivid },
  done: { bg: 'rgba(52,217,168,0.13)', border: 'rgba(52,217,168,0.32)', fg: colors.mint },
  due: { bg: 'rgba(251,191,36,0.13)', border: 'rgba(251,191,36,0.32)', fg: colors.amber },
  ghost: { bg: colors.glass, border: colors.glassLine, fg: colors.ink70 },
});

/** Pastille `.pchip` (live/done/due/ghost). `live` affiche un point. */
export function Chip({ variant = 'ghost', label }: { variant?: Variant; label: string }) {
  const colors = useColors();
  const c = variants(colors)[variant];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg, borderColor: c.border }]}>
      {variant === 'live' ? <View style={[styles.dot, { backgroundColor: c.fg }]} /> : null}
      <Text style={[styles.label, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11.5, fontWeight: '600' },
});
