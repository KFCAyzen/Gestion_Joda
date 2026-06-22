import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { FileText, House, MessageSquare, Route, WalletCards, type LucideIcon } from 'lucide-react-native';

import { radius, shadow, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

// Type des props passées à `tabBar` par expo-router (qui embarque sa propre
// copie de react-navigation, distincte du paquet standalone).
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  index: { icon: House, label: 'Accueil' },
  parcours: { icon: Route, label: 'Parcours' },
  documents: { icon: FileText, label: 'Documents' },
  payments: { icon: WalletCards, label: 'Paiements' },
  messages: { icon: MessageSquare, label: 'Messages' },
};

/** Barre d'onglets flottante `.pm-tabs` (verre + onglet actif en pastille crimson). */
export function BottomTabs({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const light = colors.bgBase !== '#100307';

  // Plein écran sur le chat : la barre est masquée (retour via le chevron du header).
  if (state.routes[state.index]?.name === 'messages') return null;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="box-none">
      <BlurView intensity={30} tint={light ? 'light' : 'dark'} style={styles.bar}>
        {state.routes.map((route, i) => {
          const meta = ICONS[route.name];
          if (!meta) return null;
          const focused = state.index === i;
          const Icon = meta.icon;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <Pressable key={route.key} style={styles.item} onPress={onPress} hitSlop={6}>
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
    pill: {
      width: 44,
      height: 36,
      borderRadius: radius.sm + 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Lueur crimson + liseré supérieur (équivalent RN de l'inset highlight de la maquette).
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
  });
