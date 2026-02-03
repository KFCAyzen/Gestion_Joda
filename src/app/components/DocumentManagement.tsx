"use client";

import { useState } from 'react';
import { useStudentDocuments } from '../hooks/useJodaData';
import { useAuth } from '../context/AuthContext';
import { Document, DocumentType, DocumentStatus } from '../types/joda';
import { sanitizeForHtml } from '../utils/security';

interface DocumentManagementProps {
    studentId: string;
    studentName: string;
}

const DOCUMENT_TYPES: { type: DocumentType; label: string; required: boolean }[] = [
    { type: 'passeport', label: 'Passeport', required: true },
    { type: 'casier_judiciaire', label: 'Casier judiciaire', required: true },
    { type: 'carte_photo', label: 'Carte photo numérique', required: true },
    { type: 'releve_bac', label: 'Relevé du Bac', required: true },
    { type: 'diplome_bac', label: 'Diplôme du Bac', required: true }
];

export default function DocumentManagement({ studentId, studentName }: DocumentManagementProps) {
    const { user } = useAuth();
    const { documents, loading, addDocument, validateDocument } = useStudentDocuments(studentId);
    const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
    const [validationModal, setValidationModal] = useState<{
        document: Document;
        status: DocumentStatus;
        reason?: string;
    } | null>(null);

    const handleFileUpload = async (type: DocumentType, file: File) => {
        if (!file) return;

        setUploadingType(type);
        
        try {
            // Simuler l'upload vers Firebase Storage
            const reader = new FileReader();
            reader.onload = async () => {
                const documentData = {
                    studentId,
                    type,
                    status: 'en_attente' as DocumentStatus,
                    url: reader.result as string, // En production, ce sera l'URL Firebase Storage
                    uploadedAt: new Date()
                };

                await addDocument(documentData);
                setUploadingType(null);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Erreur upload:', error);
            setUploadingType(null);
        }
    };

    const handleValidation = async (document: Document, status: DocumentStatus, reason?: string) => {
        await validateDocument(document.id, status, user?.username, reason);
        setValidationModal(null);
    };

    const getStatusColor = (status: DocumentStatus) => {
        switch (status) {
            case 'valide': return 'bg-green-100 text-green-800';
            case 'non_conforme': return 'bg-red-100 text-red-800';
            case 'en_attente': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: DocumentStatus) => {
        switch (status) {
            case 'valide':
                return <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>;
            case 'non_conforme':
                return <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>;
            case 'en_attente':
                return <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>;
            default:
                return null;
        }
    };

    const getDocumentForType = (type: DocumentType) => {
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
            {/* En-tête avec progression */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-800">
                        Documents de {sanitizeForHtml(studentName)}
                    </h2>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">{getCompletionRate()}%</div>
                        <div className="text-sm text-gray-600">Complété</div>
                    </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getCompletionRate()}%` }}
                    ></div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                    {documents.filter(doc => doc.status === 'valide').length} sur {DOCUMENT_TYPES.length} documents validés
                </div>
            </div>

            {/* Liste des documents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {DOCUMENT_TYPES.map((docType) => {
                    const document = getDocumentForType(docType.type);
                    const isUploading = uploadingType === docType.type;

                    return (
                        <div key={docType.type} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-start justify-between mb-4">
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
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(document.status)}
                                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(document.status)}`}>
                                            {document.status === 'valide' ? 'Validé' :
                                             document.status === 'non_conforme' ? 'Non conforme' : 'En attente'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!document ? (
                                // Zone d'upload
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
                                // Document uploadé
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{docType.label}</p>
                                            <p className="text-xs text-gray-600">
                                                Uploadé le {new Date(document.uploadedAt || '').toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => window.open(document.url, '_blank')}
                                            className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                                        >
                                            Voir
                                        </button>
                                    </div>

                                    {document.status === 'non_conforme' && document.rejectionReason && (
                                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-sm font-medium text-red-800 mb-1">Motif de rejet :</p>
                                            <p className="text-sm text-red-700">{sanitizeForHtml(document.rejectionReason)}</p>
                                        </div>
                                    )}

                                    {user?.role !== 'student' && document.status === 'en_attente' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setValidationModal({ document, status: 'valide' })}
                                                className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                Valider
                                            </button>
                                            <button
                                                onClick={() => setValidationModal({ document, status: 'non_conforme' })}
                                                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                                            >
                                                Rejeter
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal de validation */}
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
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Motif du rejet *
                                    </label>
                                    <textarea
                                        value={validationModal.reason || ''}
                                        onChange={(e) => setValidationModal({
                                            ...validationModal,
                                            reason: e.target.value
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                        rows={3}
                                        placeholder="Expliquez pourquoi ce document est rejeté..."
                                        required
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => setValidationModal(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => handleValidation(
                                    validationModal.document, 
                                    validationModal.status, 
                                    validationModal.reason
                                )}
                                disabled={validationModal.status === 'non_conforme' && !validationModal.reason}
                                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                                    validationModal.status === 'valide' 
                                        ? 'bg-green-600 hover:bg-green-700' 
                                        : 'bg-red-600 hover:bg-red-700'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {validationModal.status === 'valide' ? 'Valider' : 'Rejeter'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}