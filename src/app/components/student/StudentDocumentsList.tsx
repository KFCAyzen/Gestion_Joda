"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Document {
    id: string;
    type: string;
    name: string;
    uploadDate: string;
    status: string;
}

interface StudentDocumentsListProps {
    documents: Document[];
    onBack: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, docType: string) => void;
}

export default function StudentDocumentsList({ documents, onBack, onFileUpload }: StudentDocumentsListProps) {
    const docTypes = ["Passeport", "Diplôme", "Relevé de notes", "Photo d'identité", "Lettre de motivation", "CV"];

    return (
        <div className="joda-surface">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-semibold text-slate-900">Gestion des documents</h3>
                <Button variant="link" onClick={onBack} className="h-auto p-0 text-sm text-slate-600">Retour</Button>
            </div>
            <div>
                <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-blue-900">Documents requis</h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {docTypes.map((docType) => (
                            <div key={docType} className="flex items-center justify-between rounded-lg bg-white p-3">
                                <span className="text-sm text-slate-700">{docType}</span>
                                <label className="cursor-pointer">
                                    <Input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => onFileUpload(e, docType)}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    <span className="rounded-lg bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700">
                                        {documents.find((d) => d.type === docType) ? "Remplacer" : "Upload"}
                                    </span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <h4 className="mb-3 text-sm font-semibold text-slate-900">Documents uploadés</h4>
                {documents.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-base text-slate-500">Aucun document uploadé</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <div key={doc.id} className="joda-surface-muted p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                                            <span className="text-xs font-bold text-slate-600">DOC</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{doc.type}</p>
                                            <p className="text-xs text-slate-500">{doc.name} - {doc.uploadDate}</p>
                                        </div>
                                    </div>
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{doc.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
