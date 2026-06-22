import { useMemo, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Search } from 'lucide-react-native';

import { colors as defaultColors, fontSize, gradients, radius, spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

/* ── Segmented filter (`.seg2` / `.fchip`) ───────────────────────────────── */
export type SegOption = { id: string; label: string; count?: number | null };

export function SegFilter({
  options,
  value,
  onChange,
  style,
}: {
  options: SegOption[];
  value: string;
  onChange: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.seg, style]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} style={[styles.fchip, on && styles.fchipOn]} onPress={() => onChange(o.id)}>
            <Text style={[styles.fchipLabel, on && styles.fchipLabelOn]} numberOfLines={1}>
              {o.label}
              {o.count ? <Text style={styles.fchipCount}>{`  ·  ${o.count}`}</Text> : null}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ── Search bar (`.search`) ──────────────────────────────────────────────── */
export function SearchBar({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.search, style]}>
      <Search size={18} color={colors.ink50} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.ink35}
        style={styles.searchInput}
      />
    </View>
  );
}

/* ── Section label (`.seclbl`) ───────────────────────────────────────────── */
export function SectionLabel({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.seclbl}>
      <Text style={styles.seclblText}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.seclblAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ── List card container (`.glass.listcard`) ─────────────────────────────── */
export function ListCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.listcard, style]}>{children}</View>;
}

/** Une ligne `.litem` séparée par un liseré (sauf la dernière). */
export function ListRow({
  children,
  onPress,
  last,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const styles = useStyles();
  const inner = <View style={[styles.litem, !last && styles.litemBorder, style]}>{children}</View>;
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: colors.softFill }}>
      {inner}
    </Pressable>
  );
}

/* ── Progress bar (`.pbar`) ──────────────────────────────────────────────── */
export function ProgressBar({ pct, style }: { pct: number; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  const w = Math.max(0, Math.min(100, pct));
  return (
    <View style={[styles.pbar, style]}>
      <LinearGradient
        colors={gradients.crimson}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.pbarFill, { width: `${w}%` }]}
      />
    </View>
  );
}

/* ── KPI tile (`.kpi`) ───────────────────────────────────────────────────── */
export function StatTile({
  value,
  label,
  trend,
  trendDir,
  valueColor,
  style,
}: {
  value: string;
  label: string;
  trend?: string;
  trendDir?: 'up' | 'down';
  valueColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.kpi, style]}>
      <Text style={[styles.kpiValue, valueColor ? { color: valueColor } : null]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {trend ? (
        <Text style={[styles.kpiTrend, { color: trendDir === 'up' ? colors.mint : colors.ink50 }]} numberOfLines={1}>
          {trend}
        </Text>
      ) : null}
    </View>
  );
}

/* ── Toggle switch ───────────────────────────────────────────────────────── */
export function Toggle({ on, onPress }: { on: boolean; onPress?: () => void }) {
  const styles = useStyles();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {on ? (
        <LinearGradient
          colors={gradients.crimson}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.toggle, { alignItems: 'flex-end' }]}>
          <View style={styles.knob} />
        </LinearGradient>
      ) : (
        <View style={[styles.toggle, styles.toggleOff]}>
          <View style={styles.knob} />
        </View>
      )}
    </Pressable>
  );
}

/* ── Count badge (pastille rouge) ────────────────────────────────────────── */
export function CountBadge({ count, color }: { count: number; color?: string }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.badge, { backgroundColor: color ?? colors.crimsonVivid }]}>
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
}

const makeText = (colors: Palette) =>
  StyleSheet.create({
    t1: { color: colors.text, fontSize: 14.5, fontWeight: '600' },
    t2: { color: colors.ink70, fontSize: fontSize.meta },
    t3: { color: colors.ink50, fontSize: 11.5 },
    amount: { color: colors.text, fontSize: 17, fontWeight: '600' },
    eyebrow: {
      color: colors.ink50,
      fontSize: fontSize.eyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.6,
    },
  });

/** Styles de texte statiques (sombre) — pour le code non thémé (Agent/Admin actuels). */
export const text = makeText(defaultColors);

/** Styles de texte réactifs au thème. */
export function useText() {
  const colors = useColors();
  return useMemo(() => makeText(colors), [colors]);
}

/** Styles internes des primitives, réactifs au thème. */
function useStyles() {
  const colors = useColors();
  return useMemo(() => makeStyles(colors), [colors]);
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  seg: { flexDirection: 'row', gap: 8 },
  fchip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassLine,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fchipOn: { backgroundColor: colors.redGlass, borderColor: colors.redLine },
  fchipLabel: { color: colors.ink70, fontSize: 12.5, fontWeight: '600' },
  fchipLabelOn: { color: colors.crimsonVivid },
  fchipCount: { color: colors.ink50, fontWeight: '700' },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassLine,
    backgroundColor: colors.glass,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },

  seclbl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  seclblText: { color: colors.ink70, fontSize: 12.5, fontWeight: '700' },
  seclblAction: { color: colors.crimsonVivid, fontSize: 12.5, fontWeight: '600' },

  listcard: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.cardPad,
    overflow: 'hidden',
  },
  litem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  litemBorder: { borderBottomWidth: 1, borderBottomColor: colors.glassLine },

  pbar: { height: 7, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  pbarFill: { height: '100%', borderRadius: radius.pill },

  kpi: {
    flex: 1,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassLine,
    borderRadius: radius.md,
    padding: 13,
    gap: 3,
  },
  kpiValue: { color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  kpiLabel: { color: colors.ink50, fontSize: 11.5, fontWeight: '600' },
  kpiTrend: { fontSize: 10.5, fontWeight: '600', marginTop: 2 },

  toggle: { width: 42, height: 25, borderRadius: radius.pill, padding: 3, justifyContent: 'center' },
  toggleOff: { backgroundColor: colors.track, alignItems: 'flex-start' },
  knob: { width: 19, height: 19, borderRadius: radius.pill, backgroundColor: '#fff' },

  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
