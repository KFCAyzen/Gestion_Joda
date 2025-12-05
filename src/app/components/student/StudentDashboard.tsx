"use client";

import StudentStatsCard from './StudentStatsCard';

interface Application {
    id: string;
    universityName: string;
    program: string;
    status: string;
}

interface Payment {
    id: string;
    description: string;
    date: string;
    amount: number;
    status: string;
}

interface Document {
    id: string;
    type: string;
    uploadDate: string;
    status: string;
}

interface Subscription {
    id: string;
    serviceName: string;
    startDate: string;
    status: string;
}

interface StudentDashboardProps {
    applications: Application[];
    payments: Payment[];
    documents: Document[];
    subscriptions: Subscription[];
    employeeReceipts: any[];
    serviceRequests: any[];
    studentFile: any;
    solvency: number;
    onViewChange: (view: string) => void;
    getStatusColor: (status: string) => string;
    getPaymentStatusColor: (status: string) => string;
}

export default function StudentDashboard({
    applications,
    payments,
    documents,
    subscriptions,
    employeeReceipts,
    serviceRequests,
    studentFile,
    solvency,
    onViewChange,
    getStatusColor,
    getPaymentStatusColor
}: StudentDashboardProps) {
    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                <StudentStatsCard
                    title="Candidatures"
                    value={applications.length}
                    bgColor="bg-blue-100"
                    icon={
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />
                <StudentStatsCard
                    title="Acceptées"
                    value={applications.filter(a => a.status === 'Acceptée').length}
                    bgColor="bg-green-100"
                    icon={
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StudentStatsCard
                    title="Solvabilité"
                    value={`${solvency}%`}
                    bgColor="bg-purple-100"
                    icon={
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    }
                />
                <StudentStatsCard
                    title="Dossier"
                    value={`${studentFile?.completionRate || 0}%`}
                    bgColor="bg-indigo-100"
                    icon={
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                />
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-200 mb-4 sm:mb-6">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 md:mb-4">Avancement du dossier</h3>
                <div className="space-y-1.5 sm:space-y-2 md:space-y-4">
                    <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
                            <span className="text-gray-600">Progression</span>
                            <span className="font-semibold text-gray-900">{studentFile?.completionRate || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                            <div 
                                className="bg-gradient-to-r from-red-500 to-red-600 h-2 sm:h-3 rounded-full transition-all duration-500"
                                style={{ width: `${studentFile?.completionRate || 0}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                        <span className="text-xs sm:text-sm text-gray-600">Statut du dossier</span>
                        <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full ${getStatusColor(studentFile?.status || 'En attente')}`}>
                            {studentFile?.status || 'En attente'}
                        </span>
                    </div>
                    {studentFile?.missingDocuments && studentFile.missingDocuments.length > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm font-semibold text-yellow-800 mb-2">Documents manquants:</p>
                            <ul className="text-sm text-yellow-700 space-y-1">
                                {studentFile.missingDocuments.map((doc: string, idx: number) => (
                                    <li key={idx}>• {doc}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <DashboardCard
                    title="Mes Candidatures"
                    items={applications.slice(0, 3)}
                    emptyMessage="Aucune candidature pour le moment"
                    onViewAll={() => onViewChange('applications')}
                    renderItem={(app) => (
                        <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{app.universityName}</p>
                                <p className="text-xs sm:text-sm text-gray-500">{app.program}</p>
                            </div>
                            <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full whitespace-nowrap ml-2 ${getStatusColor(app.status)}`}>
                                {app.status}
                            </span>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Paiements Récents"
                    items={payments.slice(0, 3)}
                    emptyMessage="Aucun paiement enregistré"
                    onViewAll={() => onViewChange('payments')}
                    renderItem={(pay) => (
                        <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{pay.description}</p>
                                <p className="text-xs sm:text-sm text-gray-500">{pay.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900">{pay.amount}€</p>
                                <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full whitespace-nowrap ml-2 ${getPaymentStatusColor(pay.status)}`}>
                                    {pay.status}
                                </span>
                            </div>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Documents"
                    items={documents.slice(0, 3)}
                    emptyMessage="Aucun document uploadé"
                    onViewAll={() => onViewChange('documents')}
                    renderItem={(doc) => (
                        <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{doc.type}</p>
                                    <p className="text-xs sm:text-sm text-gray-500">{doc.uploadDate}</p>
                                </div>
                            </div>
                            <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{doc.status}</span>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Mes Services"
                    items={subscriptions.slice(0, 2)}
                    emptyMessage="Aucun service souscrit"
                    onViewAll={() => onViewChange('services')}
                    renderItem={(sub) => (
                        <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{sub.serviceName}</p>
                                <p className="text-xs sm:text-sm text-gray-500">{sub.startDate}</p>
                            </div>
                            <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full whitespace-nowrap ml-2 ${getPaymentStatusColor(sub.status)}`}>
                                {sub.status}
                            </span>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Reçus Officiels"
                    items={employeeReceipts.slice(0, 2)}
                    emptyMessage="Aucun reçu disponible"
                    onViewAll={() => onViewChange('receipts')}
                    renderItem={(receipt) => (
                        <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">Reçu {receipt.id}</p>
                                <p className="text-xs sm:text-sm text-gray-500">{new Date(receipt.date).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <span className="text-sm font-semibold text-red-600">{parseInt(receipt.amount).toLocaleString()} FCFA</span>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Mes Demandes"
                    items={serviceRequests.slice(0, 2)}
                    emptyMessage="Aucune demande"
                    onViewAll={() => onViewChange('requests')}
                    renderItem={(req) => (
                        <div className="p-2 sm:p-3 bg-gray-50 rounded-md sm:rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{req.serviceName}</p>
                                <span className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full whitespace-nowrap ml-2 ${getPaymentStatusColor(req.status)}`}>
                                    {req.status}
                                </span>
                            </div>
                            {req.note && <p className="text-xs text-gray-600 mt-1">📝 {req.note}</p>}
                        </div>
                    )}
                />
            </div>
        </>
    );
}

function DashboardCard({ title, items, emptyMessage, onViewAll, renderItem }: any) {
    return (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 md:p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">{title}</h3>
                <button onClick={onViewAll} className="text-xs sm:text-sm text-red-600 hover:text-red-700">Voir tout</button>
            </div>
            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                {items.length === 0 ? (
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-2 sm:py-3 md:py-4">{emptyMessage}</p>
                ) : (
                    items.map((item: any) => <div key={item.id}>{renderItem(item)}</div>)
                )}
            </div>
        </div>
    );
}
