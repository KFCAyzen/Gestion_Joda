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
    isIntl?: boolean;
}

function fmtAmount(n: number, isIntl: boolean): string {
    return isIntl ? `$${n.toLocaleString("fr-FR")}` : `${n.toLocaleString("fr-FR")} FCFA`;
}

export default function StudentPaymentsList({ payments, onBack, getPaymentStatusColor, onGenerateReceipt, isIntl = false }: StudentPaymentsListProps) {
    return (
        <div className="student-pay-surface p-4 sm:p-6">
            <div className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--student-border)" }}>
                <h3 className="text-lg font-semibold" style={{ color: "var(--student-fg)" }}>Historique des paiements</h3>
                <Button variant="link" onClick={onBack} className="h-auto p-0 text-sm" style={{ color: "var(--student-ring-move)" }}>Retour</Button>
            </div>
            <div>
                {payments.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-base" style={{ color: "var(--student-fg-muted)" }}>Aucun paiement enregistré</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {payments.map((pay) => (
                            <div key={pay.id} className="student-pay-surface-soft p-3">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="truncate text-sm font-semibold" style={{ color: "var(--student-fg)" }}>{pay.description}</h4>
                                        <p className="text-xs" style={{ color: "var(--student-fg-muted)" }}>{pay.date}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-bold" style={{ color: "var(--student-ring-exercise)" }}>{fmtAmount(pay.amount, isIntl)}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${getPaymentStatusColor(pay.status)}`}>{pay.status}</span>
                                    </div>
                                </div>
                                {pay.status === "paye" && (
                                    <Button
                                        onClick={() => onGenerateReceipt(pay)}
                                        className="mt-3 flex w-full items-center justify-center gap-2"
                                        style={{ background: "var(--student-ring-move)", color: "var(--student-neon-ink)" }}
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
