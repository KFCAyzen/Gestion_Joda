import { Stack } from 'expo-router';

/** Pile de l'app Agent : onglets + écrans de détail empilés (slide-in). */
export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#100307' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="student/[id]" />
      <Stack.Screen name="chat/[id]" />
      <Stack.Screen name="rapports" />
    </Stack>
  );
}
