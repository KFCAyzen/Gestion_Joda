"use client";

import { useState } from 'react';
import { useDossiersBourses } from '../hooks/useJodaData';
import { useAuth } from '../context/AuthContext';
import { DossierBourse, DossierStatus } from '../types/joda';
import { sanitizeForHtml } from '../utils/security';

const DOSSIER_STATUSES: { 
    status: DossierStatus; 
    label: string; 
    color: string; 
    description: string;
    nextStatuses: DossierStatus[];
}[] = [
    {
        status: 'document_recu',
        label: 'Document reçu',
        color: 'bg-blue-100 text-blue-800',
        description: 'Les documents ont été reçus et sont en cours de vérification',
        nextStatuses: ['en_attente', 'document_manquant']
    },
    {
        status: 'en_attente',
        label: 'En attente',
        color: 'bg-yellow-100 text-yellow-800',
        description: 'Dossier en attente de traitement',
        nextStatuses: ['en_cours', 'document_manquant']
    },
    {
        status: 'en_cours',
        label: 'En cours',
        color: 'bg-purple-100 text-purple-800',
        description: 'Dossier en cours de traitement par l\'équipe',
        nextStatuses: ['admission_validee', 'admission_rejetee', 'document_manquant']
    },
    {
        status: 'document_manquant',
        label: 'Document manquant',
        color: 'bg-orange-100 text-orange-800',
        description: 'Des documents sont manquants ou non conformes',
        nextStatuses: ['document_recu', 'en_attente']
    },
    {
        status: 'admission_validee',
        label: 'Admission validée',
        color: 'bg-green-100 text-green-800',
        description: 'L\'admission a été validée par l\'université',
        nextStatuses: ['en_attente_universite', 'visa_en_cours']
    },
    {
        status: 'admission_rejetee',
        label: 'Admission rejetée',
        color: 'bg-red-100 text-red-800',
        description: 'L\'admission a été rejetée par l\'université',
        nextStatuses: ['en_attente', 'en_cours'] // Possibilité de repostuler
    },
    {
        status: 'en_attente_universite',
        label: 'En attente université',
        color: 'bg-indigo-100 text-indigo-800',
        description: 'En attente de confirmation de l\'université',
        nextStatuses: ['visa_en_cours', 'admission_rejetee']
    },
    {
        status: 'visa_en_cours',
        label: 'Visa en cours',
        color: 'bg-teal-100 text-teal-800',
        description: 'Procédure de visa en cours',
        nextStatuses: ['termine']
    },
    {
        status: 'termine',
        label: 'Terminé',
        color: 'bg-green-200 text-green-900',
        description: 'Dossier terminé avec succès',
        nextStatuses: []
    }
];

