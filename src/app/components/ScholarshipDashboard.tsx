"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    Building2,
    CircleDollarSign,
    FileSearch,
    GraduationCap,
    RefreshCw,
    ShieldAlert,
    TrendingUp,
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    Pie,
    PieChart,
    PolarAngleAxis,
    RadialBar,
    RadialBarChart,
    XAxis,
    YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { supabase } from "../supabase";
import { generateAllScholarshipTestData, clearAllScholarshipData } from "../utils/scholarshipData";
import { formatPrice } from "../utils/formatPrice";

type ConfirmAction = "generate" | "clear" | null;

type UniversityRow = {
    id: string;
    nom?: string | null;
    active?: boolean | null;
};

type StudentRow = {
    id: string;
    created_at?: string | null;
};

type ApplicationRow = {
    id: string;
    status?: string | null;
    created_at?: string | null;
    university_id?: string | null;
    desired_program?: string | null;
};

type PaymentRow = {
    id: string;
    montant?: number | null;
    status?: string | null;
    created_at?: string | null;
    date_paiement?: string | null;
    date_limite?: string | null;
    type?: string | null;
};

type NotificationRow = {
    id: string;
    type?: string | null;
    read?: boolean | null;
    created_at?: string | null;
};

type DashboardSnapshot = {
    totalStudents: number;
    activeUniversities: number;
    totalUniversities: number;
    activePipeline: number;
    acceptanceRate: number;
    monthlyCollected: number;
    collectionRate: number;
    riskCount: number;
    applicationsGrowth: number;
    revenueGrowth: number;
    monthlyPerformance: Array<{ month: string; applications: number; accepted: number; revenue: number }>;
    weeklyFlow: Array<{ day: string; applications: number; payments: number }>;
    pipeline: Array<{ status: string; label: string; value: number; fill: string }>;
    topUniversities: Array<{ university: string; applications: number; accepted: number; acceptanceRate: number }>;
    programMix: Array<{ name: string; value: number; fill: string }>;
    riskMix: Array<{ label: string; value: number; fill: string }>;
    highlights: string[];
};

const emptySnapshot: DashboardSnapshot = {
    totalStudents: 0,
    activeUniversities: 0,
    totalUniversities: 0,
    activePipeline: 0,
    acceptanceRate: 0,
    monthlyCollected: 0,
    collectionRate: 0,
    riskCount: 0,
    applicationsGrowth: 0,
    revenueGrowth: 0,
    monthlyPerformance: [],
    weeklyFlow: [],
    pipeline: [],
    topUniversities: [],
    programMix: [],
    riskMix: [],
    highlights: [],
};

const pipelineMeta: Record<string, { label: string; fill: string }> = {
    document_recu: { label: "Documents reçus", fill: "#2563eb" },
    en_attente: { label: "En attente", fill: "#7c3aed" },
    en_cours: { label: "En traitement", fill: "#0f766e" },
    document_manquant: { label: "Documents manquants", fill: "#f97316" },
    en_attente_universite: { label: "Retour université", fill: "#8b5cf6" },
    visa_en_cours: { label: "Visa en cours", fill: "#14b8a6" },
    admission_validee: { label: "Admis", fill: "#16a34a" },
    admission_rejetee: { label: "Refusés", fill: "#ef4444" },
    termine: { label: "Terminés", fill: "#475569" },
};

const performanceChartConfig = {
    applications: { label: "Candidatures", color: "#2563eb" },
    accepted: { label: "Admissions", color: "#14b8a6" },
    revenue: { label: "Encaissements", color: "#f97316" },
} satisfies ChartConfig;

const weeklyChartConfig = {
    applications: { label: "Dossiers ouverts", color: "#0f766e" },
    payments: { label: "Paiements reçus", color: "#fb7185" },
} satisfies ChartConfig;

const pipelineChartConfig = {
    value: { label: "Volume", color: "#2563eb" },
} satisfies ChartConfig;

const universityChartConfig = {
    applications: { label: "Volume", color: "#2563eb" },
    acceptanceRate: { label: "Taux d'admission", color: "#14b8a6" },
} satisfies ChartConfig;

