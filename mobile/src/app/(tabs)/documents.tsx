import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Check, Clock, FileText, Upload } from 'lucide-react-native';

import { useAuth } from '@/lib/auth-context';
import { useStudentProfile } from '@/lib/hooks/use-student-portal';
import { useDocuments, useUploadDocument, type StudentDocument } from '@/lib/hooks/use-documents';
import { REQUIRED_DOCS, REQUIRED_KEYS, type DocKey } from '@/lib/required-docs';
import { apiFetch } from '@/lib/api';
import { Button, Chip, GlassCard, ScreenBackground } from '@/components/ui';
import { colors, fontSize, radius, spacing } from '@/theme/tokens';

export default function DocumentsScreen() {
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
  const allRequired = completion === REQUIRED_KEYS.length;

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
        <Text style={styles.eyebrow}>Dossier</Text>
        <Text style={styles.title}>Mes documents</Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>Erreur : {(error as Error).message}</Text>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, gap: spacing.rowGap }}
            showsVerticalScrollIndicator={false}>
            <GlassCard variant="strong" style={{ marginBottom: 6 }}>
              <Text style={styles.eyebrow}>Documents requis</Text>
              <Text style={styles.ratio}>
                {completion}
                <Text style={styles.ratioTotal}> / {REQUIRED_KEYS.length}</Text>
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${(completion / REQUIRED_KEYS.length) * 100}%` }]}
                />
              </View>
              <Text style={styles.progressNote}>
                {allRequired
                  ? 'Tous les documents requis sont fournis.'
                  : `Plus que ${REQUIRED_KEYS.length - completion} document(s) pour compléter ton dossier.`}
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
  const status = doc?.status;
  const Icon = status === 'valide' ? Check : status === 'en_attente' ? Clock : docDef.optional ? FileText : Upload;
  const tint = status === 'valide' ? colors.mint : status === 'en_attente' ? colors.amber : docDef.optional ? colors.ink35 : colors.crimsonVivid;

  return (
    <GlassCard style={[styles.row, docDef.optional && !doc ? styles.rowOptional : null]}>
      <View style={[styles.rowIcon, { borderColor: tint }]}>
        <Icon size={16} color={tint} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{docDef.label}</Text>
        <Text style={styles.rowMeta}>{docDef.description}</Text>
      </View>
      <View>
        {uploading ? (
          <ActivityIndicator color={colors.ink70} />
        ) : status === 'valide' ? (
          <Chip variant="done" label="OK" />
        ) : status === 'en_attente' ? (
          <Chip variant="live" label="En revue" />
        ) : status === 'non_conforme' ? (
          <Button label="Renvoyer" size="sm" onPress={onUpload} />
        ) : docDef.optional ? (
          <Button label="Ajouter" size="sm" variant="glass" onPress={onUpload} />
        ) : (
          <Button label="Ajouter" size="sm" onPress={onUpload} />
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.screenX },
  eyebrow: {
    color: colors.crimsonVivid,
    fontSize: fontSize.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginTop: 12,
  },
  title: { color: colors.text, fontSize: fontSize.screenTitle, fontWeight: '600' },
  ratio: { color: colors.text, fontSize: 34, fontWeight: '600', marginVertical: 4 },
  ratioTotal: { color: colors.ink50, fontSize: 22 },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: colors.track, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.mint },
  progressNote: { color: colors.ink50, fontSize: fontSize.meta, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowOptional: { opacity: 0.72 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.text, fontSize: fontSize.cardTitle, fontWeight: '600' },
  rowMeta: { color: colors.ink50, fontSize: fontSize.meta, marginTop: 2 },
  error: { color: colors.crimsonVivid, fontSize: 13 },
});
