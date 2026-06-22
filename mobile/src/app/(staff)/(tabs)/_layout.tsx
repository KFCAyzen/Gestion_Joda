import { Tabs } from 'expo-router';

import { StaffTabs } from '@/components/StaffTabs';
import { useColors } from '@/theme/theme';

/** Zone Agent : 5 onglets (Accueil · Dossiers · Paiements · Messages · Profil). */
export default function StaffTabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      tabBar={(props) => <StaffTabs {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgBase } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="dossiers" />
      <Tabs.Screen name="paiements" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
