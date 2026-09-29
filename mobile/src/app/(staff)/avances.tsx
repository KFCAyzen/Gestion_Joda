import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus, TriangleAlert } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import {
  BON_CATEGORIES,
  BON_CATEGORIE_LABEL,
  bonNumero,
  isEnRetard,
  useComptaParametres,
  useCreateBon,
  useJustifierBon,
  useMesBons,
  useUpdateBon,
  type BonCaisse,
  type PieceFile,
} from '@/lib/hooks/use-bons-caisse';
import { BonCard, MotifSheet, PiecePicker, Sheet, useBonStyles } from '@/components/BonsCaisseUi';
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
import { spacing } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtFCFA } from '@/lib/format';

// Motif d'une demande : le trajet et l'objet de la course, ou l'article et le fournisseur.
const MOTIF_MIN = 10;

/**
 * Mes avances (bons de caisse) — côté employé : demander une avance, confirmer
 * la réception de l'argent, la justifier avec la photo du reçu. Toute avance
 * non justifiée dans le délai bloque les nouvelles demandes.
 */
export default function MesAvances() {
  const colors = useColors();
  const styles = useBonStyles();
  const T = useText();
  const iconTint = useIconTint();
  const toast = useToast();
  const { user } = useAuth();
  const actor = user ?? undefined;

  const { data: bons = [], isLoading } = useMesBons(user?.id);
  const { data: params } = useComptaParametres();
  const create = useCreateBon(actor);
  const update = useUpdateBon(actor);
  const justifier = useJustifierBon(actor);

  const [tab, setTab] = useState('actifs');
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ montant: '', categorie: 'transports', motif: '' });
  const [justif, setJustif] = useState<{
    bon: BonCaisse;
    depense: string;
    piece: PieceFile | null;
    preuve: PieceFile | null;
  } | null>(null);
  const [annul, setAnnul] = useState<BonCaisse | null>(null);

  const retards = useMemo(() => bons.filter((b) => isEnRetard(b)), [bons]);
  const actifs = bons.filter((b) => ['demande', 'approuve', 'remis', 'justifie'].includes(b.status));
  const termines = bons.filter((b) => ['cloture', 'refuse', 'annule'].includes(b.status));
  const aJustifier = bons.filter((b) => b.status === 'remis').reduce((s, b) => s + b.montant, 0);
  const list = tab === 'actifs' ? actifs : termines;
  const bloque = retards.length > 0;

  function openNew() {
    if (bloque) {
      toast('Justifie d’abord ton avance en retard');
      return;
    }
    setForm({ montant: '', categorie: 'transports', motif: '' });
    setNewOpen(true);
  }

  async function submitNew() {
    const montant = Number(form.montant);
    if (!montant || montant <= 0) {
      toast('Indique le montant');
      return;
    }
    if (form.motif.trim().length < MOTIF_MIN) {
      toast('Motif trop vague : précise le trajet et l’objet, ou l’article et le fournisseur');
      return;
    }
    try {
      await create.mutateAsync({ montant, categorie: form.categorie, motif: form.motif.trim() });
      setNewOpen(false);
      toast('Demande envoyée ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de la demande');
    }
  }

  function confirmReception(bon: BonCaisse) {
    Alert.alert('Confirmer la réception', `As-tu bien reçu ${fmtFCFA(bon.montant)} F pour ${bonNumero(bon.numero)} ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, reçu',
        onPress: async () => {
          try {
            await update.mutateAsync({ bon, patch: { reception_confirmee_at: new Date().toISOString() }, log: 'réception confirmée' });
            toast('Réception confirmée ✓');
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Échec');
          }
        },
      },
    ]);
  }

  async function submitJustif() {
    if (!justif) return;
    const depense = Number(justif.depense.replace(/[^0-9]/g, ''));
    if (Number.isNaN(depense) || depense < 0 || depense > justif.bon.montant) {
      toast(`Montant dépensé entre 0 et ${fmtFCFA(justif.bon.montant)} F`);
      return;
    }
    if (depense > 0 && !justif.piece) {
      toast('Joins la photo du reçu ou de la fiche de course');
      return;
    }
    try {
      await justifier.mutateAsync({
        bon: justif.bon,
        montantDepense: depense,
        justificatif: justif.piece,
        preuveMission: justif.preuve,
      });
      setJustif(null);
      toast(depense < justif.bon.montant ? 'Justifié ✓ — rends la monnaie à la caisse' : 'Justifié ✓');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de la justification');
    }
  }

  async function submitAnnul(reason: string) {
    if (!annul) return;
    try {
      await update.mutateAsync({ bon: annul, patch: { status: 'annule', annulation_motif: reason }, log: `annulé — ${reason}` });
      setAnnul(null);
      toast('Demande annulée');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Échec de l’annulation');
    }
  }

  const depenseSaisie = justif ? Number(justif.depense.replace(/[^0-9]/g, '')) || 0 : 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={local.container} edges={['top', 'left', 'right']}>
        <ScreenHeader
          eyebrow="Caisse"
          title="Mes avances"
          sm
          onBack={() => router.back()}
          right={
            <Pressable onPress={openNew} hitSlop={8} style={[local.addBtn, { borderColor: colors.glassLine, backgroundColor: colors.glass2 }, bloque && { opacity: 0.4 }]}>
              <Plus size={19} color={colors.text} />
            </Pressable>
          }
        />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            {bloque ? (
              <GlassCard style={[local.alert, { borderColor: colors.redLine }]}>
                <IconBox tone="red" size={40}>
                  <TriangleAlert size={18} color={iconTint.red} />
                </IconBox>
                <View style={{ flex: 1 }}>
                  <Text style={T.t1}>{retards.length} avance{retards.length > 1 ? 's' : ''} en retard</Text>
                  <Text style={T.t2}>Justifie-la pour pouvoir faire une nouvelle demande.</Text>
                </View>
              </GlassCard>
            ) : null}

            <GlassCard variant="strong">
              <Text style={T.eyebrow}>À justifier</Text>
              <Text style={[local.big, { color: colors.text }]}>{fmtFCFA(aJustifier)} <Text style={T.t3}>F</Text></Text>
              <Text style={T.t3}>
                À justifier sous {params?.delai_justification_heures ?? 48} h après remise, avec la photo du reçu.
              </Text>
            </GlassCard>

            <Button label="Nouvelle demande d’avance" onPress={openNew} disabled={bloque} fullWidth />

            <SegFilter
              options={[
                { id: 'actifs', label: `En cours (${actifs.length})` },
                { id: 'termines', label: 'Terminés' },
              ]}
              value={tab}
              onChange={setTab}
            />

            {list.map((b) => (
              <BonCard key={b.id} bon={b}>
                {b.status === 'demande' || b.status === 'approuve' ? (
                  <Button label="Annuler" variant="glass" size="sm" onPress={() => setAnnul(b)} />
                ) : null}
                {b.status === 'remis' && !b.reception_confirmee_at ? (
                  <Button label={`J’ai reçu ${fmtFCFA(b.montant)} F`} variant="mint" size="sm" onPress={() => confirmReception(b)} />
                ) : null}
                {b.status === 'remis' ? (
                  <Button
                    label="Justifier"
                    size="sm"
                    onPress={() => setJustif({ bon: b, depense: String(b.montant), piece: null, preuve: null })}
                  />
                ) : null}
              </BonCard>
            ))}
            {!list.length ? <Text style={[local.empty, { color: colors.ink35 }]}>Aucune avance.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Nouvelle demande */}
      <Sheet visible={newOpen} title="Demande d’avance" onClose={() => setNewOpen(false)}>
        <Text style={[T.t3, styles.fieldLabel]}>Montant (FCFA)</Text>
        <TextInput
          value={form.montant}
          onChangeText={(v) => setForm((f) => ({ ...f, montant: v.replace(/[^0-9]/g, '') }))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.ink35}
          style={styles.input}
        />
        <Text style={[T.t3, styles.fieldLabel]}>Catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingVertical: 2 }}>
          {BON_CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setForm((f) => ({ ...f, categorie: c }))} style={[styles.catChip, form.categorie === c && styles.catChipOn]}>
              <Text style={[styles.catChipTxt, form.categorie === c && { color: '#fff' }]}>{BON_CATEGORIE_LABEL[c] ?? c}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={[T.t3, styles.fieldLabel]}>Motif précis</Text>
        <TextInput
          value={form.motif}
          onChangeText={(v) => setForm((f) => ({ ...f, motif: v }))}
          placeholder="Ex : Taxi Akwa → Bonanjo, dépôt dossier Mballa"
          placeholderTextColor={colors.ink35}
          multiline
          style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
        />
        <Text style={[T.t3, { marginTop: 8 }]}>
          Transport : trajet et objet de la course. Achat : article et fournisseur.
          {params ? ` À partir de ${fmtFCFA(params.seuil_approbation_admin)} F, un administrateur approuve.` : ''}
        </Text>
        <View style={styles.modalBtns}>
          <Button label="Annuler" variant="glass" onPress={() => setNewOpen(false)} style={{ flex: 1 }} />
          <Button label="Envoyer" loading={create.isPending} onPress={submitNew} style={{ flex: 1.4 }} />
        </View>
      </Sheet>

      {/* Justification */}
      <Sheet visible={!!justif} title={justif ? `Justifier ${bonNumero(justif.bon.numero)}` : 'Justifier'} onClose={() => setJustif(null)}>
        {justif ? (
          <>
            <Text style={T.t2}>
              Avance de {fmtFCFA(justif.bon.montant)} F — {justif.bon.motif}
            </Text>
            <Text style={[T.t3, styles.fieldLabel]}>Montant réellement dépensé (FCFA)</Text>
            <TextInput
              value={justif.depense}
              onChangeText={(v) => setJustif((j) => (j ? { ...j, depense: v.replace(/[^0-9]/g, '') } : j))}
              keyboardType="number-pad"
              placeholderTextColor={colors.ink35}
              style={styles.input}
            />
            {depenseSaisie < justif.bon.montant ? (
              <Text style={[T.t3, { marginTop: 6, color: colors.amber }]}>
                Monnaie à rendre à la caisse : {fmtFCFA(justif.bon.montant - depenseSaisie)} F
              </Text>
            ) : null}
            <Text style={[T.t3, styles.fieldLabel]}>Justificatif</Text>
            <PiecePicker
              label="Photographier le reçu ou la fiche de course"
              value={justif.piece}
              onChange={(piece) => setJustif((j) => (j ? { ...j, piece } : j))}
            />
            <Text style={[T.t3, styles.fieldLabel]}>Preuve de la mission (facultatif)</Text>
            <PiecePicker
              label="Ex : accusé de dépôt du document"
              value={justif.preuve}
              onChange={(preuve) => setJustif((j) => (j ? { ...j, preuve } : j))}
            />
            <Text style={[T.t3, { marginTop: 8 }]}>
              Sans reçu (moto-taxi) : photo d’une fiche de course signée, plus la preuve de la mission.
            </Text>
            <View style={styles.modalBtns}>
              <Button label="Annuler" variant="glass" onPress={() => setJustif(null)} style={{ flex: 1 }} />
              <Button label="Envoyer" loading={justifier.isPending} onPress={submitJustif} style={{ flex: 1.4 }} />
            </View>
          </>
        ) : null}
      </Sheet>

      <MotifSheet
        visible={!!annul}
        title="Annuler la demande"
        hint={annul ? `${bonNumero(annul.numero)} — ${fmtFCFA(annul.montant)} F` : undefined}
        confirmLabel="Annuler la demande"
        loading={update.isPending}
        onClose={() => setAnnul(null)}
        onSubmit={submitAnnul}
      />
    </ScreenBackground>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  addBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { fontSize: 28, fontWeight: '700', letterSpacing: -1, marginVertical: 4 },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 30 },
});
