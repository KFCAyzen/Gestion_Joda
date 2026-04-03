"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ServiceRequest {
    id: string;
    student_id: string;
    type: string;
    description: string;
    status: string;
    note: string;
    created_at: string;
    processed_at: string | null;
}

export default function ServiceRequestManagement() {
    const { user } = useAuth();
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
    const [note, setNote] = useState('');

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });
            if (data) setRequests(data.map(n => ({
                id: n.id,
                student_id: n.user_id,
                type: n.type,
                description: n.message,
                status: n.read ? 'Approuvée' : 'En attente de validation',
                note: '',
                created_at: n.created_at,
                processed_at: null
            })));
        } catch (error) {
            console.warn('Erreur chargement demandes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleApprove = async () => {
        if (!selectedRequest) return;
        try {
            await supabase.from('notifications').update({ read: true }).eq('id', selectedRequest.id);
            setSelectedRequest(null);
            setNote('');
            await loadRequests();
        } catch (error) {
            console.error("Erreur:", error);
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

            <Card>
                <CardHeader>
                    <CardTitle>Liste des Demandes ({requests.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {requests.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">Aucune demande</div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((request) => (
                                <div key={request.id} className="border rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium">{request.type}</p>
                                            <p className="text-sm text-gray-600">{request.description}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {request.created_at ? new Date(request.created_at).toLocaleDateString('fr-FR') : '-'}
                                            </p>
                                        </div>
                                        <Badge className={getStatusColor(request.status)}>
                                            {request.status}
                                        </Badge>
                                    </div>
                                    {user?.role !== 'student' && request.status === 'En attente de validation' && (
                                        <div className="mt-3 flex gap-2">
                                            <Button size="sm" onClick={() => setSelectedRequest(request)}>
                                                Traiter
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Traiter la demande</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Note</label>
                                <Input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Ajouter une note..."
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <Button variant="outline" onClick={() => setSelectedRequest(null)} className="flex-1">
                                Annuler
                            </Button>
                            <Button onClick={handleApprove} className="flex-1 bg-green-600">
                                Approuver
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
