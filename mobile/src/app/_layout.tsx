import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth, type UserRole } from '@/lib/auth-context';
import { ToastProvider } from '@/components/ui';
import { ThemeProvider } from '@/theme/theme';

/** Espace applicatif cible selon le rôle (cf. README handoff §Accès par rôle). */
function spaceForRole(role: UserRole): 'student' | 'staff' | 'admin' {
  if (role === 'student') return 'student';
  if (role === 'agent' || role === 'user') return 'staff';
  return 'admin'; // supervisor | admin | super_admin
}

/**
 * Routeur racine gardé par l'état d'auth (expo-router `Stack.Protected`).
 *   - pas de session            → sign-in
 *   - session + mustChange      → change-password (rien d'autre accessible)
 *   - session étudiant          → (tabs)   — portail étudiant
 *   - session agent/user        → (staff)  — app Agent
 *   - session admin/supervisor  → (admin)  — app Admin
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
  const ready = !!user && !mustChange;
  const space = user ? spaceForRole(user.role) : null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#100307' } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={mustChange}>
        <Stack.Screen name="change-password" />
      </Stack.Protected>
      <Stack.Protected guard={ready && space === 'student'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={ready && space === 'staff'}>
        <Stack.Screen name="(staff)" />
      </Stack.Protected>
      <Stack.Protected guard={ready && space === 'admin'}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Racine forcée en sombre : sign-in, app Agent et app Admin restent sombres.
          Le portail étudiant `(tabs)` remonte un provider gérant le mode clair. */}
      <ThemeProvider force="dark">
        <AuthProvider>
          <ToastProvider>
            <RootNavigator />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
