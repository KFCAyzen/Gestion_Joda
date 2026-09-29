import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, X } from 'lucide-react-native';

import { Button, Chip, GlassCard, useText } from '@/components/ui';
import { fmtFCFA } from '@/lib/format';
import {
  BON_CATEGORIE_LABEL,
  BON_STATUS_LABEL,
  bonNumero,
  echeanceLabel,
  isEnRetard,
  pieceUrl,
  type BonCaisse,
  type PieceFile,
} from '@/lib/hooks/use-bons-caisse';
import { type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

/* Briques communes aux écrans « Mes avances » (agent) et « Bons de caisse » (admin). */

export function useBonStyles() {
  const colors = useColors();
  return useMemo(() => makeStyles(colors), [colors]);
}

/** Feuille modale du bas, même gabarit que les formulaires de la compta mobile. */
export function Sheet({
  visible,
  title,
  titleColor,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  titleColor?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const colors = useColors();
  const styles = useBonStyles();
  const T = useText();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grab} />
          <View style={styles.sheetHead}>
            <Text style={[T.t1, { fontSize: 17 }, titleColor ? { color: titleColor } : null]}>{title}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.ink70} />
            </Pressable>
          </View>
          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Saisie d'un motif obligatoire (refus, annulation, rejet de justification). */
export function MotifSheet({
  visible,
  title,
  hint,
  confirmLabel,
  loading,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  hint?: string;
  confirmLabel: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const colors = useColors();
  const styles = useBonStyles();
  const T = useText();
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (visible) setReason('');
  }, [visible]);
  return (
    <Sheet visible={visible} title={title} titleColor={colors.crimsonVivid} onClose={onClose}>
      {hint ? <Text style={[T.t3, { marginBottom: 10 }]}>{hint}</Text> : null}
      <Text style={[T.t3, styles.fieldLabel]}>Motif (obligatoire)</Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Expliquez la raison"
        placeholderTextColor={colors.ink35}
        multiline
        style={[styles.input, { minHeight: 84, textAlignVertical: 'top' }]}
      />
      <View style={styles.modalBtns}>
        <Button label="Retour" variant="glass" onPress={onClose} style={{ flex: 1 }} />
        <Button
          label={confirmLabel}
          variant="danger"
          loading={loading}
          disabled={!reason.trim()}
          onPress={() => onSubmit(reason.trim())}
          style={{ flex: 1.4 }}
        />
      </View>
    </Sheet>
  );
}

/** Choix d'une photo (appareil ou galerie) avec aperçu. */
export function PiecePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PieceFile | null;
  onChange: (file: PieceFile | null) => void;
}) {
  const colors = useColors();
  const styles = useBonStyles();

  async function pick(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorise l'accès pour joindre la pièce.");
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    onChange({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', base64: a.base64 ?? undefined });
  }

  function prompt() {
    Alert.alert(label, undefined, [
      { text: 'Prendre une photo', onPress: () => pick(true) },
      { text: 'Choisir une image', onPress: () => pick(false) },
      ...(value ? [{ text: 'Retirer la pièce', style: 'destructive' as const, onPress: () => onChange(null) }] : []),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  return (
    <Pressable onPress={prompt} style={styles.pieceBtn}>
      {value ? (
        <>
          <Image source={{ uri: value.uri }} style={styles.pieceThumb} />
          <Text style={styles.pieceTxt}>Pièce jointe — toucher pour changer</Text>
        </>
      ) : (
        <>
          <Camera size={16} color={colors.ink70} />
          <Text style={styles.pieceTxt}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Pièce déposée, affichée par lien signé (bucket privé). */
export function PieceView({ path, label }: { path: string; label: string }) {
  const styles = useBonStyles();
  const T = useText();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setFailed(false);
    pieceUrl(path).then((u) => {
      if (cancelled) return;
      if (u) setUrl(u);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={[T.t3, { marginBottom: 6 }]}>{label}</Text>
      {failed ? (
        <Text style={T.t3}>Pièce inaccessible.</Text>
      ) : !url ? (
        <ActivityIndicator />
      ) : path.toLowerCase().endsWith('.pdf') ? (
        <Text style={T.t2}>Document PDF — à ouvrir depuis le web.</Text>
      ) : (
        <Image source={{ uri: url }} style={styles.pieceLarge} resizeMode="contain" />
      )}
    </View>
  );
}

/** Carte d'un bon : numéro, statut, montant, motif, échéance ; actions en bas. */
export function BonCard({ bon, showDemandeur, children }: { bon: BonCaisse; showDemandeur?: boolean; children?: ReactNode }) {
  const colors = useColors();
  const styles = useBonStyles();
  const T = useText();
  const retard = isEnRetard(bon);
  const echeance = echeanceLabel(bon);
  const variant =
    bon.status === 'cloture'
      ? 'done'
      : bon.status === 'refuse' || bon.status === 'annule'
        ? 'ghost'
        : retard
          ? 'live'
          : 'due';
  return (
    <GlassCard style={retard ? { borderColor: colors.redLine } : undefined}>
      <View style={styles.cardHead}>
        <Text style={styles.numero}>{bonNumero(bon.numero)}</Text>
        <Chip variant={variant} label={retard ? 'En retard' : BON_STATUS_LABEL[bon.status]} />
      </View>
      <Text style={styles.amount}>{fmtFCFA(bon.montant)} F</Text>
      {showDemandeur ? <Text style={[T.t1, { fontSize: 13.5 }]}>{bon.demandeur_nom}</Text> : null}
      <Text style={T.t2}>{bon.motif}</Text>
      <Text style={T.t3}>{BON_CATEGORIE_LABEL[bon.categorie] ?? bon.categorie}</Text>
      {echeance ? <Text style={[T.t3, retard && { color: colors.crimsonVivid, fontWeight: '600' }]}>{echeance}</Text> : null}
      {bon.status === 'remis' && !bon.reception_confirmee_at ? (
        <Text style={[T.t3, { color: colors.amber }]}>Réception non confirmée</Text>
      ) : null}
      {bon.montant_depense !== null ? (
        <Text style={T.t3}>
          Dépensé {fmtFCFA(bon.montant_depense)} F
          {bon.montant - bon.montant_depense > 0 ? ` · à rendre ${fmtFCFA(bon.montant - bon.montant_depense)} F` : ''}
        </Text>
      ) : null}
      {bon.refus_motif ? <Text style={[T.t3, { color: colors.crimsonVivid }]}>Refusé : {bon.refus_motif}</Text> : null}
      {bon.rejet_justification_motif && bon.status === 'remis' ? (
        <Text style={[T.t3, { color: colors.crimsonVivid }]}>Justification rejetée : {bon.rejet_justification_motif}</Text>
      ) : null}
      {bon.annulation_motif ? <Text style={T.t3}>Annulé : {bon.annulation_motif}</Text> : null}
      {children ? <View style={styles.cardActions}>{children}</View> : null}
    </GlassCard>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      borderWidth: 1,
      borderColor: colors.glassLine2,
      padding: 18,
      paddingBottom: 34,
      maxHeight: '92%',
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
    pieceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.glassLine,
      backgroundColor: colors.glass2,
    },
    pieceThumb: { width: 44, height: 44, borderRadius: 8 },
    pieceTxt: { fontSize: 13, fontWeight: '600', color: colors.ink70 },
    pieceLarge: { width: '100%', height: 260, borderRadius: 12, backgroundColor: colors.glass },
    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    numero: { fontSize: 11.5, fontWeight: '600', color: colors.ink50, letterSpacing: 0.5 },
    amount: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5, marginBottom: 2 },
    cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  });
