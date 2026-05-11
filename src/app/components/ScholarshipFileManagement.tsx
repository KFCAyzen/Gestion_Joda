"use client";

import React, { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Clock3, School2, Sparkles, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { getFriendlyErrorMessage } from "../lib/feedback";
import { logActivity } from "../utils/activityLogger";
import { SearchBar, FilterSelect, LoadingState } from "./shared";
import ConfirmDialog from "./ConfirmDialog";
import DocumentManagement from "./DocumentManagement";

interface ScholarshipFile {
    id: string;
    student_id: string;
    studentName: string;
    university_id: string;
    university: string;
    program: string;
    status: string;
    desired_program?: string;
    study_level?: string;
    language_level?: string;
    scholarship_type?: string;
    notes_internes?: string;
    created_at: string;
    updated_at?: string;
}

export default function ScholarshipFileManagement() {
    const { user } = useAuth();
    const t = useTranslations("scholarshipFiles");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const { showNotification } = useNotificationContext();
    const [files, setFiles] = useState<ScholarshipFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<ScholarshipFile | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean; title: string; description: string; onConfirm: () => void;
    }>({ open: false, title: "", description: "", onConfirm: () => {} });
    const closeConfirm = () => setConfirmDialog(s => ({ ...s, open: false }));

    const canDelete = user?.role === "admin" || user?.role === "super_admin";

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [filesRes, studentsRes, universitiesRes] = await Promise.all([
                supabase.from("dossier_bourses").select("*").order("created_at", { ascending: false }),
                supabase.from("students").select("id, nom, prenom, email"),
                supabase.from("universities").select("id, nom"),
            ]);

            const filesData = (filesRes.data || []).map((file: any) => {
                const student = (studentsRes.data || []).find((s: any) => s.id === file.student_id);
                const university = (universitiesRes.data || []).find((u: any) => u.id === file.university_id);
                return {
                    id: file.id,
                    student_id: file.student_id,
                    studentName: student ? `${student.prenom} ${student.nom}` : t("fallback.unknownStudent"),
                    university_id: file.university_id,
                    university: university?.nom || t("fallback.unknownUniversity"),
                    program: file.desired_program || t("fallback.noProgram"),
                    status: file.status || "en_attente",
                    desired_program: file.desired_program,
                    study_level: file.study_level,
                    language_level: file.language_level,
                    scholarship_type: file.scholarship_type,
                    notes_internes: file.notes_internes,
                    created_at: file.created_at,
                    updated_at: file.updated_at,
                };
            });

            setFiles(filesData);
        } catch (error) {
            showNotification({
                title: t("messages.loadTitle"),
                message: getFriendlyErrorMessage(error, { fallback: t("messages.loadError") }),
                type: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (selectedFile) setNotes(selectedFile.notes_internes || "");
    }, [selectedFile?.id]);

    const openFile = (file: ScholarshipFile) => {
        setSelectedFile(file);
        setNotes(file.notes_internes || "");
    };

    const closeFile = () => setSelectedFile(null);

    const updateStatus = async (newStatus: string | null) => {
        if (!newStatus) return;
        if (!selectedFile || selectedFile.status === newStatus) return;
        setUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from("dossier_bourses")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", selectedFile.id);
            if (error) throw error;
            if (user) {
                await logActivity(
                    user.id, user.name, user.role,
                    "dossier_status_change", "dossier_bourses", selectedFile.id,
                    `Statut dossier mis à jour → ${newStatus} — ${selectedFile.studentName}`,
                    { file_id: selectedFile.id, new_status: newStatus }
                );
            }
            const updated = { ...selectedFile, status: newStatus, updated_at: new Date().toISOString() };
            setSelectedFile(updated);
            setFiles(prev => prev.map(f => f.id === selectedFile.id ? updated : f));
            showNotification({ title: t("messages.statusUpdatedTitle"), message: t("messages.statusUpdated", { status: getStatusText(newStatus) }), type: "success" });
        } catch (error) {
            showNotification({
                title: t("messages.errorTitle"),
                message: getFriendlyErrorMessage(error, { fallback: t("messages.statusUpdateError") }),
                type: "error",
            });
        } finally {
            setUpdatingStatus(false);
        }
    };

    const updateNotes = async () => {
        if (!selectedFile) return;
        setIsSavingNotes(true);
        try {
            const { error } = await supabase
                .from("dossier_bourses")
                .update({ notes_internes: notes, updated_at: new Date().toISOString() })
                .eq("id", selectedFile.id);
            if (error) throw error;
            if (user) {
                await logActivity(
                    user.id, user.name, user.role,
                    "dossier_update", "dossier_bourses", selectedFile.id,
                    `Notes dossier mises à jour — ${selectedFile.studentName}`,
                    { file_id: selectedFile.id }
                );
            }
            const updated = { ...selectedFile, notes_internes: notes, updated_at: new Date().toISOString() };
            setSelectedFile(updated);
            setFiles(prev => prev.map(f => f.id === selectedFile.id ? updated : f));
            showNotification({ title: t("messages.notesSavedTitle"), message: t("messages.notesSaved"), type: "success" });
        } catch (error) {
            showNotification({
                title: t("messages.errorTitle"),
                message: getFriendlyErrorMessage(error, { fallback: t("messages.notesSaveError") }),
                type: "error",
            });
        } finally {
            setIsSavingNotes(false);
        }
    };

    const deleteFile = () => {
        if (!selectedFile) return;
        setConfirmDialog({
            open: true,
            title: t("delete.title"),
            description: t("delete.description"),
            onConfirm: async () => {
                closeConfirm();
                setDeletingFileId(selectedFile.id);
                try {
                    const { error } = await supabase.from("dossier_bourses").delete().eq("id", selectedFile.id);
                    if (error) throw error;
                    if (user) {
                        await logActivity(
                            user.id, user.name, user.role,
                            "dossier_delete", "dossier_bourses", selectedFile.id,
                            `Dossier supprimé — ${selectedFile.studentName}`,
                            { file_id: selectedFile.id }
                        );
                    }
                    showNotification({ title: t("messages.deleteSuccessTitle"), message: t("messages.deleteSuccess", { name: selectedFile.studentName }), type: "success" });
                    setFiles(prev => prev.filter(f => f.id !== selectedFile.id));
                    closeFile();
                } catch (error) {
                    showNotification({
                        title: t("messages.errorTitle"),
                        message: getFriendlyErrorMessage(error, { fallback: t("messages.deleteError") }),
                        type: "error",
                    });
                } finally {
                    setDeletingFileId(null);
                }
            },
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "admission_validee": return "bg-emerald-100 text-emerald-800";
            case "en_cours": return "bg-blue-100 text-blue-800";
            case "admission_rejetee": return "bg-rose-100 text-rose-800";
            case "document_manquant": return "bg-amber-100 text-amber-800";
            case "document_recu": return "bg-teal-100 text-teal-800";
            case "visa_en_cours": return "bg-purple-100 text-purple-800";
            case "termine": return "bg-slate-100 text-slate-700";
            default: return "bg-slate-100 text-slate-700";
        }
    };

    const getStatusText = (status: string) => {
        const map: Record<string, string> = {
            document_recu: t("status.documentReceived"),
            en_attente: t("status.pending"),
            en_cours: t("status.inProgress"),
            document_manquant: t("status.missingDocuments"),
            admission_validee: t("status.approved"),
            admission_rejetee: t("status.rejected"),
            en_attente_universite: t("status.waitingUniversity"),
            visa_en_cours: t("status.visaProcessing"),
            termine: t("status.completed"),
        };
        return map[status] ?? status;
    };

    const getAvatarGradient = (name: string) => {
        const gradients = [
            "from-slate-900 via-slate-800 to-slate-700",
            "from-blue-700 via-cyan-600 to-sky-500",
            "from-rose-600 via-orange-500 to-amber-400",
            "from-emerald-700 via-teal-600 to-cyan-500",
            "from-violet-700 via-fuchsia-600 to-rose-500",
        ];
        const index = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % gradients.length;
        return gradients[index];
    };

    const getInitials = (name: string) =>
        name.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("");

    const filteredFiles = files.filter(file => {
        const matchesStatus = filterStatus === "all" || file.status === filterStatus;
        const matchesSearch =
            searchTerm === "" ||
            file.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.program.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    if (isLoading) return <LoadingState message={t("loading")} />;

    // ── Vue détail ──────────────────────────────────────────────────────────
    if (selectedFile) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="joda-surface flex items-center gap-4">
                    <button
                        onClick={closeFile}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t("actions.back")}
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(selectedFile.studentName)} text-sm font-bold text-white shadow`}>
                            {getInitials(selectedFile.studentName)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{selectedFile.studentName}</h2>
                            <p className="text-sm text-slate-500">{selectedFile.program} — {selectedFile.university}</p>
                        </div>
                    </div>
                    <span className={`ml-auto rounded-full px-4 py-1.5 text-xs font-bold ${getStatusColor(selectedFile.status)}`}>
                        {getStatusText(selectedFile.status)}
                    </span>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Colonne gauche : infos + statut + notes */}
                    <div className="space-y-6 lg:col-span-1">
                        {/* Infos */}
                        <div className="joda-surface space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("detail.info")}</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <School2 className="h-4 w-4 flex-shrink-0 text-slate-400" />
                                    {selectedFile.university}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <CalendarDays className="h-4 w-4 flex-shrink-0 text-slate-400" />
                                    {t("detail.submittedOn", { date: new Date(selectedFile.created_at).toLocaleDateString(dateLocale) })}
                                </div>
                                {selectedFile.updated_at && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Clock3 className="h-4 w-4 flex-shrink-0 text-slate-400" />
                                        {t("detail.updatedOn", { date: new Date(selectedFile.updated_at).toLocaleDateString(dateLocale) })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Statut */}
                        <div className="joda-surface space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("detail.status")}</p>
                            <Select
                                value={selectedFile.status}
                                disabled={updatingStatus}
                                onValueChange={updateStatus}
                            >
                                <SelectTrigger className="w-full bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="document_manquant">{t("status.missingDocuments")}</SelectItem>
                                    <SelectItem value="document_recu">{t("status.documentReceived")}</SelectItem>
                                    <SelectItem value="en_attente">{t("status.pending")}</SelectItem>
                                    <SelectItem value="en_cours">{t("status.inProgress")}</SelectItem>
                                    <SelectItem value="admission_validee">{t("status.approved")}</SelectItem>
                                    <SelectItem value="admission_rejetee">{t("status.rejected")}</SelectItem>
                                    <SelectItem value="en_attente_universite">{t("status.waitingUniversity")}</SelectItem>
                                    <SelectItem value="visa_en_cours">{t("status.visaProcessing")}</SelectItem>
                                    <SelectItem value="termine">{t("status.completed")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Notes */}
                        <div className="joda-surface space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("detail.notes")}</p>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm transition-all focus:border-red-500 focus:ring-2 focus:ring-red-100 focus:outline-none"
                                rows={6}
                                placeholder={t("detail.notesPlaceholder")}
                            />
                            <div className="flex justify-end">
                                <Button className="bg-red-600 hover:bg-red-700" disabled={isSavingNotes} onClick={updateNotes}>
                                    {isSavingNotes ? t("actions.saving") : t("actions.save")}
                                </Button>
                            </div>
                        </div>

                        {/* Suppression */}
                        {canDelete && (
                            <div className="joda-surface">
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    disabled={deletingFileId === selectedFile.id}
                                    onClick={deleteFile}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {deletingFileId === selectedFile.id ? t("actions.deleting") : t("actions.deleteFile")}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Colonne droite : documents */}
                    <div className="lg:col-span-2">
                        <div className="joda-surface">
                            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t("detail.documents")}</p>
                            <DocumentManagement
                                studentId={selectedFile.student_id}
                                studentName={selectedFile.studentName}
                            />
                        </div>
                    </div>
                </div>

                <ConfirmDialog
                    isOpen={confirmDialog.open}
                    onClose={closeConfirm}
                    onConfirm={confirmDialog.onConfirm}
                    title={confirmDialog.title}
                    description={confirmDialog.description}
                    confirmLabel={t("actions.delete")}
                />
            </div>
        );
    }

    // ── Vue liste ───────────────────────────────────────────────────────────
    return (
        <div className="space-y-8">
            <div className="joda-surface">
                <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg">
                            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t("header.tag")}</p>
                            <h1 className="text-3xl font-bold text-slate-900">{t("header.title")}</h1>
                            <p className="text-lg text-slate-500">{t("header.subtitle")}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{files.length}</div>
                            <div className="text-sm text-slate-500">{t("stats.total")}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{files.filter(f => f.status === "admission_validee").length}</div>
                            <div className="text-sm text-slate-500">{t("stats.approved")}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{files.filter(f => f.status === "en_cours").length}</div>
                            <div className="text-sm text-slate-500">{t("stats.inProgress")}</div>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={t("filters.searchPlaceholder")} />
                    <FilterSelect
                        label={t("filters.status")}
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={[
                            { value: "document_manquant", label: t("status.missingDocuments") },
                            { value: "document_recu", label: t("status.documentReceived") },
                            { value: "en_attente", label: t("status.pending") },
                            { value: "en_cours", label: t("status.inProgress") },
                            { value: "admission_validee", label: t("status.approved") },
                            { value: "admission_rejetee", label: t("status.rejected") },
                        ]}
                    />
                </div>
            </div>

            {filteredFiles.length === 0 ? (
                <div className="joda-surface py-20 text-center">
                    <p className="text-slate-400">{t("empty")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredFiles.map(file => (
                        <div
                            key={file.id}
                            className="relative cursor-pointer overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)]"
                            onClick={() => openFile(file)}
                        >
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.92),transparent_34%)]" />
                            <div className="relative space-y-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(file.studentName)} text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,23,42,0.22)]`}>
                                            {getInitials(file.studentName)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-950">{file.studentName}</h3>
                                                {file.status === "admission_validee" && <Sparkles className="h-4 w-4 text-emerald-500" />}
                                            </div>
                                            <p className="text-sm text-slate-500">{file.program}</p>
                                        </div>
                                    </div>
                                    <span className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${getStatusColor(file.status)}`}>
                                        {getStatusText(file.status)}
                                    </span>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-[1.4rem] border border-white/80 bg-white/75 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            <School2 className="h-3.5 w-3.5" />
                                            {t("card.targetUniversity")}
                                        </div>
                                        <p className="text-sm font-semibold text-slate-900">{file.university}</p>
                                    </div>
                                    <div className="rounded-[1.4rem] border border-white/80 bg-white/75 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            {t("card.deposit")}
                                        </div>
                                        <p className="text-sm font-semibold text-slate-900">{new Date(file.created_at).toLocaleDateString(dateLocale)}</p>
                                    </div>
                                </div>

                                {file.notes_internes && (
                                    <div className="flex items-start gap-3 rounded-[1.4rem] border border-sky-200 bg-sky-50/80 p-4">
                                        <Clock3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" />
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">{t("card.followUpNote")}</p>
                                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-700">{file.notes_internes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.open}
                onClose={closeConfirm}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                description={confirmDialog.description}
                confirmLabel={t("actions.delete")}
            />
        </div>
    );
}
