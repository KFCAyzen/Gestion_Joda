"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, FileText, Loader2, Send, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { getFriendlyErrorMessage } from "../lib/feedback";
import { logActivity } from "../utils/activityLogger";
import { validateFile } from "../utils/fileValidation";
import {
    useDeleteStaffDocument,
    useSendStaffDocument,
    useStaffDocuments,
    type StaffDocument,
} from "../lib/hooks/use-staff-documents";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
    studentId: string;
    studentName: string;
}

function formatSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function StaffDocumentsSender({ studentId, studentName }: Props) {
    const { user } = useAuth();
    const t = useTranslations("staffDocuments");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const { showNotification } = useNotificationContext();

    const { data: documents = [], isLoading } = useStaffDocuments(studentId);
    const sendMutation = useSendStaffDocument();
    const deleteMutation = useDeleteStaffDocument();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [confirmDelete, setConfirmDelete] = useState<StaffDocument | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0] ?? null;
        if (!picked) {
            setFile(null);
            return;
        }
        const v = validateFile(picked);
        if (!v.valid) {
            showNotification({
                title: t("notifications.errorTitle"),
                message: v.error ?? t("notifications.invalidFile"),
                type: "error",
            });
            e.target.value = "";
            return;
        }
        setFile(picked);
    };

    const resetForm = () => {
        setTitle("");
        setDescription("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSend = async () => {
        if (!user || !file || !title.trim()) return;
        try {
            const doc = await sendMutation.mutateAsync({
                studentId,
                title,
                description,
                file,
                sentBy: user.id,
            });
            await logActivity(
                user.id,
                user.name,
                user.role,
                "staff_document_sent",
                "staff_documents",
                doc.id,
                `Document envoyé à ${studentName} — ${doc.title}`,
                { student_id: studentId, document_id: doc.id, title: doc.title },
            );
            showNotification({
                title: t("notifications.sentTitle"),
                message: t("notifications.sentMessage", { name: studentName }),
                type: "success",
            });
            resetForm();
        } catch (error) {
            showNotification({
                title: t("notifications.errorTitle"),
                message: getFriendlyErrorMessage(error, { fallback: t("notifications.sendError") }),
                type: "error",
            });
        }
    };

    const handleDelete = (doc: StaffDocument) => {
        setConfirmDelete(doc);
    };

    const confirmDeletion = async () => {
        if (!confirmDelete) return;
        const doc = confirmDelete;
        setConfirmDelete(null);
        try {
            await deleteMutation.mutateAsync(doc);
            if (user) {
                await logActivity(
                    user.id,
                    user.name,
                    user.role,
                    "staff_document_deleted",
                    "staff_documents",
                    doc.id,
                    `Document envoyé supprimé — ${doc.title}`,
                    { student_id: doc.student_id, document_id: doc.id },
                );
            }
            showNotification({
                title: t("notifications.deletedTitle"),
                message: t("notifications.deletedMessage"),
                type: "success",
            });
        } catch (error) {
            showNotification({
                title: t("notifications.errorTitle"),
                message: getFriendlyErrorMessage(error, { fallback: t("notifications.deleteError") }),
                type: "error",
            });
        }
    };

    const canSend = !!user && !!file && title.trim().length > 0 && !sendMutation.isPending;

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-5">
                <div className="mb-4 flex items-center gap-2">
                    <Send className="h-4 w-4 text-red-600" />
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("sender.title")}</h4>
                </div>
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{t("sender.description", { name: studentName })}</p>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("sender.titleLabel")} *</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("sender.titlePlaceholder")}
                            maxLength={150}
                            disabled={sendMutation.isPending}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("sender.descriptionLabel")}</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder={t("sender.descriptionPlaceholder")}
                            maxLength={500}
                            disabled={sendMutation.isPending}
                            className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("sender.fileLabel")} *</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileChange}
                            className="hidden"
                            disabled={sendMutation.isPending}
                        />
                        {file ? (
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2">
                                <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
                                    <p className="text-[10px] text-slate-500">{formatSize(file.size)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                    className="text-xs text-slate-500 hover:text-red-600"
                                    disabled={sendMutation.isPending}
                                >
                                    {t("sender.removeFile")}
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={sendMutation.isPending}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 px-3 py-3 text-xs text-slate-600 dark:text-slate-400 transition-colors hover:border-red-500 hover:bg-red-50/40 dark:hover:bg-red-900/10"
                            >
                                <Upload className="h-4 w-4" />
                                {t("sender.pickFile")}
                            </button>
                        )}
                    </div>

                    <div className="flex justify-end pt-1">
                        <Button
                            onClick={handleSend}
                            disabled={!canSend}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {sendMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t("sender.sending")}
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    {t("sender.send")}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{t("history.title")}</h4>
                {isLoading ? (
                    <p className="py-6 text-center text-sm text-slate-500">{t("history.loading")}</p>
                ) : documents.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">{t("history.empty")}</p>
                ) : (
                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                                    <FileText className="h-4 w-4 text-red-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{doc.title}</p>
                                    {doc.description && (
                                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{doc.description}</p>
                                    )}
                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                                        <span>{new Date(doc.created_at).toLocaleDateString(dateLocale)}</span>
                                        {doc.file_size ? <span>· {formatSize(doc.file_size)}</span> : null}
                                        {doc.downloaded_at ? (
                                            <span className="text-emerald-600">· {t("history.downloaded")}</span>
                                        ) : (
                                            <span className="text-amber-600">· {t("history.notDownloaded")}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <a
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                                        title={t("history.view")}
                                    >
                                        <Download className="h-4 w-4" />
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(doc)}
                                        disabled={deleteMutation.isPending}
                                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                                        title={t("history.delete")}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={confirmDeletion}
                title={t("confirmDelete.title")}
                description={t("confirmDelete.description", { title: confirmDelete?.title ?? "" })}
                confirmLabel={t("confirmDelete.confirm")}
            />
        </div>
    );
}
