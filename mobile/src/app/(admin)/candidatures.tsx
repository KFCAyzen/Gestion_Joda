import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { ArrowRight, Building2, Check, ChevronRight, SlidersHorizontal, Undo2, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useCandidatures, useUniversities, useUpdateCandidature, type Candidature } from '@/lib/hooks/use-admin';
import type { DossierStatus } from '@/lib/hooks/use-student-portal';
import { DOSSIER_TRANSITIONS } from '@/lib/dossier-milestones';
import { Avatar, Button, Chip, GlassCard, ScreenBackground, ScreenHeader, SegFilter, useText, useToast } from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { relTime } from '@/lib/format';

const TODO: DossierStatus[] = ['document_manquant', 'en_attente', 'document_recu', 'en_attente_universite'];
const STATUS_LABEL: Record<string, string> = {
  document_manquant: 'Document manquant',
  en_attente: 'En attente',
  document_recu: 'Document reçu',
  en_cours: 'En cours',
  en_attente_universite: 'Attente université',
  admission_validee: 'Admission validée',
  admission_rejetee: 'Rejeté',
  visa_en_cours: 'Visa en cours',
  termine: 'Terminé',
};
const STATUS_CHIP: Record<string, 'live' | 'due' | 'done' | 'ghost'> = {
  document_manquant: 'due',
  en_attente: 'live',
  document_recu: 'live',
  en_attente_universite: 'due',
  en_cours: 'live',
  admission_validee: 'done',
  termine: 'done',
};

export default function AdminCandidatures() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const { user } = useAuth();
  const { data, isLoading } = useCandidatures();
  const { data: universities } = useUniversities();
  const updateCand = useUpdateCandidature(user ?? undefined);
  const toast = useToast();

  const canProcess = user?.role === 'super_admin';

  const [f, setF] = useState('todo');
  const [traiter, setTraiter] = useState<Candidature | null>(null);
  const list = (data ?? []).filter((c) => (f === 'todo' ? TODO.includes(c.status) : true));

  const REGRESS: DossierStatus[] = ['document_manquant', 'admission_rejetee', 'en_attente'];

  async function assignUniversity(c: Candidature, universityId: string) {
    try {
      await updateCand.mutateAsync({ dossierId: c.id, studentName: c.name, universityId });
      toast('Université affectée ✓');
      setTraiter((t) => (t ? { ...t, universityId } : t));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec');
    }
  }

  async function advanceStatus(c: Candidature, status: DossierStatus) {
    try {
      await updateCand.mutateAsync({ dossierId: c.id, studentName: c.name, status, fromStatus: c.status });
      toast('Statut mis à jour ✓');
      setTraiter(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec');
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow={`${(data ?? []).length} candidatures`} title="Candidatures" sm onBack={() => router.back()} />
        <SegFilter
          options={[
            { id: 'todo', label: 'À traiter', count: (data ?? []).filter((c) => TODO.includes(c.status)).length },
            { id: 'all', label: 'Toutes', count: (data ?? []).length },
          ]}
          value={f}
          onChange={setF}
          style={{ marginBottom: 12 }}
        />
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: 11 }} showsVerticalScrollIndicator={false}>
            {list.map((c) => (
              <Pressable key={c.id} onPress={() => router.navigate(`/(admin)/student/${c.studentId}` as Href)}>
                <GlassCard style={styles.card}>
                  <Avatar name={c.name} kind="student" size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={T.t1} numberOfLines={1}>{c.name}</Text>
                    <Text style={T.t2} numberOfLines={1}>{c.program}</Text>
                    <Text style={T.t3}>{relTime(c.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Chip variant={STATUS_CHIP[c.status] ?? 'ghost'} label={STATUS_LABEL[c.status] ?? c.status} />
                    {canProcess ? (
                      <Pressable onPress={() => setTraiter(c)} style={styles.traiterBtn}>
                        <SlidersHorizontal size={12} color={colors.crimsonVivid} />
                        <Text style={styles.traiterTxt}>Traiter</Text>
                      </Pressable>
                    ) : (
                      <ChevronRight size={16} color={colors.ink35} />
                    )}
                  </View>
                </GlassCard>
              </Pressable>
            ))}
            {!list.length ? <Text style={styles.empty}>Aucune candidature.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Bottom-sheet « Traiter » — parité ApplicationManagement (super_admin) */}
      <Modal visible={!!traiter} transparent animationType="slide" onRequestClose={() => setTraiter(null)}>
        <Pressable style={styles.overlay} onPress={() => setTraiter(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            {traiter ? (
              <>
                <View style={styles.sheetHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.t1, { fontSize: 17 }]} numberOfLines={1}>{traiter.name}</Text>
                    <Text style={T.t3} numberOfLines={1}>{traiter.program}</Text>
                  </View>
                  <Pressable style={styles.closeBtn} onPress={() => setTraiter(null)}>
                    <X size={18} color={colors.ink70} />
                  </Pressable>
                </View>

                {/* Université */}
                <Text style={[T.eyebrow, { marginBottom: 8 }]}>Université affectée</Text>
                <ScrollView style={{ maxHeight: 190 }} showsVerticalScrollIndicator={false}>
                  {(universities ?? []).map((u) => {
                    const on = traiter.universityId === u.id;
                    return (
                      <Pressable
                        key={u.id}
                        onPress={() => assignUniversity(traiter, u.id)}
                        disabled={updateCand.isPending}
                        style={[styles.uniRow, on && styles.uniRowOn]}>
                        <Building2 size={16} color={on ? colors.crimsonVivid : colors.ink50} />
                        <View style={{ flex: 1 }}>
                          <Text style={[T.t1, { fontSize: 13.5 }]} numberOfLines={1}>{u.nom}</Text>
                          {u.pays || u.ville ? (
                            <Text style={T.t3} numberOfLines={1}>{[u.ville, u.pays].filter(Boolean).join(', ')}</Text>
                          ) : null}
                        </View>
                        {on ? <Check size={16} color={colors.mint} strokeWidth={2.6} /> : null}
                      </Pressable>
                    );
                  })}
                  {!universities?.length ? <Text style={styles.empty}>Aucune université.</Text> : null}
                </ScrollView>

                {/* Statut */}
                <Text style={[T.eyebrow, { marginTop: 16, marginBottom: 8 }]}>Faire avancer</Text>
                {(DOSSIER_TRANSITIONS[traiter.status] ?? []).length ? (
                  <View style={{ gap: 9 }}>
                    {(DOSSIER_TRANSITIONS[traiter.status] ?? []).map((st) => {
                      const regress = REGRESS.includes(st);
                      return (
                        <Button
                          key={st}
                          label={STATUS_LABEL[st] ?? st}
                          size="sm"
                          variant={regress ? 'glass' : 'primary'}
                          loading={updateCand.isPending}
                          icon={regress ? <Undo2 size={15} color={colors.ink70} /> : <ArrowRight size={15} color="#fff" />}
                          onPress={() => advanceStatus(traiter, st)}
                        />
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[T.t2, { textAlign: 'center', paddingVertical: 6 }]}>Statut final — aucune transition.</Text>
                )}
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenBackground>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 40 },

    traiterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: colors.redGlass,
      borderWidth: 1,
      borderColor: colors.redLine,
    },
    traiterTxt: { color: colors.crimsonVivid, fontSize: 11.5, fontWeight: '600' },

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
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
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
    uniRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingVertical: 10,
      paddingHorizontal: 11,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      marginBottom: 6,
    },
    uniRowOn: { backgroundColor: colors.redGlass, borderColor: colors.redLine },
  });
