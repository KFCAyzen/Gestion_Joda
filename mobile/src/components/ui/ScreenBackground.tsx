import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

/**
 * Fond d'ambiance `.pm-bg` : dégradés radiaux crimson sur base sombre.
 * RN n'a pas de gradient radial natif → on le rend en SVG (3 halos + base).
 */
export function ScreenBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="halo1" cx="12%" cy="-6%" rx="120%" ry="80%">
            <Stop offset="0" stopColor="#ef4444" stopOpacity={0.42} />
            <Stop offset="0.46" stopColor="#ef4444" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="halo2" cx="96%" cy="8%" rx="110%" ry="70%">
            <Stop offset="0" stopColor="#be123c" stopOpacity={0.3} />
            <Stop offset="0.5" stopColor="#be123c" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="halo3" cx="60%" cy="108%" rx="120%" ry="90%">
            <Stop offset="0" stopColor="#7f1d1d" stopOpacity={0.4} />
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
  root: { flex: 1, backgroundColor: colors.bgBase },
});
