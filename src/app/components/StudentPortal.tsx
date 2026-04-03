"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { useNotificationContext } from '../context/NotificationContext';
import StudentNotifications from './StudentNotifications';
import StudentDashboard from './student/StudentDashboard';
import StudentPaymentsList from './student/StudentPaymentsList';
import StudentDocumentsList from './student/StudentDocumentsList';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface User {
    id: string;
    name: string;
    role: string;
}

interface StudentPortalProps {
    user: User;
    onLogout: () => void;
}

interface Payment {
    id: string;
    student_id: string;
    type: string;
    montant: number;
    status: string;
    date_limite: string;
    date_paiement: string | null;
    created_at: string;
}

interface Document {
    id: string;
    student_id: string;
    type: string;
    status: string;
    url: string;
    uploaded_at: string;
}

interface DossierBourse {
    id: string;
    student_id: string;
    status: string;
    notes_internes: string;
    university_id: string;
    created_at: string;
}

function formatMontant(n: number) {
    return n.toLocaleString('fr-FR') + 'FCFA';
}

const STATUS_COLORS: Record<string, string> = {
    paye: 'bg-green-100 text-green-700',
    attente: 'bg-yellow-100 text-yellow-700',
    retard: 'bg-red-100 text-red-700',
    valide: 'bg-green-100 text-green-700',
    en_attente: 'bg-yellow-100 text-yellow-700',
    non_conforme: 'bg-red-100 text-red-700',
    document_recu: 'bg-blue-100 text-blue-700',
    en_cours: 'bg-purple-100 text-purple-700',
    admission_validee: 'bg-green-100 text-green-700',
    admission_rejetee: 'bg-red-100 text-red-700',
    visa_en_cours: 'bg-teal-100 text-teal-700',
    termine: 'bg-gray-100 text-gray-700',
};

const DOSSIER_LABELS: Record<string, string> = {
    document_recu: 'Documents reçus',
    en_attente: 'En attente',
    en_cours: 'En cours',
    document_manquant: 'Document manquant',
    admission_validee: 'Admission validée',
    admission_rejetee: 'Admission rejetée',
    en_attente_universite: 'En attente université',
    visa_en_cours: 'Visa en cours',
    termine: 'Terminé',
};

type View = 'dashboard' | 'payments' | 'documents' | 'dossier' | 'notifications';

export default function StudentPortal({ user, onLogout }: StudentPortalProps) {
    const { showNotification } = useNotificationContext();
    const [view, setView] = useState<View>('dashboard');
    const [payments, setPayments] = useState<Payment[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [dossier, setDossier] = useState<DossierBourse | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [pays, docs, dossiers] = await Promise.all([
                supabase.from('payments').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
                supabase.from('documents').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
                supabase.from('dossier_bourses').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(1)
            ]);
            setPayments(pays.data || []);
            setDocuments(docs.data || []);
            if (dossiers.data && dossiers.data.length > 0) {
                setDossier(dossiers.data[0]);
            }
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => { load(); }, [load]);

    const getPaymentStatusLabel = (status: string) => {
        switch (status) {
            case 'paye': return 'Payé';
            case 'attente': return 'En attente';
            case 'retard': return 'En retard';
            default: return status;
        }
    };

    const getDocumentStatusLabel = (status: string) => {
        switch (status) {
            case 'valide': return 'Validé';
            case 'en_attente': return 'En attente';
            case 'non_conforme': return 'Non conforme';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-xl font-bold text-red-600">Gestion Joda - Portail Étudiant</h1>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{user.name}</span>
                            <Button variant="outline" size="sm" onClick={onLogout}>Déconnexion</Button>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        {(['dashboard', 'payments', 'documents', 'dossier', 'notifications'] as View[]).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                                    view === v
                                        ? 'border-red-500 text-red-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {v === 'dashboard' ? 'Tableau de bord' :
                                 v === 'payments' ? 'Paiements' :
                                 v === 'documents' ? 'Documents' :
                                 v === 'dossier' ? 'Mon dossier' : 'Notifications'}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {view === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Paiements</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{payments.length}</p>
                                <p className="text-xs text-gray-500">Total paiements</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Documents</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold">{documents.length}</p>
                                <p className="text-xs text-gray-500">Documents uploadés</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Statut dossier</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Badge className={STATUS_COLORS[dossier?.status || 'en_attente']}>
                                    {DOSSIER_LABELS[dossier?.status || 'en_attente']}
                                </Badge>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {view === 'payments' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Mes Paiements</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {payments.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Aucun paiement</p>
                            ) : (
                                <div className="space-y-3">
                                    {payments.map((payment) => (
                                        <div key={payment.id} className="border rounded-lg p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{payment.type}</p>
                                                <p className="text-sm text-gray-500">
                                                    {payment.date_limite ? new Date(payment.date_limite).toLocaleDateString('fr-FR') : '-'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-red-600">{formatMontant(payment.montant)}</p>
                                                <Badge className={STATUS_COLORS[payment.status]}>{getPaymentStatusLabel(payment.status)}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {view === 'documents' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Mes Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {documents.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">Aucun document</p>
                            ) : (
                                <div className="space-y-3">
                                    {documents.map((doc) => (
                                        <div key={doc.id} className="border rounded-lg p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{doc.type}</p>
                                                <p className="text-sm text-gray-500">
                                                    Uploadé le {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('fr-FR') : '-'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {doc.url && (
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                                        Voir
                                                    </a>
                                                )}
                                                <Badge className={STATUS_COLORS[doc.status]}>{getDocumentStatusLabel(doc.status)}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {view === 'dossier' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Mon Dossier de Bourse</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {dossier ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Statut:</span>
                                        <Badge className={STATUS_COLORS[dossier.status]}>{DOSSIER_LABELS[dossier.status]}</Badge>
                                    </div>
                                    {dossier.notes_internes && (
                                        <div className="p-4 bg-gray-50 rounded-lg">
                                            <p className="text-sm text-gray-700">{dossier.notes_internes}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">Aucun dossier</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {view === 'notifications' && <StudentNotifications user={user} />}
            </main>
        </div>
    );
}
