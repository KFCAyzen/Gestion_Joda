import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KeyRound, Plus, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useAdminUsers, useToggleUserActive, useResetPassword, useCreateUser, type AppUser } from '@/lib/hooks/use-admin';
import { roleLabel } from '@/lib/access';
import type { UserRole } from '@/lib/auth-context';
import { Avatar, Button, Chip, GlassCard, ScreenBackground, ScreenHeader, SegFilter, Toggle, useText, useToast } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export default function AdminUtilisateurs() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { user } = useAuth();
  const { data, isLoading } = useAdminUsers();
  const toggle = useToggleUserActive();
  const resetPwd = useResetPassword();
  const createUser = useCreateUser();
  const toast = useToast();
  const [tab, setTab] = useState('comptes');
  const [create, setCreate] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'super_admin';
  const creatableRoles: UserRole[] = user?.role === 'super_admin'
    ? ['agent', 'supervisor', 'admin', 'super_admin']
    : ['agent', 'supervisor', 'admin'];

  const emptyForm = { name: '', email: '', username: '', password: '', role: 'agent' as UserRole };
  const [form, setForm] = useState(emptyForm);

  async function onToggle(u: AppUser) {
    try {
      await toggle.mutateAsync({ id: u.id, active: !u.active });
      toast('Statut du compte mis à jour');
    } catch {
      toast('Échec de la mise à jour');
    }
  }

  function confirmReset(u: AppUser) {
    Alert.alert('Réinitialiser le mot de passe', `Générer un mot de passe temporaire pour ${u.name} et l’envoyer par email ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Réinitialiser',
        onPress: async () => {
          try {
            await resetPwd.mutateAsync(u.id);
            toast('Mot de passe réinitialisé ✓');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Échec');
          }
        },
      },
    ]);
  }

  async function saveCreate() {
    if (!form.name.trim() || !form.email.trim() || form.username.trim().length < 3 || form.password.length < 8) {
      toast('Nom, email, identifiant (3+) et mot de passe (8+) requis');
      return;
    }
    try {
      await createUser.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
        role: form.role,
      });
      setCreate(false);
      setForm(emptyForm);
      toast('Compte créé ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de la création');
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow={`${(data ?? []).length} comptes`}
          title="Utilisateurs"
          sm
          onBack={() => router.back()}
          right={
            canManage ? (
              <Pressable onPress={() => { setForm(emptyForm); setCreate(true); }} hitSlop={8} style={styles.addBtn}>
                <Plus size={19} color={colors.text} />
              </Pressable>
            ) : undefined
          }
        />
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
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Text style={[T.t3, { color: u.active ? colors.mint : colors.ink50 }]}>{u.active ? 'Actif' : 'Inactif'}</Text>
                  <Toggle on={u.active} onPress={() => onToggle(u)} />
                  {canManage ? (
                    <Pressable onPress={() => confirmReset(u)} style={styles.resetBtn}>
                      <KeyRound size={11} color={colors.amber} />
                      <Text style={styles.resetTxt}>Reset MDP</Text>
                    </Pressable>
                  ) : null}
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

      {/* Modal création de compte — parité UserManagement via /api/create-user */}
      <Modal visible={create} transparent animationType="slide" onRequestClose={() => setCreate(false)}>
        <Pressable style={styles.overlay} onPress={() => setCreate(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={[T.t1, { fontSize: 17 }]}>Nouveau compte</Text>
              <Pressable style={styles.closeBtn} onPress={() => setCreate(false)}>
                <X size={18} color={colors.ink70} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <UField label="Nom complet" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} colors={colors} T={T} />
              <UField label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} colors={colors} T={T} keyboardType="email-address" />
              <UField label="Identifiant" value={form.username} onChange={(v) => setForm((f) => ({ ...f, username: v }))} colors={colors} T={T} autoCapitalize="none" />
              <UField label="Mot de passe temporaire" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} colors={colors} T={T} secureTextEntry />

              <Text style={[T.t3, { marginBottom: 8, marginTop: 4 }]}>Rôle</Text>
              <View style={styles.roleRow}>
                {creatableRoles.map((r) => (
                  <Pressable key={r} onPress={() => setForm((f) => ({ ...f, role: r }))} style={[styles.roleChip, form.role === r && styles.roleChipOn]}>
                    <Text style={[styles.roleChipTxt, form.role === r && { color: '#fff' }]}>{roleLabel(r)}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalBtns}>
              <Button label="Annuler" variant="glass" onPress={() => setCreate(false)} style={{ flex: 1 }} />
              <Button label="Créer le compte" loading={createUser.isPending} onPress={saveCreate} style={{ flex: 1.4 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

function UField({
  label,
  value,
  onChange,
  colors,
  T,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: Palette;
  T: ReturnType<typeof useText>;
  keyboardType?: 'default' | 'email-address';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[T.t3, { marginBottom: 6 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        placeholderTextColor={colors.ink35}
        style={{
          backgroundColor: colors.glass2,
          borderWidth: 1,
          borderColor: colors.glassLine,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 11,
          color: colors.text,
          fontSize: 14.5,
        }}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    chipRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },

    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.glassLine,
      backgroundColor: colors.glass2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(251,191,36,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(251,191,36,0.30)',
    },
    resetTxt: { color: colors.amber, fontSize: 10.5, fontWeight: '600' },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      borderWidth: 1,
      borderColor: colors.glassLine2,
      padding: 18,
      paddingBottom: 34,
    },
    grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.glassLine2, marginBottom: 14 },
    sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.glass2,
      borderWidth: 1,
      borderColor: colors.glassLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    roleChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
    },
    roleChipOn: { backgroundColor: colors.crimsonDeep, borderColor: 'transparent' },
    roleChipTxt: { color: colors.ink70, fontSize: 12.5, fontWeight: '500' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  });
