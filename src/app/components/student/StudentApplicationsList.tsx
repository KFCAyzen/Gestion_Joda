"use client";

import { Button } from "@/components/ui/button";

interface Application {
    id: string;
    universityName: string;
    program: string;
    status: string;
    submittedDate: string;
    lastUpdate: string;
}

interface StudentApplicationsListProps {
    applications: Application[];
    onBack: () => void;
    getStatusColor: (status: string) => string;
}

export default function StudentApplicationsList({ applications, onBack, getStatusColor }: StudentApplicationsListProps) {
    return (
        <div className="student-surface-soft rounded-lg sm:rounded-xl">
            <div className="p-4 sm:p-6 border-b border-[rgba(220,38,38,0.12)]">
                <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--student-fg)]">Toutes mes candidatures</h3>
                    <Button variant="link" onClick={onBack} className="text-xs sm:text-sm p-0 h-auto text-[var(--student-fg-muted)]">← Retour</Button>
                </div>
            </div>
            <div className="p-6">
                {applications.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-[var(--student-fg-muted)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm sm:text-base text-[var(--student-fg-muted)]">Aucune candidature pour le moment</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {applications.map(app => (
                            <div key={app.id} className="student-surface-soft rounded-lg p-4 transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="text-base sm:text-lg font-semibold text-[var(--student-fg)]">{app.universityName}</h4>
                                        <p className="text-xs sm:text-sm text-[var(--student-fg-muted)]">{app.program}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(app.status)}`}>
                                        {app.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-[var(--student-fg-muted)]">Date de soumission</p>
                                        <p className="text-[var(--student-fg)] font-medium">{app.submittedDate}</p>
                                    </div>
                                    <div>
                                        <p className="text-[var(--student-fg-muted)]">Dernière mise à jour</p>
                                        <p className="text-[var(--student-fg)] font-medium">{app.lastUpdate}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
