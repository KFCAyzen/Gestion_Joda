"use client";

import { useMemo } from "react";
import { MONTANTS_BOURSE, MONTANTS_MANDARIN, MONTANTS_ANGLAIS } from "../types/joda";
import { calculatePenalty } from "../utils/penaltyCalculator";

interface Payment {
    id: string;
    type: string;
    tranche: number | null;
    montant: number;
    status: string;
    date_limite: string | null;
    date_paiement: string | null;
    penalites?: number;
}

interface Tranche {
    tranche: number;
    label: string;
    montant: number;
}

interface Service {
    type: string;
    label: string;
    total: number;
    tranches: Tranche[];
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function getGraceDays(type: string): number {
    return type === "mandarin" || type === "anglais" ? 30 : 3;
}

function computeTrancheState(payment: Payment | undefined, serviceType: string) {
    // No payment record yet
    if (!payment) {
        return {
            barPct: 0,
            barColor: "bg-slate-200",
            penalty: 0,
            daysLabel: null as string | null,
            daysColor: "",
            statusLabel: "Non planifiée",
            statusBadge: "bg-slate-100 text-slate-500",
        };
    }

    // Paid
    if (payment.status === "paye") {
        const paid = payment.date_paiement
            ? `Payé le ${new Date(payment.date_paiement).toLocaleDateString("fr-FR")}`
            : "Payé";
        return {
            barPct: 100,
            barColor: "bg-green-500",
            penalty: 0,
            daysLabel: paid,
            daysColor: "text-green-600",
            statusLabel: "Payé",
            statusBadge: "bg-green-100 text-green-700",
        };
    }

    // In validation
    if (payment.status === "en_validation") {
        return {
            barPct: 85,
            barColor: "bg-blue-400",
            penalty: 0,
            daysLabel: "En cours de validation",
            daysColor: "text-blue-600",
            statusLabel: "En validation",
            statusBadge: "bg-blue-100 text-blue-700",
        };
    }

    // No deadline set
    if (!payment.date_limite) {
        return {
            barPct: 5,
            barColor: "bg-slate-300",
            penalty: 0,
            daysLabel: "Pas d'échéance définie",
            daysColor: "text-slate-400",
            statusLabel: "En attente",
            statusBadge: "bg-yellow-100 text-yellow-700",
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(payment.date_limite);
    deadline.setHours(0, 0, 0, 0);

    const graceDays = getGraceDays(serviceType);
    const graceEnd = new Date(deadline.getTime() + graceDays * MS_PER_DAY);

    const daysToDeadline = Math.ceil((deadline.getTime() - today.getTime()) / MS_PER_DAY);
    const daysToGraceEnd = Math.ceil((graceEnd.getTime() - today.getTime()) / MS_PER_DAY);
    const penalty = calculatePenalty(payment);

    // Before deadline
    if (daysToDeadline > 0) {
        let barPct: number;
        let barColor: string;
        let daysColor: string;

        if (daysToDeadline > 14) {
            barPct = 12;
            barColor = "bg-blue-300";
            daysColor = "text-blue-500";
        } else if (daysToDeadline > 7) {
            barPct = 35;
            barColor = "bg-yellow-400";
            daysColor = "text-yellow-600";
        } else if (daysToDeadline > 3) {
            barPct = 60;
            barColor = "bg-orange-400";
            daysColor = "text-orange-600";
        } else {
            barPct = 80;
            barColor = "bg-orange-500";
            daysColor = "text-orange-700";
        }

        return {
            barPct,
            barColor,
            penalty: 0,
            daysLabel: `J-${daysToDeadline} — Échéance le ${deadline.toLocaleDateString("fr-FR")}`,
            daysColor,
            statusLabel: "En attente",
            statusBadge: "bg-yellow-100 text-yellow-700",
        };
    }

    // In grace period
    if (daysToGraceEnd > 0) {
        const graceUsed = graceDays - daysToGraceEnd;
        const barPct = Math.round(80 + (graceUsed / graceDays) * 12);
        return {
            barPct,
            barColor: "bg-amber-400",
            penalty: 0,
            daysLabel: `Période de grâce — ${daysToGraceEnd} j restants (sur ${graceDays} j)`,
            daysColor: "text-amber-600",
            statusLabel: "En attente",
            statusBadge: "bg-amber-100 text-amber-700",
        };
    }

    // Past grace — late
    const daysLate = Math.abs(daysToGraceEnd);
    return {
        barPct: 100,
        barColor: "bg-red-500",
        penalty,
        daysLabel: `${daysLate} jour${daysLate > 1 ? "s" : ""} de retard`,
        daysColor: "text-red-600",
        statusLabel: "En retard",
        statusBadge: "bg-red-100 text-red-700",
    };
}

function getExpectedServices(choix: string, langue: string): Service[] {
    const services: Service[] = [];
    const lc = langue.toLowerCase();

    if (choix === "procedure_seule" || choix === "procedure_cours") {
        services.push({
            type: "bourse",
            label: "Procédure Bourse",
            total: Object.values(MONTANTS_BOURSE).reduce((a, b) => a + b, 0),
            tranches: [
                { tranche: 1, label: "Inscription", montant: MONTANTS_BOURSE.TRANCHE_1 },
                { tranche: 2, label: "Dépôt de dossier", montant: MONTANTS_BOURSE.TRANCHE_2 },
                { tranche: 3, label: "Admission", montant: MONTANTS_BOURSE.TRANCHE_3 },
                { tranche: 4, label: "Visa", montant: MONTANTS_BOURSE.TRANCHE_4 },
            ],
        });
    }

    if (choix === "cours_seuls" || choix === "procedure_cours") {
        if (lc.includes("mandarin")) {
            services.push({
                type: "mandarin",
                label: "Cours de Mandarin",
                total: MONTANTS_MANDARIN.TOTAL,
                tranches: [
                    { tranche: 1, label: "Inscription", montant: MONTANTS_MANDARIN.INSCRIPTION },
                    { tranche: 2, label: "Livre", montant: MONTANTS_MANDARIN.LIVRE },
                    { tranche: 3, label: "1re tranche de cours", montant: MONTANTS_MANDARIN.TRANCHE_1 },
                    { tranche: 4, label: "2e tranche de cours", montant: MONTANTS_MANDARIN.TRANCHE_2 },
                ],
            });
        } else if (lc.includes("anglais")) {
            services.push({
                type: "anglais",
                label: "Cours d'Anglais",
                total: MONTANTS_ANGLAIS.TOTAL,
                tranches: [
                    { tranche: 1, label: "Inscription", montant: MONTANTS_ANGLAIS.INSCRIPTION },
                    { tranche: 2, label: "Livre", montant: MONTANTS_ANGLAIS.LIVRE },
                    { tranche: 3, label: "1re tranche de cours", montant: MONTANTS_ANGLAIS.TRANCHE_1 },
                    { tranche: 4, label: "2e tranche de cours", montant: MONTANTS_ANGLAIS.TRANCHE_2 },
                ],
            });
        }
    }

    return services;
}

function fmt(n: number) {
    return n.toLocaleString("fr-FR") + " FCFA";
}

export default function PaymentOverview({
    choix,
    langue,
    payments,
    onDownloadReceipt,
}: {
    choix: string;
    langue: string;
    payments: Payment[];
    onDownloadReceipt?: (payment: Payment) => void;
}) {
    const services = useMemo(() => getExpectedServices(choix, langue), [choix, langue]);

    const totalDu = services.reduce((sum, s) => sum + s.total, 0);
    const totalPenalties = useMemo(
        () => payments.filter((p) => p.status !== "paye").reduce((sum, p) => sum + calculatePenalty(p), 0),
        [payments]
    );
    const totalPaye = payments
        .filter((p) => p.status === "paye")
        .reduce((sum, p) => sum + p.montant, 0);
    const reste = Math.max(0, totalDu - totalPaye + totalPenalties);
    const pct = totalDu > 0 ? Math.min(100, Math.round((totalPaye / totalDu) * 100)) : 0;

    if (services.length === 0) {
        return (
            <p className="py-4 text-center text-sm text-slate-500">
                Aucun service configuré pour ce profil.
            </p>
        );
    }

    return (
        <div className="space-y-6">
            {/* Résumé financier */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">Total dû</p>
                    <p className="mt-1 text-base font-bold text-slate-900">
                        {totalDu.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px] text-slate-500">FCFA</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-green-600">Payé</p>
                    <p className="mt-1 text-base font-bold text-green-700">
                        {totalPaye.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px] text-green-600">FCFA</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-red-500">
                        Reste{totalPenalties > 0 ? " + pén." : ""}
                    </p>
                    <p className="mt-1 text-base font-bold text-red-600">
                        {reste.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px] text-red-500">FCFA</p>
                </div>
            </div>

            {totalPenalties > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <span className="text-xs font-semibold text-red-600">Pénalités cumulées :</span>
                    <span className="text-sm font-bold text-red-700">{fmt(totalPenalties)}</span>
                </div>
            )}

            {/* Progression globale */}
            <div>
                <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>Progression globale</span>
                    <span className="font-semibold text-slate-700">{pct}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                        className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>{totalPaye.toLocaleString("fr-FR")} FCFA payés</span>
                    <span>{totalDu.toLocaleString("fr-FR")} FCFA au total</span>
                </div>
            </div>

            {/* Échéancier par service */}
            {services.map((service) => {
                const sPayments = payments.filter((p) => p.type === service.type);
                const sPaid = sPayments
                    .filter((p) => p.status === "paye")
                    .reduce((s, p) => s + p.montant, 0);
                const sPct = service.total > 0
                    ? Math.min(100, Math.round((sPaid / service.total) * 100))
                    : 0;
                const paidCount = sPayments.filter((p) => p.status === "paye").length;

                return (
                    <div key={service.type} className="space-y-3">
                        {/* En-tête service */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{service.label}</p>
                                <p className="text-[10px] text-slate-400">
                                    {paidCount} / {service.tranches.length} tranche{service.tranches.length > 1 ? "s" : ""} réglée{paidCount > 1 ? "s" : ""}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold text-slate-700">{sPct}%</p>
                                <p className="text-[10px] text-slate-400">
                                    {sPaid.toLocaleString("fr-FR")} / {service.total.toLocaleString("fr-FR")} FCFA
                                </p>
                            </div>
                        </div>

                        {/* Tranches */}
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                            {service.tranches.map((tranche) => {
                                const payment = sPayments.find(
                                    (p) => p.tranche === tranche.tranche
                                );
                                const state = computeTrancheState(payment, service.type);

                                return (
                                    <div
                                        key={tranche.tranche}
                                        className="rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm"
                                    >
                                        {/* Ligne principale */}
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {/* Cercle numéro */}
                                                <span
                                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                                        state.barPct === 100 && state.barColor === "bg-green-500"
                                                            ? "bg-green-100 text-green-700"
                                                            : state.barColor.includes("red")
                                                              ? "bg-red-100 text-red-700"
                                                              : state.barColor.includes("amber")
                                                                ? "bg-amber-100 text-amber-700"
                                                                : state.barColor.includes("orange")
                                                                  ? "bg-orange-100 text-orange-700"
                                                                  : "bg-slate-100 text-slate-600"
                                                    }`}
                                                >
                                                    {payment?.status === "paye" ? "✓" : tranche.tranche}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold leading-tight text-slate-800">
                                                        {tranche.label}
                                                    </p>
                                                    {payment?.date_limite && payment.status !== "paye" && (
                                                        <p className="text-[10px] text-slate-400">
                                                            Échéance : {new Date(payment.date_limite).toLocaleDateString("fr-FR")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-xs font-bold text-slate-900">
                                                    {fmt(tranche.montant)}
                                                </p>
                                                <span
                                                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${state.statusBadge}`}
                                                >
                                                    {state.statusLabel}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Barre de progression */}
                                        <div className="mb-1.5">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-[10px] font-medium ${state.daysColor}`}>
                                                    {state.daysLabel ?? ""}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {state.barPct}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all duration-500 ${state.barColor}`}
                                                    style={{ width: `${state.barPct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Pénalité */}
                                        {state.penalty > 0 && (
                                            <div className="mt-2 flex items-center justify-between rounded-lg bg-red-50 px-2.5 py-1.5">
                                                <span className="text-[10px] font-semibold text-red-500">
                                                    Pénalité de retard
                                                </span>
                                                <span className="text-xs font-bold text-red-700">
                                                    +{fmt(state.penalty)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Bouton reçu */}
                                        {payment?.status === "paye" && onDownloadReceipt && (
                                            <button
                                                onClick={() => onDownloadReceipt(payment)}
                                                className="mt-2 w-full rounded-lg border border-green-200 bg-green-50 py-1.5 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100"
                                            >
                                                Télécharger le reçu
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
