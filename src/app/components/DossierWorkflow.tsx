"use client";

import React, { useState, useCallback } from 'react';
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { useAuth } from '../context/AuthContext';
import { useNotificationContext } from '../context/NotificationContext';
import { logActivity } from '../utils/activityLogger';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DossierBourse {
    id: string;
    student_id: string;
    status: string;
    notes_internes: string;
    university_id: string;
    assigned_to: string;
    created_at: string;
    updated_at: string;
}

interface DossierHistory {
    id: string;
    dossier_id: string;
    action: string;
    status: string;
    description: string;
    performed_by: string;
    performed_at: string;
}

type DossierStatus = 'document_recu' | 'en_attente' | 'en_cours' | 'document_manquant' | 'admission_validee' | 'admission_rejetee' | 'en_attente_universite' | 'visa_en_cours' | 'termine';

const DOSSIER_STATUSES: { 
    status: DossierStatus; 
    label: string; 
    color: string; 
    description: string;
    nextStatuses: DossierStatus[];
}[] = [
    { status: 'document_recu', label: 'Document reçu', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300', description: 'Les documents ont été reçus', nextStatuses: ['en_attente', 'document_manquant'] },
    { status: 'en_attente', label: 'En attente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', description: 'Dossier en attente', nextStatuses: ['en_cours', 'document_manquant'] },
    { status: 'en_cours', label: 'En cours', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', description: 'En cours de traitement', nextStatuses: ['admission_validee', 'admission_rejetee', 'document_manquant'] },
    { status: 'document_manquant', label: 'Document manquant', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', description: 'Documents manquants', nextStatuses: ['document_recu', 'en_attente'] },
    { status: 'admission_validee', label: 'Admission validée', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', description: 'Admission validée', nextStatuses: ['en_attente_universite', 'visa_en_cours'] },
    { status: 'admission_rejetee', label: 'Admission rejetée', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', description: 'Admission rejetée', nextStatuses: ['en_attente', 'en_cours'] },
    { status: 'en_attente_universite', label: 'En attente université', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300', description: 'En attente université', nextStatuses: ['visa_en_cours', 'admission_rejetee'] },
    { status: 'visa_en_cours', label: 'Visa en cours', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300', description: 'Visa en cours', nextStatuses: ['termine'] },
    { status: 'termine', label: 'Terminé', color: 'bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-200', description: 'Terminé', nextStatuses: [] }
];

interface StudentLite {
    id: string;
    nom: string;
    prenom: string;
}

export default function DossierWorkflow() {
    const { user } = useAuth();
    const supabase = createClient();
    const t = useTranslations("dossierWorkflow");
    const { showNotification } = useNotificationContext();
    const [submitting, setSubmitting] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<DossierStatus>('en_attente');
    const [statusChangeModal, setStatusChangeModal] = useState<{
        dossier: DossierBourse;
        newStatus: DossierStatus;
        description: string;
    } | null>(null);

    // Liste des étudiants (id/nom/prénom) indépendante du statut : mise en cache
    // une fois plutôt que rechargée à chaque changement d'onglet.
    const { data: students = [] } = useQuery({
        queryKey: ['dossier-workflow', 'students-min'],
        staleTime: 60 * 1000,
        queryFn: async () => {
            const { data } = await supabase.from('students').select('id, nom, prenom');
            return (data ?? []) as StudentLite[];
        },
    });

    // Dossiers du statut sélectionné, mis en cache par statut : revenir sur un
    // onglet déjà consulté est instantané (plus de rechargement réseau).
    const { data: dossiers = [], isLoading: loading, refetch: refetchDossiers } = useQuery({
        queryKey: ['dossier-workflow', 'by-status', selectedStatus],
        staleTime: 60 * 1000,
        queryFn: async () => {
            const { data } = await supabase
                .from('dossier_bourses')
                .select('*')
                .eq('status', selectedStatus)
                .order('created_at', { ascending: false });
            return (data ?? []) as DossierBourse[];
        },
    });

    const getStudentName = useCallback(
        (studentId: string | null | undefined): string | null => {
            if (!studentId) return null;
            const s = students.find((s) => s.id === studentId);
            return s ? `${s.prenom} ${s.nom}` : null;
        },
        [students]
    );

    const handleStatusChange = async () => {
        if (!statusChangeModal || !user || submitting) return;

        const allowed = DOSSIER_STATUSES.find((s) => s.status === statusChangeModal.dossier.status)?.nextStatuses ?? [];
        if (!allowed.includes(statusChangeModal.newStatus)) {
            showNotification("Transition non autorisée", "error");
            return;
        }

        setSubmitting(true);
        try {
            const { error: updateErr } = await supabase.from('dossier_bourses').update({
                status: statusChangeModal.newStatus,
                updated_at: new Date().toISOString()
            }).eq('id', statusChangeModal.dossier.id);

            if (updateErr) throw updateErr;

            await supabase.from('dossier_history').insert({
                dossier_id: statusChangeModal.dossier.id,
                action: 'status_change',
                status: statusChangeModal.newStatus,
                description: statusChangeModal.description,
                performed_by: user.id
            });

            const studentName = getStudentName(statusChangeModal.dossier.student_id) ?? statusChangeModal.dossier.student_id;
            await logActivity(
                user.id, user.name, user.role,
                "dossier_status_change", "dossier_bourses", statusChangeModal.dossier.id,
                `Dossier ${studentName} : ${statusChangeModal.dossier.status} → ${statusChangeModal.newStatus}`,
                {
                    dossier_id: statusChangeModal.dossier.id,
                    previous_status: statusChangeModal.dossier.status,
                    new_status: statusChangeModal.newStatus,
                }
            );

            showNotification("Statut du dossier mis à jour", "success");
            await refetchDossiers();
            setStatusChangeModal(null);
        } catch (err) {
            console.error("Erreur changement statut dossier:", err);
            showNotification("Erreur lors de la mise à jour du statut", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusConfig = (status: string) => {
        return DOSSIER_STATUSES.find(s => s.status === status);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'document_recu': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
            case 'en_attente': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'en_cours': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
            case 'document_manquant': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>;
            case 'admission_validee': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'admission_rejetee': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
            case 'visa_en_cours': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
            case 'termine': return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">{t("loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">
                    {t("title")}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    {t("description")}
                </p>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>{t("filterTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {DOSSIER_STATUSES.map((statusConfig) => (
                            <button
                                key={statusConfig.status}
                                onClick={() => setSelectedStatus(statusConfig.status as DossierStatus)}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                    selectedStatus === statusConfig.status
                                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1 rounded ${statusConfig.color}`}>
                                        {getStatusIcon(statusConfig.status)}
                                    </div>
                                    <span className="font-medium text-sm">{statusConfig.label}</span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 text-left">
                                    {statusConfig.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("listTitle", { label: getStatusConfig(selectedStatus)?.label ?? selectedStatus, count: dossiers.length })}</CardTitle>
                </CardHeader>
                <CardContent>
                    {dossiers.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">{t("empty")}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dossiers.map((dossier) => (
                                <div key={dossier.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                                {getStudentName(dossier.student_id) ?? t("fileId", { id: dossier.id.slice(0, 8) })}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {t("fileId", { id: dossier.id.slice(0, 8) })}
                                            </p>
                                        </div>
                                        <Badge className={getStatusConfig(dossier.status)?.color}>
                                            {getStatusConfig(dossier.status)?.label}
                                        </Badge>
                                    </div>

                                    {dossier.notes_internes && user?.role !== 'student' && (
                                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">{t("internalNotes")}</p>
                                            <p className="text-sm text-yellow-700 dark:text-yellow-300">{dossier.notes_internes}</p>
                                        </div>
                                    )}

                                    {user?.role !== 'student' && (
                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                            {getStatusConfig(dossier.status)?.nextStatuses.map((nextStatus) => (
                                                <Button
                                                    key={nextStatus}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setStatusChangeModal({
                                                        dossier,
                                                        newStatus: nextStatus,
                                                        description: ''
                                                    })}
                                                >
                                                    → {getStatusConfig(nextStatus)?.label}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {statusChangeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {t("changeStatusTitle")}
                            </h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                {t("changeStatusDesc", { from: getStatusConfig(statusChangeModal.dossier.status)?.label ?? statusChangeModal.dossier.status, to: getStatusConfig(statusChangeModal.newStatus)?.label ?? statusChangeModal.newStatus })}
                            </p>
                            <div className="space-y-2">
                                <Label>{t("actionLabel")}</Label>
                                <Input
                                    value={statusChangeModal.description}
                                    onChange={(e) => setStatusChangeModal({
                                        ...statusChangeModal,
                                        description: e.target.value
                                    })}
                                    placeholder={t("actionPlaceholder")}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                            <Button variant="outline" onClick={() => setStatusChangeModal(null)} disabled={submitting} className="flex-1">
                                {t("cancel")}
                            </Button>
                            <Button onClick={handleStatusChange} disabled={submitting || !statusChangeModal.description.trim()} className="flex-1">
                                {submitting ? "..." : t("confirm")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
