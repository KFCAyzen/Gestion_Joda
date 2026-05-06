"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, Clock3, School2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { SearchBar, FilterSelect, PageHeader, LoadingState, StatsCard } from "./shared";

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
    const { showNotification } = useNotificationContext();
    const [files, setFiles] = useState<ScholarshipFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<ScholarshipFile | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [notes, setNotes] = useState("");

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
                    studentName: student ? `${student.prenom} ${student.nom}` : "Étudiant inconnu",
                    university_id: file.university_id,
                    university: university?.nom || "Université inconnue",
                    program: file.desired_program || "Programme non renseigné",
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
            console.error("Erreur chargement dossiers:", error);
            showNotification("Erreur lors du chargement des dossiers", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedFile) {
            setNotes(selectedFile.notes_internes || "");
        }
    }, [selectedFile]);

    const updateStatus = async (fileId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from("dossier_bourses")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", fileId);

            if (error) throw error;

            showNotification("Statut mis à jour", "success");
            await loadData();
            if (selectedFile?.id === fileId) {
                setSelectedFile({ ...selectedFile, status: newStatus });
            }
        } catch (error) {
            console.error("Erreur mise à jour statut:", error);
            showNotification("Erreur lors de la mise à jour", "error");
        }
    };

    const updateNotes = async () => {
        if (!selectedFile) return;

        try {
            const { error } = await supabase
                .from("dossier_bourses")
                .update({ notes_internes: notes, updated_at: new Date().toISOString() })
                .eq("id", selectedFile.id);

            if (error) throw error;

            showNotification("Notes sauvegardées", "success");
            await loadData();
        } catch (error) {
            console.error("Erreur sauvegarde notes:", error);
            showNotification("Erreur lors de la sauvegarde", "error");
        }
    };

    const deleteFile = async (fileId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce dossier ?")) return;

        try {
            const { error } = await supabase.from("dossier_bourses").delete().eq("id", fileId);

            if (error) throw error;

            showNotification("Dossier supprimé", "success");
            if (selectedFile?.id === fileId) {
                setSelectedFile(null);
            }
            await loadData();
        } catch (error) {
            console.error("Erreur suppression dossier:", error);
            showNotification("Erreur lors de la suppression", "error");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "admission_validee":
                return "bg-emerald-100 text-emerald-800";
            case "en_cours":
                return "bg-blue-100 text-blue-800";
            case "admission_rejetee":
                return "bg-rose-100 text-rose-800";
            case "document_manquant":
                return "bg-amber-100 text-amber-800";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "document_recu":
                return "Document reçu";
            case "en_attente":
                return "En attente";
            case "en_cours":
                return "En cours";
            case "document_manquant":
                return "Documents manquants";
            case "admission_validee":
                return "Approuvé";
            case "admission_rejetee":
                return "Rejeté";
            case "en_attente_universite":
                return "En attente université";
            case "visa_en_cours":
                return "Visa en cours";
            case "termine":
                return "Terminé";
            default:
                return status;
        }
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
        name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("");

    const filteredFiles = files.filter((file) => {
        const matchesStatus = filterStatus === "all" || file.status === filterStatus;
        const matchesSearch =
            searchTerm === "" ||
            file.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.program.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    if (isLoading) {
        return <LoadingState message="Chargement des dossiers..." />;
    }

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
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Gestion dossiers</p>
                            <h1 className="text-3xl font-bold text-slate-900">Gestion des Dossiers</h1>
                            <p className="text-lg text-slate-500">Suivi avancé des candidatures de bourses</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{files.length}</div>
                            <div className="text-sm text-slate-500">Total</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{files.filter((f) => f.status === "admission_validee").length}</div>
                            <div className="text-sm text-slate-500">Approuvés</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{files.filter((f) => f.status === "en_cours").length}</div>
                            <div className="text-sm text-slate-500">En cours</div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Rechercher par nom, université ou programme..."
                    />
                    <FilterSelect
                        label="Statut"
                        value={filterStatus}
                        onChange={setFilterStatus}
                        options={[
                            { value: "document_manquant", label: "Documents manquants" },
                            { value: "en_attente", label: "En attente" },
                            { value: "en_cours", label: "En cours" },
                            { value: "admission_validee", label: "Approuvé" },
                            { value: "admission_rejetee", label: "Rejeté" },
                        ]}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
                <div className="xl:col-span-3">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {filteredFiles.map((file) => (
                            <div
                                key={file.id}
                                className={`relative cursor-pointer overflow-hidden rounded-[2rem] border bg-gradient-to-br from-slate-50 via-white to-slate-100 border-slate-200 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)] ${
                                    selectedFile?.id === file.id
                                        ? "ring-2 ring-red-500 shadow-[0_24px_54px_rgba(239,68,68,0.16)]"
                                        : "shadow-[0_18px_45px_rgba(15,23,42,0.07)]"
                                }`}
                                onClick={() => setSelectedFile(file)}
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
                                        <span className={`rounded-full px-4 py-2 text-xs font-bold shadow-sm ${getStatusColor(file.status)}`}>
                                            {getStatusText(file.status)}
                                        </span>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-[1.4rem] border border-white/80 bg-white/75 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                <School2 className="h-3.5 w-3.5" />
                                                Université cible
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900">{file.university}</p>
                                        </div>
                                        <div className="rounded-[1.4rem] border border-white/80 bg-white/75 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                Dépôt
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900">{new Date(file.created_at).toLocaleDateString("fr-FR")}</p>
                                        </div>
                                    </div>

                                    {file.notes_internes && (
                                        <div className="flex items-start gap-3 rounded-[1.4rem] border border-sky-200 bg-sky-50/80 p-4">
                                            <Clock3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" />
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">Note de suivi</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-700">{file.notes_internes}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="xl:col-span-1">
                    <div className="sticky top-6">
                        {selectedFile ? (
                            <div className="space-y-6">
                                <div className="joda-surface">
                                    <div className="mb-8 text-center">
                                        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(selectedFile.studentName)} text-2xl font-bold text-white shadow-lg`}>
                                            {getInitials(selectedFile.studentName)}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900">{selectedFile.studentName}</h3>
                                        <p className="text-slate-600">{selectedFile.program}</p>
                                        <span className={`mt-2 inline-block rounded-full px-4 py-2 text-sm font-bold ${getStatusColor(selectedFile.status)}`}>
                                            {getStatusText(selectedFile.status)}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="rounded-xl bg-slate-50 p-5">
                                            <div className="text-sm text-slate-600">Université</div>
                                            <div className="font-semibold text-slate-900">{selectedFile.university}</div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg bg-blue-50 p-4">
                                                <div className="text-xs text-blue-600">Soumis</div>
                                                <div className="text-sm font-semibold text-blue-900">{new Date(selectedFile.created_at).toLocaleDateString("fr-FR")}</div>
                                            </div>
                                            <div className="rounded-lg bg-green-50 p-4">
                                                <div className="text-xs text-green-600">Mis à jour</div>
                                                <div className="text-sm font-semibold text-green-900">{selectedFile.updated_at ? new Date(selectedFile.updated_at).toLocaleDateString("fr-FR") : "-"}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <div className="mb-3 text-sm font-bold text-slate-700">Statut du dossier</div>
                                        <Select
                                            value={selectedFile.status}
                                            onValueChange={(v) => updateStatus(selectedFile.id, v || "en_attente")}
                                        >
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="document_manquant">Documents manquants</SelectItem>
                                                <SelectItem value="en_attente">En attente</SelectItem>
                                                <SelectItem value="en_cours">En cours</SelectItem>
                                                <SelectItem value="admission_validee">Approuvé</SelectItem>
                                                <SelectItem value="admission_rejetee">Rejeté</SelectItem>
                                                <SelectItem value="termine">Terminé</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {canDelete && (
                                        <div className="mt-6">
                                            <Button
                                                variant="destructive"
                                                className="w-full"
                                                onClick={() => deleteFile(selectedFile.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Supprimer le dossier
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="joda-surface">
                                    <h3 className="mb-4 text-lg font-bold text-slate-900">Notes & Commentaires</h3>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500"
                                        rows={6}
                                        placeholder="Ajouter des notes, commentaires ou observations sur ce dossier..."
                                    />
                                    <div className="mt-3 flex justify-end">
                                        <Button className="bg-red-600 hover:bg-red-700" onClick={updateNotes}>Sauvegarder</Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="joda-surface px-8 py-20 text-center">
                                <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
                                    <svg className="h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="mb-3 text-lg font-semibold text-slate-900">Aucun dossier sélectionné</h3>
                                <p className="text-slate-500">Clique sur un dossier pour voir les détails et gérer les documents.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
