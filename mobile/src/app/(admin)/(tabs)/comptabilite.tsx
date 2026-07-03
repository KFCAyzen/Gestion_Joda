import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowDownLeft, ArrowUpRight, Check, Plus, TriangleAlert, X } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useAccountingLedger, useValidateSortie, useAddAccountingEntry } from '@/lib/hooks/use-admin';
import {
  Button,
  GlassCard,
  IconBox,
  ScreenBackground,
  ScreenHeader,
  SegFilter,
  useIconTint,
  useText,
  useToast,
} from '@/components/ui';
import { spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtCompact, fmtFCFA, shortDate } from '@/lib/format';

const SORTIE_CATS = ['loyer', 'salaires', 'fonctionnement', 'materiels', 'fournitures', 'transports', 'communication', 'partenaires', 'divers'];
const ENTREE_TYPES = ['revenus_divers', 'paiement_procedure', 'paiement_cours'];
const CAT_LABEL: Record<string, string> = {
  revenus_divers: 'Revenus divers',
  paiement_procedure: 'Procédure',
  paiement_cours: 'Cours',
  loyer: 'Loyer',
  salaires: 'Salaires',
  fonctionnement: 'Fonctionnement',
  materiels: 'Matériels',
  fournitures: 'Fournitures',
  transports: 'Transports',
  communication: 'Communication',
  partenaires: 'Partenaires',
  divers: 'Divers',
};

const VIEWS = [
  { id: 'jour', label: 'Jour' },
  { id: 'semaine', label: 'Sem.' },
  { id: 'mois', label: 'Mois' },
  { id: 'trimestre', label: 'Trim.' },
  { id: 'annee', label: 'Année' },
];

// Début (ms) de la période en cours pour la vue choisie. Sert à filtrer la
// liste et les flux affichés — le solde courant reste global (cf. carte).
function periodStartMs(view: string): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  switch (view) {
    case 'jour':
      return d.getTime();
    case 'semaine': {
      const s = new Date(d);
      s.setDate(d.getDate() - d.getDay());
      return s.getTime();
    }
    case 'mois':
      return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    case 'trimestre':
      return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime();
    case 'annee':
      return new Date(d.getFullYear(), 0, 1).getTime();
    default:
      return 0;
  }
}