const gaugeChartConfig = {
    value: { label: "Taux", color: "#2563eb" },
} satisfies ChartConfig;

const pieChartConfig = {
    program_1: { label: "Programme 1", color: "#2563eb" },
    program_2: { label: "Programme 2", color: "#14b8a6" },
    program_3: { label: "Programme 3", color: "#f97316" },
    program_4: { label: "Programme 4", color: "#8b5cf6" },
    program_5: { label: "Programme 5", color: "#f43f5e" },
    risk_1: { label: "Risque 1", color: "#ef4444" },
    risk_2: { label: "Risque 2", color: "#f97316" },
    risk_3: { label: "Risque 3", color: "#facc15" },
} satisfies ChartConfig;

const programPalette = ["#2563eb", "#14b8a6", "#f97316", "#8b5cf6", "#f43f5e"];
const riskPalette = ["#ef4444", "#f97316", "#facc15"];

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function addMonths(date: Date, months: number) {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(date: Date) {
    return date.toISOString().split("T")[0];
}

function toDate(value?: string | null) {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function percentage(part: number, total: number) {
    if (!total) return 0;
    return Math.round((part / total) * 100);
}

function compactAmount(value: number) {
    return new Intl.NumberFormat("fr-FR", {
        notation: "compact",
        maximumFractionDigits: value >= 1000000 ? 1 : 0,
    }).format(value);
}

function signedPercent(value: number) {
    const rounded = Math.round(value);
    if (rounded === 0) return "0%";
    return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function formatProgramLabel(name?: string | null) {
    if (!name) return "Non renseigné";
    return name.length > 18 ? `${name.slice(0, 18)}…` : name;
}

function buildSnapshot(
    universities: UniversityRow[],
    students: StudentRow[],
    applications: ApplicationRow[],
    payments: PaymentRow[],
    notifications: NotificationRow[],
): DashboardSnapshot {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const previousMonthStart = addMonths(currentMonthStart, -1);
    const nextMonthStart = addMonths(currentMonthStart, 1);
    const last30Start = addDays(startOfDay(now), -29);
    const previous30Start = addDays(last30Start, -30);
    const previous30End = addDays(last30Start, -1);
    const overduePayments = payments.filter((payment) => {
        const due = toDate(payment.date_limite);
        return payment.status === "retard" || (!!due && due < now && payment.status !== "paye");
    });
    const riskNotifications = notifications.filter((item) =>
        ["document_manquant", "retard_paiement", "mise_a_jour_dossier"].includes(item.type || ""),
    );

    const paidPayments = payments.filter((payment) => payment.status === "paye");
    const totalBilled = payments.reduce((sum, payment) => sum + (payment.montant || 0), 0);
    const totalCollected = paidPayments.reduce((sum, payment) => sum + (payment.montant || 0), 0);
    const monthlyCollected = paidPayments
        .filter((payment) => {
            const paidAt = toDate(payment.date_paiement || payment.created_at);
            return !!paidAt && paidAt >= currentMonthStart && paidAt < nextMonthStart;
        })
        .reduce((sum, payment) => sum + (payment.montant || 0), 0);

    const current30Applications = applications.filter((application) => {
        const createdAt = toDate(application.created_at);
        return !!createdAt && createdAt >= last30Start;
    }).length;

    const previous30Applications = applications.filter((application) => {
        const createdAt = toDate(application.created_at);
        return !!createdAt && createdAt >= previous30Start && createdAt <= previous30End;
    }).length;

    const currentMonthRevenue = paidPayments
        .filter((payment) => {
            const paidAt = toDate(payment.date_paiement || payment.created_at);
            return !!paidAt && paidAt >= currentMonthStart && paidAt < nextMonthStart;
        })
        .reduce((sum, payment) => sum + (payment.montant || 0), 0);

    const previousMonthRevenue = paidPayments
        .filter((payment) => {
            const paidAt = toDate(payment.date_paiement || payment.created_at);
            return !!paidAt && paidAt >= previousMonthStart && paidAt < currentMonthStart;
        })
        .reduce((sum, payment) => sum + (payment.montant || 0), 0);

    const acceptedApplications = applications.filter((application) => application.status === "admission_validee").length;
    const rejectedApplications = applications.filter((application) => application.status === "admission_rejetee").length;
    const activePipeline = applications.filter((application) =>
        ["document_recu", "en_attente", "en_cours", "document_manquant", "en_attente_universite", "visa_en_cours"].includes(application.status || ""),
    ).length;

    const monthlyPerformance = Array.from({ length: 6 }, (_, index) => addMonths(currentMonthStart, index - 5)).map((monthDate) => {
        const key = monthKey(monthDate);
        const next = addMonths(monthDate, 1);
        const monthlyApplications = applications.filter((application) => {
            const createdAt = toDate(application.created_at);
            return !!createdAt && createdAt >= monthDate && createdAt < next;
        });
        const monthlyAccepted = monthlyApplications.filter((application) => application.status === "admission_validee").length;
        const monthlyRevenue = paidPayments
            .filter((payment) => {
                const paidAt = toDate(payment.date_paiement || payment.created_at);
                return !!paidAt && paidAt >= monthDate && paidAt < next;
            })
            .reduce((sum, payment) => sum + (payment.montant || 0), 0);

        return {
            month: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(monthDate),
            applications: monthlyApplications.length,
            accepted: monthlyAccepted,
            revenue: Math.round(monthlyRevenue),
            key,
        };
    });

    const weeklyFlow = Array.from({ length: 7 }, (_, index) => addDays(startOfDay(now), index - 6)).map((date) => {
        const key = dayKey(date);
        const next = addDays(date, 1);

        return {
            day: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date),
            applications: applications.filter((application) => {
                const createdAt = toDate(application.created_at);
                return !!createdAt && createdAt >= date && createdAt < next;
            }).length,
            payments: paidPayments
                .filter((payment) => {
                    const paidAt = toDate(payment.date_paiement || payment.created_at);
                    return !!paidAt && paidAt >= date && paidAt < next;
                })
                .reduce((sum, payment) => sum + (payment.montant || 0), 0),
            key,
        };
    });

    const pipeline = Object.entries(pipelineMeta).map(([status, meta]) => ({
        status,
        label: meta.label,
        value: applications.filter((application) => application.status === status).length,
        fill: meta.fill,
    }));

    const universityDirectory = new Map(universities.map((university) => [university.id, university.nom || "Université inconnue"]));
    const universityBuckets = new Map<string, { university: string; applications: number; accepted: number }>();

    applications.forEach((application) => {
        const label = universityDirectory.get(application.university_id || "") || "Université non attribuée";
        const bucket = universityBuckets.get(label) || { university: label, applications: 0, accepted: 0 };
        bucket.applications += 1;
        if (application.status === "admission_validee") {
            bucket.accepted += 1;
        }
        universityBuckets.set(label, bucket);
    });

    const topUniversities = [...universityBuckets.values()]
        .map((item) => ({
            ...item,
            acceptanceRate: percentage(item.accepted, item.applications),
        }))
        .sort((a, b) => b.applications - a.applications)
        .slice(0, 5);

    const programBuckets = new Map<string, number>();
    applications.forEach((application) => {
        const key = formatProgramLabel(application.desired_program || "Non renseigné");
        programBuckets.set(key, (programBuckets.get(key) || 0) + 1);
    });

    const programMix = [...programBuckets.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], index) => ({
            name,
            value,
            fill: programPalette[index % programPalette.length],
        }));

    const riskMix = [
        { label: "Paiements en retard", value: overduePayments.length, fill: riskPalette[0] },
        {
            label: "Documents manquants",
            value: notifications.filter((item) => item.type === "document_manquant").length,
            fill: riskPalette[1],
        },
        {
            label: "Alertes non lues",
            value: notifications.filter((item) => !item.read).length,
            fill: riskPalette[2],
        },
    ].filter((item) => item.value > 0);

    const topUniversity = topUniversities[0];
    const highestMonth = [...monthlyPerformance].sort((a, b) => b.revenue - a.revenue)[0];

    const highlights = [
        topUniversity
            ? `${topUniversity.university} porte le plus gros volume avec ${topUniversity.applications} candidatures et ${topUniversity.acceptanceRate}% d'admission.`
            : "Aucune université ne concentre encore le volume pour le moment.",
        highestMonth
            ? `Le mois de ${highestMonth.month} concentre le pic d'encaissement avec ${formatPrice(String(highestMonth.revenue))}.`
            : "Le volet encaissement n'a pas encore de tendance mensuelle exploitable.",
        overduePayments.length > 0
            ? `${overduePayments.length} paiement(s) en tension nécessitent une relance rapide côté opérations.`
            : "Aucun paiement critique détecté sur la période courante.",
    ];

    return {
        totalStudents: students.length,
        activeUniversities: universities.filter((university) => university.active).length,
        totalUniversities: universities.length,
        activePipeline,
        acceptanceRate: percentage(acceptedApplications, acceptedApplications + rejectedApplications),
        monthlyCollected,
        collectionRate: percentage(totalCollected, totalBilled),
        riskCount: overduePayments.length + riskNotifications.length,
        applicationsGrowth: previous30Applications === 0 ? current30Applications * 100 : ((current30Applications - previous30Applications) / previous30Applications) * 100,
        revenueGrowth: previousMonthRevenue === 0 ? currentMonthRevenue > 0 ? 100 : 0 : ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100,
        monthlyPerformance,
        weeklyFlow,
        pipeline,
        topUniversities,
        programMix,
        riskMix,
        highlights,
    };
}

