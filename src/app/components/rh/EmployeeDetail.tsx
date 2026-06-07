"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    ArrowLeft,
    BadgePercent,
    CalendarDays,
    ClipboardList,
    History as HistoryIcon,
    Loader2,
    Mail,
    Phone,
    Plus,
    Printer,
    Receipt,
    Star,
    Trash2,
    UserCircle2,
} from "lucide-react";
import ConfirmDialog from "../ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    useEmployees,
    useDailyReports,
    useLeaveRequests,
    usePayslips,
    useDeductionRules,
    useDeductionOccurrences,
    useCreateDeductionOccurrence,
    useDeleteDeductionOccurrence,
    useEmployeeEvaluations,
    useCreateEmployeeEvaluation,
    useDeleteEmployeeEvaluation,
} from "../../lib/hooks/use-hr";
import type {
    Employee,
    DeductionRule,
    DailyReport,
    LeaveRequest,
    Payslip,
    DeductionOccurrence,
    EmployeeEvaluation,
} from "../../types/hr";
import {
    printEmployeeDossier,
    type DossierSection,
    type DossierHistoryRow,
} from "../../lib/printEmployeeDossier";
import { printEmployeeReports } from "../../lib/printEmployeeReports";
import { printEmployeeEvaluation } from "../../lib/printEmployeeEvaluation";
import { printEmployeeAnnualReport } from "../../lib/printEmployeeAnnualReport";
import { payslipReference } from "../../lib/payslipRef";
import { EVAL_CRITERIA, fmtNote, overallAverage, criterionAverages } from "../../lib/hrEvaluation";

type DetailTab = "overview" | "history" | "reports" | "leaves" | "payroll" | "deductions" | "evaluations" | "annual";

interface MonthlyStat {
    mois: number;
    hours: number;
    reports: number;
    leaveDays: number;
    net: number;
    deductions: number;
}

function fmtMoney(n: number): string {
    return n.toLocaleString("fr-FR") + " FCFA";
}

