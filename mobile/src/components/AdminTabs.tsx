import { useMemo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { Tabs } from 'expo-router';
import { Award, LayoutGrid, MoreHorizontal, Wallet, type LucideIcon } from 'lucide-react-native';

import { useStaffReports, isPendingReport } from '@/lib/hooks/use-staff';
import { radius, shadow, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: LayoutGrid, label: 'Bord' },
  performances: { icon: Award, label: 'Perfs' },
  comptabilite: { icon: Wallet, label: 'Compta' },
  plus: { icon: MoreHorizontal, label: 'Plus' },
};

/** Barre d'onglets de l'app Admin (4 onglets, badge « Plus » = rapports en attente). */
export function AdminTabs({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const light = colors.bgBase !== '#100307';
  const { data: reports } = useStaffReports();
  const pendingReports = (reports ?? []).filter((r) => isPendingReport(r.status)).length;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="box-none">
      <BlurView intensity={30} tint={light ? 'light' : 'dark'} style={styles.bar}>
        {state.routes.map((route, i) => {
          const meta = ICONS[route.name];
          if (!meta) return null;
          const focused = state.index === i;
          const Icon = meta.icon;
          const badge = route.name === 'plus' ? pendingReports || null : null;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable key={route.key} style={styles.item} onPress={onPress} hitSlop={6}>
              <View>
                {focused ? (
                  <LinearGradient
                    colors={['rgba(255,90,95,0.9)', 'rgba(209,26,42,0.85)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.pill, styles.pillActive]}>
                    <Icon size={20} color="#fff" strokeWidth={2.2} />
                  </LinearGradient>
                ) : (
                  <View style={styles.iconInactive}>
                    <Icon size={20} color={colors.ink35} strokeWidth={2} />
                  </View>
                )}
                {badge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
    bar: {
      flexDirection: 'row',
      borderRadius: 26,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.glassLine,
      backgroundColor: colors.tabBarBg,
      paddingVertical: 9,
      paddingHorizontal: 8,
      ...shadow.tabBar,
    },
    item: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 4 },
    pill: { width: 44, height: 36, borderRadius: radius.sm + 1, alignItems: 'center', justifyContent: 'center' },
    pillActive: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.3)',
      shadowColor: colors.crimson,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 22,
      elevation: 8,
    },
    iconInactive: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 10, color: colors.ink35, fontWeight: '600' },
    labelActive: { color: colors.text },
    badge: {
      position: 'absolute',
      top: -2,
      right: 2,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: 8,
      backgroundColor: colors.crimsonVivid,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.dotBorder,
    },
    badgeText: { color: '#fff', fontSize: 9.5, fontWeight: '700' },
  });
