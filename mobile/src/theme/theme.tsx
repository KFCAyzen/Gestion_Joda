import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { darkColors, lightColors, type Palette } from './tokens';

export type ThemeMode = 'light' | 'dark';
/** Préférence persistée : suivre le système, ou forcer clair / sombre. */
export type ThemePref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'joda.theme.pref';

type ThemeValue = {
  colors: Palette;
  mode: ThemeMode;
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * Fournit la palette active à un sous-arbre.
 *  - `force` impose un mode (utilisé à la racine pour garder sign-in / Agent / Admin en sombre).
 *  - sinon, lit la préférence persistée (system|light|dark) et la résout via `useColorScheme`.
 * Le portail étudiant `(tabs)` monte un provider *sans* `force` pour activer le mode clair.
 */
export function ThemeProvider({ children, force }: { children: ReactNode; force?: ThemeMode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    if (force) return;
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (alive && (v === 'light' || v === 'dark' || v === 'system')) setPrefState(v);
    });
    return () => {
      alive = false;
    };
  }, [force]);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  };

  const mode: ThemeMode = force ?? (pref === 'system' ? (system === 'light' ? 'light' : 'dark') : pref);
  const colors = mode === 'light' ? lightColors : darkColors;

  const value = useMemo<ThemeValue>(() => ({ colors, mode, pref, setPref }), [colors, mode, pref]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme doit être utilisé dans un <ThemeProvider>');
  return v;
}

/** Palette active (réagit au mode clair/sombre). */
export function useColors(): Palette {
  return useTheme().colors;
}

/** Préférence + setter (pour le sélecteur de thème). */
export function useThemePref(): { pref: ThemePref; mode: ThemeMode; setPref: (p: ThemePref) => void } {
  const { pref, mode, setPref } = useTheme();
  return { pref, mode, setPref };
}
