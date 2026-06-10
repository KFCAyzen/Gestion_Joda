"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "../context/AuthContext";
import { usePayments } from "../lib/hooks/use-payments";
import { useStudents } from "../lib/hooks/use-students";
import { useUsers } from "../lib/hooks/use-users";
import { createClient } from "../lib/supabase/client";
import { formatPrice } from "../utils/formatPrice";
import LoadingSpinner from "./LoadingSpinner";
import ProtectedRoute from "./ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    ChevronDown,
    ChevronUp,
    Trophy,
    CalendarDays,
    Users,
    BookOpen,
    FileText,
    Clock,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentRow {
    id: string;
    student_id: string;
    type: string;
    montant: number;
    status: string;
    date_paiement: string | null;
    penalites: number;
    validated_by?: string | null;
    validated_at?: string | null;
    created_at: string;
}

interface ActivityLogRow {
    user_id: string;
    activity_type: string;
    created_at: string;
}

interface DossierHistoryRow {
    performed_by: string | null;
    performed_at: string;
}

interface StudentRow {
    id: string;
    nom: string;
    prenom: string;
    created_by: string | null;
}

interface UserRow {
    id: string;
    username: string;
    name: string;
    role: string;
}

interface DossierRow {
    id: string;
    student_id: string;
}

interface DailyStats {
    date: string;
    courses: { count: number; amount: number };
    procedures: { count: number; amount: number };
    total: number;
}

interface PaymentMetrics {
    count: number;
    amount: number;
}

interface AgentStats {
    agentId: string;
    agentName: string;
    agentRole: string;
    paye: {
        bourse: PaymentMetrics;
        mandarin: PaymentMetrics;
        anglais: PaymentMetrics;
        other: PaymentMetrics;
        total: number;
        count: number;
    };
    enValidation: PaymentMetrics;
    attente: PaymentMetrics;
    retard: PaymentMetrics;
    penalites: number;
    studentsCount: number;
    dossiersCount: number;
    // Performance score components (each 0-100, normalized relative to best performer)
    revenueScore: number;
    activityScore: number;
    speedScore: number;
    dossierScore: number;
    performanceScore: number; // weighted composite 0-100
    activityCount: number;
    avgValidationDays: number | null;
    dossierActionCount: number;
    rank: number;
}

