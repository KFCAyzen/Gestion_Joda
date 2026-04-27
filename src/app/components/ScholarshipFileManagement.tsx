"use client";

import React, { useState } from "react";
import { AlertTriangle, CalendarDays, CircleCheckBig, Clock3, FileBadge2, School2, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ScholarshipFile {
    id: string;
    studentName: string;
    university: string;
    program: string;
    status: "incomplete" | "pending" | "review" | "approved" | "rejected";
    documents: {
        passport: boolean;
        criminalRecord: boolean;
        photo: boolean;
        transcript: boolean;
        diploma: boolean;
        motivationLetter: boolean;
        recommendationLetter: boolean;
        hskCertificate: boolean;
    };
    submissionDate: string;
    lastUpdate: string;
    notes: string;
    priority: "low" | "medium" | "high";
}

export default function ScholarshipFileManagement() {
    const [files, setFiles] = useState<ScholarshipFile[]>([
        {
            id: "1",
            studentName: "Marie Dupont",
            university: "Université de Pékin",
            program: "Informatique",
            status: "pending",
            documents: {
                passport: true,
                criminalRecord: true,
                photo: true,
                transcript: false,
                diploma: false,
                motivationLetter: true,
                recommendationLetter: false,
                hskCertificate: true,
            },
            submissionDate: "2024-01-15",
            lastUpdate: "2024-01-20",
            notes: "En attente du relevé de notes",
            priority: "high",
        },
        {
            id: "2",
            studentName: "Jean Martin",
            university: "Université Tsinghua",
            program: "Économie",
            status: "review",
            documents: {
                passport: true,
                criminalRecord: true,
                photo: true,
                transcript: true,
                diploma: true,
                motivationLetter: true,
                recommendationLetter: true,
                hskCertificate: false,
            },
            submissionDate: "2024-01-10",
            lastUpdate: "2024-01-22",
            notes: "Dossier complet, en attente certificat HSK",
            priority: "medium",
        },
        {
            id: "3",
            studentName: "Sophie Chen",
            university: "Université Fudan",
            program: "Médecine",
            status: "approved",
            documents: {
                passport: true,
                criminalRecord: true,
                photo: true,
                transcript: true,
                diploma: true,
                motivationLetter: true,
                recommendationLetter: true,
                hskCertificate: true,
            },
            submissionDate: "2024-01-05",
            lastUpdate: "2024-01-25",
            notes: "Bourse approuvée - félicitations !",
            priority: "low",
        },
    ]);

    const [selectedFile, setSelectedFile] = useState<ScholarshipFile | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");

    const getStatusColor = (status: string) => {
        switch (status) {
            case "incomplete":
                return "bg-slate-100 text-slate-700";
            case "pending":
                return "bg-amber-100 text-amber-800";
            case "review":
                return "bg-blue-100 text-blue-800";
            case "approved":
                return "bg-emerald-100 text-emerald-800";
            case "rejected":
                return "bg-rose-100 text-rose-800";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high":
                return "bg-rose-500";
            case "medium":
                return "bg-amber-500";
            case "low":
                return "bg-emerald-500";
            default:
                return "bg-slate-500";
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case "high":
                return "Priorité haute";
            case "medium":
                return "Priorité moyenne";
            case "low":
                return "Priorité faible";
            default:
                return "Priorité standard";
        }
    };

    const getPriorityCardStyle = (priority: string) => {
        switch (priority) {
            case "high":
                return "from-rose-50 via-white to-orange-50 border-rose-200/70";
            case "medium":
                return "from-amber-50 via-white to-sky-50 border-amber-200/70";
            case "low":
                return "from-emerald-50 via-white to-teal-50 border-emerald-200/70";
            default:
                return "from-slate-50 via-white to-slate-100 border-slate-200";
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

    const getDocumentName = (docType: string) => {
        const names: Record<string, string> = {
            passport: "Passeport",
            criminalRecord: "Casier judiciaire",
            photo: "Photo d'identité",
            transcript: "Relevé de notes",
            diploma: "Diplôme",
            motivationLetter: "Lettre de motivation",
            recommendationLetter: "Lettre de recommandation",
            hskCertificate: "Certificat HSK",
        };
        return names[docType] || docType;
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "incomplete":
                return "Incomplet";
            case "pending":
                return "En attente";
            case "review":
                return "En révision";
            case "approved":
                return "Approuvé";
            case "rejected":
                return "Rejeté";
            default:
                return status;
        }
    };

    const getCompletionPercentage = (documents: ScholarshipFile["documents"]) => {
        const total = Object.keys(documents).length;
        const completed = Object.values(documents).filter(Boolean).length;
        return Math.round((completed / total) * 100);
    };

    const filteredFiles = files.filter((file) => {
        const matchesStatus = filterStatus === "all" || file.status === filterStatus;
        const matchesSearch =
            searchTerm === "" ||
            file.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.university.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.program.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const selectedDocumentsCount = (documents: ScholarshipFile["documents"]) =>
        Object.values(documents).filter(Boolean).length;

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
                            <div className="text-2xl font-bold text-emerald-600">{files.filter((f) => f.status === "approved").length}</div>
                            <div className="text-sm text-slate-500">Approuvés</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{files.filter((f) => f.status === "review").length}</div>
                            <div className="text-sm text-slate-500">En révision</div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <Input
                            type="text"
                            placeholder="Rechercher par nom, université ou programme..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/80 pl-4"
                        />
                    </div>
                    <Select value={filterStatus || "all"} onValueChange={(v) => setFilterStatus(v || "all")}>
                        <SelectTrigger className="w-[200px] bg-white/80">
                            <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les statuts</SelectItem>
                            <SelectItem value="incomplete">Incomplet</SelectItem>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="review">En révision</SelectItem>
                            <SelectItem value="approved">Approuvé</SelectItem>
                            <SelectItem value="rejected">Rejeté</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-4">
                <div className="xl:col-span-3">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {filteredFiles.map((file) => (
                            <div
                                key={file.id}
                                className={`relative cursor-pointer overflow-hidden rounded-[2rem] border bg-gradient-to-br p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(15,23,42,0.12)] ${
                                    getPriorityCardStyle(file.priority)
                                } ${
                                    selectedFile?.id === file.id
                                        ? "ring-2 ring-red-500 shadow-[0_24px_54px_rgba(239,68,68,0.16)]"
                                        : "shadow-[0_18px_45px_rgba(15,23,42,0.07)]"
                                }`}
                                onClick={() => setSelectedFile(file)}
                            >
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.92),transparent_34%)]" />
                                <div className={`absolute left-5 top-5 h-2.5 w-2.5 rounded-full ${getPriorityColor(file.priority)}`} />
                                <div className="relative space-y-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarGradient(file.studentName)} text-sm font-bold text-white shadow-[0_16px_32px_rgba(15,23,42,0.22)]`}>
                                                {getInitials(file.studentName)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-slate-950">{file.studentName}</h3>
                                                    {file.status === "approved" && <Sparkles className="h-4 w-4 text-emerald-500" />}
                                                </div>
                                                <p className="text-sm text-slate-500">{file.program}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`rounded-full px-4 py-2 text-xs font-bold shadow-sm ${getStatusColor(file.status)}`}>
                                                {getStatusText(file.status)}
                                            </span>
                                            <span className="rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                                {getPriorityLabel(file.priority)}
                                            </span>
                                        </div>
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
                                            <p className="text-sm font-semibold text-slate-900">{new Date(file.submissionDate).toLocaleDateString("fr-FR")}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-[1.6rem] border border-white/80 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Complétude dossier</p>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    {selectedDocumentsCount(file.documents)} document(s) reçu(s) sur {Object.keys(file.documents).length}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-semibold tracking-tight text-slate-950">{getCompletionPercentage(file.documents)}%</p>
                                            </div>
                                        </div>
                                        <div className="h-3.5 w-full rounded-full bg-slate-200/80">
                                            <div
                                                className="h-3.5 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 shadow-[0_10px_20px_rgba(249,115,22,0.28)]"
                                                style={{ width: `${getCompletionPercentage(file.documents)}%` }}
                                            />
                                        </div>
                                        <div className="mt-4 grid grid-cols-4 gap-2">
                                            {Object.entries(file.documents).slice(0, 8).map(([key, completed]) => (
                                                <div
                                                    key={key}
                                                    className={`flex h-10 items-center justify-center rounded-xl border text-center text-xs font-semibold ${
                                                        completed
                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                            : "border-slate-200 bg-slate-100 text-slate-400"
                                                    }`}
                                                    title={getDocumentName(key)}
                                                >
                                                    {completed ? <CircleCheckBig className="h-4 w-4" /> : <FileBadge2 className="h-4 w-4" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {file.notes && (
                                        <div className="flex items-start gap-3 rounded-[1.4rem] border border-sky-200 bg-sky-50/80 p-4">
                                            {file.priority === "high" ? (
                                                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" />
                                            ) : (
                                                <Clock3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-500" />
                                            )}
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">Note de suivi</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-700">{file.notes}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between border-t border-slate-200/80 pt-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Star className="h-3.5 w-3.5" />
                                            Dernière mise à jour : {new Date(file.lastUpdate).toLocaleDateString("fr-FR")}
                                        </div>
                                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                            Ouvrir la fiche
                                        </span>
                                    </div>
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
                                                <div className="text-sm font-semibold text-blue-900">{new Date(selectedFile.submissionDate).toLocaleDateString("fr-FR")}</div>
                                            </div>
                                            <div className="rounded-lg bg-green-50 p-4">
                                                <div className="text-xs text-green-600">Mis à jour</div>
                                                <div className="text-sm font-semibold text-green-900">{new Date(selectedFile.lastUpdate).toLocaleDateString("fr-FR")}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <div className="mb-3 text-sm font-bold text-slate-700">Statut du dossier</div>
                                        <Select
                                            value={selectedFile.status}
                                            onValueChange={(v) => {
                                                const newStatus = (v || "pending") as ScholarshipFile["status"];
                                                const updatedFile = { ...selectedFile, status: newStatus, lastUpdate: new Date().toISOString().split("T")[0] };
                                                setFiles(files.map((f) => (f.id === selectedFile.id ? updatedFile : f)));
                                                setSelectedFile(updatedFile);
                                            }}
                                        >
                                            <SelectTrigger className="w-full bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="incomplete">Incomplet</SelectItem>
                                                <SelectItem value="pending">En attente</SelectItem>
                                                <SelectItem value="review">En révision</SelectItem>
                                                <SelectItem value="approved">Approuvé</SelectItem>
                                                <SelectItem value="rejected">Rejeté</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="joda-surface">
                                    <h3 className="mb-6 text-lg font-bold text-slate-900">
                                        Documents requis
                                    </h3>
                                    <div className="space-y-4">
                                        {Object.entries(selectedFile.documents).map(([key, completed]) => (
                                            <div key={key} className={`rounded-xl border-2 p-4 ${completed ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium text-slate-900">{getDocumentName(key)}</div>
                                                        <div className={`text-xs ${completed ? "text-green-600" : "text-slate-500"}`}>
                                                            {completed ? "Reçu" : "En attente"}
                                                        </div>
                                                    </div>
                                                    <label className="relative inline-flex cursor-pointer items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={completed}
                                                            onChange={(e) => {
                                                                const updatedFile = {
                                                                    ...selectedFile,
                                                                    documents: {
                                                                        ...selectedFile.documents,
                                                                        [key]: e.target.checked,
                                                                    },
                                                                };
                                                                setFiles(files.map((f) => (f.id === selectedFile.id ? updatedFile : f)));
                                                                setSelectedFile(updatedFile);
                                                            }}
                                                            className="peer sr-only"
                                                        />
                                                        <div className="relative h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-red-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white" />
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="joda-surface">
                                    <h3 className="mb-4 text-lg font-bold text-slate-900">Notes & Commentaires</h3>
                                    <textarea
                                        value={selectedFile.notes}
                                        onChange={(e) => {
                                            const updatedFile = { ...selectedFile, notes: e.target.value };
                                            setFiles(files.map((f) => (f.id === selectedFile.id ? updatedFile : f)));
                                            setSelectedFile(updatedFile);
                                        }}
                                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 transition-all focus:border-red-500 focus:ring-2 focus:ring-red-500"
                                        rows={6}
                                        placeholder="Ajouter des notes, commentaires ou observations sur ce dossier..."
                                    />
                                    <div className="mt-3 flex justify-end">
                                        <Button className="bg-red-600 hover:bg-red-700">Sauvegarder</Button>
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
