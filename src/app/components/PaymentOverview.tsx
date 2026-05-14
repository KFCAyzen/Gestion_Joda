"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Check, CreditCard, Loader2 } from "lucide-react";
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
            barColor: "bg-[var(--student-border)]",
            penalty: 0,
            daysLabel: null as string | null,
            daysColor: "text-[var(--student-fg-muted)]",
            statusLabel: "Non planifiée",
            statusBadge: "border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-fg-muted)]",
        };
    }

    // Paid
    if (payment.status === "paye") {
        const paid = payment.date_paiement
            ? `__paid_on:${new Date(payment.date_paiement).toLocaleDateString("fr-FR")}`
            : "__paid";
        return {
            barPct: 100,
            barColor: "bg-[var(--student-neon-lime)]",
            penalty: 0,
            daysLabel: paid,
            daysColor: "text-[var(--student-neon-lime)]",
            statusLabel: "Payé",
            statusBadge: "border-[rgba(220,38,38,0.22)] bg-[rgba(220,38,38,0.08)] text-[var(--student-neon-lime)]",
        };
    }

    // In validation
    if (payment.status === "en_validation") {
        return {
            barPct: 85,
            barColor: "bg-[var(--student-ring-exercise)]",
            penalty: 0,
            daysLabel: "__in_validation",
            daysColor: "text-[var(--student-ring-exercise)]",
            statusLabel: "En validation",
            statusBadge: "border-[rgba(220,38,38,0.15)] bg-[rgba(220,38,38,0.05)] text-[var(--student-ring-exercise)]",
        };
    }

    // No deadline set
    if (!payment.date_limite) {
        return {
            barPct: 5,
            barColor: "bg-[var(--student-border)]",
            penalty: 0,
            daysLabel: "__no_deadline",
            daysColor: "text-[var(--student-fg-muted)]",
            statusLabel: "En attente",
            statusBadge: "border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-fg-muted)]",
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
            barColor = "bg-[var(--student-neon-lime)]/35";
            daysColor = "text-[var(--student-neon-lime)]/85";
        } else if (daysToDeadline > 7) {
            barPct = 35;
            barColor = "bg-[var(--student-neon-lime)]/55";
            daysColor = "text-[var(--student-neon-lime-mid)]";
        } else if (daysToDeadline > 3) {
            barPct = 60;
            barColor = "bg-[var(--student-neon-lime)]/72";
            daysColor = "text-[var(--student-neon-lime)]";
        } else {
            barPct = 80;
            barColor = "bg-[var(--student-neon-lime)]";
            daysColor = "text-[var(--student-neon-lime)]";
        }

        return {
            barPct,
            barColor,
            penalty: 0,
            daysLabel: `__days_left:${daysToDeadline}:${deadline.toISOString()}:${deadline.toLocaleDateString("fr-FR")}`,
            daysColor,
            statusLabel: "En attente",
            statusBadge: "border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-fg-muted)]",
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
            daysLabel: `__grace:${daysToGraceEnd}:${graceDays}`,
            daysColor: "text-[var(--student-ring-move)]",
            statusLabel: "En attente",
            statusBadge: "border-[rgba(220,38,38,0.15)] bg-[rgba(220,38,38,0.05)] text-[var(--student-ring-move)]",
        };
    }

    // Past grace — late
    const daysLate = Math.abs(daysToGraceEnd);
    return {
        barPct: 100,
        barColor: "bg-[var(--student-ring-move)]",
        penalty,
        daysLabel: `__late:${daysLate}`,
        daysColor: "text-[var(--student-ring-move)]",
        statusLabel: "En retard",
        statusBadge: "border-[rgba(255,65,85,0.25)] bg-[rgba(255,65,85,0.08)] text-[var(--student-ring-move)]",
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


function resolveDaysLabel(raw: string | null, t: (k: string, v?: any) => string, locale: string): string | null {
    if (!raw) return null;
    if (raw === "__in_validation") return t("statuses.validationLabel");
    if (raw === "__no_deadline") return t("statuses.noDeadline");
    if (raw === "__paid") return t("statuses.paid");
    if (raw.startsWith("__paid_on:")) return t("statuses.paidOn", { date: raw.slice(10) });
    if (raw.startsWith("__days_left:")) {
        const parts = raw.split(":");
        const days = parts[1];
        const dateStr = parts[3];
        return t("statuses.daysLeft", { days, date: dateStr });
    }
    if (raw.startsWith("__grace:")) {
        const parts = raw.split(":");
        return t("statuses.gracePeriod", { remaining: parts[1], total: parts[2] });
    }
    if (raw.startsWith("__late:")) {
        const days = parseInt(raw.split(":")[1] || "0");
        return t("statuses.daysLate", { days, plural: days > 1 ? "s" : "" });
    }
    return raw;
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
    nationalite,
    payments,
    onDownloadReceipt,
    onDeclarePayment,
}: {
    choix: string;
    langue: string;
    niveau?: string;
    nationalite?: string | null;
    payments: Payment[];
    onDownloadReceipt?: (payment: Payment) => void;
    onDeclarePayment?: (payment: Payment | null, info: TrancheDeclareInfo) => void;
}) {
    const { getConfig, getBourseConfig } = usePaymentConfig();
    const t = useTranslations("paymentOverview");
    const locale = useLocale();

    const services = useMemo((): Service[] => {
        const list: Service[] = [];
        const lc = langue.toLowerCase();

        if (choix === "procedure_seule" || choix === "procedure_cours") {
            const cfg = getBourseConfig(niveau, nationalite);
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
    }, [choix, langue, niveau, nationalite, payments, getConfig, getBourseConfig]);

    const totalDu = services.reduce((sum, s) => sum + s.total, 0);

    const totalPenalties = useMemo(() => {
        return payments.filter((p) => p.status !== "paye").reduce((sum, p) => {
            const isLangue = p.type === "mandarin" || p.type === "anglais";
            const cfg = isLangue
                ? getConfig(p.type as "mandarin" | "anglais")
                : getBourseConfig(niveau, nationalite);
            return sum + calculatePenalty(p, { grace_days: cfg.grace_days, daily_penalty: cfg.daily_penalty });
        }, 0);
    }, [payments, getConfig, getBourseConfig, niveau, nationalite]);
    const totalPaye = payments
        .filter((p) => p.status === "paye")
        .reduce((sum, p) => sum + p.montant, 0);
    const reste = Math.max(0, totalDu - totalPaye + totalPenalties);
    const pct = totalDu > 0 ? Math.min(100, Math.round((totalPaye / totalDu) * 100)) : 0;

    if (services.length === 0) {
        return (
            <p className="py-4 text-center text-sm text-[var(--student-fg-muted)]">
                {t("noService")}
            </p>
        );
    }

    return (
        <div className="space-y-6 px-5 pb-6 pt-1 sm:px-7">
            {/* Résumé financier — glass olive + chiffres néon */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                <div className="student-pay-surface-soft p-3 text-center sm:p-3.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--student-fg-muted)] sm:text-[10px]">{t("totalDue")}</p>
                    <p className="mt-1.5 text-base font-semibold tabular-nums tracking-tight text-[var(--student-fg)] sm:text-lg">
                        {totalDu.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[9px] text-[var(--student-fg-muted)] sm:text-[10px]">FCFA</p>
                </div>
                <div className="student-pay-surface-soft p-3 text-center sm:p-3.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--student-ring-exercise)] sm:text-[10px]">{t("paid")}</p>
                    <p
                        className="mt-1.5 text-base font-semibold tabular-nums tracking-tight text-[var(--student-ring-exercise)] sm:text-lg"
                        style={{ textShadow: "var(--student-pay-glow-soft)" }}
                    >
                        {totalPaye.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[9px] text-[var(--student-fg-muted)] sm:text-[10px]">FCFA</p>
                </div>
                <div className="student-pay-surface-soft p-3 text-center sm:p-3.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--student-fg-muted)] sm:text-[10px]">
                        {totalPenalties > 0 ? t("remainingWithPenalty") : t("remaining")}
                    </p>
                    <p
                        className="mt-1.5 text-base font-semibold tabular-nums tracking-tight text-[var(--student-ring-move)] sm:text-lg"
                        style={{ textShadow: "var(--student-glow-move)" }}
                    >
                        {reste.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-[9px] text-[var(--student-fg-muted)] sm:text-[10px]">FCFA</p>
                </div>
            </div>

            {totalPenalties > 0 && (
                <div className="student-pay-pill flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="text-xs font-semibold text-[var(--student-fg-muted)]">{t("cumulatedPenalties")}</span>
                    <span className="text-sm font-semibold tabular-nums text-[var(--student-ring-move)] [text-shadow:var(--student-glow-move)]">
                        {fmt(totalPenalties)}
                    </span>
                </div>
            )}

            {/* Progression globale — barre néon lime */}
            <div className="student-pay-surface-soft px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="mb-2 flex justify-between text-xs text-[var(--student-fg-muted)]">
                    <span className="font-medium">{t("globalProgress")}</span>
                    <span className="font-semibold tabular-nums text-[var(--student-ring-exercise)]">{pct}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/25 dark:bg-black/45 sm:h-3">
                    <div
                        className="h-full rounded-full bg-[var(--student-ring-exercise)] transition-all duration-700"
                        style={{
                            width: `${pct}%`,
                            boxShadow: "var(--student-pay-glow)",
                        }}
                    />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-[var(--student-fg-muted)]">
                    <span>{t("paidAmount", { amount: totalPaye.toLocaleString(locale === "en" ? "en-US" : "fr-FR") })}</span>
                    <span>{t("totalAmount", { amount: totalDu.toLocaleString(locale === "en" ? "en-US" : "fr-FR") })}</span>
                </div>
            </div>

            {/* Échéancier par service */}
            {services.map((service) => {
                const isLangue = service.type === "mandarin" || service.type === "anglais";
                const serviceCfg = isLangue
                    ? getConfig(service.type as "mandarin" | "anglais")
                    : getBourseConfig(niveau, nationalite);
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
                        <div className="student-pay-surface-soft flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                            <div className="min-w-0">
                                <p className="text-sm font-semibold tracking-tight text-[var(--student-fg)]">{service.label}</p>
                                <p className="mt-0.5 text-[10px] text-[var(--student-fg-muted)]">
                                    {t("installmentsPaid", { paid: paidCount, total: service.tranches.length, plural: service.tranches.length > 1 ? "s" : "" })}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold tabular-nums text-[var(--student-ring-exercise)]">{sPct}%</p>
                                <p className="text-[10px] text-[var(--student-fg-muted)]">
                                    {sPaid.toLocaleString("fr-FR")} / {service.total.toLocaleString("fr-FR")}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {service.tranches.map((tranche) => {
                                const payment = sPayments.find(
                                    (p) => p.tranche === tranche.tranche
                                );
                                const state = computeTrancheState(payment, service.type, serviceCfg.grace_days, penaltyConfig);
                                const canDeclare =
                                    payment?.status !== "paye" &&
                                    payment?.status !== "en_validation" &&
                                    Boolean(onDeclarePayment);

                                const declarePayload = () =>
                                    onDeclarePayment?.(payment ?? null, {
                                        type: service.type,
                                        tranche: tranche.tranche,
                                        montant: tranche.montant,
                                        label: tranche.label,
                                    });

                                return (
                                    <div
                                        key={tranche.tranche}
                                        className="student-pay-surface-soft flex flex-col gap-3 p-4 sm:p-[1.125rem]"
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={[
                                                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-[12px] font-bold",
                                                            payment?.status === "paye"
                                                                ? "border-[rgba(220,38,38,0.28)] bg-[rgba(220,38,38,0.06)] text-[var(--student-ring-exercise)]"
                                                                : state.statusLabel === "En retard"
                                                                  ? "border-[rgba(255,65,85,0.35)] bg-[rgba(255,65,85,0.06)] text-[var(--student-ring-move)]"
                                                                  : state.statusLabel === "En validation"
                                                                    ? "border-[rgba(220,38,38,0.20)] bg-[rgba(220,38,38,0.05)] text-[var(--student-ring-exercise)]"
                                                                    : "border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-fg-muted)]",
                                                        ].join(" ")}
                                                    >
                                                        {tranche.tranche}
                                                    </div>
                                                    <div className="min-w-0 flex-1 pt-0.5">
                                                        <p className="text-[13px] font-semibold leading-snug text-[var(--student-fg)] sm:text-sm">
                                                            {tranche.label}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                            <span
                                                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${state.statusBadge}`}
                                                            >
                                                                {state.statusLabel === "En retard" ? t("statuses.late") : state.statusLabel === "En validation" ? t("statuses.inValidation") : state.statusLabel === "Non planifiée" ? t("statuses.unplanned") : t("statuses.pending")}
                                                            </span>
                                                            {payment?.date_limite && payment.status !== "paye" ? (
                                                                <span className="text-[10px] text-[var(--student-fg-muted)]">
                                                                    {t("deadline", { date: new Date(payment.date_limite).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR") })}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[var(--student-fg)]">
                                                            {fmt(tranche.montant)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="mb-1 flex items-center justify-between gap-2">
                                                        <span className={`min-w-0 flex-1 text-[10px] font-medium leading-snug ${state.daysColor}`}>
                                                            {resolveDaysLabel(state.daysLabel, t, locale) ?? "\u00a0"}
                                                        </span>
                                                        <span className="shrink-0 text-[10px] tabular-nums text-[var(--student-fg-muted)]">{state.barPct}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/25 dark:bg-black/50">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-500 ${state.barColor}`}
                                                            style={{ width: `${state.barPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                                                {payment?.status === "paye" ? (
                                                    <div
                                                        className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border-2 border-[rgba(220,38,38,0.45)] bg-[rgba(220,38,38,0.06)] text-[var(--student-ring-exercise)] shadow-[var(--student-pay-glow-soft)]"
                                                        title={t("statuses.paid")}
                                                    >
                                                        <Check className="h-6 w-6 stroke-[2.5]" aria-hidden />
                                                    </div>
                                                ) : payment?.status === "en_validation" ? (
                                                    <div
                                                        className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border border-[rgba(220,38,38,0.20)] bg-[rgba(220,38,38,0.05)] text-[var(--student-ring-exercise)]"
                                                        title={t("statuses.inValidation")}
                                                    >
                                                        <Loader2 className="h-6 w-6 animate-spin opacity-90" aria-hidden />
                                                    </div>
                                                ) : canDeclare ? (
                                                    <button
                                                        type="button"
                                                        onClick={declarePayload}
                                                        className="student-focus-ring relative flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full bg-[var(--student-neon-lime)] text-[var(--student-neon-ink)] shadow-[var(--student-pay-glow)] transition-transform hover:scale-[1.04] active:scale-[0.97]"
                                                        aria-label="Effectuer ce paiement"
                                                    >
                                                        <CreditCard className="h-6 w-6 opacity-95" aria-hidden />
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>

                                        {state.penalty > 0 ? (
                                            <div className="student-pay-pill flex items-center justify-between gap-2 px-3 py-2">
                                                <span className="text-[10px] font-semibold text-[var(--student-fg-muted)]">{t("latePaymentPenalty")}</span>
                                                <span className="text-xs font-semibold tabular-nums text-[var(--student-ring-move)] [text-shadow:var(--student-glow-move)]">
                                                    +{fmt(state.penalty)}
                                                </span>
                                            </div>
                                        ) : null}

                                        <div className="flex flex-wrap gap-2">
                                            {payment?.status === "paye" && onDownloadReceipt ? (
                                                <button
                                                    type="button"
                                                    onClick={() => onDownloadReceipt(payment)}
                                                    className="student-focus-ring student-pay-pill flex-1 px-3 py-2 text-center text-xs font-semibold text-[var(--student-ring-exercise)] transition-colors hover:bg-[rgba(220,38,38,0.06)] sm:flex-none"
                                                >
                                                    {t("downloadReceipt")}
                                                </button>
                                            ) : null}
                                            {payment?.status === "en_validation" ? (
                                                <div className="student-pay-pill flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--student-ring-exercise)] sm:flex-none">
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                                    {t("waitingValidation")}
                                                </div>
                                            ) : null}
                                        </div>
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
