import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useColors, useThemePref } from '@/theme/theme';

/** Pile de l'app Agent : onglets + écrans de détail empilés (slide-in). */
export default function StaffLayout() {
  return (
    <ThemeProvider>
      <StaffStack />
    </ThemeProvider>
  );
}

function StaffStack() {
  const colors = useColors();
  const { mode } = useThemePref();
  return (
    <>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgBase } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="student/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="rapports" />
      </Stack>
    </>
  );
}
