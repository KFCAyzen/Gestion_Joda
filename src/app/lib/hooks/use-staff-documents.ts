import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';

const supabase = createClient();

export const STAFF_DOCUMENTS_KEY = ['staff_documents'] as const;

export interface StaffDocument {
    id: string;
    student_id: string;
    sent_by: string | null;
    title: string;
    description: string | null;
    file_url: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    storage_path: string | null;
    downloaded_at: string | null;
    created_at: string;
}

export function useStaffDocuments(studentId: string | null | undefined) {
    return useQuery({
        queryKey: [...STAFF_DOCUMENTS_KEY, studentId ?? 'none'],
        queryFn: async (): Promise<StaffDocument[]> => {
            if (!studentId) return [];
            const { data, error } = await supabase
                .from('staff_documents')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []) as StaffDocument[];
        },
        enabled: !!studentId,
        staleTime: 30 * 1000,
    });
}

export interface SendStaffDocumentInput {
    studentId: string;
    title: string;
    description?: string;
    file: File;
    sentBy: string;
}

export function useSendStaffDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studentId, title, description, file, sentBy }: SendStaffDocumentInput) => {
            const ext = file.name.split('.').pop() ?? 'bin';
            const safeBase = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
            const path = `staff-to-student/${studentId}/${Date.now()}_${safeBase}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('student-documents')
                .upload(path, file, { upsert: false, contentType: file.type || undefined });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('student-documents').getPublicUrl(path);

            const { data, error } = await supabase
                .from('staff_documents')
                .insert({
                    student_id: studentId,
                    sent_by: sentBy,
                    title: title.trim(),
                    description: description?.trim() || null,
                    file_url: urlData.publicUrl,
                    file_name: file.name,
                    file_size: file.size,
                    mime_type: file.type || null,
                    storage_path: path,
                })
                .select()
                .single();

            if (error) {
                await supabase.storage.from('student-documents').remove([path]).catch(() => {});
                throw error;
            }
            return data as StaffDocument;
        },
        onSuccess: (doc) => {
            queryClient.invalidateQueries({ queryKey: [...STAFF_DOCUMENTS_KEY, doc.student_id] });
        },
    });
}

export function useDeleteStaffDocument() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (doc: StaffDocument) => {
            if (doc.storage_path) {
                await supabase.storage.from('student-documents').remove([doc.storage_path]).catch(() => {});
            }
            const { error } = await supabase.from('staff_documents').delete().eq('id', doc.id);
            if (error) throw error;
            return doc;
        },
        onSuccess: (doc) => {
            queryClient.invalidateQueries({ queryKey: [...STAFF_DOCUMENTS_KEY, doc.student_id] });
        },
    });
}

export function useMarkStaffDocumentDownloaded() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (doc: StaffDocument) => {
            if (doc.downloaded_at) return doc;
            const { data, error } = await supabase
                .from('staff_documents')
                .update({ downloaded_at: new Date().toISOString() })
                .eq('id', doc.id)
                .select()
                .single();
            if (error) throw error;
            return data as StaffDocument;
        },
        onSuccess: (doc) => {
            queryClient.invalidateQueries({ queryKey: [...STAFF_DOCUMENTS_KEY, doc.student_id] });
        },
    });
}