function InsightCard({
    title,
    value,
    subtitle,
    trend,
    icon,
}: {
    title: string;
    value: string;
    subtitle: string;
    trend: string;
    icon: React.ReactNode;
}) {
    return (
        <Card className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.12),transparent_32%)]" />
            <CardContent className="relative p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">{title}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                        {icon}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">{subtitle}</p>
                    <span className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {trend}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

export default function ScholarshipDashboard() {
    const { user } = useAuth();
    const { showNotification } = useNotificationContext();
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
    const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

    const loadDashboardData = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const [universitiesRes, studentsRes, applicationsRes, paymentsRes, notificationsRes] = await Promise.all([
                supabase.from("universities").select("id, nom, active"),
                supabase.from("students").select("id, created_at"),
                supabase.from("dossier_bourses").select("id, status, created_at, university_id"),
                supabase.from("payments").select("id, montant, status, created_at, date_paiement, date_limite, type"),
                supabase.from("notifications").select("id, type, read, created_at"),
            ]);

            setSnapshot(
                buildSnapshot(
                    (universitiesRes.data || []) as UniversityRow[],
                    (studentsRes.data || []) as StudentRow[],
                    (applicationsRes.data || []) as ApplicationRow[],
                    (paymentsRes.data || []) as PaymentRow[],
                    (notificationsRes.data || []) as NotificationRow[],
                ),
            );
        } catch (error) {
            console.warn("Erreur chargement dashboard:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();

        const handleRefresh = () => {
            loadDashboardData();
        };

        window.addEventListener("dashboardUpdate", handleRefresh);
        window.addEventListener("dataChanged", handleRefresh);

        return () => {
            window.removeEventListener("dashboardUpdate", handleRefresh);
            window.removeEventListener("dataChanged", handleRefresh);
        };
    }, [loadDashboardData]);

    const gaugeValue = useMemo(
        () => [{ name: "value", value: snapshot.acceptanceRate, fill: "var(--color-value)" }],
        [snapshot.acceptanceRate],
    );

    const performanceHighlights = useMemo(() => {
        const latestMonth = snapshot.monthlyPerformance.at(-1);
        const bestAdmissionsMonth =
            snapshot.monthlyPerformance.length > 0
                ? [...snapshot.monthlyPerformance].sort((a, b) => b.accepted - a.accepted)[0]
                : null;
        const averageRevenue =
            snapshot.monthlyPerformance.length > 0
                ? Math.round(
                      snapshot.monthlyPerformance.reduce((sum, item) => sum + item.revenue, 0) / snapshot.monthlyPerformance.length,
                  )
                : 0;

        return [
            {
                label: "Dernier mois",
                value: latestMonth ? `${latestMonth.applications} dossiers` : "0 dossier",
                detail: latestMonth ? `${latestMonth.accepted} admissions en ${latestMonth.month}` : "Aucune tendance",
            },
            {
                label: "Pic d'admission",
                value: bestAdmissionsMonth ? bestAdmissionsMonth.month : "N/A",
                detail: bestAdmissionsMonth ? `${bestAdmissionsMonth.accepted} admissions validées` : "Pas encore de pic",
            },
            {
                label: "Moyenne cash/mois",
                value: formatPrice(String(averageRevenue)),
                detail: "Base glissante sur 6 mois",
            },
        ];
    }, [snapshot.monthlyPerformance]);

    const riskGaugeValue = useMemo(() => {
        const riskRatio = Math.min(snapshot.riskCount * 10, 100);
        return [{ name: "value", value: riskRatio, fill: "var(--color-value)" }];
    }, [snapshot.riskCount]);

    if (isLoading) {
        return (
            <div className="flex min-h-[460px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
                    <p className="text-slate-600">Chargement du cockpit décisionnel...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-0 sm:p-2 lg:p-4">
            <section className="relative overflow-hidden rounded-[2.25rem] border border-stone-200/80 bg-[linear-gradient(135deg,#f8fafc_0%,#f3f4f6_42%,#fff7ed_100%)] px-6 py-6 shadow-[0_30px_80px_rgba(148,163,184,0.18)] sm:px-8 sm:py-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.1),transparent_26%)]" />
                <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                            Executive Dashboard
                        </p>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                            Cockpit de pilotage des admissions, revenus et risques
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                            Vue consolidée pour arbitrer plus vite: flux de candidatures, rendement universités,
                            capacité d'encaissement et alertes opérationnelles.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                                {snapshot.activePipeline} dossiers en cours
                            </div>
                            <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                                {snapshot.collectionRate}% de collecte
                            </div>
                            <div className="rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                                {snapshot.activeUniversities} universités actives
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button variant="outline" onClick={loadDashboardData} className="border-white/80 bg-white/85 text-slate-700 hover:bg-white hover:text-slate-950">
                            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                            Actualiser
                        </Button>
                        {user?.role === "super_admin" && (
                            <>
                                <Button onClick={() => setConfirmAction("generate")} className="bg-slate-950 text-white hover:bg-slate-800">
                                    Injecter des données
                                </Button>
                                <Button variant="destructive" onClick={() => setConfirmAction("clear")} className="border border-rose-400/20 bg-rose-500/90 hover:bg-rose-500">
                                    Purger les jeux de test
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <div className="relative mt-8 grid gap-3 lg:grid-cols-3">
                    {snapshot.highlights.map((highlight, index) => (
                        <div key={index} className="rounded-[1.5rem] border border-white/80 bg-white/78 p-4 backdrop-blur shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Insight {index + 1}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{highlight}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InsightCard
                    title="Portefeuille"
                    value={String(snapshot.activePipeline)}
                    subtitle={`${snapshot.totalStudents} étudiants actifs dans le pipeline`}
                    trend={signedPercent(snapshot.applicationsGrowth)}
                    icon={<FileSearch className="h-5 w-5" />}
                />
                <InsightCard
                    title="Encaissements"
                    value={formatPrice(String(snapshot.monthlyCollected))}
                    subtitle={`Taux de collecte global ${snapshot.collectionRate}%`}
                    trend={signedPercent(snapshot.revenueGrowth)}
                    icon={<CircleDollarSign className="h-5 w-5" />}
                />
                <InsightCard
                    title="Réseau"
                    value={String(snapshot.activeUniversities)}
                    subtitle={`${snapshot.totalUniversities} universités référencées`}
                    trend={`${snapshot.totalUniversities ? percentage(snapshot.activeUniversities, snapshot.totalUniversities) : 0}% actives`}
                    icon={<Building2 className="h-5 w-5" />}
                />
                <InsightCard
                    title="Risque"
                    value={String(snapshot.riskCount)}
                    subtitle="Alertes nécessitant une action rapide"
                    trend={snapshot.riskCount > 0 ? "À surveiller" : "Sous contrôle"}
                    icon={<ShieldAlert className="h-5 w-5" />}
                />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
                <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Performance mensuelle</p>
                            <CardTitle className="mt-2 text-xl text-slate-950">Volume, admissions et cash sur 6 mois</CardTitle>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            Focus décision
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-2 sm:p-4">
                        <ChartContainer config={performanceChartConfig} className="h-[220px] w-full sm:h-[280px]">
                            <ComposedChart data={snapshot.monthlyPerformance} margin={{ left: -10, right: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
                                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => compactAmount(Number(value))} tick={{ fontSize: 11 }} width={36} />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value, name) => (
                                                <div className="flex min-w-[150px] items-center justify-between gap-6">
                                                    <span className="text-muted-foreground">{String(name)}</span>
                                                    <span className="font-mono font-medium">
                                                        {name === "Encaissements" ? formatPrice(String(value)) : Number(value).toLocaleString("fr-FR")}
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} verticalAlign="top" className="mb-2 flex-wrap gap-y-1 text-xs" />
                                <Bar yAxisId="left" dataKey="applications" fill="var(--color-applications)" radius={[10, 10, 2, 2]} barSize={24} />
                                <Bar yAxisId="left" dataKey="accepted" fill="var(--color-accepted)" radius={[10, 10, 2, 2]} barSize={24} />
                                <Area yAxisId="right" dataKey="revenue" fill="var(--color-revenue)" fillOpacity={0.18} stroke="var(--color-revenue)" strokeWidth={2.5} type="monotone" />
                                <Line yAxisId="right" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--color-revenue)" }} activeDot={{ r: 5 }} type="monotone" />
                            </ComposedChart>
                        </ChartContainer>
                        </div>
                        <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-3">
                            {performanceHighlights.map((item) => (
                                <div key={item.label} className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                                    <p className="mt-2 text-lg font-semibold text-slate-950">{item.value}</p>
                                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-6">
                    <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                        <CardHeader className="pb-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Qualité de conversion</p>
                            <CardTitle className="mt-2 text-xl text-slate-950">Taux d'admission final</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="relative">
                                <ChartContainer config={gaugeChartConfig} className="mx-auto h-[220px] max-w-[220px]">
                                    <RadialBarChart
                                        data={gaugeValue}
                                        startAngle={210}
                                        endAngle={-30}
                                        innerRadius={72}
                                        outerRadius={104}
                                        barSize={16}
                                    >
                                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                        <RadialBar dataKey="value" background cornerRadius={999} />
                                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                    </RadialBarChart>
                                </ChartContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-semibold tracking-tight text-slate-950">{snapshot.acceptanceRate}%</span>
                                    <span className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">Conversion</span>
                                </div>
                            </div>
                            <div className="grid gap-3 text-sm text-slate-600">
                                <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
                                    <div className="flex items-center justify-between">
                                        <span>Collecte globale</span>
                                        <strong className="text-slate-950">{snapshot.collectionRate}%</strong>
                                    </div>
                                </div>
                                <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-4">
                                    <div className="flex items-center justify-between">
                                        <span>Étudiants suivis</span>
                                        <strong className="text-slate-950">{snapshot.totalStudents}</strong>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#fff7ed,#ffffff)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                        <CardHeader className="pb-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Niveau d'alerte</p>
                            <CardTitle className="mt-2 text-xl text-slate-950">Pression opérationnelle</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="relative">
                                <ChartContainer config={gaugeChartConfig} className="mx-auto h-[180px] max-w-[180px]">
                                    <RadialBarChart
                                        data={riskGaugeValue}
                                        startAngle={210}
                                        endAngle={-30}
                                        innerRadius={58}
                                        outerRadius={84}
                                        barSize={14}
                                    >
                                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                                        <RadialBar dataKey="value" background fill="var(--color-value)" cornerRadius={999} />
                                    </RadialBarChart>
                                </ChartContainer>
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-semibold tracking-tight text-slate-950">{snapshot.riskCount}</span>
                                    <span className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">Alertes</span>
                                </div>
                            </div>
                            <div className="rounded-[1.5rem] border border-amber-200 bg-white/85 p-4 text-sm text-amber-900">
                                {snapshot.riskCount > 0
                                    ? "Priorité aux paiements en retard et dossiers incomplets pour fluidifier le mois en cours."
                                    : "Aucun signal critique détecté sur les flux de paiement et les notifications."}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr_0.9fr]">
                <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <CardHeader className="pb-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Pipeline</p>
                        <CardTitle className="mt-2 text-xl text-slate-950">Répartition des statuts</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <ChartContainer config={pipelineChartConfig} className="h-[280px] w-full sm:h-[320px]">
                            <BarChart data={snapshot.pipeline} layout="vertical" margin={{ left: 4, right: 8 }}>
                                <CartesianGrid horizontal={false} strokeDasharray="4 4" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={100} tick={{ fontSize: 11 }} />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent formatter={(value) => <span className="font-mono font-medium">{Number(value).toLocaleString("fr-FR")}</span>} />}
                                />
                                <Bar dataKey="value" radius={999}>
                                    {snapshot.pipeline.map((entry) => (
                                        <Cell key={entry.status} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <CardHeader className="pb-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Réseau</p>
                        <CardTitle className="mt-2 text-xl text-slate-950">Universités les plus contributrices</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <ChartContainer config={universityChartConfig} className="h-[280px] w-full sm:h-[320px]">
                            <BarChart data={snapshot.topUniversities} margin={{ left: -10, right: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                                <XAxis dataKey="university" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={56} tick={{ fontSize: 10 }} />
                                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
                                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={32} />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value, name) => (
                                                <div className="flex min-w-[150px] items-center justify-between gap-6">
                                                    <span className="text-muted-foreground">{String(name)}</span>
                                                    <span className="font-mono font-medium">
                                                        {name === "Taux d'admission" ? `${value}%` : Number(value).toLocaleString("fr-FR")}
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                <Bar yAxisId="left" dataKey="applications" fill="var(--color-applications)" radius={[12, 12, 4, 4]} barSize={26} />
                                <Line yAxisId="right" type="monotone" dataKey="acceptanceRate" stroke="var(--color-acceptanceRate)" strokeWidth={2.5} dot={{ r: 4 }} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <CardHeader className="pb-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Mix</p>
                        <CardTitle className="mt-2 text-xl text-slate-950">Programmes les plus demandés</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {snapshot.programMix.length === 0 ? (
                            <div className="flex h-[320px] items-center justify-center rounded-3xl border border-dashed border-slate-200 text-sm text-slate-500">
                                Pas encore assez de dossiers pour le mix programme.
                            </div>
                        ) : (
                            <>
                                <ChartContainer config={pieChartConfig} className="mx-auto h-[220px] max-w-[280px]">
                                    <PieChart>
                                        <Pie
                                            data={snapshot.programMix}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={58}
                                            outerRadius={92}
                                            paddingAngle={3}
                                            strokeWidth={0}
                                        >
                                            {snapshot.programMix.map((entry) => (
                                                <Cell key={entry.name} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                                    </PieChart>
                                </ChartContainer>
                                <div className="mt-4 space-y-2">
                                    {snapshot.programMix.map((entry) => (
                                        <div key={entry.name} className="flex items-center justify-between rounded-[1.25rem] border border-slate-200/80 bg-white px-3 py-2 text-sm shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                                                <span className="text-slate-600">{entry.name}</span>
                                            </div>
                                            <span className="font-semibold text-slate-950">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <CardHeader className="pb-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Cadence 7 jours</p>
                        <CardTitle className="mt-2 text-xl text-slate-950">Rythme de production et encaissement</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <ChartContainer config={weeklyChartConfig} className="h-[220px] w-full sm:h-[300px]">
                            <AreaChart data={snapshot.weeklyFlow}>
                                <defs>
                                    <linearGradient id="applicationsFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-applications)" stopOpacity={0.32} />
                                        <stop offset="95%" stopColor="var(--color-applications)" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="paymentsFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-payments)" stopOpacity={0.32} />
                                        <stop offset="95%" stopColor="var(--color-payments)" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={28} />
                                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickFormatter={(value) => compactAmount(Number(value))} tick={{ fontSize: 11 }} width={36} />
                                <ChartTooltip
                                    cursor={false}
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value, name) => (
                                                <div className="flex min-w-[150px] items-center justify-between gap-6">
                                                    <span className="text-muted-foreground">{String(name)}</span>
                                                    <span className="font-mono font-medium">
                                                        {name === "Paiements reçus" ? formatPrice(String(value)) : Number(value).toLocaleString("fr-FR")}
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Area yAxisId="left" dataKey="applications" type="monotone" stroke="var(--color-applications)" fill="url(#applicationsFill)" strokeWidth={2.5} />
                                <Area yAxisId="right" dataKey="payments" type="monotone" stroke="var(--color-payments)" fill="url(#paymentsFill)" strokeWidth={2.5} />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#fff7ed,#ffffff)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <CardHeader className="pb-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Watchlist</p>
                        <CardTitle className="mt-2 text-xl text-slate-950">Répartition des risques</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {snapshot.riskMix.length === 0 ? (
                            <div className="flex h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/70 text-center text-sm text-emerald-800">
                                <ShieldAlert className="mb-3 h-8 w-8" />
                                Aucun risque significatif détecté.
                            </div>
                        ) : (
                            <>
                                <ChartContainer config={pieChartConfig} className="mx-auto h-[220px] max-w-[280px]">
                                    <PieChart>
                                        <Pie
                                            data={snapshot.riskMix}
                                            dataKey="value"
                                            nameKey="label"
                                            innerRadius={54}
                                            outerRadius={90}
                                            paddingAngle={4}
                                            strokeWidth={0}
                                        >
                                            {snapshot.riskMix.map((entry) => (
                                                <Cell key={entry.label} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
                                    </PieChart>
                                </ChartContainer>
                                <div className="space-y-2">
                                    {snapshot.riskMix.map((entry) => (
                                        <div key={entry.label} className="flex items-center justify-between rounded-[1.25rem] border border-slate-200/80 bg-white px-3 py-2 text-sm shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                                                <span className="text-slate-600">{entry.label}</span>
                                            </div>
                                            <span className="font-semibold text-slate-950">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </section>

            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                            {confirmAction === "generate" ? <TrendingUp className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                        </div>
                        <h3 className="text-xl font-semibold text-slate-950">
                            {confirmAction === "generate" ? "Générer un jeu de démonstration ?" : "Supprimer les données de démonstration ?"}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-slate-500">
                            {confirmAction === "generate"
                                ? "Cette action ajoute des étudiants, universités, candidatures et paiements fictifs pour enrichir le cockpit."
                                : "Cette action nettoie les données de démonstration pour revenir à une base plus propre."}
                        </p>
                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setConfirmAction(null)}>
                                Annuler
                            </Button>
                            <Button
                                className="flex-1"
                                variant={confirmAction === "generate" ? "default" : "destructive"}
                                onClick={async () => {
                                    if (confirmAction === "generate") {
                                        const success = await generateAllScholarshipTestData();
                                        showNotification(
                                            success ? "Jeu de démonstration généré avec succès." : "La génération des données a échoué.",
                                            success ? "success" : "error",
                                        );
                                    } else {
                                        const success = await clearAllScholarshipData();
                                        showNotification(
                                            success ? "Données de démonstration supprimées." : "Le nettoyage a échoué.",
                                            success ? "success" : "error",
                                        );
                                    }
                                    setConfirmAction(null);
                                    loadDashboardData();
                                }}
                            >
                                Confirmer
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <section className="grid gap-4 lg:grid-cols-3">
                <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_60px_rgba(15,23,42,0.08)] xl:col-span-2">
                    <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Next best actions</p>
                            <h3 className="mt-2 text-xl font-semibold text-slate-950">Ce que le dashboard recommande maintenant</h3>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                            Orchestration business
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-950">Priorité stratégique</p>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Accentuer les relances sur les dossiers incomplets et pousser les universités à plus fort taux de conversion.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
