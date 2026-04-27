"use client";

import StudentStatsCard from "./StudentStatsCard";
import { Button } from "@/components/ui/button";

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
    getPaymentStatusColor,
}: StudentDashboardProps) {
    return (
        <>
            <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StudentStatsCard title="Candidatures" value={applications.length} bgColor="bg-blue-100" icon={<span className="text-blue-600">AP</span>} />
                <StudentStatsCard title="Acceptées" value={applications.filter((a) => a.status === "Acceptee").length} bgColor="bg-green-100" icon={<span className="text-green-600">OK</span>} />
                <StudentStatsCard title="Solvabilité" value={`${solvency}%`} bgColor="bg-purple-100" icon={<span className="text-purple-600">%</span>} />
                <StudentStatsCard title="Dossier" value={`${studentFile?.completionRate || 0}%`} bgColor="bg-indigo-100" icon={<span className="text-indigo-600">DF</span>} />
            </div>

            <div className="joda-surface mb-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Avancement du dossier</h3>
                <div className="space-y-4">
                    <div>
                        <div className="mb-2 flex justify-between text-sm">
                            <span className="text-slate-600">Progression</span>
                            <span className="font-semibold text-slate-900">{studentFile?.completionRate || 0}%</span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-slate-200">
                            <div className="h-3 rounded-full bg-gradient-to-r from-red-500 to-red-600" style={{ width: `${studentFile?.completionRate || 0}%` }} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                        <span className="text-sm text-slate-600">Statut du dossier</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(studentFile?.status || "En attente")}`}>
                            {studentFile?.status || "En attente"}
                        </span>
                    </div>
                    {studentFile?.missingDocuments && studentFile.missingDocuments.length > 0 && (
                        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                            <p className="mb-2 text-sm font-semibold text-yellow-800">Documents manquants:</p>
                            <ul className="space-y-1 text-sm text-yellow-700">
                                {studentFile.missingDocuments.map((doc: string, idx: number) => (
                                    <li key={idx}>- {doc}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <DashboardCard
                    title="Mes Candidatures"
                    items={applications.slice(0, 3)}
                    emptyMessage="Aucune candidature pour le moment"
                    onViewAll={() => onViewChange("applications")}
                    renderItem={(app: Application) => (
                        <div className="joda-surface-muted flex items-center justify-between p-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">{app.universityName}</p>
                                <p className="text-sm text-slate-500">{app.program}</p>
                            </div>
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${getStatusColor(app.status)}`}>{app.status}</span>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Paiements récents"
                    items={payments.slice(0, 3)}
                    emptyMessage="Aucun paiement enregistré"
                    onViewAll={() => onViewChange("payments")}
                    renderItem={(pay: Payment) => (
                        <div className="joda-surface-muted flex items-center justify-between p-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">{pay.description}</p>
                                <p className="text-sm text-slate-500">{pay.date}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">{pay.amount} EUR</p>
                                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${getPaymentStatusColor(pay.status)}`}>{pay.status}</span>
                            </div>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Documents"
                    items={documents.slice(0, 3)}
                    emptyMessage="Aucun document uploadé"
                    onViewAll={() => onViewChange("documents")}
                    renderItem={(doc: Document) => (
                        <div className="joda-surface-muted flex items-center justify-between p-3">
                            <div>
                                <p className="text-sm font-medium text-slate-900">{doc.type}</p>
                                <p className="text-sm text-slate-500">{doc.uploadDate}</p>
                            </div>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{doc.status}</span>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Mes Services"
                    items={subscriptions.slice(0, 2)}
                    emptyMessage="Aucun service souscrit"
                    onViewAll={() => onViewChange("services")}
                    renderItem={(sub: Subscription) => (
                        <div className="joda-surface-muted flex items-center justify-between p-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">{sub.serviceName}</p>
                                <p className="text-sm text-slate-500">{sub.startDate}</p>
                            </div>
                            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${getPaymentStatusColor(sub.status)}`}>{sub.status}</span>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Reçus officiels"
                    items={employeeReceipts.slice(0, 2)}
                    emptyMessage="Aucun reçu disponible"
                    onViewAll={() => onViewChange("receipts")}
                    renderItem={(receipt: any) => (
                        <div className="joda-surface-muted flex items-center justify-between p-3">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">Reçu {receipt.id}</p>
                                <p className="text-sm text-slate-500">{new Date(receipt.date).toLocaleDateString("fr-FR")}</p>
                            </div>
                            <span className="text-sm font-semibold text-red-600">{parseInt(receipt.amount, 10).toLocaleString()} FCFA</span>
                        </div>
                    )}
                />

                <DashboardCard
                    title="Mes Demandes"
                    items={serviceRequests.slice(0, 2)}
                    emptyMessage="Aucune demande"
                    onViewAll={() => onViewChange("requests")}
                    renderItem={(req: any) => (
                        <div className="joda-surface-muted p-3">
                            <div className="mb-1 flex items-center justify-between">
                                <p className="truncate text-sm font-medium text-slate-900">{req.serviceName}</p>
                                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${getPaymentStatusColor(req.status)}`}>{req.status}</span>
                            </div>
                            {req.note && <p className="text-xs text-slate-600">Note: {req.note}</p>}
                        </div>
                    )}
                />
            </div>
        </>
    );
}

function DashboardCard({ title, items, emptyMessage, onViewAll, renderItem }: any) {
    return (
        <div className="joda-surface">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                <Button variant="link" onClick={onViewAll} className="h-auto p-0 text-sm text-red-600">
                    Voir tout
                </Button>
            </div>
            <div className="space-y-3">
                {items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-slate-500">{emptyMessage}</p>
                ) : (
                    items.map((item: any) => <div key={item.id}>{renderItem(item)}</div>)
                )}
            </div>
        </div>
    );
}
