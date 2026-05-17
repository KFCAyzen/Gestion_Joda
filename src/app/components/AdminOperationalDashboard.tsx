"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, AlertTriangle, FileText, CheckCircle, User, DollarSign, CreditCard, Clock, RefreshCw } from "lucide-react";
import { Bar, BarChart, Cell, ResponsiveContainer } from "recharts";
import { useApplications, APPLICATIONS_KEY } from "../lib/hooks/use-applications";
import { usePayments, PAYMENTS_KEY } from "../lib/hooks/use-payments";
import { useUniversities, UNIVERSITIES_KEY } from "../lib/hooks/use-universities";
import { getActivityLogs, ActivityType, ACTIVITY_LABELS } from "../utils/activityLogger";
import { useTheme } from "../context/ThemeContext";
import ProtectedRoute from "./ProtectedRoute";

interface ActivityLog {
    id: string;
    user_id: string;
    user_name: string;
    user_role: string;
    activity_type: ActivityType;
    entity_type: string;
    entity_id: string | null;
    description: string;
    metadata?: Record<string, any>;
    created_at: string;
}

interface DashboardStats {
    aTraiter: number;
    dossiersOuverts: number;
    dossiersOpenGrowth: number;
    encaisseeMois: number;
    encaisseGrowth: number;
    weeklyFlux: Array<{ day: string; value: number; isToday: boolean }>;
    topUniversities: Array<{ name: string; count: number; max: number }>;
}

type ViewMode = "hier" | "aujourd'hui" | "semaine" | "mois";

const ALERT_TYPES: ActivityType[] = [
    "payment_create",
    "payment_validate",
    "document_upload",
    "document_validate",
    "document_reject",
    "dossier_status_change",
    "application_status_change",
];

function getEntryIcon(activityType: ActivityType) {
    if (activityType === "payment_create" || activityType === "payment_validate" || activityType === "accounting_entry" || activityType === "accounting_expense") {
        return <DollarSign className="h-3.5 w-3.5" />;
    }
    if (activityType === "document_upload" || activityType === "document_validate" || activityType === "document_reject") {
        return <FileText className="h-3.5 w-3.5" />;
    }
    if (activityType === "dossier_status_change" || activityType === "application_status_change") {
        if (activityType === "dossier_status_change") return <CheckCircle className="h-3.5 w-3.5" />;
        return <CheckCircle className="h-3.5 w-3.5" />;
    }
    if (activityType === "student_create" || activityType === "student_update") {
        return <User className="h-3.5 w-3.5" />;
    }
    return <AlertTriangle className="h-3.5 w-3.5" />;
}

function getEntryIconStyle(activityType: ActivityType, isAlert: boolean): string {
    if (isAlert) return "text-red-500";
    if (activityType === "payment_validate" || activityType === "accounting_entry") return "text-yellow-500";
    if (activityType === "document_upload") return "text-gray-500 dark:text-gray-400";
    if (activityType === "dossier_status_change" || activityType === "application_status_change") return "text-green-500";
    if (activityType === "student_create") return "text-blue-400";
    return "text-gray-400";
}

function getBadge(log: ActivityLog): { label: string; style: string } | null {
    const meta = log.metadata || {};
    if (log.activity_type === "payment_create" || log.activity_type === "payment_validate") {
        return { label: "À valider", style: "border border-red-300 text-red-600 bg-red-50 dark:bg-red-900/20" };
    }
    if (log.activity_type === "document_upload") {
        return { label: "Prêt à examiner", style: "border border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-900/20" };
    }
    if (log.activity_type === "dossier_status_change" && meta?.new_status === "admission_validee") {
        return { label: "Admission", style: "border border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-900/20" };
    }
    if (log.activity_type === "dossier_status_change" && meta?.new_status === "visa_en_cours") {
        return { label: "Visa", style: "border border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20" };
    }
    if (log.activity_type === "accounting_expense") {
        return null;
    }
    return null;
}

