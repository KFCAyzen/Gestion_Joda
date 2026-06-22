import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BottomTabs } from '@/components/BottomTabs';
import { ThemeProvider, useColors, useThemePref } from '@/theme/theme';

/**
 * Zone authentifiée étudiant : 5 onglets (handoff). Barre flottante custom.
 * Ce sous-arbre monte un `ThemeProvider` *géré* (sans `force`) pour activer
 * le mode clair/sombre selon la préférence — seul le portail étudiant est concerné.
 */
export default function TabsLayout() {
  return (
    <ThemeProvider>
      <TabsInner />
    </ThemeProvider>
  );
}

function TabsInner() {
  const colors = useColors();
  const { mode } = useThemePref();
  return (
    <>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <Tabs
        tabBar={(props) => <BottomTabs {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgBase } }}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="parcours" />
        <Tabs.Screen name="documents" />
        <Tabs.Screen name="payments" />
        <Tabs.Screen name="messages" />
      </Tabs>
    </>
  );
}
