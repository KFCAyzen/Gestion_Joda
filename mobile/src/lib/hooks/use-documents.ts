import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

import { supabase } from '../supabase';
import { REQUIRED_KEYS } from '../required-docs';

export type DocumentStatus = 'en_attente' | 'valide' | 'non_conforme';
export type StudentDocument = {
  id: string;
  student_id: string;
  type: string;
  url?: string | null;
  status: DocumentStatus;
  created_at: string;
};

export const DOCUMENTS_KEY = ['documents'];
const BUCKET = 'student-documents';

/** Documents de l'étudiant. */
export function useDocuments(studentId?: string | null) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, studentId ?? 'none'],
    queryFn: async (): Promise<StudentDocument[]> => {
      const { data, error } = await supabase
        .from('documents')
        .select('id, student_id, type, url, status, created_at')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudentDocument[];
    },
    enabled: !!studentId,
    staleTime: 30 * 1000,
  });
}

export type UploadInput = {
  studentId: string;
  key: string;
  name: string;
  mimeType: string;
  /** base64 fourni directement (images via ImagePicker). */
  base64?: string;
  /** sinon, uri local à lire (PDF via DocumentPicker). */
  uri?: string;
};

/**
 * Upload d'une pièce — miroir du flux web `DocumentUpload.handleUpload` :
 * storage `student-documents` → upsert ligne `documents` (status en_attente)
 * → passe le dossier en `document_recu` quand tous les requis sont présents.
 */
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, key, name, mimeType, base64, uri }: UploadInput) => {
      let b64 = base64;
      if (!b64 && uri) {
        b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      }
      if (!b64) throw new Error('Fichier illisible');

      const ext = (name.split('.').pop() || mimeType.split('/').pop() || 'bin').toLowerCase();
      const path = `documents/${studentId}/${key}_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, decode(b64), { contentType: mimeType, upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const nowIso = new Date().toISOString();

      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('student_id', studentId)
        .eq('type', key)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('documents')
          .update({ url: urlData.publicUrl, status: 'en_attente', uploaded_at: nowIso })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('documents')
          .insert({ student_id: studentId, type: key, status: 'en_attente', url: urlData.publicUrl, uploaded_at: nowIso });
      }

      // Tous les requis présents → dossier document_manquant → document_recu.
      const { data: allDocs } = await supabase.from('documents').select('type').eq('student_id', studentId);
      const uploaded = new Set((allDocs ?? []).map((d) => d.type as string));
      if (REQUIRED_KEYS.every((k) => uploaded.has(k))) {
        await supabase
          .from('dossier_bourses')
          .update({ status: 'document_recu' })
          .eq('student_id', studentId)
          .eq('status', 'document_manquant');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}
