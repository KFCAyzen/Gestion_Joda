import { Tabs } from 'expo-router';

import { AdminTabs } from '@/components/AdminTabs';
import { useColors } from '@/theme/theme';

/** Zone Admin : 4 onglets (Bord · Perfs · Compta · Plus). */
export default function AdminTabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      tabBar={(props) => <AdminTabs {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgBase } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="performances" />
      <Tabs.Screen name="comptabilite" />
      <Tabs.Screen name="plus" />
    </Tabs>
  );
}
