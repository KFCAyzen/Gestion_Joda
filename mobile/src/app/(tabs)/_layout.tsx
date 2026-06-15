import { Tabs } from 'expo-router';

import { BottomTabs } from '@/components/BottomTabs';

/** Zone authentifiée : 5 onglets (handoff). Barre flottante custom. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabs {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#100307' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="parcours" />
      <Tabs.Screen name="documents" />
      <Tabs.Screen name="payments" />
      <Tabs.Screen name="messages" />
    </Tabs>
  );
}
