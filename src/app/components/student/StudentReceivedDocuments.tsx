"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileText, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "../../lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
    STAFF_DOCUMENTS_KEY,
    useMarkStaffDocumentDownloaded,
    useStaffDocuments,
    type StaffDocument,
} from "../../lib/hooks/use-staff-documents";

interface Props {
    studentId: string | null;
}

function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentReceivedDocuments({ studentId }: Props) {
    const t = useTranslations("studentReceivedDocuments");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { data: documents = [], isLoading } = useStaffDocuments(studentId);
    const markDownloaded = useMarkStaffDocumentDownloaded();

    useEffect(() => {
        if (!studentId) return;
        const channel = supabase
            .channel(`staff-docs-rt-${studentId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "staff_documents", filter: `student_id=eq.${studentId}` },
                () => {
                    queryClient.invalidateQueries({ queryKey: [...STAFF_DOCUMENTS_KEY, studentId] });
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [studentId, queryClient, supabase]);

    const handleDownload = async (doc: StaffDocument) => {
        try {
            await markDownloaded.mutateAsync(doc);
        } catch {
            /* non bloquant */
        }
    };

    if (!studentId) return null;

    return (
        <Card className="student-surface rounded-[2rem] border-0 shadow-none bg-transparent ring-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Inbox className="h-4 w-4 text-[var(--student-neon-lime)]" />
                    {t("title")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="py-6 text-center text-sm text-[var(--student-fg-muted)]">{t("loading")}</p>
                ) : documents.length === 0 ? (
                    <p className="py-6 text-center text-sm text-[var(--student-fg-muted)]">{t("empty")}</p>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="student-surface-soft flex items-start gap-3 rounded-2xl p-3"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.10)]">
                                    <FileText className="h-4 w-4 text-[var(--student-neon-lime)]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-[var(--student-fg)]">{doc.title}</p>
                                        {!doc.downloaded_at && (
                                            <Badge className="shrink-0 rounded-full border border-[rgba(34,197,94,0.40)] bg-[rgba(34,197,94,0.15)] text-[10px] font-semibold text-green-400">
                                                {t("new")}
                                            </Badge>
                                        )}
                                    </div>
                                    {doc.description && (
                                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--student-fg-muted)]">{doc.description}</p>
                                    )}
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--student-fg-muted)]">
                                        <span>{new Date(doc.created_at).toLocaleDateString(dateLocale)}</span>
                                        {doc.file_size ? <span>· {formatSize(doc.file_size)}</span> : null}
                                    </div>
                                </div>
                                <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => void handleDownload(doc)}
                                    className="student-focus-ring flex shrink-0 items-center gap-1.5 rounded-xl border border-[rgba(220,38,38,0.40)] bg-[var(--student-neon-lime)] px-3 py-2 text-xs font-semibold text-[var(--student-neon-ink)] shadow-[var(--student-pay-glow)] hover:brightness-110"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    {t("download")}
                                </a>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
