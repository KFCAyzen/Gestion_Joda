"use client";

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
    const docTypes = ['Passeport', 'Diplôme', 'Relevé de notes', 'Photo d\'identité', 'Lettre de motivation', 'CV'];

    return (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Gestion des documents</h3>
                    <button onClick={onBack} className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">← Retour</button>
                </div>
            </div>
            <div className="p-6">
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3">Documents requis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {docTypes.map(docType => (
                            <div key={docType} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                <span className="text-xs sm:text-sm text-gray-700">{docType}</span>
                                <label className="cursor-pointer">
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={(e) => onFileUpload(e, docType)}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                    />
                                    <span className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                                        {documents.find(d => d.type === docType) ? 'Remplacer' : 'Upload'}
                                    </span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <h4 className="text-sm font-semibold text-gray-900 mb-3">Documents uploadés</h4>
                {documents.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm sm:text-base text-gray-500">Aucun document uploadé</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map(doc => (
                            <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{doc.type}</p>
                                            <p className="text-xs text-gray-500">{doc.name} • {doc.uploadDate}</p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                                        {doc.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
