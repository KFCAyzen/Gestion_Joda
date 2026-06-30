import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { CheckCircle2, ChevronRight, Plus, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useStaffDossiers, useCreateStudent } from '@/lib/hooks/use-staff';
import { Button, Avatar, Chip, GlassCard, ProgressBar, ScreenBackground, ScreenHeader, SearchBar, useText, useToast } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const CHOIX = [
  { id: 'procedure_seule', label: 'Procédure seule' },
  { id: 'procedure_cours', label: 'Procédure + cours' },
  { id: 'cours_seuls', label: 'Cours seuls' },
];
const LANGUES = ['mandarin', 'anglais'];

export default function AdminEtudiants() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { user } = useAuth();
  const { data, isLoading } = useStaffDossiers();
  const createStudent = useCreateStudent(user ?? undefined);
  const toast = useToast();
  const [q, setQ] = useState('');
  const list = (data ?? []).filter((d) => !q || `${d.name} ${d.program}`.toLowerCase().includes(q.toLowerCase()));

  const canCreate = ['agent', 'supervisor', 'admin', 'super_admin'].includes(user?.role ?? '');

  const emptyForm = { prenom: '', nom: '', email: '', telephone: '', age: '', local: true, nationalite: '', niveau: '', filiere: '', langue: 'mandarin', choix: 'procedure_seule' };
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);

  function openCreate() {
    setForm(emptyForm);
    setCreated(null);
    setModal(true);
  }

  async function save() {
    const age = parseInt(form.age || '0', 10) || 0;
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) {
      toast('Prénom, nom et email requis');
      return;
    }
    if (age <= 0) {
      toast('Âge invalide');
      return;
    }
    try {
      const creds = await createStudent.mutateAsync({
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        telephone: form.telephone,
        age,
        nationalite: form.local ? 'Camerounais' : form.nationalite,
        niveau: form.niveau,
        filiere: form.filiere,
        langue: form.choix === 'procedure_seule' ? undefined : form.langue,
        choix: form.choix,
      });
      setCreated(creds);
      toast('Étudiant créé ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de la création');
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow={`${(data ?? []).length} étudiants`}
          title="Étudiants"
          sm
          onBack={() => router.back()}
          right={
            canCreate ? (
              <Pressable onPress={openCreate} hitSlop={8} style={styles.addBtn}>
                <Plus size={19} color={colors.text} />
              </Pressable>
            ) : undefined
          }
        />
        <SearchBar value={q} onChange={setQ} placeholder="Rechercher un étudiant…" style={{ marginBottom: 12 }} />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {list.map((d) => (
              <Pressable key={d.id} onPress={() => router.navigate(`/(admin)/student/${d.id}` as Href)}>
                <GlassCard style={styles.card}>
                  <Avatar name={d.name} kind="student" size={44} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={T.t1} numberOfLines={1}>{d.name}</Text>
                    <Text style={T.t2} numberOfLines={1}>{d.program}</Text>
                    <ProgressBar pct={d.pct} />
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Chip variant={d.chip} label={`${d.step}/6`} />
                    <ChevronRight size={16} color={colors.ink35} />
                  </View>
                </GlassCard>
              </Pressable>
            ))}
            {!list.length ? <Text style={styles.empty}>Aucun étudiant.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Modal création étudiant — parité StudentManagement.handleSubmit */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            {created ? (
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <CheckCircle2 size={42} color={colors.mint} />
                <Text style={[T.t1, { fontSize: 17, marginTop: 10 }]}>Compte créé</Text>
                <Text style={[T.t3, { textAlign: 'center', marginTop: 4 }]}>Communiquez ces identifiants à l’étudiant.</Text>
                <View style={styles.credBox}>
                  <View style={styles.credRow}>
                    <Text style={T.t3}>Identifiant</Text>
                    <Text style={styles.credVal}>{created.username}</Text>
                  </View>
                  <View style={[styles.credRow, { borderTopWidth: 1, borderTopColor: colors.glassLine }]}>
                    <Text style={T.t3}>Mot de passe</Text>
                    <Text style={[styles.credVal, { color: colors.crimsonVivid }]}>{created.password}</Text>
                  </View>
                </View>
                <Button label="Terminé" onPress={() => setModal(false)} style={{ alignSelf: 'stretch', marginTop: 16 }} />
              </View>
            ) : (
              <>
                <View style={styles.sheetHead}>
                  <Text style={[T.t1, { fontSize: 17 }]}>Nouvel étudiant</Text>
                  <Pressable style={styles.closeBtn} onPress={() => setModal(false)}>
                    <X size={18} color={colors.ink70} />
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}><SField label="Prénom" value={form.prenom} onChange={(v) => setForm((f) => ({ ...f, prenom: v }))} colors={colors} T={T} /></View>
                    <View style={{ flex: 1 }}><SField label="Nom" value={form.nom} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} colors={colors} T={T} /></View>
                  </View>
                  <SField label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} colors={colors} T={T} keyboardType="email-address" />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1.4 }}><SField label="Téléphone" value={form.telephone} onChange={(v) => setForm((f) => ({ ...f, telephone: v }))} colors={colors} T={T} keyboardType="phone-pad" /></View>
                    <View style={{ flex: 1 }}><SField label="Âge" value={form.age} onChange={(v) => setForm((f) => ({ ...f, age: v.replace(/[^0-9]/g, '') }))} colors={colors} T={T} keyboardType="number-pad" /></View>
                  </View>

                  <Pressable style={styles.localRow} onPress={() => setForm((f) => ({ ...f, local: !f.local }))}>
                    <Text style={T.t1}>Étudiant local (Camerounais)</Text>
                    <View style={[styles.checkbox, form.local && styles.checkboxOn]}>{form.local ? <Text style={styles.checkMark}>✓</Text> : null}</View>
                  </Pressable>
                  {!form.local ? <SField label="Nationalité" value={form.nationalite} onChange={(v) => setForm((f) => ({ ...f, nationalite: v }))} colors={colors} T={T} /> : null}

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}><SField label="Niveau" value={form.niveau} onChange={(v) => setForm((f) => ({ ...f, niveau: v }))} colors={colors} T={T} /></View>
                    <View style={{ flex: 1 }}><SField label="Filière" value={form.filiere} onChange={(v) => setForm((f) => ({ ...f, filiere: v }))} colors={colors} T={T} /></View>
                  </View>

                  <Text style={[T.t3, { marginBottom: 8 }]}>Service</Text>
                  <View style={styles.chipWrap}>
                    {CHOIX.map((c) => (
                      <Pressable key={c.id} onPress={() => setForm((f) => ({ ...f, choix: c.id }))} style={[styles.chip, form.choix === c.id && styles.chipOn]}>
                        <Text style={[styles.chipTxt, form.choix === c.id && { color: '#fff' }]}>{c.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {form.choix !== 'procedure_seule' ? (
                    <>
                      <Text style={[T.t3, { marginBottom: 8, marginTop: 12 }]}>Langue</Text>
                      <View style={styles.chipWrap}>
                        {LANGUES.map((l) => (
                          <Pressable key={l} onPress={() => setForm((f) => ({ ...f, langue: l }))} style={[styles.chip, form.langue === l && styles.chipOn]}>
                            <Text style={[styles.chipTxt, { textTransform: 'capitalize' }, form.langue === l && { color: '#fff' }]}>{l}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : null}
                </ScrollView>
                <View style={styles.modalBtns}>
                  <Button label="Annuler" variant="glass" onPress={() => setModal(false)} style={{ flex: 1 }} />
                  <Button label="Créer le compte" loading={createStudent.isPending} onPress={save} style={{ flex: 1.4 }} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

function SField({
  label,
  value,
  onChange,
  colors,
  T,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: Palette;
  T: ReturnType<typeof useText>;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[T.t3, { marginBottom: 6 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
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
    localRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
      marginBottom: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: colors.glassLine2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: colors.mint, borderColor: 'transparent' },
    checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
    },
    chipOn: { backgroundColor: colors.crimsonDeep, borderColor: 'transparent' },
    chipTxt: { color: colors.ink70, fontSize: 12.5, fontWeight: '500' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    credBox: {
      alignSelf: 'stretch',
      marginTop: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.glassLine,
      backgroundColor: colors.glass2,
    },
    credRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
    credVal: { color: colors.text, fontSize: 15, fontWeight: '700' },
  });
