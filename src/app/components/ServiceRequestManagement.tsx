"use client";

import { useEffect, useState } from "react";
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
    const [note, setNote] = useState("");

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
            if (data) {
                setRequests(
                    data.map((n) => ({
                        id: n.id,
                        student_id: n.user_id,
                        type: n.type,
                        description: n.message,
                        status: n.read ? "Approuvée" : "En attente de validation",
                        note: "",
                        created_at: n.created_at,
                        processed_at: null,
                    })),
                );
            }
        } catch (error) {
            console.warn("Erreur chargement demandes:", error);
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
            await supabase.from("notifications").update({ read: true }).eq("id", selectedRequest.id);
            setSelectedRequest(null);
            setNote("");
            await loadRequests();
        } catch (error) {
            console.error("Erreur:", error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Approuvée":
                return "bg-green-100 text-green-700";
            case "Rejetée":
                return "bg-red-100 text-red-700";
            case "En attente de validation":
                return "bg-yellow-100 text-yellow-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
                    <p className="text-slate-600">Chargement des demandes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="joda-surface">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    Demandes services
                </p>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Demandes de Souscription</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Traite les demandes et notes de suivi liées aux notifications et souscriptions.
                </p>
            </div>

            <Card className="joda-surface border-0 shadow-none">
                <CardHeader>
                    <CardTitle>Liste des Demandes ({requests.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {requests.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">Aucune demande</div>
                    ) : (
                        <div className="space-y-3">
                            {requests.map((request) => (
                                <div key={request.id} className="joda-surface-muted p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="font-medium">{request.type}</p>
                                            <p className="text-sm text-gray-600">{request.description}</p>
                                            <p className="mt-1 text-xs text-gray-500">
                                                {request.created_at ? new Date(request.created_at).toLocaleDateString("fr-FR") : "-"}
                                            </p>
                                        </div>
                                        <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                                    </div>
                                    {user?.role !== "student" && request.status === "En attente de validation" && (
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                        <div className="border-b border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900">Traiter la demande</h3>
                        </div>
                        <div className="space-y-4 p-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Note</label>
                                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note..." />
                            </div>
                        </div>
                        <div className="flex gap-3 border-t border-gray-200 p-6">
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