function isAlertEntry(log: ActivityLog): boolean {
    return (
        log.activity_type === "payment_create" ||
        (log.activity_type === "document_reject") ||
        (log.metadata?.new_status === "document_manquant")
    );
}

function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatAmount(amount?: number): string | null {
    if (!amount) return null;
    return new Intl.NumberFormat("fr-FR").format(amount) + " F";
}

function getDateRangeForView(view: ViewMode): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (view) {
        case "hier": {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            return { start: yesterday, end: today };
        }
        case "semaine": {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - 6);
            return { start: weekStart, end: new Date(today.getTime() + 86400000) };
        }
        case "mois": {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return { start: monthStart, end: new Date(today.getTime() + 86400000) };
        }
        default: {
            return { start: today, end: new Date(today.getTime() + 86400000) };
        }
    }
}

function groupLogsByPeriod(logs: ActivityLog[]): Array<{ label: string; entries: ActivityLog[] }> {
    const groups = new Map<string, ActivityLog[]>();

    logs.forEach((log) => {
        const date = new Date(log.created_at);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        let dateLabel = "";
        if (isToday) {
            const hour = date.getHours();
            dateLabel = hour < 12 ? "MATIN" : hour < 18 ? "APRÈS-MIDI" : "SOIR";
        } else if (isYesterday) {
            dateLabel = `HIER · ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).toUpperCase()}`;
        } else {
            dateLabel = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
        }

        const key = `${date.toDateString()}-${isToday ? dateLabel : "all"}`;
        const group = groups.get(key) || [];
        group.push(log);
        groups.set(key, group);
    });

    return Array.from(groups.entries()).map(([, entries]) => {
        const date = new Date(entries[0].created_at);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        let label = "";
        if (isToday) {
            const hour = date.getHours();
            const timeLabel = hour < 12 ? "MATIN" : hour < 18 ? "APRÈS-MIDI" : "SOIR";
            label = `${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).toUpperCase()} · ${timeLabel}`;
        } else if (isYesterday) {
            label = `HIER · ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).toUpperCase()}`;
        } else {
            label = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
        }

        return { label, entries };
    });
}

function formatHeaderDate(view: ViewMode): { title: string; subtitle: string } {
    const now = new Date();
    const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const months = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];

    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];

    switch (view) {
        case "hier": {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            return {
                title: "Hier",
                subtitle: `${days[yesterday.getDay()]} ${yesterday.getDate()} ${months[yesterday.getMonth()]}`,
            };
        }
        case "semaine":
            return { title: "Cette semaine", subtitle: `7 derniers jours` };
        case "mois":
            return {
                title: `${months[now.getMonth()].charAt(0).toUpperCase() + months[now.getMonth()].slice(1)} ${now.getFullYear()}`,
                subtitle: "Vue mensuelle",
            };
        default:
            return {
                title: "Aujourd'hui",
                subtitle: `${dayName} ${day} ${month}`,
            };
    }
}

function formatCompact(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
    return String(value);
}