export default function DossierWorkflow() {
    const { user } = useAuth();
    const { dossiers, loading, loadDossiersByStatus, changeDossierStatus } = useDossiersBourses();
    const [selectedStatus, setSelectedStatus] = useState<DossierStatus>('en_attente');
    const [statusChangeModal, setStatusChangeModal] = useState<{
        dossier: DossierBourse;
        newStatus: DossierStatus;
        description: string;
    } | null>(null);

    const handleStatusChange = async () => {
        if (!statusChangeModal) return;

        const success = await changeDossierStatus(
            statusChangeModal.dossier.id,
            statusChangeModal.newStatus,
            user?.username || 'system',
            statusChangeModal.description
        );

        if (success) {
            await loadDossiersByStatus(selectedStatus);
            setStatusChangeModal(null);
        }
    };

    const getStatusConfig = (status: DossierStatus) => {
        return DOSSIER_STATUSES.find(s => s.status === status);
    };

    const getStatusIcon = (status: DossierStatus) => {
        switch (status) {
            case 'document_recu':
                return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>;
            case 'en_attente':
                return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>;
            case 'en_cours':
                return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>;
            case 'document_manquant':
                return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>;
            case 'admission_validee':
                return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>;
            case 'admission_rejetee':
                return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>;
            case 'visa_en_cours':
                return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>;
            case 'termine':
                return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>;
            default:
                return null;
        }
    };

    // Charger les dossiers quand le statut sélectionné change
    React.useEffect(() => {
        loadDossiersByStatus(selectedStatus);
    }, [selectedStatus, loadDossiersByStatus]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement des dossiers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-2">
                    Workflow des Dossiers de Bourses
                </h1>
                <p className="text-gray-600">
                    Gérez le suivi des dossiers d'étudiants à travers les différentes étapes du processus
                </p>
            </div>

            {/* Filtres par statut */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4">Filtrer par statut</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {DOSSIER_STATUSES.map((statusConfig) => (
                            <button
                                key={statusConfig.status}
                                onClick={() => setSelectedStatus(statusConfig.status)}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                    selectedStatus === statusConfig.status
                                        ? 'border-red-500 bg-red-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1 rounded ${statusConfig.color}`}>
                                        {getStatusIcon(statusConfig.status)}
                                    </div>
                                    <span className="font-medium text-sm">{statusConfig.label}</span>
                                </div>
                                <div className="text-xs text-gray-600 text-left">
                                    {statusConfig.description}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Liste des dossiers */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-800">
                        Dossiers - {getStatusConfig(selectedStatus)?.label} ({dossiers.length})
                    </h2>
                </div>
                
                <div className="p-6">
                    {dossiers.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                {getStatusIcon(selectedStatus)}
                            </div>
                            <p className="text-gray-500">Aucun dossier avec ce statut</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dossiers.map((dossier) => (
                                <div key={dossier.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-1">
                                                Dossier #{sanitizeForHtml(dossier.id)}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Étudiant ID: {sanitizeForHtml(dossier.studentId)}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Assigné à: {sanitizeForHtml(dossier.assignedTo || 'Non assigné')}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusConfig(dossier.status)?.color}`}>
                                                {getStatusConfig(dossier.status)?.label}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes internes */}
                                    {dossier.notes_internes && user?.role !== 'student' && (
                                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm font-medium text-yellow-800 mb-1">Notes internes :</p>
                                            <p className="text-sm text-yellow-700">{sanitizeForHtml(dossier.notes_internes)}</p>
                                        </div>
                                    )}

                                    {/* Historique récent */}
                                    {dossier.historique.length > 0 && (
                                        <div className="mb-4">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Dernières actions :</h4>
                                            <div className="space-y-2">
                                                {dossier.historique.slice(-3).map((entry, index) => (
                                                    <div key={index} className="flex items-start gap-3 text-sm">
                                                        <div className="w-2 h-2 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                                                        <div>
                                                            <p className="text-gray-900">{sanitizeForHtml(entry.description)}</p>
                                                            <p className="text-gray-500 text-xs">
                                                                {new Date(entry.performedAt).toLocaleDateString('fr-FR')} par {sanitizeForHtml(entry.performedBy)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions possibles */}
                                    {user?.role !== 'student' && (
                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                                            {getStatusConfig(dossier.status)?.nextStatuses.map((nextStatus) => (
                                                <button
                                                    key={nextStatus}
                                                    onClick={() => setStatusChangeModal({
                                                        dossier,
                                                        newStatus: nextStatus,
                                                        description: ''
                                                    })}
                                                    className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                                                >
                                                    → {getStatusConfig(nextStatus)?.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de changement de statut */}
            {statusChangeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Changer le statut du dossier
                            </h3>
                        </div>
                        
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-gray-600 mb-2">
                                    Passer de <span className="font-semibold">{getStatusConfig(statusChangeModal.dossier.status)?.label}</span> à <span className="font-semibold">{getStatusConfig(statusChangeModal.newStatus)?.label}</span>
                                </p>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description de l'action *
                                </label>
                                <textarea
                                    value={statusChangeModal.description}
                                    onChange={(e) => setStatusChangeModal({
                                        ...statusChangeModal,
                                        description: e.target.value
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                    rows={3}
                                    placeholder="Décrivez la raison de ce changement de statut..."
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => setStatusChangeModal(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleStatusChange}
                                disabled={!statusChangeModal.description.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}