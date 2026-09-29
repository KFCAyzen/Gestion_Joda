import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import {
  bonNumero,
  isEnRetard,
  positionGrille,
  useBonsATraiter,
  useComptaParametres,
  useGrilleTransport,
  useUpdateBon,
  type BonCaisse,
} from '@/lib/hooks/use-bons-caisse';
import { BonCard, MotifSheet, PieceView, Sheet, useBonStyles } from '@/components/BonsCaisseUi';
import { Button, ScreenBackground, ScreenHeader, SegFilter, useText, useToast } from '@/components/ui';
import { spacing } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { fmtFCFA } from '@/lib/format';

/**
 * Bons de caisse — côté administration : décider, remettre l'argent, contrôler
 * la justification. La base refuse qu'on traite son propre bon.
 */
export default function AdminBonsCaisse() {
  const colors = useColors();
  const styles = useBonStyles();
  const T = useText();
  const toast = useToast();
  const { user } = useAuth();
  const { data: bons = [], isLoading } = useBonsATraiter();
  const { data: params } = useComptaParametres();
  const { data: grille } = useGrilleTransport();
  const update = useUpdateBon(user ?? undefined);

  const [tab, setTab] = useState('demande');
  const [controle, setControle] = useState<BonCaisse | null>(null);
  const [motif, setMotif] = useState<{ bon: BonCaisse; kind: 'refus' | 'rejet' } | null>(null);

  const by = (s: BonCaisse['status']) => bons.filter((b) => b.status === s);
  const enCours = by('remis').sort((a, b) => Number(isEnRetard(b)) - Number(isEnRetard(a)));
  const lists: Record<string, BonCaisse[]> = {
    demande: by('demande'),
    approuve: by('approuve'),
    justifie: by('justifie'),
    remis: enCours,
  };
  const list = lists[tab] ?? [];
  const isMine = (b: BonCaisse) => !!user?.id && b.demandeur_id === user.id;

  async function run(bon: BonCaisse, patch: Record<string, unknown>, log: string, done: string) {
    try {
      await update.mutateAsync({ bon, patch, log });
      toast(done);
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action impossible');
      return false;
    }
  }

  function approuver(b: BonCaisse) {
    Alert.alert(`Approuver ${bonNumero(b.numero)} ?`, `${fmtFCFA(b.montant)} F pour ${b.demandeur_nom}\n${b.motif}`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Approuver', onPress: () => run(b, { status: 'approuve' }, 'approuvé', 'Bon approuvé ✓') },
    ]);
  }

  function remettre(b: BonCaisse) {
    Alert.alert(
      `Remettre ${fmtFCFA(b.montant)} F ?`,
      `À ${b.demandeur_nom}. L'argent sort de la caisse maintenant ; justification attendue sous ${params?.delai_justification_heures ?? 48} h.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Remettre', onPress: () => run(b, { status: 'remis' }, 'argent remis', 'Argent remis ✓') },
      ],
    );
  }

  function cloturer(b: BonCaisse) {
    const rendu = b.montant - (b.montant_depense ?? 0);
    Alert.alert(
      `Clôturer ${bonNumero(b.numero)} ?`,
      `Dépensé ${fmtFCFA(b.montant_depense ?? 0)} F, inscrit au livre comptable.` +
        (rendu > 0 ? `\nClôturez seulement après avoir récupéré ${fmtFCFA(rendu)} F de monnaie.` : ''),
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Clôturer',
          onPress: async () => {
            if (await run(b, { status: 'cloture' }, `clôturé — dépensé ${b.montant_depense ?? 0} F`, 'Bon clôturé ✓')) {
              setControle(null);
            }
          },
        },
      ],
    );
  }

  async function submitMotif(reason: string) {
    if (!motif) return;
    const ok =
      motif.kind === 'refus'
        ? await run(motif.bon, { status: 'refuse', refus_motif: reason }, `refusé — ${reason}`, 'Demande refusée')
        : await run(motif.bon, { status: 'remis', rejet_justification_motif: reason }, `justification rejetée — ${reason}`, 'Justification rejetée');
    if (ok) setMotif(null);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={local.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Comptabilité" title="Bons de caisse" sm onBack={() => router.back()} />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: spacing.cardGap }} showsVerticalScrollIndicator={false}>
            <SegFilter
              options={[
                { id: 'demande', label: `Décider (${lists.demande.length})` },
                { id: 'approuve', label: `Remettre (${lists.approuve.length})` },
                { id: 'justifie', label: `Contrôler (${lists.justifie.length})` },
                { id: 'remis', label: `En cours (${lists.remis.length})` },
              ]}
              value={tab}
              onChange={setTab}
            />

            {list.map((b) => (
              <BonCard key={b.id} bon={b} showDemandeur>
                <GrilleInfo pos={b.status === 'demande' ? positionGrille(b, grille) : null} nb={b.nb_trajets ?? 1} />
                {isMine(b) && b.status !== 'remis' ? (
                  <Text style={T.t3}>Votre propre bon : un autre compte doit le traiter.</Text>
                ) : b.status === 'demande' ? (
                  <>
                    <Button label="Approuver" variant="mint" size="sm" loading={update.isPending} onPress={() => approuver(b)} />
                    <Button label="Refuser" variant="glass" size="sm" onPress={() => setMotif({ bon: b, kind: 'refus' })} />
                  </>
                ) : b.status === 'approuve' ? (
                  <Button label={`Remettre ${fmtFCFA(b.montant)} F`} size="sm" loading={update.isPending} onPress={() => remettre(b)} />
                ) : b.status === 'justifie' ? (
                  <Button label="Contrôler la pièce" size="sm" onPress={() => setControle(b)} />
                ) : null}
              </BonCard>
            ))}
            {!list.length ? <Text style={[local.empty, { color: colors.ink35 }]}>Rien à traiter.</Text> : null}
          </ScrollView>
        )}
      </SafeAreaView>

      <Sheet visible={!!controle} title={controle ? `Contrôle ${bonNumero(controle.numero)}` : 'Contrôle'} onClose={() => setControle(null)}>
        {controle ? (
          <>
            <Text style={T.t1}>{controle.demandeur_nom}</Text>
            <Text style={T.t2}>{controle.motif}</Text>
            <Text style={[T.t2, { marginTop: 8 }]}>
              Remis {fmtFCFA(controle.montant)} F · dépensé {fmtFCFA(controle.montant_depense ?? 0)} F
            </Text>
            {controle.montant - (controle.montant_depense ?? 0) > 0 ? (
              <Text style={[T.t2, { color: colors.amber }]}>
                Monnaie à récupérer : {fmtFCFA(controle.montant - (controle.montant_depense ?? 0))} F
              </Text>
            ) : null}
            {controle.justificatif_path ? <PieceView path={controle.justificatif_path} label="Justificatif" /> : null}
            {controle.preuve_mission_path ? <PieceView path={controle.preuve_mission_path} label="Preuve de la mission" /> : null}
            <View style={styles.modalBtns}>
              <Button
                label="Rejeter"
                variant="danger"
                onPress={() => {
                  // iOS n'empile pas deux Modal : on ferme le contrôle avant d'ouvrir le motif.
                  const bon = controle;
                  setControle(null);
                  setTimeout(() => setMotif({ bon, kind: 'rejet' }), 350);
                }}
                style={{ flex: 1 }}
              />
              <Button label="Clôturer" variant="mint" loading={update.isPending} onPress={() => cloturer(controle)} style={{ flex: 1.4 }} />
            </View>
          </>
        ) : null}
      </Sheet>

      <MotifSheet
        visible={!!motif}
        title={motif?.kind === 'rejet' ? 'Rejeter la justification' : 'Refuser la demande'}
        hint={
          motif?.kind === 'rejet'
            ? 'L’avance redevient due : l’employé devra fournir une nouvelle pièce.'
            : motif
              ? `${bonNumero(motif.bon.numero)} — ${fmtFCFA(motif.bon.montant)} F`
              : undefined
        }
        confirmLabel={motif?.kind === 'rejet' ? 'Rejeter' : 'Refuser'}
        loading={update.isPending}
        onClose={() => setMotif(null)}
        onSubmit={submitMotif}
      />
    </ScreenBackground>
  );
}

/** Bon de transport hors grille ou au-dessus du tarif : décision administrateur. */
function GrilleInfo({ pos, nb }: { pos: ReturnType<typeof positionGrille>; nb: number }) {
  const T = useText();
  const colors = useColors();
  if (!pos || pos.kind === 'dans_grille') return null;
  return (
    <Text style={[T.t3, { color: colors.amber, width: '100%' }]}>
      {pos.kind === 'hors_grille'
        ? 'Trajet hors grille des transports : décision administrateur.'
        : `${pos.trajet}${nb > 1 ? ` × ${nb}` : ''} : ${fmtFCFA(pos.plafond)} F max selon la grille.`}
    </Text>
  );
}

const local = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 30 },
});
