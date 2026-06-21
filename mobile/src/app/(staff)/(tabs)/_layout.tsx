import { Tabs } from 'expo-router';

import { StaffTabs } from '@/components/StaffTabs';

/** Zone Agent : 5 onglets (Accueil · Dossiers · Paiements · Messages · Profil). */
export default function StaffTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <StaffTabs {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#100307' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="dossiers" />
      <Tabs.Screen name="paiements" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
