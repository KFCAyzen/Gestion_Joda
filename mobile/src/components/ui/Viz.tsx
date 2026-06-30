/**
 * Primitives de data-viz animées — port RN du `creative-viz.jsx`
 * (design_handoff_creative_redesign). Montées « on reveal » :
 *  - CountUp  : nombre qui s'incrémente 0→valeur (ease-out cubique).
 *  - Sparkline: courbe qui se dessine (strokeDashoffset) + aire dégradée.
 *  - CVBars   : barres dont la hauteur croît, délai par item.
 *  - Donut    : anneau segmenté, chaque segment apparaît avec un décalage.
 *
 * Réutilisées par les écrans staff/admin (heros, bento, cartes répartition).
 * Respect du reduced-motion : l'état final est l'état de repos ; si l'anim est
 * coupée, le visuel reste correct (jamais figé à 0/vide).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View, type TextStyle } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/theme/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/* ─────────────────────────────  CountUp  ───────────────────────────── */

type CountUpProps = {
  to: number;
  duration?: number;
  /** Formate la valeur courante (par défaut : entier arrondi). */
  format?: (n: number) => string;
  style?: TextStyle | TextStyle[];
};

/** Nombre animé 0→`to`, ease-out cubique (~1100 ms). */
export function CountUp({ to, duration = 1100, format = (n) => String(Math.round(n)), style }: CountUpProps) {
  const [v, setV] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    let t0: number | null = null;
    const tick = (t: number) => {
      if (cancelled) return;
      if (t0 == null) t0 = t;
      const p = Math.min(1, (t - t0) / duration);
      setV(to * ease(p));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    // Reduced motion : on saute directement à la valeur finale.
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) setV(to);
        else rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        rafRef.current = requestAnimationFrame(tick);
      });
    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [to, duration]);

  return <Text style={style}>{format(v)}</Text>;
}

/* ─────────────────────────────  Sparkline  ─────────────────────────── */

type SparklineProps = {
  points: number[];
  width?: number;
  height?: number;
  /** id unique pour le dégradé (évite les collisions SVG). */
  gid?: string;
  fill?: boolean;
  color?: string;
};

/** Courbe qui se dessine au montage + aire dégradée + point final. */
export function Sparkline({ points, width = 132, height = 40, gid = 'spark', fill = true, color }: SparklineProps) {
  const colors = useColors();
  const stroke = color ?? colors.crimsonVivid;
  const pad = 4;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const pts = points.map((p, i): [number, number] => [i * step, height - pad - ((p - min) / span) * (height - pad * 2)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const len = pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

  const offset = useSharedValue(len);
  useEffect(() => {
    offset.value = withTiming(0, { duration: 1300, easing: Easing.out(Easing.cubic) });
  }, [len]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  const last = pts[pts.length - 1];

  return (
    <Svg width={width} height={height} style={{ overflow: 'visible' }}>
      <Defs>
        <LinearGradient id={`${gid}f`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity="0.28" />
          <Stop offset="1" stopColor={stroke} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {fill ? <Path d={area} fill={`url(#${gid}f)`} /> : null}
      <AnimatedPath
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        animatedProps={animatedProps}
      />
      <Circle cx={last[0]} cy={last[1]} r={3.2} fill={stroke} />
    </Svg>
  );
}

/* ─────────────────────────────  CVBars  ────────────────────────────── */

type Bar = { label: string; value: number };
type CVBarsProps = {
  bars: Bar[];
  /** index de la barre « aujourd'hui » (mise en avant crimson). */
  todayIdx?: number;
  height?: number;
};

function GrowBar({ pct, delay, color }: { pct: number; delay: number; color: string }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(delay, withTiming(pct, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [pct]);
  const animatedStyle = useAnimatedStyle(() => ({ height: `${h.value}%` }));
  return <Animated.View style={[{ width: '100%', borderRadius: 6, backgroundColor: color }, animatedStyle]} />;
}

/** Mini-bar chart animé (flux 7 jours). */
export function CVBars({ bars, todayIdx = bars.length - 1, height = 64 }: CVBarsProps) {
  const colors = useColors();
  const max = Math.max(...bars.map((b) => b.value)) || 1;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 7, height }}>
      {bars.map((b, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <View style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }}>
            <GrowBar
              pct={(b.value / max) * 100}
              delay={i * 60}
              color={i === todayIdx ? colors.crimsonVivid : colors.glassLine2}
            />
          </View>
          <Text style={{ fontSize: 9.5, color: colors.ink50, marginTop: 5 }}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ─────────────────────────────  Donut  ─────────────────────────────── */

type Segment = { value: number; color: string; label?: string };
type DonutProps = {
  segments: Segment[];
  size?: number;
  stroke?: number;
  children?: ReactNode;
};

function DonutSegment({
  cx,
  c,
  r,
  stroke,
  color,
  frac,
  accFrac,
  delay,
}: {
  cx: number;
  c: number;
  r: number;
  stroke: number;
  color: string;
  frac: number;
  accFrac: number;
  delay: number;
}) {
  const dash = useSharedValue(0);
  useEffect(() => {
    dash.value = withDelay(delay, withTiming(frac * c, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [frac, c]);
  const animatedProps = useAnimatedProps(() => ({ strokeDasharray: [dash.value, c] }));
  return (
    <AnimatedCircle
      cx={cx}
      cy={cx}
      r={r}
      stroke={color}
      strokeWidth={stroke}
      fill="none"
      strokeDashoffset={-accFrac * c}
      transform={`rotate(-90 ${cx} ${cx})`}
      animatedProps={animatedProps}
    />
  );
}

/** Anneau segmenté animé (répartition). */
export function Donut({ segments, size = 108, stroke = 16, children }: DonutProps) {
  const colors = useColors();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;

  let acc = 0;
  const rendered = segments.map((s, i) => {
    const frac = s.value / total;
    const node = (
      <DonutSegment key={i} cx={cx} c={c} r={r} stroke={stroke} color={s.color} frac={frac} accFrac={acc} delay={i * 120} />
    );
    acc += frac;
    return node;
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        {rendered}
      </Svg>
      {children ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
      ) : null}
    </View>
  );
}
