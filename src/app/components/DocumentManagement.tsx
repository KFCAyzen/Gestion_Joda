"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface DocumentManagementProps {
    studentId: string;
    studentName: string;
}

interface Document {
    id: string;
    student_id: string;
    type: string;
    status: string;
    url: string;
    uploaded_at: string;
    validated_at: string | null;
    validated_by: string | null;
    rejection_reason: string | null;
    created_at: string;
}

const DOCUMENT_TYPES: { type: string; label: string; required: boolean }[] = [
    { type: 'passeport', label: 'Passeport', required: true },
    { type: 'casier_judiciaire', label: 'Casier judiciaire', required: true },
    { type: 'carte_photo', label: 'Carte photo numérique', required: true },
    { type: 'releve_bac', label: 'Relevé du Bac', required: true },
    { type: 'diplome_bac', label: 'Diplôme du Bac', required: true }
];

export default function DocumentManagement({ studentId, studentName }: DocumentManagementProps) {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingType, setUploadingType] = useState<string | null>(null);
    const [validationModal, setValidationModal] = useState<{
        document: Document;
        status: string;
        reason?: string;
    } | null>(null);

    const loadDocuments = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase
            .from('documents')
            .select('*')
            .eq('student_id', studentId);
        if (data) setDocuments(data);
        setLoading(false);
    }, [studentId]);

    useEffect(() => {
        loadDocuments();
    }, [loadDocuments]);

    const handleFileUpload = async (type: string, file: File) => {
        if (!file) return;
        setUploadingType(type);
        
        try {
            const reader = new FileReader();
            reader.onload = async () => {
                const { error } = await supabase.from('documents').insert({
                    student_id: studentId,
                    type,
                    status: 'en_attente',
                    url: reader.result as string,
                    uploaded_at: new Date().toISOString()
                });
                if (!error) loadDocuments();
                setUploadingType(null);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Erreur upload:', error);
            setUploadingType(null);
        }
    };

    const handleValidation = async () => {
        if (!validationModal || !user) return;

        const updates: any = {
            status: validationModal.status,
            validated_by: user.id,
            validated_at: new Date().toISOString()
        };
        
        if (validationModal.status === 'non_conforme') {
            updates.rejection_reason = validationModal.reason;
        }

        await supabase.from('documents').update(updates).eq('id', validationModal.document.id);
        setValidationModal(null);
        loadDocuments();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'valide': return 'bg-green-100 text-green-800';
            case 'non_conforme': return 'bg-red-100 text-red-800';
            case 'en_attente': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'valide': return 'Validé';
            case 'non_conforme': return 'Non conforme';
            case 'en_attente': return 'En attente';
            default: return status;
        }
    };

    const getDocumentForType = (type: string) => {
        return documents.find(doc => doc.type === type);
    };

    const getCompletionRate = () => {
        const validDocuments = documents.filter(doc => doc.status === 'valide').length;
        return Math.round((validDocuments / DOCUMENT_TYPES.length) * 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                    <p className="text-slate-600">Chargement des documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Documents de {studentName}</CardTitle>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">{getCompletionRate()}%</div>
                            <div className="text-sm text-gray-600">Complété</div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                            className="bg-red-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getCompletionRate()}%` }}
                        ></div>
                    </div>
                    <div className="text-sm text-gray-600">
                        {documents.filter(doc => doc.status === 'valide').length} sur {DOCUMENT_TYPES.length} documents validés
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {DOCUMENT_TYPES.map((docType) => {
                    const document = getDocumentForType(docType.type);
                    const isUploading = uploadingType === docType.type;

                    return (
                        <Card key={docType.type}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            {docType.label}
                                            {docType.required && <span className="text-red-500 text-sm">*</span>}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {docType.required ? 'Document obligatoire' : 'Document optionnel'}
                                        </p>
                                    </div>
                                    {document && (
                                        <Badge className={getStatusColor(document.status)}>
                                            {getStatusLabel(document.status)}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                {!document ? (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-red-400 transition-colors">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileUpload(docType.type, file);
                                            }}
                                            className="hidden"
                                            id={`upload-${docType.type}`}
                                            disabled={isUploading}
                                        />
                                        <label 
                                            htmlFor={`upload-${docType.type}`}
                                            className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
                                        >
                                            {isUploading ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mb-2"></div>
                                                    <p className="text-sm text-gray-600">Upload en cours...</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    <p className="text-sm text-gray-600 mb-1">Cliquer pour uploader</p>
                                                    <p className="text-xs text-gray-500">PDF, JPG, PNG (max 5MB)</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{docType.label}</p>
                                                <p className="text-xs text-gray-600">
                                                    Uploadé le {new Date(document.uploaded_at).toLocaleDateString('fr-FR')}
                                                </p>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => window.open(document.url, '_blank')}>
                                                Voir
                                            </Button>
                                        </div>

                                        {document.status === 'non_conforme' && document.rejection_reason && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm font-medium text-red-800 mb-1">Motif de rejet :</p>
                                                <p className="text-sm text-red-700">{document.rejection_reason}</p>
                                            </div>
                                        )}

                                        {user?.role !== 'student' && document.status === 'en_attente' && (
                                            <div className="flex gap-2">
                                                <Button size="sm" className="flex-1 bg-green-600" onClick={() => setValidationModal({ document, status: 'valide' })}>
                                                    Valider
                                                </Button>
                                                <Button size="sm" variant="destructive" className="flex-1" onClick={() => setValidationModal({ document, status: 'non_conforme' })}>
                                                    Rejeter
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {validationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {validationModal.status === 'valide' ? 'Valider le document' : 'Rejeter le document'}
                            </h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 mb-4">
                                Êtes-vous sûr de vouloir {validationModal.status === 'valide' ? 'valider' : 'rejeter'} ce document ?
                            </p>
                            {validationModal.status === 'non_conforme' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Motif du rejet *</label>
                                    <Input
                                        value={validationModal.reason || ''}
                                        onChange={(e) => setValidationModal({
                                            ...validationModal,
                                            reason: e.target.value
                                        })}
                                        placeholder="Expliquez pourquoi ce document est rejeté..."
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <Button variant="outline" onClick={() => setValidationModal(null)} className="flex-1">
                                Annuler
                            </Button>
                            <Button 
                                onClick={handleValidation} 
                                disabled={validationModal.status === 'non_conforme' && !validationModal.reason}
                                className={`flex-1 ${validationModal.status === 'valide' ? 'bg-green-600' : 'bg-red-600'}`}
                            >
                                {validationModal.status === 'valide' ? 'Valider' : 'Rejeter'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
