import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { Moon, Smartphone, Sun } from 'lucide-react-native';

import { type Palette } from '@/theme/tokens';
import { useColors, useThemePref, type ThemePref } from '@/theme/theme';

const LABEL: Record<ThemePref, string> = {
  light: 'Clair',
  dark: 'Sombre',
  system: 'Système',
};

/**
 * Bouton verre 44×44 qui ouvre le sélecteur d'apparence (Clair / Sombre / Système).
 * L'icône reflète la préférence active. À placer dans l'en-tête du portail étudiant.
 */
export function ThemeToggle() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { pref, setPref } = useThemePref();

  const Icon = pref === 'light' ? Sun : pref === 'dark' ? Moon : Smartphone;

  function openPicker() {
    const opt = (p: ThemePref): string => `${LABEL[p]}${pref === p ? ' ✓' : ''}`;
    Alert.alert('Apparence', 'Choisis le thème de l’application.', [
      { text: opt('light'), onPress: () => setPref('light') },
      { text: opt('dark'), onPress: () => setPref('dark') },
      { text: opt('system'), onPress: () => setPref('system') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  return (
    <Pressable onPress={openPicker} hitSlop={6} style={styles.btn} accessibilityLabel="Changer le thème">
      <Icon size={19} color={colors.text} strokeWidth={1.8} />
    </Pressable>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    btn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.softFill,
      borderWidth: 1,
      borderColor: colors.glassLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
