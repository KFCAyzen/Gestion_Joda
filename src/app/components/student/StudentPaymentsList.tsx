"use client";

import { Button } from "@/components/ui/button";

interface Payment {
    id: string;
    studentId: string;
    description: string;
    date: string;
    amount: number;
    status: string;
}

interface StudentPaymentsListProps {
    payments: Payment[];
    onBack: () => void;
    getPaymentStatusColor: (status: string) => string;
    onGenerateReceipt: (payment: Payment) => void;
}

export default function StudentPaymentsList({ payments, onBack, getPaymentStatusColor, onGenerateReceipt }: StudentPaymentsListProps) {
    return (
        <div className="joda-surface">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-semibold text-slate-900">Historique des paiements</h3>
                <Button variant="link" onClick={onBack} className="h-auto p-0 text-sm text-slate-600">Retour</Button>
            </div>
            <div>
                {payments.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-base text-slate-500">Aucun paiement enregistré</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {payments.map((pay) => (
                            <div key={pay.id} className="joda-surface-muted p-4">
                                <div className="mb-3 flex items-start justify-between">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-base font-semibold text-slate-900">{pay.description}</h4>
                                        <p className="text-sm text-slate-600">{pay.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-slate-900">{pay.amount.toLocaleString()} FCFA</p>
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${getPaymentStatusColor(pay.status)}`}>{pay.status}</span>
                                    </div>
                                </div>
                                {pay.status === "Paye" && (
                                    <Button
                                        onClick={() => onGenerateReceipt(pay)}
                                        className="mt-3 flex w-full items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                                        size="sm"
                                    >
                                        Télécharger le reçu
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
