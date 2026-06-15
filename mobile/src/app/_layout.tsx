import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/auth-context';

/**
 * Routeur racine gardé par l'état d'auth (expo-router `Stack.Protected`).
 *   - pas de session            → sign-in
 *   - session + mustChange      → change-password (rien d'autre accessible)
 *   - session + ok              → index (accueil)
 */
function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#100307' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const mustChange = !!user && user.mustChangePassword;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#100307' } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={mustChange}>
        <Stack.Screen name="change-password" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !mustChange}>
        <Stack.Screen name="index" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
