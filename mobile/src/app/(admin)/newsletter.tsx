import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Mail, Send, Users, X } from 'lucide-react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useSendNewsletter, type NewsletterFilter } from '@/lib/hooks/use-admin';
import { Button, GlassCard, IconBox, ListCard, ListRow, ScreenBackground, ScreenHeader, useIconTint, useText, useToast } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const NL_FILTERS: { id: NewsletterFilter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'dossier_cours', label: 'Dossier en cours' },
  { id: 'dossier_attente', label: 'En attente' },
  { id: 'payment_late', label: 'Paiements en retard' },
  { id: 'langue_mandarin', label: 'Mandarin' },
  { id: 'langue_anglais', label: 'Anglais' },
];

function useAudiences() {
  return useQuery({
    queryKey: ['admin', 'newsletter', 'audiences'],
    queryFn: async () => {
      const [all, enCours, retards] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('dossier_bourses').select('id', { count: 'exact', head: true }).in('status', ['en_cours', 'en_attente_universite', 'visa_en_cours']),
        supabase.from('payments').select('student_id').eq('status', 'retard'),
      ]);
      const lateStudents = new Set(((retards.data as { student_id: string }[]) ?? []).map((p) => p.student_id)).size;
      return [
        { label: 'Tous les étudiants', count: all.count ?? 0 },
        { label: 'Dossier en cours', count: enCours.count ?? 0 },
        { label: 'Paiements en retard', count: lateStudents },
      ];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export default function AdminNewsletter() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { user } = useAuth();
  const { data, isLoading } = useAudiences();
  const send = useSendNewsletter();
  const toast = useToast();

  const canSend = user?.role === 'admin' || user?.role === 'super_admin';
  const [compose, setCompose] = useState(false);
  const [form, setForm] = useState<{ subject: string; message: string; filter: NewsletterFilter }>({ subject: '', message: '', filter: 'all' });

  async function onSend() {
    if (!form.subject.trim() || !form.message.trim()) {
      toast('Objet et message requis');
      return;
    }
    try {
      const r = await send.mutateAsync({ subject: form.subject.trim(), message: form.message.trim(), filter: form.filter });
      setCompose(false);
      setForm({ subject: '', message: '', filter: 'all' });
      toast(`${r.sent} e-mail(s) envoyé(s) ✓`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de l’envoi');
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Communication" title="Newsletter" sm onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
          <GlassCard variant="strong" style={styles.compose}>
            <IconBox tone="purple" size={48}>
              <Mail size={22} color={iconTint.purple} />
            </IconBox>
            <View style={{ flex: 1 }}>
              <Text style={T.t1}>Composer une campagne</Text>
              <Text style={T.t2}>Push ou e-mail vers une audience ciblée.</Text>
            </View>
          </GlassCard>

          <Button
            label="Nouvelle campagne"
            icon={<Send size={16} color="#fff" />}
            onPress={() => (canSend ? setCompose(true) : toast('Réservé aux administrateurs'))}
          />

          <Text style={styles.section}>Audiences</Text>
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : (
            <ListCard>
              {(data ?? []).map((a, i, arr) => (
                <ListRow key={a.label} last={i === arr.length - 1}>
                  <IconBox tone="blue" size={38}>
                    <Users size={17} color={iconTint.blue} />
                  </IconBox>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.t1, { fontSize: 14 }]}>{a.label}</Text>
                  </View>
                  <Text style={styles.count}>{a.count}</Text>
                </ListRow>
              ))}
            </ListCard>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modal composition — parité NewsletterPage via /api/newsletter/send */}
      <Modal visible={compose} transparent animationType="slide" onRequestClose={() => setCompose(false)}>
        <Pressable style={styles.overlay} onPress={() => setCompose(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={[T.t1, { fontSize: 17 }]}>Nouvelle campagne</Text>
              <Pressable style={styles.closeBtn} onPress={() => setCompose(false)}>
                <X size={18} color={colors.ink70} />
              </Pressable>
            </View>

            <Text style={[T.t3, { marginBottom: 6 }]}>Objet</Text>
            <TextInput
              value={form.subject}
              onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))}
              placeholder="Objet de l’e-mail"
              placeholderTextColor={colors.ink35}
              style={styles.input}
            />

            <Text style={[T.t3, { marginBottom: 6, marginTop: 12 }]}>Message</Text>
            <TextInput
              value={form.message}
              onChangeText={(v) => setForm((f) => ({ ...f, message: v }))}
              placeholder="Contenu du message…"
              placeholderTextColor={colors.ink35}
              multiline
              style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
            />

            <Text style={[T.t3, { marginBottom: 8, marginTop: 12 }]}>Audience</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
              {NL_FILTERS.map((opt) => (
                <Pressable key={opt.id} onPress={() => setForm((f) => ({ ...f, filter: opt.id }))} style={[styles.chip, form.filter === opt.id && styles.chipOn]}>
                  <Text style={[styles.chipTxt, form.filter === opt.id && { color: '#fff' }]}>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalBtns}>
              <Button label="Annuler" variant="glass" onPress={() => setCompose(false)} style={{ flex: 1 }} />
              <Button label="Envoyer" loading={send.isPending} icon={<Send size={15} color="#fff" />} onPress={onSend} style={{ flex: 1.4 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    compose: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    section: { color: colors.ink70, fontSize: 12.5, fontWeight: '700', marginTop: 4 },
    count: { color: colors.text, fontSize: 16, fontWeight: '700' },

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
    input: {
      backgroundColor: colors.glass2,
      borderWidth: 1,
      borderColor: colors.glassLine,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      color: colors.text,
      fontSize: 14.5,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
    },
    chipOn: { backgroundColor: colors.crimsonDeep, borderColor: 'transparent' },
    chipTxt: { color: colors.ink70, fontSize: 12.5, fontWeight: '500' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 18 },
  });