type ViewMode = "by-agent" | "daily";
type Period = "week" | "month" | "quarter" | "year" | "all";
type FilterOption = { value: string; label: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSE_TYPES = new Set(["mandarin", "anglais", "inscription"]);
const STAFF_BASE_ROLES = new Set(["agent", "supervisor", "user"]);
const PERIOD_OPTIONS: Period[] = ["week", "month", "quarter", "year", "all"];
const ROLE_COLORS: Record<string, string> = {
    agent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    supervisor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    user: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
    admin: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    super_admin: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const supabase = createClient();

// ─── Pure helpers ──────────────────────────────────────────────────────────────

const toDateKey = (v: string) => new Date(v).toISOString().split("T")[0];

function getPeriodStart(period: Period): Date | null {
    if (period === "all") return null;
    const d = new Date();
    if (period === "week") d.setDate(d.getDate() - 7);
    else if (period === "month") d.setMonth(d.getMonth() - 1);
    else if (period === "quarter") d.setMonth(d.getMonth() - 3);
    else d.setFullYear(d.getFullYear() - 1);
    return d;
}

function isInPeriod(p: PaymentRow, start: Date | null): boolean {
    if (!start) return true;
    return new Date(p.date_paiement || p.created_at) >= start;
}

function computeDailyStats(payments: PaymentRow[]): DailyStats[] {
    const groups: Record<string, PaymentRow[]> = {};
    payments.forEach((p) => {
        const key = toDateKey(p.date_paiement || p.created_at);
        (groups[key] ??= []).push(p);
    });
    return Object.keys(groups)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map((date) => {
            const dp = groups[date];
            const courses = dp.filter((p) => COURSE_TYPES.has(p.type));
            const procedures = dp.filter((p) => !COURSE_TYPES.has(p.type));
            const coursesAmt = courses.reduce((s, p) => s + (p.montant || 0), 0);
            const proceduresAmt = procedures.reduce((s, p) => s + (p.montant || 0), 0);
            return {
                date,
                courses: { count: courses.length, amount: coursesAmt },
                procedures: { count: procedures.length, amount: proceduresAmt },
                total: coursesAmt + proceduresAmt,
            };
        });
}

function getInitials(name: string) {
    return name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function getRankConfig(rank: number, hasPayments: boolean) {
    if (!hasPayments)
        return { border: "border border-slate-200 dark:border-slate-700", badgeBg: "", avatarBg: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500", glow: "", isInactive: true };
    if (rank === 1)
        return { border: "border-2 border-yellow-400", badgeBg: "bg-yellow-400 text-yellow-900", avatarBg: "bg-yellow-100 text-yellow-700", glow: "shadow-md shadow-yellow-100 dark:shadow-yellow-900/20", isInactive: false };
    if (rank === 2)
        return { border: "border-2 border-slate-300 dark:border-slate-500", badgeBg: "bg-slate-300 text-slate-700 dark:bg-slate-500 dark:text-white", avatarBg: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200", glow: "", isInactive: false };
    if (rank === 3)
        return { border: "border-2 border-amber-500", badgeBg: "bg-amber-500 text-white", avatarBg: "bg-amber-100 text-amber-700", glow: "shadow-md shadow-amber-50 dark:shadow-amber-900/10", isInactive: false };
    return { border: "border border-slate-200 dark:border-slate-700", badgeBg: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300", avatarBg: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300", glow: "", isInactive: false };
}

const SCORE_WEIGHTS = { revenue: 0.40, activity: 0.25, speed: 0.20, dossier: 0.15 } as const;

function normalize(value: number, max: number): number {
    return max > 0 ? Math.min(value / max, 1) : 0;
}

function emptyMetrics(): PaymentMetrics { return { count: 0, amount: 0 }; }
function emptyAgentPaye() {
    return { bourse: emptyMetrics(), mandarin: emptyMetrics(), anglais: emptyMetrics(), other: emptyMetrics(), total: 0, count: 0 };
}

function scoreColor(score: number) {
    if (score >= 70) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" };
    if (score >= 40) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" };
    return { text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500" };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

type T = ReturnType<typeof useTranslations<"performanceHistory">>;

function DailyCard({ day, dateLocale, t }: { day: DailyStats; dateLocale: string; t: T }) {
    return (
        <Card className="joda-surface-muted border-0 shadow-none">
            <CardContent className="p-4">
                <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(day.date + "T12:00:00").toLocaleDateString(dateLocale, {
                            weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })}
                    </h3>
                    <Badge variant="destructive" className="w-fit text-sm">{formatPrice(day.total.toString())}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <BookOpen size={13} className="text-blue-600 dark:text-blue-400" />
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">{t("cards.languageCourses")}</p>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">{t("cards.paymentsCount", { count: day.courses.count })}</p>
                        <p className="font-bold text-blue-700 dark:text-blue-300">{formatPrice(day.courses.amount.toString())}</p>
                    </div>
                    <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <FileText size={13} className="text-green-600 dark:text-green-400" />
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">{t("cards.procedures")}</p>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400">{t("cards.paymentsCount", { count: day.procedures.count })}</p>
                        <p className="font-bold text-green-700 dark:text-green-300">{formatPrice(day.procedures.amount.toString())}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface AgentCardProps {
    agent: AgentStats;
    maxTotal: number;
    expanded: boolean;
    onToggle: () => void;
    dailyStats: DailyStats[];
    dateLocale: string;
    t: T;
}

function AgentCard({ agent, maxTotal, expanded, onToggle, dailyStats, dateLocale, t }: AgentCardProps) {
    const hasPayments = agent.paye.total > 0;
    const isActive = hasPayments || agent.activityCount > 0;
    const config = getRankConfig(agent.rank, isActive);
    const progressPct = maxTotal > 0 ? Math.round((agent.paye.total / maxTotal) * 100) : 0;
    const roleBg = ROLE_COLORS[agent.agentRole] ?? ROLE_COLORS.user;
    const hasAlerts = agent.enValidation.count > 0 || agent.attente.count > 0 || agent.retard.count > 0 || agent.penalites > 0;
    const sc = scoreColor(agent.performanceScore);

    return (
        <Card className={cn("overflow-hidden", config.border, config.glow, !isActive && "opacity-55")}>
            <CardContent className="p-0">
                {/* Header */}
                <div className="p-4 pb-3">
                    <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                            <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold", config.avatarBg)}>
                                {getInitials(agent.agentName)}
                            </div>
                            {hasPayments && (
                                <span className={cn("absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black leading-none", config.badgeBg)}>
                                    {agent.rank}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className={cn("truncate font-semibold", config.isInactive ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100")}>
                                {agent.agentName}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", roleBg)}>
                                    {t(`agentCard.role.${agent.agentRole}` as Parameters<T>[0])}
                                </span>
                                <span className="flex items-center gap-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                                    <Users size={10} />
                                    {t("agentCard.students", { count: agent.studentsCount })}
                                </span>
                                {agent.dossiersCount > 0 && (
                                    <span className="flex items-center gap-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                                        <FileText size={10} />
                                        {t("agentCard.dossiers", { count: agent.dossiersCount })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Performance score */}
                {isActive && (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {t("agentCard.score")}
                            </span>
                            <span className={cn("text-sm font-bold tabular-nums", sc.text)}>
                                {agent.performanceScore}
                                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">/100</span>
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                            <div
                                className={cn("h-full rounded-full transition-all duration-700", sc.bar)}
                                style={{ width: `${agent.performanceScore}%` }}
                            />
                        </div>
                        {/* Score breakdown */}
                        <div className="mt-2 grid grid-cols-4 gap-1 text-center">
                            <div className="rounded bg-slate-50 dark:bg-slate-800 px-1 py-0.5">
                                <p className="text-[9px] text-slate-400 uppercase tracking-wide">{t("agentCard.scoreRevenue")}</p>
                                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{agent.revenueScore}%</p>
                            </div>
                            <div className="rounded bg-slate-50 dark:bg-slate-800 px-1 py-0.5">
                                <p className="text-[9px] text-slate-400 uppercase tracking-wide">{t("agentCard.scoreActivity")}</p>
                                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{agent.activityScore}%</p>
                            </div>
                            <div className="rounded bg-slate-50 dark:bg-slate-800 px-1 py-0.5">
                                <p className="text-[9px] text-slate-400 uppercase tracking-wide">{t("agentCard.scoreSpeed")}</p>
                                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{agent.speedScore}%</p>
                            </div>
                            <div className="rounded bg-slate-50 dark:bg-slate-800 px-1 py-0.5">
                                <p className="text-[9px] text-slate-400 uppercase tracking-wide">{t("agentCard.scoreDossier")}</p>
                                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{agent.dossierScore}%</p>
                            </div>
                        </div>
                        {agent.avgValidationDays !== null && (
                            <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 text-center">
                                {t("agentCard.avgValidation", { days: agent.avgValidationDays.toFixed(1) })}
                            </p>
                        )}
                    </div>
                )}

                {/* Revenue + progress bar */}
                {hasPayments ? (
                    <>
                        <div className="px-4 pb-2">
                            <div className="flex items-baseline justify-between mb-1.5">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("stats.revenue")}</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">
                                    {formatPrice(agent.paye.total.toString())}
                                </p>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-700"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Type breakdown: bourse / mandarin / anglais */}
                        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700 text-center">
                            <div className="p-2.5">
                                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                                    {t("agentCard.bourse")}
                                </p>
                                <p className="text-[11px] text-slate-400">{agent.paye.bourse.count} pay.</p>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {formatPrice(agent.paye.bourse.amount.toString())}
                                </p>
                            </div>
                            <div className="p-2.5">
                                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-500 dark:text-rose-400">
                                    {t("agentCard.mandarin")}
                                </p>
                                <p className="text-[11px] text-slate-400">{agent.paye.mandarin.count} pay.</p>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {formatPrice(agent.paye.mandarin.amount.toString())}
                                </p>
                            </div>
                            <div className="p-2.5">
                                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                                    {t("agentCard.anglais")}
                                </p>
                                <p className="text-[11px] text-slate-400">{agent.paye.anglais.count} pay.</p>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {formatPrice(agent.paye.anglais.amount.toString())}
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 text-center">
                        <p className="text-sm italic text-slate-400 dark:text-slate-500">{t("agentCard.noPayment")}</p>
                    </div>
                )}

                {/* Status alerts row */}
                {hasAlerts && (
                    <div className="flex flex-wrap gap-1.5 border-t border-slate-100 dark:border-slate-700 px-4 py-2.5">
                        {agent.enValidation.count > 0 && (
                            <div className="flex items-center gap-1 rounded-md bg-orange-50 dark:bg-orange-900/20 px-2 py-1">
                                <CheckCircle2 size={10} className="text-orange-500" />
                                <span className="text-[11px] text-orange-700 dark:text-orange-400">
                                    {t("agentCard.enValidation", { count: agent.enValidation.count })}
                                </span>
                            </div>
                        )}
                        {agent.attente.count > 0 && (
                            <div className="flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-900/20 px-2 py-1">
                                <Clock size={10} className="text-amber-500" />
                                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                                    {t("agentCard.attente", { count: agent.attente.count })}
                                </span>
                            </div>
                        )}
                        {agent.retard.count > 0 && (
                            <div className="flex items-center gap-1 rounded-md bg-rose-50 dark:bg-rose-900/20 px-2 py-1">
                                <AlertCircle size={10} className="text-rose-500" />
                                <span className="text-[11px] text-rose-700 dark:text-rose-400">
                                    {t("agentCard.retard", { count: agent.retard.count })}
                                </span>
                            </div>
                        )}
                        {agent.penalites > 0 && (
                            <div className="flex items-center gap-1 rounded-md bg-orange-50 dark:bg-orange-900/20 px-2 py-1">
                                <span className="text-[11px] text-orange-700 dark:text-orange-400">
                                    {t("agentCard.penalties")} {formatPrice(agent.penalites.toString())}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Expand toggle + daily detail */}
                {hasPayments && (
                    <>
                        <button
                            onClick={onToggle}
                            className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 dark:border-slate-700 py-2.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                        >
                            {expanded ? (
                                <><ChevronUp size={13} />{t("agentCard.hideDetails")}</>
                            ) : (
                                <><ChevronDown size={13} />{t("agentCard.viewDetails")}</>
                            )}
                        </button>
                        {expanded && (
                            <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-800/30">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                    {t("agentCard.dailyBreakdown")}
                                </p>
                                {dailyStats.length === 0 ? (
                                    <p className="py-3 text-center text-xs text-slate-400">{t("states.empty")}</p>
                                ) : (
                                    dailyStats.map((day, i) => (
                                        <DailyCard key={`${agent.agentId}-${day.date}-${i}`} day={day} dateLocale={dateLocale} t={t} />
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function PerformanceHistory() {
    const { user } = useAuth();
    const t = useTranslations("performanceHistory");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";

    const isAdmin = ["admin", "super_admin", "supervisor"].includes(user?.role ?? "");

    const { data: allPaymentsRaw = [], isLoading: loadingPayments, isError } = usePayments();
    const { data: studentsRaw = [], isLoading: loadingStudents } = useStudents();
    const { data: usersRaw = [], isLoading: loadingUsers } = useUsers();
    const { data: dossiersRaw = [], isLoading: loadingDossiers } = useQuery({
        queryKey: ["dossier_bourses", "performance"],
        queryFn: async () => {
            const { data, error } = await supabase.from("dossier_bourses").select("id, student_id");
            if (error) throw error;
            return (data ?? []) as DossierRow[];
        },
        staleTime: 60_000,
    });

    const { data: activityLogsRaw = [], isLoading: loadingLogs } = useQuery({
        queryKey: ["activity_logs", "performance"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("activity_logs")
                .select("user_id, activity_type, created_at")
                .not("activity_type", "in", "(login,logout,config_update)")
                .order("created_at", { ascending: false })
                .limit(5000);
            if (error) throw error;
            return (data ?? []) as ActivityLogRow[];
        },
        staleTime: 2 * 60_000,
        enabled: isAdmin,
    });

    const { data: dossierHistoryRaw = [], isLoading: loadingDossierHistory } = useQuery({
        queryKey: ["dossier_history", "performance"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("dossier_history")
                .select("performed_by, performed_at")
                .order("performed_at", { ascending: false })
                .limit(5000);
            if (error) throw error;
            return (data ?? []) as DossierHistoryRow[];
        },
        staleTime: 2 * 60_000,
        enabled: isAdmin,
    });

    const [selectedCreator, setSelectedCreator] = useState<string>("all");
    const [viewMode, setViewMode] = useState<ViewMode>("by-agent");
    const [period, setPeriod] = useState<Period>("month");
    const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

    // Admin-only queries don't block the non-admin loading path
    const isLoading =
        loadingPayments || loadingStudents ||
        (isAdmin && (loadingUsers || loadingDossiers || loadingLogs || loadingDossierHistory));

    // ── Lookup maps ─────────────────────────────────────────────────────────────

    const studentsById = useMemo<Record<string, StudentRow>>(
        () => (studentsRaw as unknown as StudentRow[]).reduce<Record<string, StudentRow>>((acc, s) => { acc[s.id] = s; return acc; }, {}),
        [studentsRaw],
    );

    // ── Scoped raw payments (role=user sees only their students) ────────────────

    const allPayments = useMemo<PaymentRow[]>(() => {
        const raw = allPaymentsRaw as unknown as PaymentRow[];
        return user?.role === "user"
            ? raw.filter((p) => studentsById[p.student_id]?.created_by === user.id)
            : raw;
    }, [allPaymentsRaw, user, studentsById]);

    // ── Period-filtered paye payments ───────────────────────────────────────────

    const periodStart = useMemo(() => getPeriodStart(period), [period]);

    const payePayments = useMemo(
        () => allPayments.filter((p) => p.status === "paye" && isInPeriod(p, periodStart)),
        [allPayments, periodStart],
    );

    // ── Current-state payments (not period-filtered) ────────────────────────────

    const enValidationPayments = useMemo(() => allPayments.filter((p) => p.status === "en_validation"), [allPayments]);
    const attentePayments = useMemo(() => allPayments.filter((p) => p.status === "attente"), [allPayments]);
    const retardPayments = useMemo(() => allPayments.filter((p) => p.status === "retard"), [allPayments]);

    // ── Set of user IDs that have created at least one student ─────────────────

    const creatorIdSet = useMemo(
        () => new Set(Object.values(studentsById).map((s) => s.created_by).filter(Boolean) as string[]),
        [studentsById],
    );

    // ── Creator options for daily-view filter ───────────────────────────────────

    const creatorOptions = useMemo<FilterOption[]>(() => {
        if (!isAdmin) return [];
        const usersAll = usersRaw as unknown as UserRow[];
        return usersAll
            .filter((u) => u.role !== "student" && creatorIdSet.has(u.id))
            .map((u) => ({ value: u.id, label: u.name || u.username || u.id }))
            .sort((a, b) => a.label.localeCompare(b.label, "fr"));
    }, [usersRaw, creatorIdSet, isAdmin]);

    // ── Global KPI totals ───────────────────────────────────────────────────────

    const globalTotals = useMemo(() => {
        const revenue = payePayments.reduce((s, p) => s + (p.montant || 0), 0);
        const penalties = payePayments.reduce((s, p) => s + (p.penalites || 0), 0);
        return {
            revenue,
            penalties,
            enValidation: { count: enValidationPayments.length, amount: enValidationPayments.reduce((s, p) => s + (p.montant || 0), 0) },
            retard: { count: retardPayments.length, amount: retardPayments.reduce((s, p) => s + (p.montant || 0), 0) },
        };
    }, [payePayments, enValidationPayments, retardPayments]);

    // ── Dossiers count per agent ────────────────────────────────────────────────

    const dossiersByAgent = useMemo<Record<string, number>>(() => {
        const counts: Record<string, number> = {};
        (dossiersRaw as DossierRow[]).forEach((d) => {
            const agentId = studentsById[d.student_id]?.created_by;
            if (agentId) counts[agentId] = (counts[agentId] ?? 0) + 1;
        });
        return counts;
    }, [dossiersRaw, studentsById]);

    // ── Activity counts per user (period-filtered) ──────────────────────────────

    const activityByAgent = useMemo<Record<string, number>>(() => {
        const counts: Record<string, number> = {};
        const logs = activityLogsRaw as ActivityLogRow[];
        logs.forEach((log) => {
            if (periodStart && new Date(log.created_at) < periodStart) return;
            counts[log.user_id] = (counts[log.user_id] ?? 0) + 1;
        });
        return counts;
    }, [activityLogsRaw, periodStart]);

    // ── Dossier action counts per agent (period-filtered) ───────────────────────

    const dossierActionsByAgent = useMemo<Record<string, number>>(() => {
        const counts: Record<string, number> = {};
        const history = dossierHistoryRaw as DossierHistoryRow[];
        history.forEach((h) => {
            if (!h.performed_by) return;
            if (periodStart && new Date(h.performed_at) < periodStart) return;
            counts[h.performed_by] = (counts[h.performed_by] ?? 0) + 1;
        });
        return counts;
    }, [dossierHistoryRaw, periodStart]);

    // ── Avg validation delay per agent (validated payments in period) ────────────

    const validationDelayByAgent = useMemo<Record<string, number>>(() => {
        // Returns average delay in DAYS per agent (validated_by)
        const agentDelays: Record<string, number[]> = {};
        payePayments.forEach((p) => {
            if (!p.validated_by || !p.validated_at) return;
            const delaySec = (new Date(p.validated_at).getTime() - new Date(p.created_at).getTime()) / 1000;
            if (delaySec < 0) return;
            (agentDelays[p.validated_by] ??= []).push(delaySec / 86400); // convert to days
        });
        return Object.fromEntries(
            Object.entries(agentDelays).map(([id, delays]) => [
                id,
                delays.reduce((s, d) => s + d, 0) / delays.length,
            ])
        );
    }, [payePayments]);

    // ── Agent ranking stats ─────────────────────────────────────────────────────

    const agentStats = useMemo<AgentStats[]>(() => {
        if (!isAdmin) return [];
        const usersAll = usersRaw as unknown as UserRow[];
        const agentMap: Record<string, Omit<AgentStats, "revenueScore" | "activityScore" | "speedScore" | "dossierScore" | "performanceScore" | "rank">> = {};

        const makeEntry = (u: UserRow) => ({
            agentId: u.id,
            agentName: u.name || u.username || u.id,
            agentRole: u.role,
            paye: emptyAgentPaye(),
            enValidation: emptyMetrics(),
            attente: emptyMetrics(),
            retard: emptyMetrics(),
            penalites: 0,
            studentsCount: 0,
            dossiersCount: 0,
            activityCount: 0,
            avgValidationDays: null as number | null,
            dossierActionCount: 0,
        });

        // Always include base-role staff
        usersAll.filter((u) => STAFF_BASE_ROLES.has(u.role)).forEach((u) => { agentMap[u.id] = makeEntry(u); });

        // Include admin/super_admin only if they have created students
        usersAll
            .filter((u) => !STAFF_BASE_ROLES.has(u.role) && u.role !== "student")
            .forEach((u) => {
                if (!agentMap[u.id] && creatorIdSet.has(u.id)) {
                    agentMap[u.id] = makeEntry(u);
                }
            });

        // Accumulate period-filtered paye payments (for revenue)
        payePayments.forEach((p) => {
            const agentId = studentsById[p.student_id]?.created_by;
            if (!agentId || !agentMap[agentId]) return;
            const entry = agentMap[agentId];
            const amt = p.montant || 0;
            entry.paye.total += amt;
            entry.paye.count++;
            entry.penalites += p.penalites || 0;
            if (p.type === "bourse") { entry.paye.bourse.count++; entry.paye.bourse.amount += amt; }
            else if (p.type === "mandarin") { entry.paye.mandarin.count++; entry.paye.mandarin.amount += amt; }
            else if (p.type === "anglais") { entry.paye.anglais.count++; entry.paye.anglais.amount += amt; }
            else { entry.paye.other.count++; entry.paye.other.amount += amt; }
        });

        // Accumulate current-state payments
        [...enValidationPayments, ...attentePayments, ...retardPayments].forEach((p) => {
            const agentId = studentsById[p.student_id]?.created_by;
            if (!agentId || !agentMap[agentId]) return;
            const amt = p.montant || 0;
            const entry = agentMap[agentId];
            if (p.status === "en_validation") { entry.enValidation.count++; entry.enValidation.amount += amt; }
            else if (p.status === "attente") { entry.attente.count++; entry.attente.amount += amt; }
            else { entry.retard.count++; entry.retard.amount += amt; }
        });

        // Students count
        Object.values(studentsById).forEach((s) => {
            if (s.created_by && agentMap[s.created_by]) agentMap[s.created_by].studentsCount++;
        });

        // Dossiers count (from dossier_bourses via student.created_by)
        Object.entries(dossiersByAgent).forEach(([agentId, count]) => {
            if (agentMap[agentId]) agentMap[agentId].dossiersCount = count;
        });

        // Activity & dossier interaction counts
        Object.keys(agentMap).forEach((agentId) => {
            agentMap[agentId].activityCount = activityByAgent[agentId] ?? 0;
            agentMap[agentId].dossierActionCount = dossierActionsByAgent[agentId] ?? 0;
            agentMap[agentId].avgValidationDays = validationDelayByAgent[agentId] ?? null;
        });

        // ── Compute performance scores ──────────────────────────────────────────
        const all = Object.values(agentMap);

        const maxRevenue = Math.max(...all.map((a) => a.paye.total), 1);
        const maxActivity = Math.max(...all.map((a) => a.activityCount), 1);
        const maxDossierActions = Math.max(...all.map((a) => a.dossierActionCount), 1);
        // For speed: lower delay = better. We use the max delay as the worst benchmark.
        const validDelays = all.map((a) => a.avgValidationDays).filter((d): d is number => d !== null);
        const maxDelay = Math.max(...validDelays, 1);

        const withScores: AgentStats[] = all.map((a) => {
            const rScore = normalize(a.paye.total, maxRevenue) * 100;
            const aScore = normalize(a.activityCount, maxActivity) * 100;
            const sScore = a.avgValidationDays !== null
                ? (1 - normalize(a.avgValidationDays, maxDelay)) * 100
                : 50; // neutral if no validated payments
            const dScore = normalize(a.dossierActionCount, maxDossierActions) * 100;

            const composite = Math.round(
                SCORE_WEIGHTS.revenue * rScore +
                SCORE_WEIGHTS.activity * aScore +
                SCORE_WEIGHTS.speed * sScore +
                SCORE_WEIGHTS.dossier * dScore
            );

            return {
                ...a,
                revenueScore: Math.round(rScore),
                activityScore: Math.round(aScore),
                speedScore: Math.round(sScore),
                dossierScore: Math.round(dScore),
                performanceScore: composite,
                rank: 0,
            };
        });

        // Sort by composite score desc, then inactive (score=0) alphabetically at the end
        const active = withScores.filter((a) => a.performanceScore > 0 || a.activityCount > 0 || a.paye.total > 0)
            .sort((a, b) => b.performanceScore - a.performanceScore);
        const inactive = withScores.filter((a) => a.performanceScore === 0 && a.activityCount === 0 && a.paye.total === 0)
            .sort((a, b) => a.agentName.localeCompare(b.agentName, "fr"));

        return [
            ...active.map((a, i) => ({ ...a, rank: i + 1 })),
            ...inactive.map((a, i) => ({ ...a, rank: active.length + i + 1 })),
        ];
    }, [isAdmin, usersRaw, studentsById, creatorIdSet, payePayments, enValidationPayments, attentePayments, retardPayments, dossiersByAgent, activityByAgent, dossierActionsByAgent, validationDelayByAgent]);

    const maxTotal = useMemo(() => Math.max(...agentStats.map((a) => a.paye.total), 0), [agentStats]);

    // ── Daily view ──────────────────────────────────────────────────────────────

    const filteredDailyPayments = useMemo(() => {
        if (selectedCreator === "all") return payePayments;
        return payePayments.filter((p) => studentsById[p.student_id]?.created_by === selectedCreator);
    }, [payePayments, selectedCreator, studentsById]);

    const dailyStats = useMemo(() => computeDailyStats(filteredDailyPayments), [filteredDailyPayments]);

    const expandedAgentDailyStats = useMemo<DailyStats[]>(() => {
        if (!expandedAgent) return [];
        return computeDailyStats(payePayments.filter((p) => studentsById[p.student_id]?.created_by === expandedAgent));
    }, [expandedAgent, payePayments, studentsById]);

    const selectedCreatorLabel =
        selectedCreator === "all"
            ? t("filters.allManagers")
            : creatorOptions.find((o) => o.value === selectedCreator)?.label ?? selectedCreator;

    // ── Export handlers ─────────────────────────────────────────────────────────

    const handleDownloadWord = () => {
        const wordContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${t("export.title")}</title></head>
        <body>
            <h1>Joda Company</h1>
            <h2>${t("export.title")}</h2>
            <p><strong>${t("export.manager")} :</strong> ${selectedCreatorLabel}</p>
            <p><strong>${t("export.generatedAt")} :</strong> ${new Date().toLocaleDateString(dateLocale)} ${t("export.at")} ${new Date().toLocaleTimeString(dateLocale)}</p>
            <p><strong>${t("export.totalRevenue")} :</strong> ${formatPrice(globalTotals.revenue.toString())}</p>
            <table border='1' cellpadding='6' cellspacing='0'>
                <tr><th>${t("table.date")}</th><th>${t("table.courses")}</th><th>${t("table.courseAmount")}</th><th>${t("table.procedures")}</th><th>${t("table.procedureAmount")}</th><th>${t("table.total")}</th></tr>
                ${dailyStats.map((day) => `
                    <tr>
                        <td>${new Date(day.date + "T12:00:00").toLocaleDateString(dateLocale)}</td>
                        <td>${day.courses.count}</td>
                        <td>${formatPrice(day.courses.amount.toString())}</td>
                        <td>${day.procedures.count}</td>
                        <td>${formatPrice(day.procedures.amount.toString())}</td>
                        <td>${formatPrice(day.total.toString())}</td>
                    </tr>`).join("")}
            </table>
        </body></html>`;

        const blob = new Blob([wordContent], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${t("export.filePrefix")}_${selectedCreator === "all" ? t("export.globalScope") : selectedCreator}_${new Date().toISOString().split("T")[0]}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        printWindow.document.write(`<!DOCTYPE html><html lang="${locale}"><head><title>${t("export.title")}</title></head><body>
            <h1>Joda Company</h1><h2>${t("export.title")}</h2>
            <p><strong>${t("export.manager")} :</strong> ${selectedCreatorLabel}</p>
            <p><strong>${t("export.totalRevenue")} :</strong> ${formatPrice(globalTotals.revenue.toString())}</p>
            <table border="1" cellpadding="6" cellspacing="0">
                <tr><th>${t("table.date")}</th><th>${t("table.courses")}</th><th>${t("table.courseAmount")}</th><th>${t("table.procedures")}</th><th>${t("table.procedureAmount")}</th><th>${t("table.total")}</th></tr>
                ${dailyStats.map((day) => `
                    <tr>
                        <td>${new Date(day.date + "T12:00:00").toLocaleDateString(dateLocale)}</td>
                        <td>${day.courses.count}</td>
                        <td>${formatPrice(day.courses.amount.toString())}</td>
                        <td>${day.procedures.count}</td>
                        <td>${formatPrice(day.procedures.amount.toString())}</td>
                        <td>${formatPrice(day.total.toString())}</td>
                    </tr>`).join("")}
            </table></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    // ── Guard ───────────────────────────────────────────────────────────────────

    if (!user) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">{t("states.authRequired")}</p>
            </div>
        );
    }

    // ── Render ──────────────────────────────────────────────────────────────────

    return (
        <ProtectedRoute requiredRole="supervisor">
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">

                {/* Header */}
                <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            {t("header.tag")}
                        </p>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
                            {t("header.title")}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {t("header.subtitle")}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button onClick={handlePrint} style={{ backgroundColor: "#dc2626" }}>
                            {t("actions.print")}
                        </Button>
                        {isAdmin && (
                            <Button onClick={handleDownloadWord} className="bg-blue-600 hover:bg-blue-700">
                                {t("actions.downloadWord")}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Period filter */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
                        {PERIOD_OPTIONS.map((p) => (
                            <button
                                key={p}
                                onClick={() => { setPeriod(p); setExpandedAgent(null); }}
                                className={cn(
                                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                    period === p
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                                )}
                            >
                                {t(`period.${p}` as Parameters<T>[0])}
                            </button>
                        ))}
                    </div>

                    {/* View toggle (admin only) */}
                    {isAdmin && (
                        <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 w-fit">
                            <button
                                onClick={() => setViewMode("by-agent")}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                    viewMode === "by-agent"
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                                )}
                            >
                                <Trophy size={14} />
                                {t("tabs.byAgent")}
                            </button>
                            <button
                                onClick={() => setViewMode("daily")}
                                className={cn(
                                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                    viewMode === "daily"
                                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                                )}
                            >
                                <CalendarDays size={14} />
                                {t("tabs.daily")}
                            </button>
                        </div>
                    )}
                </div>

                {/* 4 KPI cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Card className="joda-surface border-0 shadow-none">
                        <CardContent className="pt-4">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                                    <TrendingUp size={15} className="text-rose-600 dark:text-rose-400" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("stats.revenue")}</p>
                            </div>
                            <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{formatPrice(globalTotals.revenue.toString())}</p>
                        </CardContent>
                    </Card>
                    <Card className="joda-surface border-0 shadow-none">
                        <CardContent className="pt-4">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                    <CheckCircle2 size={15} className="text-orange-500" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("stats.enValidation")}</p>
                            </div>
                            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{globalTotals.enValidation.count}</p>
                            {globalTotals.enValidation.amount > 0 && (
                                <p className="text-xs text-slate-400">{formatPrice(globalTotals.enValidation.amount.toString())}</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="joda-surface border-0 shadow-none">
                        <CardContent className="pt-4">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                                    <AlertCircle size={15} className="text-rose-600 dark:text-rose-400" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("stats.overdue")}</p>
                            </div>
                            <p className="text-xl font-bold text-rose-700 dark:text-rose-400">{globalTotals.retard.count}</p>
                            {globalTotals.retard.amount > 0 && (
                                <p className="text-xs text-slate-400">{formatPrice(globalTotals.retard.amount.toString())}</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card className="joda-surface border-0 shadow-none">
                        <CardContent className="pt-4">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                    <Clock size={15} className="text-amber-600 dark:text-amber-400" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("stats.penalties")}</p>
                            </div>
                            <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatPrice(globalTotals.penalties.toString())}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main content */}
                {isLoading ? (
                    <LoadingSpinner size="lg" text={t("states.loading")} />
                ) : isError ? (
                    <div className="py-8 text-center">
                        <p className="text-sm text-rose-600">{t("states.loadError")}</p>
                    </div>
                ) : isAdmin && viewMode === "by-agent" ? (
                    /* ── Agent ranking ── */
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-slate-400" />
                            <h2 className="font-semibold text-slate-700 dark:text-slate-300">{t("ranking.title")}</h2>
                            <span className="text-xs text-slate-400">({agentStats.filter((a) => a.paye.total > 0).length} / {agentStats.length})</span>
                        </div>
                        {agentStats.length === 0 ? (
                            <Card className="joda-surface border-0 shadow-none">
                                <CardContent className="py-12 text-center">
                                    <Users size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="text-slate-500 dark:text-slate-400">{t("agentCard.noData")}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {agentStats.map((agent) => (
                                    <AgentCard
                                        key={agent.agentId}
                                        agent={agent}
                                        maxTotal={maxTotal}
                                        expanded={expandedAgent === agent.agentId}
                                        onToggle={() => setExpandedAgent(expandedAgent === agent.agentId ? null : agent.agentId)}
                                        dailyStats={expandedAgent === agent.agentId ? expandedAgentDailyStats : []}
                                        dateLocale={dateLocale}
                                        t={t}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── Daily view ── */
                    <Card className="joda-surface border-0 shadow-none">
                        <CardHeader>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <CardTitle>
                                    {selectedCreator === "all"
                                        ? t("list.titleAll")
                                        : t("list.titleByManager", { manager: selectedCreatorLabel })}
                                </CardTitle>
                                {isAdmin && creatorOptions.length > 0 && (
                                    <Select value={selectedCreator} onValueChange={(v) => setSelectedCreator(v || "all")}>
                                        <SelectTrigger className="w-full sm:w-[220px]">
                                            <SelectValue placeholder={t("filters.allManagers")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t("filters.allManagers")}</SelectItem>
                                            {creatorOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {dailyStats.length === 0 ? (
                                <div className="py-8 text-center">
                                    <CalendarDays size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                    <p className="text-slate-500 dark:text-slate-400">{t("states.empty")}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {dailyStats.map((day, i) => (
                                        <DailyCard key={`${day.date}-${i}`} day={day} dateLocale={dateLocale} t={t} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </ProtectedRoute>
    );
}
