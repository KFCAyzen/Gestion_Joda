import { Stack } from 'expo-router';

/** Pile de l'app Admin : onglets + hub « Plus » + écrans de détail empilés. */
export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#100307' } }} />;
}