export default function AdminOperationalDashboard() {
    const { actualTheme } = useTheme();
    const queryClient = useQueryClient();
    const [view, setView] = useState<ViewMode>("aujourd'hui");
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
    const [isLogsLoading, setIsLogsLoading] = useState(true);
    const [refreshTick, setRefreshTick] = useState(0);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);

    const { data: _applicationsData = [], isLoading: appsLoading } = useApplications();
    const { data: _paymentsData = [], isLoading: paymentsLoading } = usePayments();
    const { data: _universitiesData = [] } = useUniversities(false);

    const isLoading = isLogsLoading || appsLoading || paymentsLoading;

    useEffect(() => {
        setIsLogsLoading(true);
        const { start, end } = getDateRangeForView(view);
        Promise.all([
            getActivityLogs({ startDate: start.toISOString(), endDate: end.toISOString(), limit: 100 }),
            getActivityLogs({ limit: 20 }),
        ])
            .then(([logsData, recentData]) => {
                setLogs(logsData as ActivityLog[]);
                setRecentLogs(recentData as ActivityLog[]);
                setLastRefresh(new Date());
            })
            .catch((err) => { console.error("Erreur chargement dashboard:", err); })
            .finally(() => { setIsLogsLoading(false); });
    }, [view, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

    const stats = useMemo<DashboardStats>(() => {
        type DossierRow = { id: string; status: string | null; created_at: string; university_id: string | null };
        type PaymentRow = { id: string; montant: number; status: string; created_at: string; date_paiement: string | null; type: string };
        type UniversityRow = { id: string; nom: string };

        const dossiers = _applicationsData as unknown as DossierRow[];
        const payments = _paymentsData as unknown as PaymentRow[];
        const universities = _universitiesData as unknown as UniversityRow[];

        const aTraiterStatuses = ["document_manquant", "en_attente", "en_attente_universite"];
        const aTraiter = dossiers.filter((d) => aTraiterStatuses.includes(d.status || "")).length;

        const ouvertStatuses = ["document_recu", "en_attente", "en_cours", "document_manquant", "en_attente_universite", "visa_en_cours"];
        const dossiersOuverts = dossiers.filter((d) => ouvertStatuses.includes(d.status || "")).length;

        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = thisMonthStart;

        const thisMonthPayments = payments
            .filter((p) => {
                const date = new Date(p.date_paiement || p.created_at || "");
                return p.status === "paye" && date >= thisMonthStart;
            })
            .reduce((sum, p) => sum + (p.montant || 0), 0);

        const lastMonthPayments = payments
            .filter((p) => {
                const date = new Date(p.date_paiement || p.created_at || "");
                return p.status === "paye" && date >= lastMonthStart && date < lastMonthEnd;
            })
            .reduce((sum, p) => sum + (p.montant || 0), 0);

        const encaisseGrowth =
            lastMonthPayments === 0
                ? thisMonthPayments > 0 ? 100 : 0
                : Math.round(((thisMonthPayments - lastMonthPayments) / lastMonthPayments) * 100);

        const weeklyFlux = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(now);
            date.setDate(now.getDate() - (6 - i));
            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dayEnd = new Date(dayStart.getTime() + 86400000);
            const count = dossiers.filter((d) => {
                const created = new Date(d.created_at || "");
                return created >= dayStart && created < dayEnd;
            }).length;
            const isToday = i === 6;
            const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];
            return { day: dayLabels[date.getDay()], value: count, isToday };
        });

        const uniMap = new Map(universities.map((u) => [u.id, u.nom || "Inconnue"]));
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        const weekDossiers = dossiers.filter((d) => new Date(d.created_at || "") >= weekStart);
        const uniCount = new Map<string, number>();
        weekDossiers.forEach((d) => {
            const name = uniMap.get(d.university_id || "") || "Autre";
            uniCount.set(name, (uniCount.get(name) || 0) + 1);
        });
        const topUniversities = [...uniCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count, max: 0 }));
        const maxUni = topUniversities[0]?.count || 1;
        topUniversities.forEach((u) => (u.max = maxUni));

        const lastMonthDossiers = dossiers.filter((d) => {
            const date = new Date(d.created_at || "");
            return date >= lastMonthStart && date < lastMonthEnd;
        }).length;
        const thisMonthDossiers = dossiers.filter((d) => {
            const date = new Date(d.created_at || "");
            return date >= thisMonthStart;
        }).length;

        return {
            aTraiter,
            dossiersOuverts,
            dossiersOpenGrowth: thisMonthDossiers - lastMonthDossiers,
            encaisseeMois: thisMonthPayments,
            encaisseGrowth,
            weeklyFlux,
            topUniversities,
        };
    }, [_applicationsData, _paymentsData, _universitiesData]);

    const { title, subtitle } = formatHeaderDate(view);

    const filteredLogs = searchQuery
        ? logs.filter((l) => l.description.toLowerCase().includes(searchQuery.toLowerCase()) || l.user_name.toLowerCase().includes(searchQuery.toLowerCase()))
        : logs;

    const groups = groupLogsByPeriod(filteredLogs);

    const alertCount = recentLogs.filter(isAlertEntry).length;

    const timeSince = (() => {
        const diffMs = new Date().getTime() - lastRefresh.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "il y a quelques sec";
        if (diffMin === 1) return "il y a 1 min";
        return `il y a ${diffMin} min`;
    })();

    return (
        <ProtectedRoute requiredRole="user">
        <div className="-m-4 sm:-m-5 flex flex-col bg-white dark:bg-slate-900" style={{ height: "calc(100vh - 130px)" }}>
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700 px-6 py-3">
                <div className="flex items-center gap-6">
                    <div>
                        <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</span>
                        <span className="ml-2 text-lg text-gray-400">— {subtitle}</span>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-1 py-1">
                        {(["hier", "aujourd'hui", "semaine", "mois"] as ViewMode[]).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                                    view === v
                                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                }`}
                            >
                                {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                        <Search className="h-3.5 w-3.5" />
                        Rechercher
                    </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    {timeSince}
                    <button
                        onClick={() => {
                            queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
                            queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
                            queryClient.invalidateQueries({ queryKey: UNIVERSITIES_KEY });
                            setRefreshTick((t) => t + 1);
                        }}
                        className="ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-400">
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {showSearch && (
                <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-2">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Chercher dans les activités..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
                    />
                </div>
            )}

            {/* Main 3-column layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT — Activity journal */}
                <div className="flex w-[52%] flex-col overflow-y-auto border-r border-gray-100 dark:border-slate-700">
                    {isLoading ? (
                        <div className="flex flex-1 items-center justify-center py-16 text-sm text-gray-400">
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Chargement...
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="flex flex-1 items-center justify-center py-16 text-sm text-gray-400">
                            Aucune activité sur cette période
                        </div>
                    ) : (
                        groups.map((group) => (
                            <div key={group.label}>
                                <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/50 px-6 py-1.5">
                                    <span className="text-[10px] font-semibold tracking-widest text-gray-400">{group.label}</span>
                                </div>
                                {group.entries.map((log) => {
                                    const alert = isAlertEntry(log);
                                    const badge = getBadge(log);
                                    const amount = log.metadata?.montant ? formatAmount(log.metadata.montant) : null;
                                    return (
                                        <div
                                            key={log.id}
                                            className={`flex items-start gap-4 border-b border-gray-50 px-6 py-3 ${
                                                alert ? "bg-red-50 dark:bg-red-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                            }`}
                                        >
                                            <span className="mt-0.5 w-10 shrink-0 text-right text-xs text-gray-400">{formatTime(log.created_at)}</span>
                                            <span className={`mt-0.5 shrink-0 ${getEntryIconStyle(log.activity_type, alert)}`}>
                                                {getEntryIcon(log.activity_type)}
                                            </span>
                                            <p className="flex-1 text-sm leading-snug text-gray-800 dark:text-gray-200">
                                                {log.description}
                                            </p>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {amount && (
                                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{amount}</span>
                                                )}
                                                {badge && (
                                                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.style}`}>
                                                        {badge.label}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

                {/* CENTER — Stats */}
                <div className="flex w-[28%] flex-col gap-0 overflow-y-auto border-r border-gray-100 dark:border-slate-700">
                    {/* À TRAITER */}
                    <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-5">
                        <p className="text-[10px] font-semibold tracking-widest text-gray-400">À TRAITER</p>
                        <p className="mt-1 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{stats.aTraiter}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">dossiers en attente</p>
                    </div>

                    {/* DOSSIERS OUVERTS */}
                    <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-5">
                        <p className="text-[10px] font-semibold tracking-widest text-gray-400">DOSSIERS OUVERTS</p>
                        <p className="mt-1 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{stats.dossiersOuverts}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {stats.dossiersOpenGrowth > 0 ? "+" : ""}
                            {stats.dossiersOpenGrowth} ce mois
                        </p>
                    </div>

                    {/* ENCAISSÉ CE MOIS */}
                    <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-5">
                        <p className="text-[10px] font-semibold tracking-widest text-gray-400">ENCAISSÉ CE MOIS</p>
                        <p className="mt-1 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{formatCompact(stats.encaisseeMois)}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            FCFA{" "}
                            <span className={stats.encaisseGrowth >= 0 ? "text-green-600" : "text-red-600"}>
                                {stats.encaisseGrowth > 0 ? "+" : ""}
                                {stats.encaisseGrowth}% vs M-1
                            </span>
                        </p>
                    </div>

                    {/* FLUX 7 JOURS */}
                    <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-5">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-[10px] font-semibold tracking-widest text-gray-400">FLUX 7 JOURS</p>
                            <span className="text-[10px] text-gray-400">candidatures</span>
                        </div>
                        <div className="h-16">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.weeklyFlux} barCategoryGap="20%">
                                    <Bar dataKey="value" radius={[2, 2, 0, 0]} minPointSize={3}>
                                        {stats.weeklyFlux.map((entry, index) => (
                                            <Cell
                                                key={index}
                                                fill={entry.isToday ? "#ef4444" : actualTheme === "dark" ? "#d1d5db" : "#9ca3af"}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-1 flex justify-between">
                            {stats.weeklyFlux.map((d, i) => (
                                <span key={i} className={`text-[10px] ${d.isToday ? "font-semibold text-gray-700 dark:text-gray-300" : "text-gray-400"}`}>
                                    {d.day}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* TOP 3 UNIVERSITÉS */}
                    <div className="px-6 py-5">
                        <p className="mb-3 text-[10px] font-semibold tracking-widest text-gray-400">
                            TOP 3 UNIVERSITÉS · SEMAINE
                        </p>
                        {stats.topUniversities.length === 0 ? (
                            <p className="text-xs text-gray-400">Aucune donnée disponible</p>
                        ) : (
                            <div className="space-y-3">
                                {stats.topUniversities.map((u, i) => (
                                    <div key={i}>
                                        <div className="mb-1 flex items-center justify-between">
                                            <span className="max-w-[160px] truncate text-sm text-gray-700 dark:text-gray-300">{u.name}</span>
                                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{u.count}</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700/50">
                                            <div
                                                className="h-2 rounded-full bg-gray-700 transition-all"
                                                style={{ width: `${Math.round((u.count / u.max) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT — Activity sidebar */}
                <div className="flex w-[20%] flex-col overflow-y-auto">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Activité</span>
                        {alertCount > 0 && (
                            <span className="rounded-full border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-600">
                                {alertCount}
                            </span>
                        )}
                    </div>

                    {recentLogs.length > 0 && (
                        <div className="border-b border-gray-100 dark:border-slate-700 px-4 py-2">
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                                {(() => {
                                    const now = new Date();
                                    const days = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
                                    const months = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];
                                    return `AUJOURD'HUI ${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;
                                })()}
                            </p>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        {recentLogs.map((log) => {
                            const alert = isAlertEntry(log);
                            return (
                                <div
                                    key={log.id}
                                    className={`border-b border-gray-50 dark:border-slate-700/50 px-4 py-2.5 ${alert ? "bg-red-50 dark:bg-red-900/20" : ""}`}
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="shrink-0 text-[11px] text-gray-400">{formatTime(log.created_at)}</span>
                                        <p className="text-[12px] leading-snug text-gray-700 dark:text-gray-300 line-clamp-2">{log.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
        </ProtectedRoute>
    );
}
