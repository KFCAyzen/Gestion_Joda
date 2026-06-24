import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Check, Sparkles, Upload } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useStudentProfile } from '@/lib/hooks/use-student-portal';
import { useDocuments, useUploadDocument, type StudentDocument } from '@/lib/hooks/use-documents';
import { REQUIRED_DOCS, REQUIRED_KEYS, type DocKey } from '@/lib/required-docs';
import { apiFetch } from '@/lib/api';
import {
  Button,
  Chip,
  GlassCard,
  IconBox,
  useIconTint,
  ScreenBackground,
  ScreenHeader,
  type IconTone,
} from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { fontSize, radius, spacing, type Palette } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

export default function DocumentsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { data: profile } = useStudentProfile(user?.id);
  const studentId = profile?.id;
  const { data: docs, isLoading, error } = useDocuments(studentId);
  const upload = useUploadDocument();

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [notifSent, setNotifSent] = useState(false);

  const byType = new Map((docs ?? []).map((d) => [d.type, d]));
  const completion = REQUIRED_KEYS.filter((k) => byType.has(k)).length;
  const total = REQUIRED_KEYS.length;
  const remaining = total - completion;
  const allRequired = remaining === 0;
  const pct = total ? Math.round((completion / total) * 100) : 0;

  async function runUpload(key: DocKey, input: { name: string; mimeType: string; base64?: string; uri?: string }) {
    if (!studentId) return;
    setUploadingKey(key);
    try {
      await upload.mutateAsync({ studentId, key, ...input });
      setNotifSent(false);
    } catch (e) {
      Alert.alert('Échec', (e as Error).message || "L'upload a échoué.");
    } finally {
      setUploadingKey(null);
    }
  }

  async function pickImage(key: DocKey, fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission requise', "Autorise l'accès pour ajouter une pièce.");
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (res.canceled || !res.assets[0]?.base64) return;
    const a = res.assets[0];
    await runUpload(key, {
      name: a.fileName ?? `${key}.jpg`,
      mimeType: a.mimeType ?? 'image/jpeg',
      base64: a.base64 ?? undefined,
    });
  }

  async function pickFile(key: DocKey) {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    await runUpload(key, { name: a.name, mimeType: a.mimeType ?? 'application/pdf', uri: a.uri });
  }

  function promptUpload(key: DocKey) {
    Alert.alert('Ajouter une pièce', undefined, [
      { text: 'Prendre une photo', onPress: () => pickImage(key, true) },
      { text: 'Choisir une image', onPress: () => pickImage(key, false) },
      { text: 'Choisir un fichier (PDF)', onPress: () => pickFile(key) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function sendToStaff() {
    if (!studentId) return;
    setNotifying(true);
    try {
      const res = await apiFetch('/api/notify-staff', { method: 'POST', body: JSON.stringify({ studentId }) });
      if (!res.ok) throw new Error('Erreur serveur');
      setNotifSent(true);
    } catch {
      Alert.alert('Échec', "Impossible d'envoyer le dossier. Réessaie.");
    } finally {
      setNotifying(false);
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScreenHeader eyebrow="Mes documents" title="Dossier" right={<NotificationBell />} />

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>Erreur : {(error as Error).message}</Text>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 120, gap: spacing.rowGap }}
            showsVerticalScrollIndicator={false}>
            <GlassCard variant="strong" style={{ marginBottom: 6 }}>
              <View style={styles.progressTop}>
                <Text style={styles.eyebrowMuted}>Documents requis</Text>
                <Text style={styles.ratio}>
                  <Text style={styles.ratioDone}>{completion}</Text> / {total}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressNote}>
                {allRequired ? (
                  'Tous les documents requis sont fournis.'
                ) : (
                  <>
                    Plus que <Text style={styles.progressStrong}>{remaining} document{remaining > 1 ? 's' : ''}</Text> pour
                    soumettre ton dossier complet.
                  </>
                )}
              </Text>
            </GlassCard>

            {REQUIRED_DOCS.map((doc) => (
              <DocRow
                key={doc.key}
                docDef={doc}
                doc={byType.get(doc.key)}
                uploading={uploadingKey === doc.key}
                onUpload={() => promptUpload(doc.key)}
              />
            ))}

            {allRequired ? (
              <Button
                label={notifSent ? 'Dossier envoyé ✓' : "Envoyer à l'équipe"}
                fullWidth
                loading={notifying}
                disabled={notifSent}
                onPress={sendToStaff}
                style={{ marginTop: 6 }}
              />
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function DocRow({
  docDef,
  doc,
  uploading,
  onUpload,
}: {
  docDef: (typeof REQUIRED_DOCS)[number];
  doc?: StudentDocument;
  uploading: boolean;
  onUpload: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const iconTint = useIconTint();
  const status = doc?.status;
  const received = status === 'valide' || status === 'en_attente';

  let tone: IconTone;
  let Icon: typeof Check;
  if (received) {
    tone = 'mint';
    Icon = Check;
  } else if (docDef.optional) {
    tone = 'ghost';
    Icon = Sparkles;
  } else if (status === 'non_conforme') {
    tone = 'red';
    Icon = Upload;
  } else {
    tone = 'red';
    Icon = Upload;
  }

  const subColor = !received && !docDef.optional ? colors.redIcon : colors.ink50;

  return (
    <GlassCard style={[styles.row, docDef.optional && !doc ? styles.rowOptional : null]}>
      <IconBox tone={tone} size={36}>
        <Icon size={17} color={iconTint[tone]} strokeWidth={2.2} />
      </IconBox>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{docDef.label}</Text>
        <Text style={[styles.rowMeta, { color: subColor }]}>{docDef.description}</Text>
      </View>
      <View>
        {uploading ? (
          <ActivityIndicator color={colors.ink70} />
        ) : status === 'valide' ? (
          <Chip variant="done" label="OK" />
        ) : status === 'en_attente' ? (
          <Chip variant="due" label="En revue" />
        ) : status === 'non_conforme' ? (
          <Button label="Renvoyer" size="sm" onPress={onUpload} />
        ) : docDef.optional ? (
          <Chip variant="ghost" label="Option" />
        ) : (
          <Button label="Ajouter" size="sm" onPress={onUpload} />
        )}
      </View>
    </GlassCard>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: spacing.screenX },
    eyebrowMuted: {
      color: colors.ink50,
      fontSize: fontSize.eyebrow,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.6,
    },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    ratio: { color: colors.text, fontSize: 15, fontWeight: '600' },
    ratioDone: { color: colors.mint },
    progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden', marginTop: 10 },
    progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.mint },
    progressNote: { color: colors.ink70, fontSize: fontSize.meta, marginTop: 9 },
    progressStrong: { color: colors.text, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 13 },
    rowOptional: { opacity: 0.72 },
    rowTitle: { color: colors.text, fontSize: 13.5, fontWeight: '600' },
    rowMeta: { fontSize: 11.5, marginTop: 2 },
    error: { color: colors.crimsonVivid, fontSize: 13 },
  });
