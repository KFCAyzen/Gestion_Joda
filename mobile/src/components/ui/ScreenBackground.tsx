import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useColors } from '@/theme/theme';

/**
 * Fond d'ambiance `.pm-bg` : dégradés radiaux crimson.
 * RN n'a pas de gradient radial natif → on le rend en SVG (3 halos + base).
 * Les halos sont nettement atténués en mode clair pour rester subtils sur fond warm-white.
 */
export function ScreenBackground({ children }: { children: ReactNode }) {
  const colors = useColors();
  const light = colors.bgBase !== '#100307';
  const o = light ? { h1: 0.07, h2: 0.05, h3: 0.06 } : { h1: 0.42, h2: 0.3, h3: 0.4 };
  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="halo1" cx="12%" cy="-6%" rx="120%" ry="80%">
            <Stop offset="0" stopColor="#ef4444" stopOpacity={o.h1} />
            <Stop offset="0.46" stopColor="#ef4444" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="halo2" cx="96%" cy="8%" rx="110%" ry="70%">
            <Stop offset="0" stopColor="#be123c" stopOpacity={o.h2} />
            <Stop offset="0.5" stopColor="#be123c" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="halo3" cx="60%" cy="108%" rx="120%" ry="90%">
            <Stop offset="0" stopColor="#7f1d1d" stopOpacity={o.h3} />
            <Stop offset="0.55" stopColor="#7f1d1d" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={colors.bgBase} />
        <Rect width="100%" height="100%" fill="url(#halo3)" />
        <Rect width="100%" height="100%" fill="url(#halo2)" />
        <Rect width="100%" height="100%" fill="url(#halo1)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
