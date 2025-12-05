"use client";

interface Payment {
    id: string;
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
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Historique des paiements</h3>
                    <button onClick={onBack} className="text-xs sm:text-sm text-gray-600 hover:text-gray-900">← Retour</button>
                </div>
            </div>
            <div className="p-6">
                {payments.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-sm sm:text-base text-gray-500">Aucun paiement enregistré</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {payments.map(pay => (
                            <div key={pay.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-base sm:text-lg font-semibold text-gray-900">{pay.description}</h4>
                                        <p className="text-xs sm:text-sm text-gray-600">{pay.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{pay.amount.toLocaleString()} FCFA</p>
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${getPaymentStatusColor(pay.status)}`}>
                                            {pay.status}
                                        </span>
                                    </div>
                                </div>
                                {pay.status === 'Payé' && (
                                    <button
                                        onClick={() => onGenerateReceipt(pay)}
                                        className="w-full mt-3 px-4 py-2 bg-green-600 text-white text-xs sm:text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Télécharger le reçu
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
