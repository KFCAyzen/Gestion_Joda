import { Tabs } from 'expo-router';

import { AdminTabs } from '@/components/AdminTabs';

/** Zone Admin : 4 onglets (Bord · Perfs · Compta · Plus). */
export default function AdminTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AdminTabs {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#100307' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="performances" />
      <Tabs.Screen name="comptabilite" />
      <Tabs.Screen name="plus" />
    </Tabs>
  );
}
