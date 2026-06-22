import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAdminUsers, useToggleUserActive, type AppUser } from '@/lib/hooks/use-admin';
import { roleLabel } from '@/lib/access';
import type { UserRole } from '@/lib/auth-context';
import { Avatar, Chip, GlassCard, ScreenBackground, ScreenHeader, SegFilter, Toggle, useText, useToast } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export default function AdminUtilisateurs() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { data, isLoading } = useAdminUsers();
  const toggle = useToggleUserActive();
  const toast = useToast();
  const [tab, setTab] = useState('comptes');

  async function onToggle(u: AppUser) {
    try {
      await toggle.mutateAsync({ id: u.id, active: !u.active });
      toast('Statut du compte mis à jour');
    } catch {
      toast('Échec de la mise à jour');
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={`${(data ?? []).length} comptes`} title="Utilisateurs" sm onBack={() => router.back()} />
        <SegFilter
          options={[
            { id: 'comptes', label: 'Comptes' },
            { id: 'roles', label: 'Rôles' },
          ]}
          value={tab}
          onChange={setTab}
          style={{ marginBottom: 12 }}
        />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : tab === 'comptes' ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {(data ?? []).map((u) => (
              <GlassCard key={u.id} style={styles.card}>
                <Avatar name={u.name} kind="staff" size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={T.t1} numberOfLines={1}>{u.name}</Text>
                  <Text style={T.t3}>@{u.username}</Text>
                  <View style={styles.chipRow}>
                    <Chip variant="ghost" label={roleLabel(u.role as UserRole)} />
                    {u.mustChange ? <Chip variant="due" label="Doit changer MDP" /> : null}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={[T.t3, { color: u.active ? colors.mint : colors.ink50 }]}>{u.active ? 'Actif' : 'Inactif'}</Text>
                  <Toggle on={u.active} onPress={() => onToggle(u)} />
                </View>
              </GlassCard>
            ))}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {(['super_admin', 'admin', 'supervisor', 'agent', 'user'] as UserRole[]).map((r) => {
              const count = (data ?? []).filter((u) => u.role === r).length;
              return (
                <GlassCard key={r} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1}>{roleLabel(r)}</Text>
                    <Text style={T.t3}>{count} compte{count > 1 ? 's' : ''}</Text>
                  </View>
                  <Chip variant="ghost" label={r} />
                </GlassCard>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    chipRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  });
