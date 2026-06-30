import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MapPin, Plus, Trash2, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import {
  useUniversities,
  useUpsertUniversity,
  useToggleUniversity,
  useDeleteUniversity,
  flagFor,
  type University,
} from '@/lib/hooks/use-admin';
import { Button, Chip, GlassCard, ScreenBackground, ScreenHeader, SearchBar, Toggle, useText, useToast } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export default function AdminUniversites() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { user } = useAuth();
  const { data, isLoading } = useUniversities();
  const upsert = useUpsertUniversity(user ?? undefined);
  const toggleUni = useToggleUniversity();
  const removeUni = useDeleteUniversity(user ?? undefined);
  const toast = useToast();

  const canManage = user?.role === 'admin' || user?.role === 'super_admin';

  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nom: '', pays: '', ville: '', programme: '', active: true });

  const list = (data ?? []).filter((u) => !q || `${u.nom} ${u.pays ?? ''} ${u.ville ?? ''}`.toLowerCase().includes(q.toLowerCase()));

  function openCreate() {
    setEditingId(null);
    setForm({ nom: '', pays: '', ville: '', programme: '', active: true });
    setModal(true);
  }

  function openEdit(u: University) {
    setEditingId(u.id);
    setForm({ nom: u.nom, pays: u.pays ?? '', ville: u.ville ?? '', programme: u.programme ?? '', active: u.active });
    setModal(true);
  }

  async function save() {
    if (!form.nom.trim()) {
      toast('Le nom est requis');
      return;
    }
    try {
      await upsert.mutateAsync({ id: editingId ?? undefined, ...form });
      setModal(false);
      toast(editingId ? 'Université modifiée ✓' : 'Université créée ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de l’enregistrement');
    }
  }

  async function quickToggle(u: University) {
    try {
      await toggleUni.mutateAsync({ id: u.id, active: !u.active });
      toast(u.active ? 'Université suspendue' : 'Université activée');
    } catch {
      toast('Échec de la mise à jour');
    }
  }

  function confirmDelete() {
    if (!editingId) return;
    Alert.alert('Supprimer l’université', `Supprimer définitivement « ${form.nom} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeUni.mutateAsync({ id: editingId, nom: form.nom });
            setModal(false);
            toast('Université supprimée');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Échec de la suppression');
          }
        },
      },
    ]);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow={`${(data ?? []).length} partenaires`}
          title="Universités"
          sm
          onBack={() => router.back()}
          right={
            canManage ? (
              <Pressable onPress={openCreate} hitSlop={8} style={styles.addBtn}>
                <Plus size={19} color={colors.text} />
              </Pressable>
            ) : undefined
          }
        />
        <SearchBar value={q} onChange={setQ} placeholder="Rechercher une université…" style={{ marginBottom: 12 }} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {list.map((u) => (
              <Pressable key={u.id} onPress={() => (canManage ? openEdit(u) : undefined)} disabled={!canManage}>
                <GlassCard style={styles.card}>
                  <Text style={styles.flag}>{flagFor(u.pays)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{u.nom}</Text>
                    <View style={styles.metaRow}>
                      <MapPin size={12} color={colors.ink50} />
                      <Text style={T.t3}>{[u.ville, u.pays].filter(Boolean).join(', ') || '—'}</Text>
                    </View>
                    {u.programme ? <Text style={T.t3} numberOfLines={1}>{u.programme}</Text> : null}
                  </View>
                  {canManage ? (
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={[T.t3, { color: u.active ? colors.mint : colors.ink50 }]}>{u.active ? 'Actif' : 'Suspendu'}</Text>
                      <Toggle on={u.active} onPress={() => quickToggle(u)} />
                    </View>
                  ) : (
                    <Chip variant={u.active ? 'done' : 'ghost'} label={u.active ? 'Actif' : 'Suspendu'} />
                  )}
                </GlassCard>
              </Pressable>
            ))}
            {!list.length ? <Text style={styles.empty}>Aucune université.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Modal création / édition — parité UniversityManagement */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={[T.t1, { fontSize: 17 }]}>{editingId ? 'Modifier l’université' : 'Nouvelle université'}</Text>
              <Pressable style={styles.closeBtn} onPress={() => setModal(false)}>
                <X size={18} color={colors.ink70} />
              </Pressable>
            </View>

            <UField label="Nom" value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} colors={colors} T={T} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <UField label="Pays" value={form.pays} onChange={(v) => setForm((f) => ({ ...f, pays: v }))} colors={colors} T={T} />
              </View>
              <View style={{ flex: 1 }}>
                <UField label="Ville" value={form.ville} onChange={(v) => setForm((f) => ({ ...f, ville: v }))} colors={colors} T={T} />
              </View>
            </View>
            <UField label="Programmes" value={form.programme} onChange={(v) => setForm((f) => ({ ...f, programme: v }))} colors={colors} T={T} />

            <Pressable style={styles.activeRow} onPress={() => setForm((f) => ({ ...f, active: !f.active }))}>
              <Text style={T.t1}>Partenaire actif</Text>
              <Toggle on={form.active} onPress={() => setForm((f) => ({ ...f, active: !f.active }))} />
            </Pressable>

            <View style={styles.modalBtns}>
              {editingId ? (
                <Pressable onPress={confirmDelete} style={styles.delBtn}>
                  <Trash2 size={17} color={colors.crimsonVivid} />
                </Pressable>
              ) : null}
              <Button label="Annuler" variant="glass" onPress={() => setModal(false)} style={{ flex: 1 }} />
              <Button label={editingId ? 'Enregistrer' : 'Créer'} loading={upsert.isPending} onPress={save} style={{ flex: 1.4 }} />
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: Palette;
  T: ReturnType<typeof useText>;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[T.t3, { marginBottom: 6 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
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
    flag: { fontSize: 30 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },

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
    activeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
      marginBottom: 4,
    },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },
    delBtn: {
      width: 46,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.redGlass,
      borderWidth: 1,
      borderColor: colors.redLine,
    },
  });
