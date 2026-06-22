import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useColors, useThemePref } from '@/theme/theme';

/** Pile de l'app Admin : onglets + hub « Plus » + écrans de détail empilés. */
export default function AdminLayout() {
  return (
    <ThemeProvider>
      <AdminStack />
    </ThemeProvider>
  );
}

function AdminStack() {
  const colors = useColors();
  const { mode } = useThemePref();
  return (
    <>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }} />
    </>
  );
}
