"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import DropdownMenu from "./shared/DropdownMenu";

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

const DOCUMENT_TYPES: { type: string; labelKey: string; required: boolean }[] = [
    { type: 'passeport', labelKey: 'passport', required: true },
    { type: 'casier_judiciaire', labelKey: 'criminalRecord', required: true },
    { type: 'carte_photo', labelKey: 'idPhoto', required: true },
    { type: 'releve_bac', labelKey: 'transcript', required: true },
    { type: 'diplome_bac', labelKey: 'diploma', required: true },
    { type: 'lettre_motivation', labelKey: 'motivationLetter', required: true },
    { type: 'lettre_recommandation', labelKey: 'recommendationLetter', required: true },
    { type: 'certificat_hsk', labelKey: 'hskCertificate', required: false },
];

export default function DocumentManagement({ studentId, studentName }: DocumentManagementProps) {
    const { user } = useAuth();
    const t = useTranslations("documentManagement");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
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
            console.error('Upload error:', error);
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
            case 'valide': return t("status.valid");
            case 'non_conforme': return t("status.nonCompliant");
            case 'en_attente': return t("status.pending");
            default: return status;
        }
    };

    const getDocumentLabel = (labelKey: string) => t(`types.${labelKey}`);

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
                    <p className="text-slate-600">{t("loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{t("title", { student: studentName })}</CardTitle>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">{getCompletionRate()}%</div>
                            <div className="text-sm text-gray-600">{t("completed")}</div>
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
                        {t("validatedCount", { valid: documents.filter(doc => doc.status === 'valide').length, total: DOCUMENT_TYPES.length })}
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
                                            {getDocumentLabel(docType.labelKey)}
                                            {docType.required && <span className="text-red-500 text-sm">*</span>}
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {docType.required ? t("required") : t("optional")}
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
                                                    <p className="text-sm text-gray-600">{t("uploading")}</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    <p className="text-sm text-gray-600 mb-1">{t("uploadCta")}</p>
                                                    <p className="text-xs text-gray-500">{t("uploadHint")}</p>
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
                                                <p className="text-sm font-medium text-gray-900">{getDocumentLabel(docType.labelKey)}</p>
                                                <p className="text-xs text-gray-600">
                                                    {t("uploadedOn", { date: new Date(document.uploaded_at).toLocaleDateString(dateLocale) })}
                                                </p>
                                            </div>
                                            <DropdownMenu
                                                actions={[
                                                    {
                                                        label: t("actions.view"),
                                                        icon: <Eye className="h-4 w-4" />,
                                                        onClick: () => window.open(document.url, "_blank", "noopener,noreferrer"),
                                                    },
                                                    ...(user?.role !== "student" && document.status === "en_attente"
                                                        ? [
                                                              {
                                                                  label: t("actions.validate"),
                                                                  icon: <CheckCircle2 className="h-4 w-4" />,
                                                                  onClick: () => setValidationModal({ document, status: "valide" }),
                                                              },
                                                              {
                                                                  label: t("actions.reject"),
                                                                  icon: <XCircle className="h-4 w-4" />,
                                                                  onClick: () => setValidationModal({ document, status: "non_conforme" }),
                                                                  variant: "danger" as const,
                                                              },
                                                          ]
                                                        : []),
                                                ]}
                                            />
                                        </div>

                                        {document.status === 'non_conforme' && document.rejection_reason && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-sm font-medium text-red-800 mb-1">{t("rejectionReason")}</p>
                                                <p className="text-sm text-red-700">{document.rejection_reason}</p>
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
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "rgba(15,23,42,0.25)" }}
                >
                    <div
                        className="max-w-md w-full rounded-xl bg-white shadow-2xl"
                    >
                        <div className="p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {validationModal.status === 'valide' ? t("modal.validateTitle") : t("modal.rejectTitle")}
                            </h3>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 mb-4">
                                {validationModal.status === 'valide' ? t("modal.validateQuestion") : t("modal.rejectQuestion")}
                            </p>
                            {validationModal.status === 'non_conforme' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">{t("modal.reasonLabel")}</label>
                                    <Input
                                        value={validationModal.reason || ''}
                                        onChange={(e) => setValidationModal({
                                            ...validationModal,
                                            reason: e.target.value
                                        })}
                                        placeholder={t("modal.reasonPlaceholder")}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-200 flex gap-3">
                            <Button variant="outline" onClick={() => setValidationModal(null)} className="flex-1">
                                {t("actions.cancel")}
                            </Button>
                            <Button 
                                onClick={handleValidation} 
                                disabled={validationModal.status === 'non_conforme' && !validationModal.reason}
                                className={`flex-1 ${validationModal.status === 'valide' ? 'bg-green-600' : 'bg-red-600'}`}
                            >
                                {validationModal.status === 'valide' ? t("actions.validate") : t("actions.reject")}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