function monthLabel(m: number): string {
    return ["Janv.", "Févr.", "Mars", "Avril", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."][m - 1] ?? `${m}`;
}

type TFn = (key: string, values?: Record<string, string | number>) => string;

export default function EmployeeDetail({
    employeeId,
    onBack,
    onError,
    onSuccess,
    creatorId,
}: {
    employeeId: string;
    onBack: () => void;
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
    creatorId: string;
}) {
    const t = useTranslations("hrManagement");
    const [tab, setTab] = useState<DetailTab>("overview");
    const [periodFrom, setPeriodFrom] = useState("");
    const [periodTo, setPeriodTo] = useState("");
    const [bilanYear, setBilanYear] = useState(new Date().getFullYear());

    const employeesQ = useEmployees();
    const employee = useMemo(
        () => (employeesQ.data ?? []).find((e) => e.id === employeeId) ?? null,
        [employeesQ.data, employeeId]
    );
    const reportsQ = useDailyReports();
    const leavesQ = useLeaveRequests();
    const payslipsQ = usePayslips();
    const rulesQ = useDeductionRules();
    const occQ = useDeductionOccurrences();
    const evalQ = useEmployeeEvaluations();

    const reports = useMemo(() => (reportsQ.data ?? []).filter((r) => r.employee_id === employee?.id), [reportsQ.data, employee]);
    const leaves = useMemo(() => (leavesQ.data ?? []).filter((l) => l.employee_id === employee?.id), [leavesQ.data, employee]);
    const payslips = useMemo(() => (payslipsQ.data ?? []).filter((p) => p.employee_id === employee?.id), [payslipsQ.data, employee]);
    const occurrences = useMemo(() => (occQ.data ?? []).filter((o) => o.employee_id === employee?.id), [occQ.data, employee]);
    const evaluations = useMemo(() => (evalQ.data ?? []).filter((ev) => ev.employee_id === employee?.id), [evalQ.data, employee]);
    const rules = rulesQ.data ?? [];

    const lastEvaluation = evaluations[0] ?? null;

    const supervisorName = useMemo(() => {
        if (!employee?.superieur_id) return null;
        const sup = (employeesQ.data ?? []).find((e) => e.id === employee.superieur_id);
        return sup ? `${sup.prenom} ${sup.nom}` : null;
    }, [employeesQ.data, employee]);

    const rulesById = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);

    const totalHours = reports.reduce((sum, r) => sum + (r.heures_travaillees || 0), 0);
    const approvedLeaves = leaves.filter((l) => l.statut === "approuve").reduce((s, l) => s + l.nb_jours, 0);
    const pendingLeaves = leaves.filter((l) => l.statut === "en_attente").length;
    const totalPaid = payslips.reduce((s, p) => s + p.net_a_payer, 0);
    const totalDeductions = occurrences.reduce((s, o) => s + o.montant, 0);

    // Années disponibles (à partir des données) + année courante
    const availableYears = useMemo(() => {
        const ys = new Set<number>();
        const fromDate = (d?: string | null) => {
            const y = d ? parseInt(d.slice(0, 4), 10) : NaN;
            if (!Number.isNaN(y)) ys.add(y);
        };
        reports.forEach((r) => fromDate(r.date));
        leaves.forEach((l) => fromDate(l.date_debut));
        occurrences.forEach((o) => fromDate(o.date));
        evaluations.forEach((ev) => fromDate(ev.date_evaluation));
        payslips.forEach((p) => ys.add(p.annee));
        ys.add(new Date().getFullYear());
        return Array.from(ys).sort((a, b) => b - a);
    }, [reports, leaves, occurrences, evaluations, payslips]);

    // Détail mensuel du bilan annuel (12 mois)
    const monthly = useMemo<MonthlyStat[]>(() => {
        const yStr = String(bilanYear);
        const inYear = (d?: string | null) => !!d && d.slice(0, 4) === yStr;
        const monthOf = (d: string) => parseInt(d.slice(5, 7), 10);
        const rows: MonthlyStat[] = Array.from({ length: 12 }, (_, i) => ({
            mois: i + 1,
            hours: 0,
            reports: 0,
            leaveDays: 0,
            net: 0,
            deductions: 0,
        }));
        for (const r of reports) {
            if (!inYear(r.date)) continue;
            const m = monthOf(r.date);
            if (m >= 1 && m <= 12) {
                rows[m - 1].hours += r.heures_travaillees || 0;
                rows[m - 1].reports += 1;
            }
        }
        for (const l of leaves) {
            if (l.statut !== "approuve" || !inYear(l.date_debut)) continue;
            const m = monthOf(l.date_debut);
            if (m >= 1 && m <= 12) rows[m - 1].leaveDays += l.nb_jours;
        }
        for (const p of payslips) {
            if (p.annee !== bilanYear) continue;
            if (p.mois >= 1 && p.mois <= 12) rows[p.mois - 1].net += p.net_a_payer;
        }
        for (const o of occurrences) {
            if (!inYear(o.date)) continue;
            const m = monthOf(o.date);
            if (m >= 1 && m <= 12) rows[m - 1].deductions += o.montant;
        }
        return rows;
    }, [bilanYear, reports, leaves, payslips, occurrences]);

    const annualEvaluations = useMemo(
        () => evaluations.filter((ev) => ev.date_evaluation.slice(0, 4) === String(bilanYear)),
        [evaluations, bilanYear]
    );

    const annual = useMemo(() => {
        const sum = monthly.reduce(
            (acc, m) => ({
                hours: acc.hours + m.hours,
                reports: acc.reports + m.reports,
                leaveDays: acc.leaveDays + m.leaveDays,
                net: acc.net + m.net,
                deductions: acc.deductions + m.deductions,
            }),
            { hours: 0, reports: 0, leaveDays: 0, net: 0, deductions: 0 }
        );
        return {
            ...sum,
            payslips: payslips.filter((p) => p.annee === bilanYear).length,
            evalCount: annualEvaluations.length,
            evalAvg: overallAverage(annualEvaluations),
        };
    }, [monthly, payslips, bilanYear, annualEvaluations]);

    const sections = useMemo<DossierSection[]>(
        () => (employee ? buildProfileSections(employee, supervisorName, t as TFn) : []),
        [employee, supervisorName, t]
    );

    const history = useMemo<DossierHistoryRow[]>(
        () =>
            employee
                ? buildHistory(t as TFn, { reports, leaves, payslips, occurrences, evaluations, rulesById })
                : [],
        [employee, t, reports, leaves, payslips, occurrences, evaluations, rulesById]
    );

    const stats = useMemo(
        () => [
            { label: t("detail.stats.hoursWorked"), value: `${totalHours} h` },
            { label: t("detail.stats.approvedDays"), value: String(approvedLeaves) },
            { label: t("detail.stats.pendingLeaves"), value: String(pendingLeaves) },
            { label: t("detail.stats.totalPaid"), value: fmtMoney(totalPaid) },
            { label: t("detail.stats.salary"), value: fmtMoney(employee?.salaire_base ?? 0) },
            { label: t("detail.stats.totalDeductions"), value: fmtMoney(totalDeductions) },
            { label: t("detail.stats.payslipCount"), value: String(payslips.length) },
            { label: t("detail.stats.reportCount"), value: String(reports.length) },
            { label: t("detail.stats.lastRating"), value: lastEvaluation ? `${fmtNote(lastEvaluation.note_globale)} / 5` : "—" },
        ],
        [t, totalHours, approvedLeaves, pendingLeaves, totalPaid, employee, totalDeductions, payslips.length, reports.length, lastEvaluation]
    );

    const handlePrint = () => {
        if (!employee) return;
        printEmployeeDossier({
            docTitle: t("detail.print.docTitle"),
            fullName: `${employee.prenom} ${employee.nom}`,
            subtitle: employee.poste + (employee.departement ? ` · ${employee.departement}` : ""),
            matriculeLabel: t("employees.col.matricule"),
            matricule: employee.matricule ?? "—",
            statusLabel: t(`employees.status.${employee.statut}`),
            profileTitle: t("detail.print.profileTitle"),
            sections,
            statsTitle: t("detail.print.statsTitle"),
            stats,
            notesTitle: t("detail.print.notesTitle"),
            notes: employee.notes ?? "",
            historyTitle: t("detail.print.historyTitle"),
            historyHeaders: {
                date: t("detail.history.col.date"),
                type: t("detail.history.col.type"),
                detail: t("detail.history.col.detail"),
                amount: t("detail.history.col.amount"),
            },
            history,
            historyEmpty: t("detail.history.empty"),
            generatedOn: t("detail.print.generatedOn", {
                date: new Date().toLocaleString("fr-FR"),
            }),
        });
    };

    const reportsInPeriod = useMemo(() => {
        return reports
            .filter((r) => {
                if (periodFrom && r.date < periodFrom) return false;
                if (periodTo && r.date > periodTo) return false;
                return true;
            })
            .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }, [reports, periodFrom, periodTo]);

    const handlePrintReports = () => {
        if (!employee) return;
        const totalHours = reportsInPeriod.reduce((s, r) => s + (r.heures_travaillees || 0), 0);
        const periodText =
            periodFrom || periodTo
                ? `${periodFrom || "…"} → ${periodTo || "…"}`
                : t("detail.reportsPrint.allPeriods");
        printEmployeeReports({
            docTitle: t("detail.reportsPrint.docTitle"),
            fullName: `${employee.prenom} ${employee.nom}`,
            subtitle: employee.poste + (employee.departement ? ` · ${employee.departement}` : ""),
            matriculeLabel: t("employees.col.matricule"),
            matricule: employee.matricule ?? "—",
            periodLabel: t("detail.reportsPrint.periodLabel"),
            period: periodText,
            summaryTitle: t("detail.print.statsTitle"),
            summary: [
                { label: t("detail.reportsPrint.reportCount"), value: String(reportsInPeriod.length) },
                { label: t("detail.stats.hoursWorked"), value: `${totalHours} h` },
            ],
            observationsLabel: t("reports.col.observations"),
            entries: reportsInPeriod.map((r) => ({
                date: r.date,
                hours: `${r.heures_travaillees} h`,
                activities: r.activites,
                observations: r.observations ?? "",
            })),
            emptyLabel: t("reports.empty"),
            generatedOn: t("detail.print.generatedOn", {
                date: new Date().toLocaleString("fr-FR"),
            }),
        });
    };

    const handlePrintAnnual = () => {
        if (!employee) return;
        printEmployeeAnnualReport({
            docTitle: t("detail.annual.print.docTitle"),
            fullName: `${employee.prenom} ${employee.nom}`,
            subtitle: employee.poste + (employee.departement ? ` · ${employee.departement}` : ""),
            matriculeLabel: t("employees.col.matricule"),
            matricule: employee.matricule ?? "—",
            yearLabel: t("detail.annual.year"),
            year: String(bilanYear),
            summaryTitle: t("detail.annual.summaryTitle"),
            summary: [
                { label: t("detail.stats.hoursWorked"), value: `${annual.hours} h` },
                { label: t("detail.stats.reportCount"), value: String(annual.reports) },
                { label: t("detail.stats.approvedDays"), value: String(annual.leaveDays) },
                { label: t("detail.stats.payslipCount"), value: String(annual.payslips) },
                { label: t("detail.annual.totalNet"), value: fmtMoney(annual.net) },
                { label: t("detail.stats.totalDeductions"), value: fmtMoney(annual.deductions) },
                { label: t("detail.tabs.evaluations"), value: String(annual.evalCount) },
                { label: t("detail.stats.lastRating"), value: annual.evalCount ? `${fmtNote(annual.evalAvg)} / 5` : "—" },
            ],
            monthlyTitle: t("detail.annual.monthlyTitle"),
            columns: [
                { label: t("detail.annual.col.month") },
                { label: t("detail.stats.hoursWorked"), align: "right" },
                { label: t("detail.tabs.reports"), align: "right" },
                { label: t("detail.annual.col.leaveDays"), align: "right" },
                { label: t("detail.annual.totalNet"), align: "right" },
                { label: t("detail.tabs.deductions"), align: "right" },
            ],
            rows: [
                ...monthly.map((m) => ({
                    cells: [
                        monthLabel(m.mois),
                        `${m.hours}`,
                        `${m.reports}`,
                        `${m.leaveDays}`,
                        fmtMoney(m.net),
                        fmtMoney(m.deductions),
                    ],
                })),
                {
                    total: true,
                    cells: [
                        t("detail.annual.total"),
                        `${annual.hours}`,
                        `${annual.reports}`,
                        `${annual.leaveDays}`,
                        fmtMoney(annual.net),
                        fmtMoney(annual.deductions),
                    ],
                },
            ],
            emptyLabel: t("detail.annual.empty"),
            generatedOn: t("detail.print.generatedOn", {
                date: new Date().toLocaleString("fr-FR"),
            }),
        });
    };

    const evaluatorName = (ev: EmployeeEvaluation): string => {
        if (!ev.evaluateur_id) return "—";
        const u = (employeesQ.data ?? []).find((e) => e.user_id === ev.evaluateur_id);
        return u ? `${u.prenom} ${u.nom}` : "—";
    };

    const handlePrintEvaluation = (ev: EmployeeEvaluation) => {
        if (!employee) return;
        printEmployeeEvaluation({
            docTitle: t("detail.evaluations.print.docTitle"),
            fullName: `${employee.prenom} ${employee.nom}`,
            subtitle: employee.poste + (employee.departement ? ` · ${employee.departement}` : ""),
            matriculeLabel: t("employees.col.matricule"),
            matricule: employee.matricule ?? "—",
            dateLabel: t("detail.evaluations.date"),
            date: ev.date_evaluation,
            periodLabel: t("detail.evaluations.period"),
            period: ev.periode || t("detail.reportsPrint.allPeriods"),
            evaluatorLabel: t("detail.evaluations.evaluator"),
            evaluator: evaluatorName(ev),
            criteriaTitle: t("detail.evaluations.criteriaTitle"),
            criteria: EVAL_CRITERIA.map((c) => ({
                label: t(`detail.evaluations.criteria.${c.code}`),
                score: ev[c.col],
                max: 5,
            })),
            overallLabel: t("detail.evaluations.overall"),
            overall: `${fmtNote(ev.note_globale)} / 5`,
            scoreHeader: t("detail.evaluations.score"),
            blocks: [
                { title: t("detail.evaluations.strengths"), body: ev.points_forts ?? "" },
                { title: t("detail.evaluations.improvements"), body: ev.axes_amelioration ?? "" },
                { title: t("detail.evaluations.comment"), body: ev.commentaire ?? "" },
            ],
            generatedOn: t("detail.print.generatedOn", {
                date: new Date().toLocaleString("fr-FR"),
            }),
        });
    };

    if (employeesQ.isLoading && !employee) {
        return (
            <div className="flex items-center justify-center py-24 text-slate-500">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {t("detail.loading")}
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <p className="text-slate-500">{t("detail.notFound")}</p>
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    {t("detail.back")}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* En-tête de page */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button size="sm" variant="outline" onClick={onBack}>
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        {t("detail.back")}
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {`${employee.prenom} ${employee.nom}`}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {employee.poste + (employee.departement ? ` · ${employee.departement}` : "")}
                        </p>
                    </div>
                </div>
                <Button size="sm" variant="outline" onClick={handlePrint}>
                    <Printer className="w-4 h-4 mr-1.5" />
                    {t("detail.print.button")}
                </Button>
            </div>

                {/* Header info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <InfoCard icon={<UserCircle2 className="w-4 h-4" />} label={t("employees.col.matricule")} value={employee.matricule ?? "—"} />
                    <InfoCard icon={<Mail className="w-4 h-4" />} label="Email" value={employee.email ?? "—"} />
                    <InfoCard icon={<Phone className="w-4 h-4" />} label={t("employees.form.phone")} value={employee.telephone ?? "—"} />
                    <InfoCard icon={<CalendarDays className="w-4 h-4" />} label={t("employees.col.hiredAt")} value={employee.date_embauche} />
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
                    <DetailTabBtn active={tab === "overview"} onClick={() => setTab("overview")} icon={<UserCircle2 className="w-4 h-4" />}>
                        {t("detail.tabs.overview")}
                    </DetailTabBtn>
                    <DetailTabBtn active={tab === "history"} onClick={() => setTab("history")} icon={<HistoryIcon className="w-4 h-4" />}>
                        {t("detail.tabs.history")} ({history.length})
                    </DetailTabBtn>
                    <DetailTabBtn active={tab === "reports"} onClick={() => setTab("reports")} icon={<ClipboardList className="w-4 h-4" />}>
                        {t("detail.tabs.reports")} ({reports.length})
                    </DetailTabBtn>
                    <DetailTabBtn active={tab === "leaves"} onClick={() => setTab("leaves")} icon={<CalendarDays className="w-4 h-4" />}>
                        {t("detail.tabs.leaves")} ({leaves.length})
                    </DetailTabBtn>
                    <DetailTabBtn active={tab === "payroll"} onClick={() => setTab("payroll")} icon={<Receipt className="w-4 h-4" />}>
                        {t("detail.tabs.payroll")} ({payslips.length})
                    </DetailTabBtn>
                    <DetailTabBtn active={tab === "deductions"} onClick={() => setTab("deductions")} icon={<BadgePercent className="w-4 h-4" />}>
                        {t("detail.tabs.deductions")} ({occurrences.length})
                    </DetailTabBtn>
                    <DetailTabBtn active={tab === "evaluations"} onClick={() => setTab("evaluations")} icon={<Star className="w-4 h-4" />}>
                        {t("detail.tabs.evaluations")} ({evaluations.length})
                    </DetailTabBtn>
                    <DetailTabBtn active={tab === "annual"} onClick={() => setTab("annual")} icon={<CalendarDays className="w-4 h-4" />}>
                        {t("detail.tabs.annual")}
                    </DetailTabBtn>
                </div>

                {tab === "overview" && (
                    <div className="space-y-5 overflow-x-auto pr-1">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatBox label={t("detail.stats.hoursWorked")} value={`${totalHours} h`} />
                            <StatBox label={t("detail.stats.approvedDays")} value={String(approvedLeaves)} />
                            <StatBox label={t("detail.stats.pendingLeaves")} value={String(pendingLeaves)} />
                            <StatBox label={t("detail.stats.totalPaid")} value={fmtMoney(totalPaid)} />
                            <StatBox label={t("detail.stats.salary")} value={fmtMoney(employee.salaire_base)} />
                            <StatBox label={t("detail.stats.totalDeductions")} value={fmtMoney(totalDeductions)} highlight={totalDeductions > 0} />
                            <StatBox label={t("detail.stats.payslipCount")} value={String(payslips.length)} />
                            <StatBox label={t("detail.stats.reportCount")} value={String(reports.length)} />
                            <StatBox label={t("detail.stats.lastRating")} value={lastEvaluation ? `${fmtNote(lastEvaluation.note_globale)} / 5` : "—"} />
                        </div>

                        {/* Profil détaillé */}
                        {sections.map((section) => (
                            <ProfileSection key={section.title} title={section.title} rows={section.rows} />
                        ))}

                        {employee.notes && (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold mb-1.5">
                                    {t("detail.print.notesTitle")}
                                </p>
                                <p className="text-sm whitespace-pre-wrap">{employee.notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {tab === "history" && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("detail.history.col.date")}</TableHead>
                                    <TableHead>{t("detail.history.col.type")}</TableHead>
                                    <TableHead>{t("detail.history.col.detail")}</TableHead>
                                    <TableHead className="text-right">{t("detail.history.col.amount")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-400">{t("detail.history.empty")}</TableCell></TableRow>
                                ) : (
                                    history.map((h, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="whitespace-nowrap">{h.date}</TableCell>
                                            <TableCell className="whitespace-nowrap">{h.type}</TableCell>
                                            <TableCell className="max-w-md truncate" title={h.detail}>{h.detail}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{h.amount}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {tab === "reports" && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="space-y-1">
                                <Label className="text-xs">{t("detail.reportsPrint.from")}</Label>
                                <Input
                                    type="date"
                                    value={periodFrom}
                                    max={periodTo || undefined}
                                    onChange={(e) => setPeriodFrom(e.target.value)}
                                    className="w-auto"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">{t("detail.reportsPrint.to")}</Label>
                                <Input
                                    type="date"
                                    value={periodTo}
                                    min={periodFrom || undefined}
                                    onChange={(e) => setPeriodTo(e.target.value)}
                                    className="w-auto"
                                />
                            </div>
                            {(periodFrom || periodTo) && (
                                <Button size="sm" variant="ghost" onClick={() => { setPeriodFrom(""); setPeriodTo(""); }}>
                                    {t("detail.reportsPrint.reset")}
                                </Button>
                            )}
                            <div className="ml-auto">
                                <Button size="sm" variant="outline" onClick={handlePrintReports} disabled={reportsInPeriod.length === 0}>
                                    <Printer className="w-4 h-4 mr-1.5" />
                                    {t("detail.reportsPrint.button")} ({reportsInPeriod.length})
                                </Button>
                            </div>
                        </div>
                        <div className="max-h-[360px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("reports.col.date")}</TableHead>
                                        <TableHead>{t("reports.col.hours")}</TableHead>
                                        <TableHead>{t("reports.col.activities")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportsInPeriod.length === 0 ? (
                                        <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-400">{t("reports.empty")}</TableCell></TableRow>
                                    ) : (
                                        reportsInPeriod.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell>{r.date}</TableCell>
                                                <TableCell>{r.heures_travaillees} h</TableCell>
                                                <TableCell className="max-w-md truncate" title={r.activites}>{r.activites}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {tab === "leaves" && (
                    <div className="max-h-[400px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("leaves.col.type")}</TableHead>
                                    <TableHead>{t("leaves.col.period")}</TableHead>
                                    <TableHead>{t("leaves.col.days")}</TableHead>
                                    <TableHead>{t("leaves.col.status")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {leaves.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-400">{t("leaves.empty")}</TableCell></TableRow>
                                ) : (
                                    leaves.map((l) => (
                                        <TableRow key={l.id}>
                                            <TableCell>{t(`leaves.type.${l.type}`)}</TableCell>
                                            <TableCell>{l.date_debut} → {l.date_fin}</TableCell>
                                            <TableCell>{l.nb_jours}</TableCell>
                                            <TableCell>{t(`leaves.status.${l.statut}`)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {tab === "payroll" && (
                    <div className="max-h-[400px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("payroll.col.reference")}</TableHead>
                                    <TableHead>{t("payroll.col.period")}</TableHead>
                                    <TableHead>{t("payroll.col.base")}</TableHead>
                                    <TableHead>{t("payroll.col.bonus")}</TableHead>
                                    <TableHead>{t("payroll.col.deductions")}</TableHead>
                                    <TableHead>{t("payroll.col.net")}</TableHead>
                                    <TableHead>{t("detail.paymentDate")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslips.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-6 text-slate-400">{t("payroll.empty")}</TableCell></TableRow>
                                ) : (
                                    payslips.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-mono text-xs text-gray-600">{payslipReference(p)}</TableCell>
                                            <TableCell>{monthLabel(p.mois)} {p.annee}</TableCell>
                                            <TableCell>{fmtMoney(p.salaire_base)}</TableCell>
                                            <TableCell>{fmtMoney(p.primes)}</TableCell>
                                            <TableCell>{fmtMoney(p.deductions)}</TableCell>
                                            <TableCell className="font-semibold">{fmtMoney(p.net_a_payer)}</TableCell>
                                            <TableCell>
                                                {p.payment_date ?? "—"}
                                                {p.auto_generated && (
                                                    <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">{t("detail.auto")}</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {tab === "deductions" && (
                    <DeductionsSection
                        employeeId={employee.id}
                        rules={rulesQ.data ?? []}
                        occurrences={occurrences}
                        creatorId={creatorId}
                        onError={onError}
                        onSuccess={onSuccess}
                    />
                )}

                {tab === "evaluations" && (
                    <EvaluationsSection
                        employeeId={employee.id}
                        evaluations={evaluations}
                        creatorId={creatorId}
                        evaluatorName={evaluatorName}
                        onPrint={handlePrintEvaluation}
                        onError={onError}
                        onSuccess={onSuccess}
                    />
                )}

                {tab === "annual" && (
                    <div className="space-y-4 overflow-x-auto pr-1">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">{t("detail.annual.year")}</Label>
                                <Select value={String(bilanYear)} onValueChange={(v) => setBilanYear(parseInt(v ?? "", 10) || new Date().getFullYear())}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue>{(v: string) => v}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map((y) => (
                                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button size="sm" variant="outline" onClick={handlePrintAnnual}>
                                <Printer className="w-4 h-4 mr-1.5" />
                                {t("detail.annual.print.button")}
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatBox label={t("detail.stats.hoursWorked")} value={`${annual.hours} h`} />
                            <StatBox label={t("detail.stats.reportCount")} value={String(annual.reports)} />
                            <StatBox label={t("detail.stats.approvedDays")} value={String(annual.leaveDays)} />
                            <StatBox label={t("detail.stats.payslipCount")} value={String(annual.payslips)} />
                            <StatBox label={t("detail.annual.totalNet")} value={fmtMoney(annual.net)} />
                            <StatBox label={t("detail.stats.totalDeductions")} value={fmtMoney(annual.deductions)} highlight={annual.deductions > 0} />
                            <StatBox label={t("detail.tabs.evaluations")} value={String(annual.evalCount)} />
                            <StatBox label={t("detail.stats.lastRating")} value={annual.evalCount ? `${fmtNote(annual.evalAvg)} / 5` : "—"} />
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold mb-2">{t("detail.annual.monthlyTitle")}</p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("detail.annual.col.month")}</TableHead>
                                        <TableHead className="text-right">{t("detail.stats.hoursWorked")}</TableHead>
                                        <TableHead className="text-right">{t("detail.tabs.reports")}</TableHead>
                                        <TableHead className="text-right">{t("detail.annual.col.leaveDays")}</TableHead>
                                        <TableHead className="text-right">{t("detail.annual.totalNet")}</TableHead>
                                        <TableHead className="text-right">{t("detail.tabs.deductions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {monthly.map((m) => (
                                        <TableRow key={m.mois}>
                                            <TableCell>{monthLabel(m.mois)}</TableCell>
                                            <TableCell className="text-right">{m.hours}</TableCell>
                                            <TableCell className="text-right">{m.reports}</TableCell>
                                            <TableCell className="text-right">{m.leaveDays}</TableCell>
                                            <TableCell className="text-right">{fmtMoney(m.net)}</TableCell>
                                            <TableCell className="text-right">{fmtMoney(m.deductions)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="font-semibold bg-slate-50 dark:bg-slate-800/60">
                                        <TableCell>{t("detail.annual.total")}</TableCell>
                                        <TableCell className="text-right">{annual.hours}</TableCell>
                                        <TableCell className="text-right">{annual.reports}</TableCell>
                                        <TableCell className="text-right">{annual.leaveDays}</TableCell>
                                        <TableCell className="text-right">{fmtMoney(annual.net)}</TableCell>
                                        <TableCell className="text-right">{fmtMoney(annual.deductions)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
        </div>
    );
}

function DetailTabBtn({
    active,
    onClick,
    icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors ${
                active
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
        >
            {icon}
            {children}
        </button>
    );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-slate-400">
                {icon}{label}
            </div>
            <p className="mt-1 text-sm font-medium truncate" title={value}>{value}</p>
        </div>
    );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`rounded-lg border px-3 py-2 ${highlight ? "border-rose-300 bg-rose-50 dark:bg-rose-900/20" : "border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40"}`}>
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
        </div>
    );
}

function ProfileSection({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
    return (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold">{title}</p>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                {rows.map((r) => (
                    <div key={r.label} className="flex justify-between gap-3 px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <dt className="text-xs text-slate-500 dark:text-slate-400">{r.label}</dt>
                        <dd className="text-sm font-medium text-right break-words">{r.value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

// ─── Deductions sub-section (add occurrence) ─────────────────────────────
function DeductionsSection({
    employeeId,
    rules,
    occurrences,
    creatorId,
    onError,
    onSuccess,
}: {
    employeeId: string;
    rules: DeductionRule[];
    occurrences: Array<{ id: string; rule_id: string; date: string; montant: number; motif: string | null; payslip_id: string | null }>;
    creatorId: string;
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const create = useCreateDeductionOccurrence();
    const del = useDeleteDeductionOccurrence();
    const [adding, setAdding] = useState(false);
    const [confirmDel, setConfirmDel] = useState<string | null>(null);
    const [form, setForm] = useState({
        rule_id: rules[0]?.id ?? "",
        date: new Date().toISOString().slice(0, 10),
        montant: "0",
        motif: "",
    });

    const rulesById = useMemo(() => new Map(rules.map((r) => [r.id, r])), [rules]);

    const onRuleChange = (id: string) => {
        const rule = rulesById.get(id);
        setForm((f) => ({
            ...f,
            rule_id: id,
            montant: rule && rule.amount_type === "fixed" ? String(rule.amount) : f.montant,
        }));
    };

    const handleSubmit = async () => {
        try {
            if (!form.rule_id) {
                onError(new Error(t("config.rules.selectRule")));
                return;
            }
            await create.mutateAsync({
                employee_id: employeeId,
                rule_id: form.rule_id,
                date: form.date,
                montant: parseInt(form.montant || "0", 10) || 0,
                motif: form.motif.trim() || null,
                created_by: creatorId || null,
            });
            onSuccess(t("detail.deductionAdded"));
            setAdding(false);
            setForm({ rule_id: rules[0]?.id ?? "", date: new Date().toISOString().slice(0, 10), montant: "0", motif: "" });
        } catch (e) {
            onError(e);
        }
    };

    const handleDelete = async () => {
        if (!confirmDel) return;
        try {
            await del.mutateAsync(confirmDel);
            onSuccess(t("detail.deductionDeleted"));
            setConfirmDel(null);
        } catch (e) {
            onError(e);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">{t("detail.deductionHint")}</p>
                {!adding && rules.length > 0 && (
                    <Button size="sm" onClick={() => setAdding(true)}>
                        <Plus className="w-4 h-4 mr-1" /> {t("detail.addDeduction")}
                    </Button>
                )}
            </div>
            {rules.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                    {t("detail.noRulesYet")}
                </div>
            )}
            {adding && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">{t("config.rules.col.label")}</Label>
                            <Select value={form.rule_id} onValueChange={(v) => onRuleChange(v ?? "")}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("config.rules.selectRule")}>
                                        {(value: string) => {
                                            const r = rulesById.get(value);
                                            return r ? r.label : t("config.rules.selectRule");
                                        }}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {rules.filter((r) => r.actif).map((r) => (
                                        <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("reports.col.date")}</Label>
                            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("config.rules.col.amount")} (FCFA)</Label>
                            <Input type="number" min="0" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("detail.motifOptional")}</Label>
                            <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setAdding(false)}>{t("common.cancel")}</Button>
                        <Button size="sm" onClick={handleSubmit} disabled={create.isPending}>
                            {create.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {t("common.create")}
                        </Button>
                    </div>
                </div>
            )}
            <div className="max-h-[300px] overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("reports.col.date")}</TableHead>
                            <TableHead>{t("config.rules.col.label")}</TableHead>
                            <TableHead>{t("config.rules.col.amount")}</TableHead>
                            <TableHead>{t("detail.motif")}</TableHead>
                            <TableHead>{t("detail.linked")}</TableHead>
                            <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {occurrences.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">{t("detail.noDeductions")}</TableCell></TableRow>
                        ) : (
                            occurrences.map((o) => {
                                const rule = rulesById.get(o.rule_id);
                                return (
                                    <TableRow key={o.id}>
                                        <TableCell>{o.date}</TableCell>
                                        <TableCell>{rule?.label ?? "?"}</TableCell>
                                        <TableCell>{fmtMoney(o.montant)}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={o.motif ?? ""}>{o.motif ?? "—"}</TableCell>
                                        <TableCell>
                                            {o.payslip_id ? (
                                                <Badge className="bg-blue-100 text-blue-700 text-xs">{t("detail.linkedYes")}</Badge>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!o.payslip_id && (
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setConfirmDel(o.id)}>
                                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <ConfirmDialog
                isOpen={!!confirmDel}
                onClose={() => setConfirmDel(null)}
                onConfirm={handleDelete}
                title={t("detail.confirmDeleteDeduction")}
                description={t("detail.confirmDeleteDeductionDesc")}
                isLoading={del.isPending}
            />
        </div>
    );
}

// ─── Evaluations sub-section (notation par critères) ─────────────────────────
function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    disabled={!onChange}
                    onClick={() => onChange?.(n)}
                    className={onChange ? "cursor-pointer" : "cursor-default"}
                    aria-label={String(n)}
                >
                    <Star
                        className={`w-4 h-4 ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`}
                    />
                </button>
            ))}
        </div>
    );
}

const emptyEvalForm = {
    date_evaluation: new Date().toISOString().slice(0, 10),
    periode: "",
    note_qualite: 3,
    note_productivite: 3,
    note_ponctualite: 3,
    note_equipe: 3,
    note_communication: 3,
    note_initiative: 3,
    note_discipline: 3,
    points_forts: "",
    axes_amelioration: "",
    commentaire: "",
};

function EvaluationsSection({
    employeeId,
    evaluations,
    creatorId,
    evaluatorName,
    onPrint,
    onError,
    onSuccess,
}: {
    employeeId: string;
    evaluations: EmployeeEvaluation[];
    creatorId: string;
    evaluatorName: (ev: EmployeeEvaluation) => string;
    onPrint: (ev: EmployeeEvaluation) => void;
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const create = useCreateEmployeeEvaluation();
    const del = useDeleteEmployeeEvaluation();
    const [adding, setAdding] = useState(false);
    const [confirmDel, setConfirmDel] = useState<string | null>(null);
    const [form, setForm] = useState(emptyEvalForm);
    const [periodFrom, setPeriodFrom] = useState("");
    const [periodTo, setPeriodTo] = useState("");

    // Évaluations restreintes à la période sélectionnée (sinon toutes).
    const filtered = useMemo(
        () =>
            evaluations.filter((ev) => {
                if (periodFrom && ev.date_evaluation < periodFrom) return false;
                if (periodTo && ev.date_evaluation > periodTo) return false;
                return true;
            }),
        [evaluations, periodFrom, periodTo]
    );

    // Moyennes calculées automatiquement sur la période : globale + par critère.
    const periodGlobalAvg = useMemo(() => overallAverage(filtered), [filtered]);
    const periodCritAvg = useMemo(() => criterionAverages(filtered), [filtered]);
    const hasPeriod = periodFrom !== "" || periodTo !== "";

    const noteGlobale = useMemo(() => {
        const scores = EVAL_CRITERIA.map((c) => form[c.col]);
        const avg = scores.reduce((s, n) => s + n, 0) / scores.length;
        return Math.round(avg * 100) / 100;
    }, [form]);

    const reset = () => setForm(emptyEvalForm);

    const handleSubmit = async () => {
        try {
            await create.mutateAsync({
                employee_id: employeeId,
                date_evaluation: form.date_evaluation,
                periode: form.periode.trim() || null,
                note_qualite: form.note_qualite,
                note_productivite: form.note_productivite,
                note_ponctualite: form.note_ponctualite,
                note_equipe: form.note_equipe,
                note_communication: form.note_communication,
                note_initiative: form.note_initiative,
                note_discipline: form.note_discipline,
                note_globale: noteGlobale,
                points_forts: form.points_forts.trim() || null,
                axes_amelioration: form.axes_amelioration.trim() || null,
                commentaire: form.commentaire.trim() || null,
                evaluateur_id: creatorId || null,
            });
            onSuccess(t("detail.evaluations.added"));
            setAdding(false);
            reset();
        } catch (e) {
            onError(e);
        }
    };

    const handleDelete = async () => {
        if (!confirmDel) return;
        try {
            await del.mutateAsync(confirmDel);
            onSuccess(t("detail.evaluations.deleted"));
            setConfirmDel(null);
        } catch (e) {
            onError(e);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">{t("detail.evaluations.hint")}</p>
                {!adding && (
                    <Button size="sm" onClick={() => setAdding(true)}>
                        <Plus className="w-4 h-4 mr-1" /> {t("detail.evaluations.add")}
                    </Button>
                )}
            </div>

            {/* Filtre période + moyennes calculées automatiquement */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">{t("detail.reportsPrint.from")}</Label>
                        <Input type="date" value={periodFrom} max={periodTo || undefined} onChange={(e) => setPeriodFrom(e.target.value)} className="w-auto" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">{t("detail.reportsPrint.to")}</Label>
                        <Input type="date" value={periodTo} min={periodFrom || undefined} onChange={(e) => setPeriodTo(e.target.value)} className="w-auto" />
                    </div>
                    {hasPeriod && (
                        <Button size="sm" variant="ghost" onClick={() => { setPeriodFrom(""); setPeriodTo(""); }}>
                            {t("detail.reportsPrint.reset")}
                        </Button>
                    )}
                    <span className="ml-auto text-xs text-slate-500">
                        {t("evaluationsOverview.totalEvaluations")}: <span className="font-semibold text-slate-700 dark:text-slate-200">{filtered.length}</span>
                    </span>
                </div>

                {filtered.length === 0 ? (
                    <p className="text-xs text-slate-400">{hasPeriod ? t("evaluationsOverview.empty") : t("detail.evaluations.empty")}</p>
                ) : (
                    <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-stretch">
                        <div className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-3">
                            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                                <Star className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{t("evaluationsOverview.globalAverage")}</p>
                                <p className="mt-0.5 text-2xl font-semibold text-rose-600">{fmtNote(periodGlobalAvg)} / 5</p>
                            </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-rose-600 font-semibold mb-2">{t("evaluationsOverview.byCriterion")}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                                {EVAL_CRITERIA.map((c) => (
                                    <div key={c.code} className="flex items-center justify-between gap-2">
                                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{t(`detail.evaluations.criteria.${c.code}`)}</span>
                                        <span className="flex items-center gap-2">
                                            <StarRating value={Math.round(periodCritAvg[c.code] ?? 0)} />
                                            <span className="text-xs font-medium w-9 text-right tabular-nums">{fmtNote(periodCritAvg[c.code] ?? 0)}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {adding && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">{t("detail.evaluations.date")}</Label>
                            <Input type="date" value={form.date_evaluation} onChange={(e) => setForm({ ...form, date_evaluation: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("detail.evaluations.period")}</Label>
                            <Input value={form.periode} placeholder={t("detail.evaluations.periodHint")} onChange={(e) => setForm({ ...form, periode: e.target.value })} />
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                        {EVAL_CRITERIA.map((c) => (
                            <div key={c.code} className="flex items-center justify-between gap-3 px-3 py-2">
                                <span className="text-sm">{t(`detail.evaluations.criteria.${c.code}`)}</span>
                                <div className="flex items-center gap-2">
                                    <StarRating value={form[c.col]} onChange={(v) => setForm((f) => ({ ...f, [c.col]: v }))} />
                                    <span className="text-xs text-slate-500 w-8 text-right">{form[c.col]} / 5</span>
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center justify-between gap-3 px-3 py-2 bg-slate-100/60 dark:bg-slate-800/60">
                            <span className="text-sm font-semibold">{t("detail.evaluations.overall")}</span>
                            <span className="text-sm font-bold text-rose-600">{fmtNote(noteGlobale)} / 5</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        <div className="space-y-1">
                            <Label className="text-xs">{t("detail.evaluations.strengths")}</Label>
                            <Input value={form.points_forts} onChange={(e) => setForm({ ...form, points_forts: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("detail.evaluations.improvements")}</Label>
                            <Input value={form.axes_amelioration} onChange={(e) => setForm({ ...form, axes_amelioration: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">{t("detail.evaluations.comment")}</Label>
                            <Input value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setAdding(false); reset(); }}>{t("common.cancel")}</Button>
                        <Button size="sm" onClick={handleSubmit} disabled={create.isPending}>
                            {create.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {t("common.create")}
                        </Button>
                    </div>
                </div>
            )}

            <div className="max-h-[360px] overflow-auto space-y-2">
                {filtered.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">{t("detail.evaluations.empty")}</div>
                ) : (
                    filtered.map((ev) => (
                        <div key={ev.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <StarRating value={Math.round(ev.note_globale)} />
                                    <span className="text-sm font-bold text-rose-600">{fmtNote(ev.note_globale)} / 5</span>
                                    <span className="text-xs text-slate-500">{ev.date_evaluation}{ev.periode ? ` · ${ev.periode}` : ""}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={t("detail.evaluations.print.button")} onClick={() => onPrint(ev)}>
                                        <Printer className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setConfirmDel(ev.id)}>
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                                {EVAL_CRITERIA.map((c) => (
                                    <div key={c.code} className="flex items-center justify-between gap-2 text-xs">
                                        <span className="text-slate-500 truncate">{t(`detail.evaluations.criteria.${c.code}`)}</span>
                                        <span className="font-medium">{ev[c.col]}/5</span>
                                    </div>
                                ))}
                            </div>
                            {(ev.points_forts || ev.axes_amelioration || ev.commentaire) && (
                                <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                    {ev.points_forts && <p><span className="font-semibold">{t("detail.evaluations.strengths")}:</span> {ev.points_forts}</p>}
                                    {ev.axes_amelioration && <p><span className="font-semibold">{t("detail.evaluations.improvements")}:</span> {ev.axes_amelioration}</p>}
                                    {ev.commentaire && <p><span className="font-semibold">{t("detail.evaluations.comment")}:</span> {ev.commentaire}</p>}
                                </div>
                            )}
                            <p className="mt-2 text-[11px] text-slate-400">{t("detail.evaluations.evaluator")}: {evaluatorName(ev)}</p>
                        </div>
                    ))
                )}
            </div>

            <ConfirmDialog
                isOpen={!!confirmDel}
                onClose={() => setConfirmDel(null)}
                onConfirm={handleDelete}
                title={t("detail.evaluations.confirmDelete")}
                description={t("detail.evaluations.confirmDeleteDesc")}
                isLoading={del.isPending}
            />
        </div>
    );
}

// ─── Builders profil & historique ───────────────────────────────────────────
function buildProfileSections(
    e: Employee,
    supervisorName: string | null,
    t: TFn
): DossierSection[] {
    const dash = "—";
    const v = (val: string | number | null | undefined): string =>
        val === null || val === undefined || val === "" ? dash : String(val);
    const opt = (prefix: string, key: string | null | undefined): string =>
        key ? t(`${prefix}.${key}`) : dash;

    const sections: DossierSection[] = [
        {
            title: t("detail.sections.identity"),
            rows: [
                { label: t("employees.col.matricule"), value: v(e.matricule) },
                { label: t("employees.col.position"), value: v(e.poste) },
                { label: t("employees.col.department"), value: v(e.departement) },
                { label: t("employees.col.status"), value: opt("employees.status", e.statut) },
                { label: t("employees.col.salary"), value: fmtMoney(e.salaire_base) },
            ],
        },
        {
            title: t("detail.sections.civil"),
            rows: [
                { label: t("employees.form.birthDate"), value: v(e.date_naissance) },
                { label: t("employees.form.birthPlace"), value: v(e.lieu_naissance) },
                { label: t("employees.form.sex"), value: opt("employees.form.sexOptions", e.sexe) },
                { label: t("employees.form.nationality"), value: v(e.nationalite) },
                { label: t("employees.form.preferredLanguage"), value: opt("employees.form.languageOptions", e.langue_preferee) },
                { label: t("employees.form.maritalStatus"), value: opt("employees.form.maritalOptions", e.situation_matrimoniale) },
                { label: t("employees.form.childrenCount"), value: v(e.nombre_enfants) },
                { label: t("employees.form.idType"), value: opt("employees.form.idTypeOptions", e.type_piece) },
                { label: t("employees.form.idNumber"), value: v(e.numero_piece) },
                { label: t("employees.form.idIssuePlace"), value: v(e.lieu_emission_piece) },
                { label: t("employees.form.idExpiry"), value: v(e.date_expiration_piece) },
            ],
        },
        {
            title: t("detail.sections.address"),
            rows: [
                { label: "Email", value: v(e.email) },
                { label: t("employees.form.phone"), value: v(e.telephone) },
                { label: t("employees.form.address"), value: v(e.adresse) },
                { label: t("employees.form.neighborhood"), value: v(e.quartier) },
                { label: t("employees.form.city"), value: v(e.ville) },
                { label: t("employees.form.country"), value: v(e.pays) },
            ],
        },
        {
            title: t("detail.sections.emergency"),
            rows: [
                { label: t("employees.form.emergencyName"), value: v(e.urgence_nom) },
                { label: t("employees.form.emergencyRelation"), value: v(e.urgence_lien) },
                { label: t("employees.form.emergencyPhone"), value: v(e.urgence_telephone) },
                { label: t("employees.form.emergencyEmail"), value: v(e.urgence_email) },
            ],
        },
        {
            title: t("detail.sections.contract"),
            rows: [
                { label: t("employees.form.contractType"), value: opt("employees.form.contractOptions", e.type_contrat) },
                { label: t("employees.form.scheduleType"), value: opt("employees.form.scheduleOptions", e.type_horaire) },
                { label: t("employees.col.hiredAt"), value: v(e.date_embauche) },
                { label: t("employees.form.endDate"), value: v(e.date_fin_contrat) },
                { label: t("employees.form.probationMonths"), value: v(e.periode_essai_mois) },
                { label: t("detail.supervisor"), value: v(supervisorName) },
            ],
        },
    ];
    return sections;
}

function buildHistory(
    t: TFn,
    data: {
        reports: DailyReport[];
        leaves: LeaveRequest[];
        payslips: Payslip[];
        occurrences: DeductionOccurrence[];
        evaluations: EmployeeEvaluation[];
        rulesById: Map<string, DeductionRule>;
    }
): DossierHistoryRow[] {
    const rows: Array<DossierHistoryRow & { sort: string }> = [];

    for (const r of data.reports) {
        rows.push({
            sort: r.date,
            date: r.date,
            type: t("detail.history.types.report"),
            detail: t("detail.history.reportDetail", {
                hours: r.heures_travaillees,
                activities: r.activites,
            }),
            amount: "",
        });
    }

    for (const l of data.leaves) {
        rows.push({
            sort: l.date_debut,
            date: l.date_debut,
            type: t("detail.history.types.leave"),
            detail: t("detail.history.leaveDetail", {
                type: t(`leaves.type.${l.type}`),
                from: l.date_debut,
                to: l.date_fin,
                days: l.nb_jours,
                status: t(`leaves.status.${l.statut}`),
            }),
            amount: "",
        });
    }

    for (const p of data.payslips) {
        const sortDate = p.payment_date ?? `${p.annee}-${String(p.mois).padStart(2, "0")}-01`;
        rows.push({
            sort: sortDate,
            date: p.payment_date ?? `${monthLabel(p.mois)} ${p.annee}`,
            type: t("detail.history.types.payslip"),
            detail: t("detail.history.payslipDetail", {
                period: `${monthLabel(p.mois)} ${p.annee}`,
                net: fmtMoney(p.net_a_payer),
            }),
            amount: fmtMoney(p.net_a_payer),
        });
    }

    for (const o of data.occurrences) {
        const rule = data.rulesById.get(o.rule_id);
        const label = rule?.label ?? t("detail.history.types.deduction");
        rows.push({
            sort: o.date,
            date: o.date,
            type: t("detail.history.types.deduction"),
            detail: o.motif ? `${label} — ${o.motif}` : label,
            amount: `- ${fmtMoney(o.montant)}`,
        });
    }

    for (const ev of data.evaluations) {
        rows.push({
            sort: ev.date_evaluation,
            date: ev.date_evaluation,
            type: t("detail.history.types.evaluation"),
            detail: t("detail.history.evaluationDetail", {
                note: fmtNote(ev.note_globale),
                period: ev.periode || "—",
            }),
            amount: `${fmtNote(ev.note_globale)} / 5`,
        });
    }

    rows.sort((a, b) => (a.sort < b.sort ? 1 : a.sort > b.sort ? -1 : 0));
    return rows.map((r) => ({ date: r.date, type: r.type, detail: r.detail, amount: r.amount }));
}