export default function AdminCompta() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const T = useText();
  const iconTint = useIconTint();
  const { user } = useAuth();
  const { data, isLoading } = useAccountingLedger();
  const validateSortie = useValidateSortie(user ?? undefined);
  const addEntry = useAddAccountingEntry(user ?? undefined);
  const toast = useToast();

  const canWrite = user?.role === 'admin' || user?.role === 'super_admin';

  const [view, setView] = useState('mois');
  const [filter, setFilter] = useState('tout');
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState<{ kind: 'entree' | 'sortie'; montant: string; description: string; cat: string }>({
    kind: 'sortie',
    montant: '',
    description: '',
    cat: 'divers',
  });

  // Filtrage par période (le solde courant, lui, reste global).
  const periodRows = useMemo(() => {
    const start = periodStartMs(view);
    return (data?.rows ?? []).filter((r) => new Date(r.date).getTime() >= start);
  }, [data, view]);
  const periodEntrees = periodRows.filter((r) => r.kind === 'in').reduce((s, r) => s + r.montant, 0);
  const periodSorties = periodRows
    .filter((r) => r.kind === 'out' && !r.needsValidation)
    .reduce((s, r) => s + r.montant, 0);

  const rows = periodRows.filter((r) => filter === 'tout' || (filter === 'entrees' ? r.kind === 'in' : r.kind === 'out'));

  function openAdd(kind: 'entree' | 'sortie') {
    setForm({ kind, montant: '', description: '', cat: kind === 'entree' ? 'revenus_divers' : 'divers' });
    setAdd(true);
  }

  function setKind(kind: 'entree' | 'sortie') {
    setForm((f) => ({ ...f, kind, cat: kind === 'entree' ? 'revenus_divers' : 'divers' }));
  }

  async function saveAdd() {
    const montant = Number(form.montant);
    if (!montant || montant <= 0 || !form.description.trim()) {
      toast('Montant et description requis');
      return;
    }
    try {
      await addEntry.mutateAsync({
        kind: form.kind,
        montant,
        description: form.description.trim(),
        type: form.kind === 'entree' ? form.cat : undefined,
        categorie: form.kind === 'sortie' ? form.cat : undefined,
      });
      setAdd(false);
      toast('Écriture enregistrée ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de l’enregistrement');
    }
  }

  async function validate(id: string) {
    try {
      await validateSortie.mutateAsync(id);
      toast('Sortie validée ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de la validation');
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow="Livre comptable"
          title="Comptabilité"
          right={
            canWrite ? (
              <Pressable onPress={() => openAdd('sortie')} hitSlop={8} style={styles.addBtn}>
                <Plus size={19} color={colors.text} />
              </Pressable>
            ) : undefined
          }
        />

        {isLoading || !data ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 130, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            <SegFilter options={VIEWS} value={view} onChange={setView} />

            {/* Solde courant — trésorerie globale, stable quelle que soit la période */}
            <GlassCard variant="strong">
              <View style={styles.soldeHead}>
                <Text style={T.eyebrow}>Solde courant</Text>
                <Text style={styles.soldeHint}>Trésorerie globale</Text>
              </View>
              <Text style={[styles.solde, { color: data.solde >= 0 ? colors.mint : colors.crimsonVivid }]}>
                {data.solde >= 0 ? '+' : '−'}
                {fmtFCFA(Math.abs(data.solde))} <Text style={styles.cur}>FCFA</Text>
              </Text>
              <View style={styles.flowRow}>
                <View style={[styles.flowBox, styles.flowIn]}>
                  <View style={styles.flowHead}>
                    <ArrowDownLeft size={12} color={colors.mint} />
                    <Text style={[T.t3, { color: colors.mint }]}>Entrées {view === 'jour' ? 'jour' : 'période'}</Text>
                  </View>
                  <Text style={[styles.flowAmt, { color: colors.mint }]}>{fmtCompact(periodEntrees)}</Text>
                </View>
                <View style={[styles.flowBox, styles.flowOut]}>
                  <View style={styles.flowHead}>
                    <ArrowUpRight size={12} color={colors.crimsonVivid} />
                    <Text style={[T.t3, { color: colors.crimsonVivid }]}>Sorties {view === 'jour' ? 'jour' : 'période'}</Text>
                  </View>
                  <Text style={[styles.flowAmt, { color: colors.crimsonVivid }]}>{fmtCompact(periodSorties)}</Text>
                </View>
              </View>
            </GlassCard>

            {data.toValidate > 0 ? (
              <GlassCard style={styles.alertCard}>
                <IconBox tone="amber" size={40}>
                  <TriangleAlert size={18} color={iconTint.amber} />
                </IconBox>
                <View style={{ flex: 1 }}>
                  <Text style={T.t1}>{data.toValidate} sortie{data.toValidate > 1 ? 's' : ''} à valider</Text>
                  <Text style={T.t2}>Dépenses en attente de validation</Text>
                </View>
              </GlassCard>
            ) : null}

            <SegFilter
              options={[
                { id: 'tout', label: 'Tout' },
                { id: 'entrees', label: 'Entrées' },
                { id: 'sorties', label: 'Sorties' },
              ]}
              value={filter}
              onChange={setFilter}
            />

            <GlassCard>
              {rows.map((r, i) => (
                <View key={r.id} style={[styles.lrow, i < rows.length - 1 && styles.lrowBorder]}>
                  <View style={[styles.lk, r.kind === 'in' ? styles.lkIn : styles.lkOut]}>
                    {r.kind === 'in' ? <ArrowDownLeft size={15} color={colors.mint} /> : <ArrowUpRight size={15} color={colors.crimsonVivid} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[T.t1, { fontSize: 13.5 }]} numberOfLines={1}>{r.desc}</Text>
                    <Text style={T.t3}>
                      {shortDate(r.date)} · {CAT_LABEL[r.cat] ?? r.cat}
                      {r.needsValidation ? ' · à valider' : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[styles.la, { color: r.kind === 'in' ? colors.mint : colors.crimsonVivid }]}>
                      {r.kind === 'in' ? '+' : '−'}
                      {fmtFCFA(r.montant)}
                    </Text>
                    {r.needsValidation && canWrite ? (
                      <Pressable
                        onPress={() => validate(r.id)}
                        disabled={validateSortie.isPending}
                        style={styles.validateBtn}>
                        <Check size={12} color={colors.mint} strokeWidth={2.6} />
                        <Text style={styles.validateTxt}>Valider</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
              {!rows.length ? <Text style={styles.empty}>Aucune écriture.</Text> : null}
            </GlassCard>
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Modal ajout écriture — parité LivreComptable.handleAdd */}
      <Modal visible={add} transparent animationType="slide" onRequestClose={() => setAdd(false)}>
        <Pressable style={styles.overlay} onPress={() => setAdd(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grab} />
            <View style={styles.sheetHead}>
              <Text style={[T.t1, { fontSize: 17 }]}>Nouvelle écriture</Text>
              <Pressable style={styles.closeBtn} onPress={() => setAdd(false)}>
                <X size={18} color={colors.ink70} />
              </Pressable>
            </View>

            {/* Type d'écriture */}
            <View style={styles.kindRow}>
              {(['sortie', 'entree'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={[styles.kindPill, form.kind === k && (k === 'entree' ? styles.kindOnIn : styles.kindOnOut)]}>
                  {k === 'entree' ? (
                    <ArrowDownLeft size={14} color={form.kind === k ? colors.mint : colors.ink50} />
                  ) : (
                    <ArrowUpRight size={14} color={form.kind === k ? colors.crimsonVivid : colors.ink50} />
                  )}
                  <Text style={[styles.kindTxt, form.kind === k && { color: colors.text }]}>{k === 'entree' ? 'Entrée' : 'Sortie'}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[T.t3, styles.fieldLabel]}>Montant (FCFA)</Text>
            <TextInput
              value={form.montant}
              onChangeText={(v) => setForm((f) => ({ ...f, montant: v.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.ink35}
              style={styles.input}
            />

            <Text style={[T.t3, styles.fieldLabel]}>Description</Text>
            <TextInput
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              placeholder="Motif de l’écriture"
              placeholderTextColor={colors.ink35}
              style={styles.input}
            />

            <Text style={[T.t3, styles.fieldLabel]}>{form.kind === 'entree' ? 'Type' : 'Catégorie'}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 2 }}>
              {(form.kind === 'entree' ? ENTREE_TYPES : SORTIE_CATS).map((c) => (
                <Pressable key={c} onPress={() => setForm((f) => ({ ...f, cat: c }))} style={[styles.catChip, form.cat === c && styles.catChipOn]}>
                  <Text style={[styles.catChipTxt, form.cat === c && { color: '#fff' }]}>{CAT_LABEL[c] ?? c}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalBtns}>
              <Button label="Annuler" variant="glass" onPress={() => setAdd(false)} style={{ flex: 1 }} />
              <Button label="Enregistrer" loading={addEntry.isPending} onPress={saveAdd} style={{ flex: 1.4 }} />
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
    soldeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    soldeHint: { fontSize: 10.5, color: colors.ink50, fontWeight: '500' },
    solde: { fontSize: 32, fontWeight: '700', letterSpacing: -1, marginTop: 8 },
    cur: { fontSize: 13, color: colors.ink50, fontWeight: '400' },
    flowRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    flowBox: { flex: 1, borderRadius: 12, padding: 10, borderWidth: 1 },
    flowIn: { backgroundColor: 'rgba(52,217,168,0.10)', borderColor: 'rgba(52,217,168,0.25)' },
    flowOut: { backgroundColor: colors.redGlass, borderColor: colors.redLine },
    flowHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    flowAmt: { fontSize: 15, fontWeight: '700', marginTop: 4 },
    alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(251,191,36,0.32)' },
    lrow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    lrowBorder: { borderBottomWidth: 1, borderBottomColor: colors.glassLine },
    lk: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    lkIn: { backgroundColor: 'rgba(52,217,168,0.13)' },
    lkOut: { backgroundColor: colors.redGlass },
    la: { fontSize: 14, fontWeight: '700' },
    empty: { color: colors.ink35, fontSize: 13, textAlign: 'center', paddingVertical: 30 },

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
    validateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: 'rgba(52,217,168,0.13)',
      borderWidth: 1,
      borderColor: 'rgba(52,217,168,0.32)',
    },
    validateTxt: { color: colors.mint, fontSize: 11.5, fontWeight: '600' },

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
    kindRow: { flexDirection: 'row', gap: 9, marginBottom: 6 },
    kindPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
    },
    kindOnIn: { backgroundColor: 'rgba(52,217,168,0.10)', borderColor: 'rgba(52,217,168,0.32)' },
    kindOnOut: { backgroundColor: colors.redGlass, borderColor: colors.redLine },
    kindTxt: { color: colors.ink50, fontSize: 13.5, fontWeight: '600' },
    fieldLabel: { marginTop: 12, marginBottom: 6 },
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
    catChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.glass,
      borderWidth: 1,
      borderColor: colors.glassLine,
    },
    catChipOn: { backgroundColor: colors.crimsonDeep, borderColor: 'transparent' },
    catChipTxt: { color: colors.ink70, fontSize: 12.5, fontWeight: '500' },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 18 },
  });
