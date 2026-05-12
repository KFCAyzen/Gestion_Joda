"use client";

import { useMemo } from "react";
import { CreditCard } from "lucide-react";
import { calculatePenalty } from "../utils/penaltyCalculator";
import { usePaymentConfig } from "../context/PaymentConfigContext";
import { getBourseServiceType, PaymentConfig } from "../types/payment-config";

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

function computeTrancheState(
    payment: Payment | undefined,
    serviceType: string,
    graceDays: number,
    penaltyConfig: { grace_days: number; daily_penalty: number }
) {
    // No payment record yet
    if (!payment) {
        return {
            barPct: 0,
            barColor: "bg-white/10",
            penalty: 0,
            daysLabel: null as string | null,
            daysColor: "text-white/55",
            statusLabel: "Non planifiée",
            statusBadge: "border-white/10 bg-white/5 text-white/65",
        };
    }

    // Paid
    if (payment.status === "paye") {
        const paid = payment.date_paiement
            ? `Payé le ${new Date(payment.date_paiement).toLocaleDateString("fr-FR")}`
            : "Payé";
        return {
            barPct: 100,
            barColor: "bg-[var(--student-ring-exercise)]",
            penalty: 0,
            daysLabel: paid,
            daysColor: "text-[var(--student-ring-exercise)]",
            statusLabel: "Payé",
            statusBadge: "border-white/10 bg-white/5 text-[var(--student-ring-exercise)]",
        };
    }

    // In validation
    if (payment.status === "en_validation") {
        return {
            barPct: 85,
            barColor: "bg-[var(--student-ring-stand)]",
            penalty: 0,
            daysLabel: "En cours de validation",
            daysColor: "text-[var(--student-ring-stand)]",
            statusLabel: "En validation",
            statusBadge: "border-white/10 bg-white/5 text-[var(--student-ring-stand)]",
        };
    }

    // No deadline set
    if (!payment.date_limite) {
        return {
            barPct: 5,
            barColor: "bg-white/15",
            penalty: 0,
            daysLabel: "Pas d'échéance définie",
            daysColor: "text-white/55",
            statusLabel: "En attente",
            statusBadge: "border-white/10 bg-white/5 text-white/70",
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(payment.date_limite);
    deadline.setHours(0, 0, 0, 0);

    const graceEnd = new Date(deadline.getTime() + graceDays * MS_PER_DAY);

    const daysToDeadline = Math.ceil((deadline.getTime() - today.getTime()) / MS_PER_DAY);
    const daysToGraceEnd = Math.ceil((graceEnd.getTime() - today.getTime()) / MS_PER_DAY);
    const penalty = calculatePenalty(payment, penaltyConfig);

    // Before deadline
    if (daysToDeadline > 0) {
        let barPct: number;
        let barColor: string;
        let daysColor: string;

        if (daysToDeadline > 14) {
            barPct = 12;
            barColor = "bg-[var(--student-ring-stand)]/65";
            daysColor = "text-[var(--student-ring-stand)]";
        } else if (daysToDeadline > 7) {
            barPct = 35;
            barColor = "bg-[var(--student-ring-move)]/55";
            daysColor = "text-[var(--student-ring-move)]";
        } else if (daysToDeadline > 3) {
            barPct = 60;
            barColor = "bg-[var(--student-ring-move)]/75";
            daysColor = "text-[var(--student-ring-move)]";
        } else {
            barPct = 80;
            barColor = "bg-[var(--student-ring-move)]";
            daysColor = "text-[var(--student-ring-move)]";
        }

        return {
            barPct,
            barColor,
            penalty: 0,
            daysLabel: `J-${daysToDeadline} — Échéance le ${deadline.toLocaleDateString("fr-FR")}`,
            daysColor,
            statusLabel: "En attente",
            statusBadge: "border-white/10 bg-white/5 text-white/70",
        };
    }

    // In grace period
    if (daysToGraceEnd > 0) {
        const graceUsed = graceDays - daysToGraceEnd;
        const barPct = Math.round(80 + (graceUsed / graceDays) * 12);
        return {
            barPct,
            barColor: "bg-[var(--student-ring-move)]",
            penalty: 0,
            daysLabel: `Période de grâce — ${daysToGraceEnd} j restants (sur ${graceDays} j)`,
            daysColor: "text-[var(--student-ring-move)]",
            statusLabel: "En attente",
            statusBadge: "border-white/10 bg-white/5 text-white/70",
        };
    }

    // Past grace — late
    const daysLate = Math.abs(daysToGraceEnd);
    return {
        barPct: 100,
        barColor: "bg-[var(--student-ring-move)]",
        penalty,
        daysLabel: `${daysLate} jour${daysLate > 1 ? "s" : ""} de retard`,
        daysColor: "text-[var(--student-ring-move)]",
        statusLabel: "En retard",
        statusBadge: "border-white/15 bg-white/5 text-[var(--student-ring-move)]",
    };
}

function configToService(cfg: PaymentConfig, type: string): Service {
    return {
        type,
        label: cfg.label,
        total: cfg.tranches.reduce((s, t) => s + t.montant, 0),
        tranches: cfg.tranches,
    };
}

function fmt(n: number) {
    return n.toLocaleString("fr-FR") + " FCFA";
}

export interface TrancheDeclareInfo {
    type: string;
    tranche: number;
    montant: number;
    label: string;
}

export default function PaymentOverview({
    choix,
    langue,
    niveau,
    payments,
    onDownloadReceipt,
    onDeclarePayment,
}: {
    choix: string;
    langue: string;
    niveau?: string;
    payments: Payment[];
    onDownloadReceipt?: (payment: Payment) => void;
    onDeclarePayment?: (payment: Payment | null, info: TrancheDeclareInfo) => void;
}) {
    const { getConfig, getBourseConfig } = usePaymentConfig();

    const services = useMemo((): Service[] => {
        const list: Service[] = [];
        const lc = langue.toLowerCase();

        if (choix === "procedure_seule" || choix === "procedure_cours") {
            const cfg = getBourseConfig(niveau);
            list.push(configToService(cfg, "bourse"));
        }

        if (choix === "cours_seuls" || choix === "procedure_cours") {
            if (lc.includes("mandarin")) list.push(configToService(getConfig("mandarin"), "mandarin"));
            else if (lc.includes("anglais")) list.push(configToService(getConfig("anglais"), "anglais"));
        }

        if (payments.some(p => p.type === "mandarin") && !list.some(s => s.type === "mandarin"))
            list.push(configToService(getConfig("mandarin"), "mandarin"));
        if (payments.some(p => p.type === "anglais") && !list.some(s => s.type === "anglais"))
            list.push(configToService(getConfig("anglais"), "anglais"));

        return list;
    }, [choix, langue, niveau, payments, getConfig, getBourseConfig]);

    const totalDu = services.reduce((sum, s) => sum + s.total, 0);

    const totalPenalties = useMemo(() => {
        return payments.filter((p) => p.status !== "paye").reduce((sum, p) => {
            const isLangue = p.type === "mandarin" || p.type === "anglais";
            const cfg = isLangue
                ? getConfig(p.type as "mandarin" | "anglais")
                : getBourseConfig(niveau);
            return sum + calculatePenalty(p, { grace_days: cfg.grace_days, daily_penalty: cfg.daily_penalty });
        }, 0);
    }, [payments, getConfig, getBourseConfig, niveau]);
    const totalPaye = payments
        .filter((p) => p.status === "paye")
        .reduce((sum, p) => sum + p.montant, 0);
    const reste = Math.max(0, totalDu - totalPaye + totalPenalties);
    const pct = totalDu > 0 ? Math.min(100, Math.round((totalPaye / totalDu) * 100)) : 0;

    if (services.length === 0) {
        return (
            <p className="py-4 text-center text-sm text-white/65">
                Aucun service configuré pour ce profil.
            </p>
        );
    }

    return (
        <div className="space-y-6">
            {/* Résumé financier */}
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center shadow-[0_14px_44px_rgba(0,0,0,0.35)]">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-white/55">Total dû</p>
                    <p className="mt-1 text-base font-semibold tracking-tight text-white">
                        {totalDu.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px] text-white/55">FCFA</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center shadow-[0_14px_44px_rgba(0,0,0,0.35)]">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-white/55">Payé</p>
                    <p className="mt-1 text-base font-semibold tracking-tight text-[var(--student-ring-exercise)] [text-shadow:var(--student-glow-exercise)]">
                        {totalPaye.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px] text-white/55">FCFA</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center shadow-[0_14px_44px_rgba(0,0,0,0.35)]">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-white/55">
                        Reste{totalPenalties > 0 ? " + pén." : ""}
                    </p>
                    <p className="mt-1 text-base font-semibold tracking-tight text-[var(--student-ring-move)] [text-shadow:var(--student-glow-move)]">
                        {reste.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[10px] text-white/55">FCFA</p>
                </div>
            </div>

            {totalPenalties > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 shadow-[0_16px_54px_rgba(0,0,0,0.35)]">
                    <span className="text-xs font-semibold text-white/70">Pénalités cumulées :</span>
                    <span className="text-sm font-semibold text-[var(--student-ring-move)] [text-shadow:var(--student-glow-move)]">
                        {fmt(totalPenalties)}
                    </span>
                </div>
            )}

            {/* Progression globale */}
            <div>
                <div className="mb-1.5 flex justify-between text-xs text-white/60">
                    <span>Progression globale</span>
                    <span className="font-semibold text-white">{pct}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                        className="h-3 rounded-full bg-[linear-gradient(90deg,var(--student-ring-move),var(--student-ring-exercise),var(--student-ring-stand))] transition-all duration-700"
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-white/55">
                    <span>{totalPaye.toLocaleString("fr-FR")} FCFA payés</span>
                    <span>{totalDu.toLocaleString("fr-FR")} FCFA au total</span>
                </div>
            </div>

            {/* Échéancier par service */}
            {services.map((service) => {
                const isLangue = service.type === "mandarin" || service.type === "anglais";
                const serviceCfg = isLangue
                    ? getConfig(service.type as "mandarin" | "anglais")
                    : getBourseConfig(niveau);
                const penaltyConfig = { grace_days: serviceCfg.grace_days, daily_penalty: serviceCfg.daily_penalty };

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
                                <p className="text-sm font-semibold text-white">{service.label}</p>
                                <p className="text-[10px] text-white/55">
                                    {paidCount} / {service.tranches.length} tranche{service.tranches.length > 1 ? "s" : ""} réglée{paidCount > 1 ? "s" : ""}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold text-white">{sPct}%</p>
                                <p className="text-[10px] text-white/55">
                                    {sPaid.toLocaleString("fr-FR")}, {service.total.toLocaleString("fr-FR")} FCFA
                                </p>
                            </div>
                        </div>

                        {/* Tranches */}
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
                            {service.tranches.map((tranche) => {
                                const payment = sPayments.find(
                                    (p) => p.tranche === tranche.tranche
                                );
                                const state = computeTrancheState(payment, service.type, serviceCfg.grace_days, penaltyConfig);

                                return (
                                    <div
                                        key={tranche.tranche}
                                        className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-[0_16px_54px_rgba(0,0,0,0.35)]"
                                    >
                                        {/* Ligne principale */}
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {/* Cercle numéro */}
                                                <span
                                                    className={[
                                                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-2xl border text-[11px] font-bold shadow-[0_14px_34px_rgba(0,0,0,0.35)]",
                                                        payment?.status === "paye"
                                                            ? "border-white/10 bg-white/5 text-[var(--student-ring-exercise)]"
                                                            : state.statusLabel === "En retard"
                                                              ? "border-white/15 bg-white/5 text-[var(--student-ring-move)]"
                                                              : state.statusLabel === "En validation"
                                                                ? "border-white/10 bg-white/5 text-[var(--student-ring-stand)]"
                                                                : "border-white/10 bg-white/5 text-white/75",
                                                    ].join(" ")}
                                                >
                                                    {payment?.status === "paye" ? "✓" : tranche.tranche}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold leading-tight text-white">
                                                        {tranche.label}
                                                    </p>
                                                    {payment?.date_limite && payment.status !== "paye" && (
                                                        <p className="text-[10px] text-white/55">
                                                            Échéance : {new Date(payment.date_limite).toLocaleDateString("fr-FR")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-xs font-semibold text-white">
                                                    {fmt(tranche.montant)}
                                                </p>
                                                <span
                                                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${state.statusBadge}`}
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
                                                <span className="text-[10px] text-white/55">
                                                    {state.barPct}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all duration-500 ${state.barColor}`}
                                                    style={{ width: `${state.barPct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Pénalité */}
                                        {state.penalty > 0 && (
                                            <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/12 bg-white/5 px-3 py-2">
                                                <span className="text-[10px] font-semibold text-white/70">
                                                    Pénalité de retard
                                                </span>
                                                <span className="text-xs font-semibold text-[var(--student-ring-move)] [text-shadow:var(--student-glow-move)]">
                                                    +{fmt(state.penalty)}
                                                </span>
                                            </div>
                                        )}

                                        {/* Bouton reçu */}
                                        {payment?.status === "paye" && onDownloadReceipt && (
                                            <button
                                                onClick={() => onDownloadReceipt(payment)}
                                                className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 py-2 text-xs font-semibold text-[var(--student-ring-exercise)] transition-colors hover:bg-white/10"
                                            >
                                                Télécharger le reçu
                                            </button>
                                        )}

                                        {/* Bouton déclarer paiement */}
                                        {payment?.status !== "paye" && payment?.status !== "en_validation" && onDeclarePayment && (
                                            <button
                                                onClick={() => onDeclarePayment(payment ?? null, {
                                                    type: service.type,
                                                    tranche: tranche.tranche,
                                                    montant: tranche.montant,
                                                    label: tranche.label,
                                                })}
                                                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(255,45,85,0.22),rgba(255,69,58,0.12))] py-2 text-xs font-semibold text-white shadow-[0_16px_44px_rgba(0,0,0,0.35)] transition-colors hover:bg-[linear-gradient(135deg,rgba(255,45,85,0.28),rgba(255,69,58,0.14))]"
                                            >
                                                <CreditCard className="h-3.5 w-3.5" />
                                                Effectuer ce paiement
                                            </button>
                                        )}

                                        {/* Indicateur en validation */}
                                        {payment?.status === "en_validation" && (
                                            <div className="mt-2 rounded-2xl border border-white/12 bg-white/5 py-2 text-center text-xs font-semibold text-[var(--student-ring-stand)]">
                                                En attente de validation
                                            </div>
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
