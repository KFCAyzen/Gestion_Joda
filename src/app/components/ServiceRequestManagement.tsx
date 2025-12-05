"use client";

import { useState, useEffect } from "react";
import { loadFromFirebase, updateData } from "../utils/syncData";
import { useNotificationContext } from "../context/NotificationContext";

export default function ServiceRequestManagement() {
    const [requests, setRequests] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { showNotification } = useNotificationContext();
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [note, setNote] = useState('');

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const data = await loadFromFirebase('serviceRequests');
            setRequests(Array.isArray(data) ? data : []);
        } catch (error) {
            console.warn('Erreur chargement demandes:', error);
            setRequests([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleApprove = async () => {
        if (!selectedRequest || !note.trim()) {
            showNotification("Veuillez ajouter une note", "error");
            return;
        }
        try {
            await updateData('serviceRequests', selectedRequest.id, {
                ...selectedRequest,
                status: 'Approuvée',
                processedDate: new Date().toISOString(),
                note: note
            });
            showNotification("Demande approuvée avec succès!", "success");
            setSelectedRequest(null);
            setNote('');
            await loadRequests();
        } catch (error) {
            showNotification("Erreur lors de l'approbation", "error");
        }
    };

    const handleReject = async () => {
        if (!selectedRequest || !note.trim()) {
            showNotification("Veuillez ajouter une note", "error");
            return;
        }
        try {
            await updateData('serviceRequests', selectedRequest.id, {
                ...selectedRequest,
                status: 'Rejetée',
                processedDate: new Date().toISOString(),
                note: note
            });
            showNotification("Demande rejetée", "success");
            setSelectedRequest(null);
            setNote('');
            await loadRequests();
        } catch (error) {
            showNotification("Erreur lors du rejet", "error");
        }
    };

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Approuvée': return 'bg-green-100 text-green-700';
            case 'Rejetée': return 'bg-red-100 text-red-700';
            case 'En attente de validation': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement des demandes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                Demandes de Souscription
            </h1>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 sm:p-4 sm:p-6 border-b border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:p-4">
                        <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                            Liste des demandes
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-2 sm:px-3 py-1 rounded-full">
                                {requests.length} demande(s)
                            </span>
                            <button 
                                onClick={loadRequests}
                                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                                Actualiser
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 sm:p-6">
                    {requests.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 sm:w-8 sm:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <p className="text-slate-500 text-base sm:text-lg font-medium">Aucune demande</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:gap-6">
                            {requests.sort((a, b) => {
                                const statusOrder: any = {'En attente de validation': 0, 'Approuvée': 1, 'Rejetée': 2};
                                return statusOrder[a.status] - statusOrder[b.status];
                            }).map((request) => (
                                <div key={request.id} className="bg-gradient-to-br from-white to-slate-50 p-4 sm:p-6 rounded-xl border border-slate-200 hover:shadow-lg transition-all duration-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="font-semibold text-slate-800 text-base sm:text-lg mb-1">
                                                {request.studentName}
                                            </h3>
                                            <p className="text-xs text-slate-500">{request.studentEmail}</p>
                                        </div>
                                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm rounded-full ${getStatusColor(request.status)}`}>
                                            {request.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Service:</span>
                                            <span className="font-medium">{request.serviceName}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Prix:</span>
                                            <span className="font-bold text-red-600">{request.price.toLocaleString()} FCFA</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-600">Date demande:</span>
                                            <span className="font-medium">{new Date(request.requestDate).toLocaleDateString('fr-FR')}</span>
                                        </div>
                                    </div>

                                    {request.note && (
                                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-xs font-semibold text-blue-900 mb-1">Note:</p>
                                            <p className="text-sm text-blue-800">{request.note}</p>
                                        </div>
                                    )}

                                    {request.status === 'En attente de validation' && (
                                        <div className="flex gap-3 mt-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setNote('');
                                                }}
                                                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Traiter
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="p-4 sm:p-6 border-b border-gray-200">
                            <h3 className="text-xl font-semibold text-gray-900">Traiter la demande</h3>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">{selectedRequest.studentName} - {selectedRequest.serviceName}</p>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Note / Commentaire *</label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Ajoutez vos commentaires ou instructions..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                rows={4}
                                required
                            />
                        </div>
                        <div className="p-4 sm:p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedRequest(null);
                                    setNote('');
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={!note.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Rejeter
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={!note.trim()}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Approuver
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
