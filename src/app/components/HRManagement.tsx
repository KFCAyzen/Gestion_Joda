"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    Briefcase,
    CalendarDays,
    Check,
    ClipboardList,
    Copy,
    Eye,
    Filter as FilterIcon,
    Globe,
    KeyRound,
    Link2,
    Loader2,
    Mail,
    Pencil,
    Play,
    Plus,
    Printer,
    Receipt,
    RotateCcw,
    Settings2,
    Star,
    Trash2,
    User,
    Users as UsersIcon,
    X as XIcon,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import ProtectedRoute from "./ProtectedRoute";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { getFriendlyErrorMessage } from "../lib/feedback";
import { DropdownMenu } from "./shared";
import PhoneInput from "./shared/PhoneInput";
import {
    DEFAULT_PHONE_COUNTRY_CODE,
    PHONE_COUNTRY_CODES,
    normalizePhoneNumber,
    splitPhoneNumber,
} from "../lib/phone";
import {
    useEmployees,
    useCreateEmployee,
    useUpdateEmployee,
    useDeleteEmployee,
    useLeaveRequests,
    useCreateLeaveRequest,
    useReviewLeaveRequest,
    useDeleteLeaveRequest,
    usePayslips,
    useCreatePayslip,
    useDeletePayslip,
    useDailyReports,
    useCreateDailyReport,
    useDeleteDailyReport,
    useGenerateDuePayslips,
    useEmployeeEvaluations,
} from "../lib/hooks/use-hr";
import HRConfigPanel from "./rh/HRConfigPanel";
import { useRouter } from "@/i18n/navigation";
import { printEmployeesReport } from "../lib/printEmployeesReport";
import { payslipReference } from "../lib/payslipRef";
import { computeCameroonPayroll } from "../lib/cameroonPayroll";
import { EVAL_CRITERIA, fmtNote, overallAverage, criterionAverages } from "../lib/hrEvaluation";
import type {
    Employee,
    EmployeeStatus,
    LeaveRequest,
    LeaveType,
    Payslip,
    PayslipAdjustment,
    DailyReport,
} from "../types/hr";

const TABS = ["employees", "leaves", "payroll", "reports", "evaluations", "config"] as const;
type TabId = (typeof TABS)[number];

const LEAVE_TYPES: LeaveType[] = ["annuel", "maladie", "maternite", "paternite", "sans_solde", "autre"];
const EMPLOYEE_STATUSES: EmployeeStatus[] = ["actif", "suspendu", "inactif"];

function diffDays(start: string, end: string): number {
    if (!start || !end) return 0;
    const a = new Date(start);
    const b = new Date(end);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
    const ms = b.getTime() - a.getTime();
    return Math.max(1, Math.floor(ms / 86400000) + 1);
}

function fmtMoney(n: number): string {
    return n.toLocaleString("fr-FR") + " FCFA";
}

function monthLabel(m: number): string {
    return ["Janv.", "Févr.", "Mars", "Avril", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."][m - 1] ?? `${m}`;
}

export default function HRManagement() {
    return (
        <ProtectedRoute requiredRole="supervisor">
            <HRManagementInner />
        </ProtectedRoute>
    );
}

function HRManagementInner() {
    const t = useTranslations("hrManagement");
    const { user } = useAuth();
    const { showNotification } = useNotificationContext();
    const router = useRouter();
    const [tab, setTab] = useState<TabId>("employees");

    const employeesQ = useEmployees();
    const leavesQ = useLeaveRequests();
    const payslipsQ = usePayslips();
    const reportsQ = useDailyReports();

    const employees = employeesQ.data ?? [];
    const employeesById = useMemo(() => {
        const m = new Map<string, Employee>();
        for (const e of employees) m.set(e.id, e);
        return m;
    }, [employees]);

    const employeeLabel = (id: string) => {
        const e = employeesById.get(id);
        return e ? `${e.prenom} ${e.nom}` : t("unknownEmployee");
    };

    const openEmployee = (e: Employee) => router.push(`/rh/employes/${e.id}`);

    return (
        <div className="space-y-6">
            {/* En-tête stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    icon={<UsersIcon className="w-5 h-5" />}
                    label={t("stats.totalEmployees")}
                    value={employees.filter((e) => e.statut === "actif").length}
                />
                <StatCard
                    icon={<CalendarDays className="w-5 h-5" />}
                    label={t("stats.pendingLeaves")}
                    value={(leavesQ.data ?? []).filter((l) => l.statut === "en_attente").length}
                />
                <StatCard
                    icon={<Receipt className="w-5 h-5" />}
                    label={t("stats.payslips")}
                    value={(payslipsQ.data ?? []).length}
                />
                <StatCard
                    icon={<ClipboardList className="w-5 h-5" />}
                    label={t("stats.reports")}
                    value={(reportsQ.data ?? []).length}
                />
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
                <TabButton active={tab === "employees"} onClick={() => setTab("employees")} icon={<UsersIcon className="w-4 h-4" />}>
                    {t("tabs.employees")}
                </TabButton>
                <TabButton active={tab === "leaves"} onClick={() => setTab("leaves")} icon={<CalendarDays className="w-4 h-4" />}>
                    {t("tabs.leaves")}
                </TabButton>
                <TabButton active={tab === "payroll"} onClick={() => setTab("payroll")} icon={<Receipt className="w-4 h-4" />}>
                    {t("tabs.payroll")}
                </TabButton>
                <TabButton active={tab === "reports"} onClick={() => setTab("reports")} icon={<ClipboardList className="w-4 h-4" />}>
                    {t("tabs.reports")}
                </TabButton>
                <TabButton active={tab === "evaluations"} onClick={() => setTab("evaluations")} icon={<Star className="w-4 h-4" />}>
                    {t("tabs.evaluations")}
                </TabButton>
                <TabButton active={tab === "config"} onClick={() => setTab("config")} icon={<Settings2 className="w-4 h-4" />}>
                    {t("tabs.config")}
                </TabButton>
            </div>

            {/* Panels */}
            {tab === "employees" && (
                <EmployeesPanel
                    employees={employees}
                    loading={employeesQ.isLoading}
                    onView={openEmployee}
                    onError={(e) => showNotification(getFriendlyErrorMessage(e), "error")}
                    onSuccess={(msg) => showNotification(msg, "success")}
                />
            )}
            {tab === "leaves" && (
                <LeavesPanel
                    employees={employees}
                    leaves={leavesQ.data ?? []}
                    loading={leavesQ.isLoading}
                    employeeLabel={employeeLabel}
                    reviewerId={user?.id ?? ""}
                    onError={(e) => showNotification(getFriendlyErrorMessage(e), "error")}
                    onSuccess={(msg) => showNotification(msg, "success")}
                />
            )}
            {tab === "payroll" && (
                <PayrollPanel
                    employees={employees}
                    payslips={payslipsQ.data ?? []}
                    loading={payslipsQ.isLoading}
                    employeesById={employeesById}
                    creatorId={user?.id ?? ""}
                    onError={(e) => showNotification(getFriendlyErrorMessage(e), "error")}
                    onSuccess={(msg) => showNotification(msg, "success")}
                />
            )}
            {tab === "reports" && (
                <ReportsPanel
                    employees={employees}
                    reports={reportsQ.data ?? []}
                    loading={reportsQ.isLoading}
                    employeeLabel={employeeLabel}
                    creatorId={user?.id ?? ""}
                    onError={(e) => showNotification(getFriendlyErrorMessage(e), "error")}
                    onSuccess={(msg) => showNotification(msg, "success")}
                />
            )}
            {tab === "evaluations" && (
                <EvaluationsOverviewPanel
                    employees={employees}
                    onView={openEmployee}
                />
            )}
            {tab === "config" && (
                <HRConfigPanel
                    employees={employees}
                    onError={(e) => showNotification(getFriendlyErrorMessage(e), "error")}
                    onSuccess={(msg) => showNotification(msg, "success")}
                />
            )}
        </div>
    );
}

// ─── UI helpers ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <Card className="joda-surface border-0 shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                    {icon}
                </div>
                <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function TabButton({
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
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 transition-colors ${
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

function LoadingRow({ cols }: { cols: number }) {
    return (
        <TableRow>
            <TableCell colSpan={cols} className="text-center py-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </TableCell>
        </TableRow>
    );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
    return (
        <TableRow>
            <TableCell colSpan={cols} className="p-0">
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-10 text-center my-2">
                    <p className="text-base font-medium text-slate-700 dark:text-slate-300">{label}</p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ─── Evaluations overview panel (vue globale sur une période) ───────────────
function StarsInline({ value }: { value: number }) {
    const full = Math.round(value);
    return (
        <span className="inline-flex items-center gap-0.5 align-middle">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    className={`w-3.5 h-3.5 ${n <= full ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`}
                />
            ))}
        </span>
    );
}

function EvaluationsOverviewPanel({
    employees,
    onView,
}: {
    employees: Employee[];
    onView: (e: Employee) => void;
}) {
    const t = useTranslations("hrManagement");
    const evalQ = useEmployeeEvaluations();
    const [periodFrom, setPeriodFrom] = useState("");
    const [periodTo, setPeriodTo] = useState("");

    const employeesById = useMemo(() => {
        const m = new Map<string, Employee>();
        for (const e of employees) m.set(e.id, e);
        return m;
    }, [employees]);

    const inPeriod = useMemo(() => {
        return (evalQ.data ?? []).filter((ev) => {
            if (periodFrom && ev.date_evaluation < periodFrom) return false;
            if (periodTo && ev.date_evaluation > periodTo) return false;
            return true;
        });
    }, [evalQ.data, periodFrom, periodTo]);

    // Agrégat par employé, trié par note moyenne décroissante
    const ranking = useMemo(() => {
        const byEmp = new Map<string, typeof inPeriod>();
        for (const ev of inPeriod) {
            const arr = byEmp.get(ev.employee_id) ?? [];
            arr.push(ev);
            byEmp.set(ev.employee_id, arr);
        }
        const rows = Array.from(byEmp.entries()).map(([empId, evals]) => ({
            employee: employeesById.get(empId) ?? null,
            empId,
            count: evals.length,
            avg: overallAverage(evals),
            crit: criterionAverages(evals),
        }));
        rows.sort((a, b) => b.avg - a.avg);
        return rows;
    }, [inPeriod, employeesById]);

    const globalAvg = useMemo(() => overallAverage(inPeriod), [inPeriod]);
    const globalCrit = useMemo(() => criterionAverages(inPeriod), [inPeriod]);

    const periodText =
        periodFrom || periodTo
            ? `${periodFrom || "…"} → ${periodTo || "…"}`
            : t("detail.reportsPrint.allPeriods");

    const handlePrint = () => {
        printEmployeesReport({
            docTitle: t("evaluationsOverview.print.docTitle"),
            subtitle: `${t("detail.reportsPrint.periodLabel")}: ${periodText}`,
            summaryTitle: t("evaluationsOverview.summaryTitle"),
            summary: [
                { label: t("evaluationsOverview.totalEvaluations"), value: String(inPeriod.length) },
                { label: t("evaluationsOverview.employeesEvaluated"), value: String(ranking.length) },
                { label: t("evaluationsOverview.globalAverage"), value: `${fmtNote(globalAvg)} / 5` },
                ...EVAL_CRITERIA.map((c) => ({
                    label: t(`detail.evaluations.criteria.${c.code}`),
                    value: `${fmtNote(globalCrit[c.code] ?? 0)} / 5`,
                })),
            ],
            tableTitle: t("evaluationsOverview.rankingTitle"),
            columns: [
                { key: "rank", label: t("evaluationsOverview.col.rank") },
                { key: "name", label: t("employees.col.name") },
                { key: "department", label: t("employees.col.department") },
                { key: "count", label: t("evaluationsOverview.col.count"), align: "right" },
                { key: "avg", label: t("evaluationsOverview.col.average"), align: "right" },
            ],
            rows: ranking.map((r, i) => ({
                cells: [
                    String(i + 1),
                    r.employee ? `${r.employee.prenom} ${r.employee.nom}` : t("unknownEmployee"),
                    r.employee?.departement ?? "—",
                    String(r.count),
                    `${fmtNote(r.avg)} / 5`,
                ],
            })),
            emptyLabel: t("evaluationsOverview.empty"),
            generatedOn: t("evaluationsOverview.print.generatedOn", {
                date: new Date().toLocaleString("fr-FR"),
            }),
        });
    };

    return (
        <Card className="joda-surface border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        {t("evaluationsOverview.title")}
                    </CardTitle>
                    <CardDescription>{t("evaluationsOverview.description")}</CardDescription>
                </div>
                <Button variant="outline" onClick={handlePrint} disabled={inPeriod.length === 0}>
                    <Printer className="w-4 h-4 mr-2" />
                    {t("evaluationsOverview.print.button")}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filtre période */}
                <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="space-y-1">
                        <Label className="text-xs">{t("detail.reportsPrint.from")}</Label>
                        <Input type="date" value={periodFrom} max={periodTo || undefined} onChange={(e) => setPeriodFrom(e.target.value)} className="w-auto" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">{t("detail.reportsPrint.to")}</Label>
                        <Input type="date" value={periodTo} min={periodFrom || undefined} onChange={(e) => setPeriodTo(e.target.value)} className="w-auto" />
                    </div>
                    {(periodFrom || periodTo) && (
                        <Button size="sm" variant="ghost" onClick={() => { setPeriodFrom(""); setPeriodTo(""); }}>
                            {t("detail.reportsPrint.reset")}
                        </Button>
                    )}
                </div>

                {/* Synthèse globale */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <StatCard icon={<Star className="w-5 h-5" />} label={t("evaluationsOverview.totalEvaluations")} value={inPeriod.length} />
                    <StatCard icon={<UsersIcon className="w-5 h-5" />} label={t("evaluationsOverview.employeesEvaluated")} value={ranking.length} />
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-900/40 p-4 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                            <Star className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("evaluationsOverview.globalAverage")}</p>
                            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                                {inPeriod.length ? `${fmtNote(globalAvg)} / 5` : "—"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Moyennes par critère */}
                {inPeriod.length > 0 && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                        <p className="text-xs uppercase tracking-wide text-rose-600 font-semibold mb-2">{t("evaluationsOverview.byCriterion")}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                            {EVAL_CRITERIA.map((c) => (
                                <div key={c.code} className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-slate-600 dark:text-slate-300">{t(`detail.evaluations.criteria.${c.code}`)}</span>
                                    <span className="flex items-center gap-2">
                                        <StarsInline value={globalCrit[c.code] ?? 0} />
                                        <span className="text-sm font-medium w-12 text-right">{fmtNote(globalCrit[c.code] ?? 0)}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Classement */}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">{t("evaluationsOverview.col.rank")}</TableHead>
                            <TableHead>{t("employees.col.name")}</TableHead>
                            <TableHead>{t("employees.col.department")}</TableHead>
                            <TableHead className="text-right">{t("evaluationsOverview.col.count")}</TableHead>
                            <TableHead>{t("evaluationsOverview.col.average")}</TableHead>
                            <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {evalQ.isLoading ? (
                            <LoadingRow cols={6} />
                        ) : ranking.length === 0 ? (
                            <EmptyRow cols={6} label={t("evaluationsOverview.empty")} />
                        ) : (
                            ranking.map((r, i) => (
                                <TableRow key={r.empId}>
                                    <TableCell className="font-semibold text-slate-500">{i + 1}</TableCell>
                                    <TableCell className="font-medium">
                                        {r.employee ? `${r.employee.prenom} ${r.employee.nom}` : t("unknownEmployee")}
                                    </TableCell>
                                    <TableCell>{r.employee?.departement ?? "—"}</TableCell>
                                    <TableCell className="text-right">{r.count}</TableCell>
                                    <TableCell>
                                        <span className="flex items-center gap-2">
                                            <StarsInline value={r.avg} />
                                            <span className="text-sm font-semibold">{fmtNote(r.avg)}</span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {r.employee && (
                                            <Button size="sm" variant="ghost" onClick={() => onView(r.employee!)}>
                                                <Eye className="w-4 h-4 mr-1" />
                                                {t("employees.viewDetail")}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// ─── Employees panel ───────────────────────────────────────────────────────
type EmployeeFormState = {
    // Identité pro
    matricule: string;
    nom: string;
    prenom: string;
    email: string;
    phoneCountryCode: string;
    telephone: string;
    poste: string;
    departement: string;
    date_embauche: string;
    salaire_base: string;
    statut: EmployeeStatus;
    notes: string;
    // État civil & identité
    date_naissance: string;
    lieu_naissance: string;
    sexe: "" | "M" | "F" | "autre";
    nationalite: string;
    langue_preferee:
        | ""
        | "francais"
        | "anglais"
        | "chinois"
        | "espagnol"
        | "arabe"
        | "autre";
    situation_matrimoniale:
        | ""
        | "celibataire"
        | "marie"
        | "divorce"
        | "veuf"
        | "union_libre";
    nombre_enfants: string;
    type_piece: "" | "cni" | "passeport" | "permis" | "recepisse" | "autre";
    numero_piece: string;
    date_expiration_piece: string;
    lieu_emission_piece: string;
    // Adresse
    adresse: string;
    quartier: string;
    ville: string;
    pays: string;
    // Contact d'urgence
    urgence_nom: string;
    urgence_lien: string;
    urgence_phoneCountryCode: string;
    urgence_telephone: string;
    urgence_email: string;
    // Contrat & emploi
    type_contrat: "" | "cdi" | "cdd" | "stage" | "consultant" | "interim" | "temps_partiel";
    date_fin_contrat: string;
    periode_essai_mois: string;
    superieur_id: string;
    type_horaire: "" | "temps_plein" | "temps_partiel" | "flexible" | "poste";
    numero_cnps: string;
    numero_compte_bancaire: string;
};

const emptyEmployeeForm: EmployeeFormState = {
    matricule: "",
    nom: "",
    prenom: "",
    email: "",
    phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
    telephone: "",
    poste: "",
    departement: "",
    date_embauche: new Date().toISOString().slice(0, 10),
    salaire_base: "0",
    statut: "actif",
    notes: "",
    date_naissance: "",
    lieu_naissance: "",
    sexe: "",
    nationalite: "",
    langue_preferee: "",
    situation_matrimoniale: "",
    nombre_enfants: "0",
    type_piece: "",
    numero_piece: "",
    date_expiration_piece: "",
    lieu_emission_piece: "",
    adresse: "",
    quartier: "",
    ville: "",
    pays: "",
    urgence_nom: "",
    urgence_lien: "",
    urgence_phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
    urgence_telephone: "",
    urgence_email: "",
    type_contrat: "",
    date_fin_contrat: "",
    periode_essai_mois: "",
    superieur_id: "",
    type_horaire: "",
    numero_cnps: "",
    numero_compte_bancaire: "",
};

const MATRICULE_PREFIX = "EMP-";
const MATRICULE_PAD = 4;

function nextMatricule(employees: Employee[]): string {
    const re = new RegExp(`^${MATRICULE_PREFIX}(\\d+)$`);
    let max = 0;
    for (const e of employees) {
        const m = e.matricule?.match(re);
        if (m) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n) && n > max) max = n;
        }
    }
    return `${MATRICULE_PREFIX}${String(max + 1).padStart(MATRICULE_PAD, "0")}`;
}

function EmployeesPanel({
    employees,
    loading,
    onView,
    onError,
    onSuccess,
}: {
    employees: Employee[];
    loading: boolean;
    onView: (e: Employee) => void;
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const locale = useLocale();
    const create = useCreateEmployee();
    const update = useUpdateEmployee();
    const del = useDeleteEmployee();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Employee | null>(null);
    const [form, setForm] = useState<EmployeeFormState>(emptyEmployeeForm);
    const [step, setStep] = useState(0);
    const [confirmDel, setConfirmDel] = useState<Employee | null>(null);
    const [pinByEmployee, setPinByEmployee] = useState<Record<string, string>>({});
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

    const publicLink = useMemo(() => {
        if (typeof window === "undefined") return "";
        return `${window.location.origin}/${locale}/rapport`;
    }, [locale]);

    const copyToClipboard = async (text: string, successMsg: string) => {
        try {
            await navigator.clipboard.writeText(text);
            onSuccess(successMsg);
        } catch (e) {
            onError(e);
        }
    };

    const handleRegeneratePin = async (employee: Employee) => {
        setRegeneratingId(employee.id);
        try {
            const res = await fetch(`/api/hr/employees/${employee.id}/regenerate-pin`, { method: "POST" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Regenerate failed");
            const newPin = json?.employee?.report_pin as string | undefined;
            const notif = (json?.notifications ?? {}) as {
                email?: boolean;
                sms?: boolean;
                emailError?: string;
                smsError?: string;
                emailSkipped?: string;
                smsSkipped?: string;
            };
            if (newPin) {
                setPinByEmployee((prev) => ({ ...prev, [employee.id]: newPin }));
                await copyToClipboard(newPin, t("employees.pinRegenerated", { pin: newPin }));
                let key: "pinSentBoth" | "pinSentEmail" | "pinSentSms" | "pinSentNone";
                if (notif.email && notif.sms) key = "pinSentBoth";
                else if (notif.email) key = "pinSentEmail";
                else if (notif.sms) key = "pinSentSms";
                else key = "pinSentNone";
                onSuccess(t(`employees.${key}`));
                if (notif.emailError) onError(new Error(`E-mail: ${notif.emailError}`));
                if (notif.smsError) onError(new Error(`SMS: ${notif.smsError}`));
            } else {
                onSuccess(t("employees.pinRegeneratedNoValue"));
            }
        } catch (e) {
            onError(e);
        } finally {
            setRegeneratingId(null);
        }
    };

    const displayedPin = (e: Employee) => pinByEmployee[e.id] ?? (e.report_pin ? "••••••" : "—");

    const openCreate = () => {
        setEditing(null);
        setForm({ ...emptyEmployeeForm, matricule: nextMatricule(employees) });
        setStep(0);
        setModalOpen(true);
    };

    const openEdit = (e: Employee) => {
        setEditing(e);
        const { countryCode, localNumber } = splitPhoneNumber(e.telephone);
        const urgence = splitPhoneNumber(e.urgence_telephone);
        setForm({
            matricule: e.matricule ?? "",
            nom: e.nom,
            prenom: e.prenom,
            email: e.email ?? "",
            phoneCountryCode: countryCode,
            telephone: localNumber,
            poste: e.poste,
            departement: e.departement ?? "",
            date_embauche: e.date_embauche,
            salaire_base: String(e.salaire_base),
            statut: e.statut,
            notes: e.notes ?? "",
            date_naissance: e.date_naissance ?? "",
            lieu_naissance: e.lieu_naissance ?? "",
            sexe: e.sexe ?? "",
            nationalite: e.nationalite ?? "",
            langue_preferee: e.langue_preferee ?? "",
            situation_matrimoniale: e.situation_matrimoniale ?? "",
            nombre_enfants: e.nombre_enfants != null ? String(e.nombre_enfants) : "0",
            type_piece: e.type_piece ?? "",
            numero_piece: e.numero_piece ?? "",
            date_expiration_piece: e.date_expiration_piece ?? "",
            lieu_emission_piece: e.lieu_emission_piece ?? "",
            adresse: e.adresse ?? "",
            quartier: e.quartier ?? "",
            ville: e.ville ?? "",
            pays: e.pays ?? "",
            urgence_nom: e.urgence_nom ?? "",
            urgence_lien: e.urgence_lien ?? "",
            urgence_phoneCountryCode: urgence.countryCode,
            urgence_telephone: urgence.localNumber,
            urgence_email: e.urgence_email ?? "",
            type_contrat: e.type_contrat ?? "",
            date_fin_contrat: e.date_fin_contrat ?? "",
            periode_essai_mois: e.periode_essai_mois != null ? String(e.periode_essai_mois) : "",
            superieur_id: e.superieur_id ?? "",
            type_horaire: e.type_horaire ?? "",
            numero_cnps: e.numero_cnps ?? "",
            numero_compte_bancaire: e.numero_compte_bancaire ?? "",
        });
        setStep(0);
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                matricule: form.matricule || null,
                nom: form.nom.trim(),
                prenom: form.prenom.trim(),
                email: form.email.trim() || null,
                telephone: normalizePhoneNumber(form.phoneCountryCode, form.telephone) || null,
                poste: form.poste.trim(),
                departement: form.departement.trim() || null,
                date_embauche: form.date_embauche,
                salaire_base: parseInt(form.salaire_base || "0", 10) || 0,
                statut: form.statut,
                notes: form.notes.trim() || null,
                date_naissance: form.date_naissance || null,
                lieu_naissance: form.lieu_naissance.trim() || null,
                sexe: form.sexe || null,
                nationalite: form.nationalite.trim() || null,
                langue_preferee: form.langue_preferee || null,
                situation_matrimoniale: form.situation_matrimoniale || null,
                nombre_enfants: parseInt(form.nombre_enfants || "0", 10) || 0,
                type_piece: form.type_piece || null,
                numero_piece: form.numero_piece.trim() || null,
                date_expiration_piece: form.date_expiration_piece || null,
                lieu_emission_piece: form.lieu_emission_piece.trim() || null,
                adresse: form.adresse.trim() || null,
                quartier: form.quartier.trim() || null,
                ville: form.ville.trim() || null,
                pays: form.pays.trim() || null,
                urgence_nom: form.urgence_nom.trim() || null,
                urgence_lien: form.urgence_lien.trim() || null,
                urgence_telephone:
                    normalizePhoneNumber(form.urgence_phoneCountryCode, form.urgence_telephone) || null,
                urgence_email: form.urgence_email.trim() || null,
                type_contrat: form.type_contrat || null,
                date_fin_contrat: form.date_fin_contrat || null,
                periode_essai_mois: form.periode_essai_mois ? parseInt(form.periode_essai_mois, 10) : null,
                superieur_id: form.superieur_id || null,
                type_horaire: form.type_horaire || null,
                numero_cnps: form.numero_cnps.trim() || null,
                numero_compte_bancaire: form.numero_compte_bancaire.trim() || null,
            };
            if (editing) {
                await update.mutateAsync({ id: editing.id, data: payload });
                onSuccess(t("messages.employeeUpdated"));
            } else {
                const created = await create.mutateAsync(payload);
                onSuccess(t("messages.employeeCreated"));
                try {
                    const res = await fetch(`/api/hr/employees/${created.id}/regenerate-pin`, { method: "POST" });
                    const json = await res.json();
                    if (res.ok) {
                        const newPin = json?.employee?.report_pin as string | undefined;
                        const notif = (json?.notifications ?? {}) as {
                email?: boolean;
                sms?: boolean;
                emailError?: string;
                smsError?: string;
                emailSkipped?: string;
                smsSkipped?: string;
            };
                        if (newPin) {
                            setPinByEmployee((prev) => ({ ...prev, [created.id]: newPin }));
                            await copyToClipboard(newPin, t("employees.pinRegenerated", { pin: newPin }));
                            let key: "pinSentBoth" | "pinSentEmail" | "pinSentSms" | "pinSentNone";
                            if (notif.email && notif.sms) key = "pinSentBoth";
                            else if (notif.email) key = "pinSentEmail";
                            else if (notif.sms) key = "pinSentSms";
                            else key = "pinSentNone";
                            onSuccess(t(`employees.${key}`));
                            if (notif.emailError) onError(new Error(`E-mail: ${notif.emailError}`));
                            if (notif.smsError) onError(new Error(`SMS: ${notif.smsError}`));
                        }
                    } else {
                        console.error("regenerate-pin HTTP", res.status, json);
                        onError(new Error(json?.error || `HTTP ${res.status}`));
                    }
                } catch (pinErr) {
                    console.error("Auto-send PIN failed:", pinErr);
                }
            }
            setModalOpen(false);
        } catch (e) {
            onError(e);
        }
    };

    const handleDelete = async () => {
        if (!confirmDel) return;
        try {
            await del.mutateAsync(confirmDel.id);
            onSuccess(t("messages.employeeDeleted"));
            setConfirmDel(null);
        } catch (e) {
            onError(e);
        }
    };

    const handlePrintReport = () => {
        const count = (s: EmployeeStatus) => employees.filter((e) => e.statut === s).length;
        const payroll = employees
            .filter((e) => e.statut === "actif")
            .reduce((sum, e) => sum + (e.salaire_base || 0), 0);
        const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "long" });
        const fmtDate = (d?: string | null) => {
            if (!d) return "—";
            const parsed = new Date(d);
            return isNaN(parsed.getTime()) ? d : dateFmt.format(parsed);
        };
        const generatedOn = t("employees.report.generatedOn", {
            date: new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date()),
        });

        printEmployeesReport({
            docTitle: t("employees.report.docTitle"),
            subtitle: t("employees.report.subtitle", { count: employees.length }),
            summaryTitle: t("employees.report.summaryTitle"),
            summary: [
                { label: t("employees.report.summary.total"), value: String(employees.length) },
                { label: t("status.actif"), value: String(count("actif")) },
                { label: t("status.suspendu"), value: String(count("suspendu")) },
                { label: t("status.inactif"), value: String(count("inactif")) },
                { label: t("employees.report.summary.payroll"), value: fmtMoney(payroll) },
            ],
            tableTitle: t("employees.report.tableTitle"),
            columns: [
                { key: "matricule", label: t("employees.col.matricule") },
                { key: "name", label: t("employees.col.name") },
                { key: "position", label: t("employees.col.position") },
                { key: "department", label: t("employees.col.department") },
                { key: "hiredAt", label: t("employees.col.hiredAt") },
                { key: "salary", label: t("employees.col.salary"), align: "right" },
                { key: "status", label: t("employees.col.status") },
            ],
            rows: employees.map((e) => ({
                cells: [
                    e.matricule ?? "—",
                    `${e.prenom} ${e.nom}`,
                    e.poste,
                    e.departement ?? "—",
                    fmtDate(e.date_embauche),
                    fmtMoney(e.salaire_base),
                    t(`status.${e.statut}`),
                ],
            })),
            emptyLabel: t("employees.empty"),
            generatedOn,
        });
    };

    return (
        <Card className="joda-surface border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        {t("employees.title")}
                    </CardTitle>
                    <CardDescription>{t("employees.description")}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={handlePrintReport}
                        disabled={employees.length === 0}
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        {t("employees.report.print")}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => copyToClipboard(publicLink, t("employees.publicLinkCopied"))}
                        disabled={!publicLink}
                        title={publicLink}
                    >
                        <Link2 className="w-4 h-4 mr-2" />
                        {t("employees.copyPublicLink")}
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("employees.add")}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("employees.col.name")}</TableHead>
                            <TableHead>{t("employees.col.matricule")}</TableHead>
                            <TableHead>{t("employees.col.position")}</TableHead>
                            <TableHead>{t("employees.col.department")}</TableHead>
                            <TableHead>{t("employees.col.hiredAt")}</TableHead>
                            <TableHead>{t("employees.col.salary")}</TableHead>
                            <TableHead>{t("employees.col.pin")}</TableHead>
                            <TableHead>{t("employees.col.status")}</TableHead>
                            <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <LoadingRow cols={9} />
                        ) : employees.length === 0 ? (
                            <EmptyRow cols={9} label={t("employees.empty")} />
                        ) : (
                            employees.map((e) => (
                                <TableRow key={e.id}>
                                    <TableCell className="font-medium">
                                        {e.prenom} {e.nom}
                                    </TableCell>
                                    <TableCell>{e.matricule ?? "—"}</TableCell>
                                    <TableCell>{e.poste}</TableCell>
                                    <TableCell>{e.departement ?? "—"}</TableCell>
                                    <TableCell>{e.date_embauche}</TableCell>
                                    <TableCell>{fmtMoney(e.salaire_base)}</TableCell>
                                    <TableCell>
                                        <div
                                            className="flex items-center gap-1"
                                            title={pinByEmployee[e.id] ? undefined : t("employees.pinHiddenHint")}
                                        >
                                            <code className="font-mono text-sm">{displayedPin(e)}</code>
                                            {pinByEmployee[e.id] && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0"
                                                    title={t("employees.copyPin")}
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            pinByEmployee[e.id]!,
                                                            t("employees.pinCopied")
                                                        )
                                                    }
                                                >
                                                    <Copy className="w-3 h-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={e.statut} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            <DropdownMenu
                                                actions={[
                                                    {
                                                        label: t("employees.viewDetail"),
                                                        icon: <User className="w-4 h-4" />,
                                                        onClick: () => onView(e),
                                                    },
                                                    {
                                                        label: t("employees.regeneratePin"),
                                                        icon: regeneratingId === e.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <KeyRound className="w-4 h-4" />
                                                        ),
                                                        onClick: () => handleRegeneratePin(e),
                                                        disabled: regeneratingId === e.id,
                                                    },
                                                    {
                                                        label: t("employees.editTitle"),
                                                        icon: <Pencil className="w-4 h-4" />,
                                                        onClick: () => openEdit(e),
                                                    },
                                                    {
                                                        label: t("employees.confirmDeleteTitle"),
                                                        icon: <Trash2 className="w-4 h-4" />,
                                                        onClick: () => setConfirmDel(e),
                                                        variant: "danger",
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? t("employees.editTitle") : t("employees.addTitle")}
                size="lg"
            >
                <EmployeeWizard
                    form={form}
                    setForm={setForm}
                    step={step}
                    setStep={setStep}
                    employees={employees}
                    editingId={editing?.id ?? null}
                    onCancel={() => setModalOpen(false)}
                    onSubmit={handleSubmit}
                    isPending={create.isPending || update.isPending}
                    editing={!!editing}
                />
            </Modal>

            <ConfirmDialog
                isOpen={!!confirmDel}
                onClose={() => setConfirmDel(null)}
                onConfirm={handleDelete}
                title={t("employees.confirmDeleteTitle")}
                description={
                    confirmDel
                        ? t("employees.confirmDeleteDesc", { name: `${confirmDel.prenom} ${confirmDel.nom}` })
                        : ""
                }
                isLoading={del.isPending}
            />
        </Card>
    );
}

// ─── Employee wizard (multi-step form) ─────────────────────────────────────
const WIZARD_STEPS = ["identity", "civil", "address", "emergency", "contract"] as const;
type WizardStepKey = (typeof WIZARD_STEPS)[number];

const SEXE_OPTIONS = ["M", "F", "autre"] as const;
const SITUATION_OPTIONS = [
    "celibataire",
    "marie",
    "divorce",
    "veuf",
    "union_libre",
] as const;
const PIECE_OPTIONS = ["cni", "passeport", "permis", "recepisse", "autre"] as const;
const CONTRAT_OPTIONS = [
    "cdi",
    "cdd",
    "stage",
    "consultant",
    "interim",
    "temps_partiel",
] as const;
const HORAIRE_OPTIONS = ["temps_plein", "temps_partiel", "flexible", "poste"] as const;
const LANGUE_OPTIONS = [
    "francais",
    "anglais",
    "chinois",
    "espagnol",
    "arabe",
    "autre",
] as const;

function EmployeeWizard({
    form,
    setForm,
    step,
    setStep,
    employees,
    editingId,
    onCancel,
    onSubmit,
    isPending,
    editing,
}: {
    form: EmployeeFormState;
    setForm: React.Dispatch<React.SetStateAction<EmployeeFormState>>;
    step: number;
    setStep: React.Dispatch<React.SetStateAction<number>>;
    employees: Employee[];
    editingId: string | null;
    onCancel: () => void;
    onSubmit: () => Promise<void>;
    isPending: boolean;
    editing: boolean;
}) {
    const t = useTranslations("hrManagement");

    const supervisorOptions = useMemo(
        () => employees.filter((e) => e.id !== editingId),
        [employees, editingId]
    );

    const stepValid = (i: number): string | null => {
        if (i === 0) {
            if (!form.prenom.trim()) return t("employees.form.firstname");
            if (!form.nom.trim()) return t("employees.form.lastname");
            if (!form.poste.trim()) return t("employees.col.position");
        }
        if (i === 4) {
            if (!form.date_embauche) return t("employees.col.hiredAt");
            if (!form.salaire_base) return t("employees.col.salary");
            if (form.type_contrat === "cdd" && !form.date_fin_contrat) {
                return t("employees.form.endDate");
            }
        }
        return null;
    };

    const next = () => {
        const missing = stepValid(step);
        if (missing) return;
        setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
    };
    const prev = () => setStep((s) => Math.max(s - 1, 0));

    const isLast = step === WIZARD_STEPS.length - 1;

    return (
        <div className="space-y-5">
            <Stepper step={step} setStep={setStep} stepValid={stepValid} />

            {step === 0 && <StepIdentity form={form} setForm={setForm} />}
            {step === 1 && <StepCivil form={form} setForm={setForm} />}
            {step === 2 && <StepAddress form={form} setForm={setForm} />}
            {step === 3 && <StepEmergency form={form} setForm={setForm} />}
            {step === 4 && (
                <StepContract form={form} setForm={setForm} supervisorOptions={supervisorOptions} />
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button variant="ghost" onClick={onCancel} disabled={isPending}>
                    {t("common.cancel")}
                </Button>
                <div className="flex gap-2">
                    {step > 0 && (
                        <Button variant="outline" onClick={prev} disabled={isPending}>
                            {t("employees.wizard.previous")}
                        </Button>
                    )}
                    {!isLast && (
                        <Button onClick={next} disabled={!!stepValid(step)}>
                            {t("employees.wizard.next")}
                        </Button>
                    )}
                    {isLast && (
                        <Button onClick={onSubmit} disabled={isPending || !!stepValid(step)}>
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editing ? t("common.save") : t("common.create")}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Stepper({
    step,
    setStep,
    stepValid,
}: {
    step: number;
    setStep: React.Dispatch<React.SetStateAction<number>>;
    stepValid: (i: number) => string | null;
}) {
    const t = useTranslations("hrManagement");
    return (
        <div className="flex flex-wrap items-center gap-1 text-xs">
            {WIZARD_STEPS.map((key, i) => {
                const done = i < step;
                const active = i === step;
                const goable = i <= step || (i === step + 1 && !stepValid(step));
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => goable && setStep(i)}
                        disabled={!goable}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition ${
                            active
                                ? "bg-rose-600 text-white"
                                : done
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        } ${goable ? "cursor-pointer hover:opacity-90" : "cursor-not-allowed opacity-70"}`}
                    >
                        <span className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-white/30 text-[10px] font-semibold">
                            {done ? <Check className="w-3 h-3" /> : i + 1}
                        </span>
                        <span className="hidden sm:inline">{t(`employees.wizard.steps.${key}`)}</span>
                    </button>
                );
            })}
        </div>
    );
}

function StepIdentity({
    form,
    setForm,
}: {
    form: EmployeeFormState;
    setForm: React.Dispatch<React.SetStateAction<EmployeeFormState>>;
}) {
    const t = useTranslations("hrManagement");
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={t("employees.col.matricule")}>
                <Input
                    value={form.matricule}
                    readOnly
                    className="bg-slate-100 dark:bg-slate-800 cursor-not-allowed"
                    title={t("employees.matriculeAutoHint")}
                />
            </Field>
            <Field label={t("employees.col.status")}>
                <Select
                    value={form.statut}
                    onValueChange={(v) =>
                        setForm((f) => ({ ...f, statut: (v as EmployeeStatus) ?? "actif" }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {EMPLOYEE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`employees.status.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t("employees.form.firstname")} required>
                <Input
                    value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.lastname")} required>
                <Input
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.col.position")} required>
                <Input
                    value={form.poste}
                    onChange={(e) => setForm((f) => ({ ...f, poste: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.col.department")}>
                <Input
                    value={form.departement}
                    onChange={(e) => setForm((f) => ({ ...f, departement: e.target.value }))}
                />
            </Field>
        </div>
    );
}

function StepCivil({
    form,
    setForm,
}: {
    form: EmployeeFormState;
    setForm: React.Dispatch<React.SetStateAction<EmployeeFormState>>;
}) {
    const t = useTranslations("hrManagement");
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={t("employees.form.birthDate")}>
                <Input
                    type="date"
                    value={form.date_naissance}
                    onChange={(e) => setForm((f) => ({ ...f, date_naissance: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.birthPlace")}>
                <Input
                    value={form.lieu_naissance}
                    onChange={(e) => setForm((f) => ({ ...f, lieu_naissance: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.sex")}>
                <Select
                    value={form.sexe || undefined}
                    onValueChange={(v) =>
                        setForm((f) => ({ ...f, sexe: ((v as typeof f.sexe) ?? "") || "" }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t("employees.form.choose")} />
                    </SelectTrigger>
                    <SelectContent>
                        {SEXE_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`employees.form.sexOptions.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t("employees.form.nationality")}>
                <Input
                    value={form.nationalite}
                    onChange={(e) => setForm((f) => ({ ...f, nationalite: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.preferredLanguage")}>
                <Select
                    value={form.langue_preferee || undefined}
                    onValueChange={(v) =>
                        setForm((f) => ({
                            ...f,
                            langue_preferee: ((v as typeof f.langue_preferee) ?? "") || "",
                        }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t("employees.form.choose")} />
                    </SelectTrigger>
                    <SelectContent>
                        {LANGUE_OPTIONS.map((l) => (
                            <SelectItem key={l} value={l}>
                                {t(`employees.form.languageOptions.${l}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t("employees.form.maritalStatus")}>
                <Select
                    value={form.situation_matrimoniale || undefined}
                    onValueChange={(v) =>
                        setForm((f) => ({
                            ...f,
                            situation_matrimoniale:
                                ((v as typeof f.situation_matrimoniale) ?? "") || "",
                        }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t("employees.form.choose")} />
                    </SelectTrigger>
                    <SelectContent>
                        {SITUATION_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                                {t(`employees.form.maritalOptions.${s}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t("employees.form.childrenCount")}>
                <Input
                    type="number"
                    min="0"
                    value={form.nombre_enfants}
                    onChange={(e) => setForm((f) => ({ ...f, nombre_enfants: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.idType")}>
                <Select
                    value={form.type_piece || undefined}
                    onValueChange={(v) =>
                        setForm((f) => ({ ...f, type_piece: ((v as typeof f.type_piece) ?? "") || "" }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t("employees.form.choose")} />
                    </SelectTrigger>
                    <SelectContent>
                        {PIECE_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>
                                {t(`employees.form.idTypeOptions.${p}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t("employees.form.idNumber")}>
                <Input
                    value={form.numero_piece}
                    onChange={(e) => setForm((f) => ({ ...f, numero_piece: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.idIssuePlace")}>
                <Input
                    value={form.lieu_emission_piece}
                    onChange={(e) => setForm((f) => ({ ...f, lieu_emission_piece: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.idExpiry")}>
                <Input
                    type="date"
                    value={form.date_expiration_piece}
                    onChange={(e) =>
                        setForm((f) => ({ ...f, date_expiration_piece: e.target.value }))
                    }
                />
            </Field>
        </div>
    );
}

function StepAddress({
    form,
    setForm,
}: {
    form: EmployeeFormState;
    setForm: React.Dispatch<React.SetStateAction<EmployeeFormState>>;
}) {
    const t = useTranslations("hrManagement");
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Email">
                <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.phone")}>
                <PhoneInput
                    id="employee-telephone"
                    countryCode={form.phoneCountryCode}
                    value={form.telephone}
                    onCountryCodeChange={(value) =>
                        setForm((f) => ({ ...f, phoneCountryCode: value }))
                    }
                    onValueChange={(value) => setForm((f) => ({ ...f, telephone: value }))}
                />
            </Field>
            <div className="md:col-span-2">
                <Field label={t("employees.form.address")}>
                    <Input
                        value={form.adresse}
                        onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
                    />
                </Field>
            </div>
            <Field label={t("employees.form.neighborhood")}>
                <Input
                    value={form.quartier}
                    onChange={(e) => setForm((f) => ({ ...f, quartier: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.city")}>
                <Input
                    value={form.ville}
                    onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.country")}>
                <Input
                    value={form.pays}
                    onChange={(e) => setForm((f) => ({ ...f, pays: e.target.value }))}
                />
            </Field>
        </div>
    );
}

function StepEmergency({
    form,
    setForm,
}: {
    form: EmployeeFormState;
    setForm: React.Dispatch<React.SetStateAction<EmployeeFormState>>;
}) {
    const t = useTranslations("hrManagement");
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={t("employees.form.emergencyName")}>
                <Input
                    value={form.urgence_nom}
                    onChange={(e) => setForm((f) => ({ ...f, urgence_nom: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.emergencyRelation")}>
                <Input
                    value={form.urgence_lien}
                    onChange={(e) => setForm((f) => ({ ...f, urgence_lien: e.target.value }))}
                    placeholder={t("employees.form.emergencyRelationHint")}
                />
            </Field>
            <Field label={t("employees.form.emergencyPhone")}>
                <PhoneInput
                    id="employee-urgence-telephone"
                    countryCode={form.urgence_phoneCountryCode}
                    value={form.urgence_telephone}
                    onCountryCodeChange={(value) =>
                        setForm((f) => ({ ...f, urgence_phoneCountryCode: value }))
                    }
                    onValueChange={(value) => setForm((f) => ({ ...f, urgence_telephone: value }))}
                />
            </Field>
            <Field label={t("employees.form.emergencyEmail")}>
                <Input
                    type="email"
                    value={form.urgence_email}
                    onChange={(e) => setForm((f) => ({ ...f, urgence_email: e.target.value }))}
                />
            </Field>
        </div>
    );
}

function StepContract({
    form,
    setForm,
    supervisorOptions,
}: {
    form: EmployeeFormState;
    setForm: React.Dispatch<React.SetStateAction<EmployeeFormState>>;
    supervisorOptions: Employee[];
}) {
    const t = useTranslations("hrManagement");
    const isCdd = form.type_contrat === "cdd";
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label={t("employees.form.contractType")}>
                <Select
                    value={form.type_contrat || undefined}
                    onValueChange={(v) =>
                        setForm((f) => ({
                            ...f,
                            type_contrat: ((v as typeof f.type_contrat) ?? "") || "",
                        }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t("employees.form.choose")} />
                    </SelectTrigger>
                    <SelectContent>
                        {CONTRAT_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                                {t(`employees.form.contractOptions.${c}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t("employees.form.scheduleType")}>
                <Select
                    value={form.type_horaire || undefined}
                    onValueChange={(v) =>
                        setForm((f) => ({
                            ...f,
                            type_horaire: ((v as typeof f.type_horaire) ?? "") || "",
                        }))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t("employees.form.choose")} />
                    </SelectTrigger>
                    <SelectContent>
                        {HORAIRE_OPTIONS.map((h) => (
                            <SelectItem key={h} value={h}>
                                {t(`employees.form.scheduleOptions.${h}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t("employees.col.hiredAt")} required>
                <Input
                    type="date"
                    value={form.date_embauche}
                    onChange={(e) => setForm((f) => ({ ...f, date_embauche: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.endDate")} required={isCdd}>
                <Input
                    type="date"
                    value={form.date_fin_contrat}
                    onChange={(e) => setForm((f) => ({ ...f, date_fin_contrat: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.probationMonths")}>
                <Input
                    type="number"
                    min="0"
                    value={form.periode_essai_mois}
                    onChange={(e) => setForm((f) => ({ ...f, periode_essai_mois: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.supervisor")}>
                <Select
                    value={form.superieur_id || undefined}
                    onValueChange={(v) => setForm((f) => ({ ...f, superieur_id: v ?? "" }))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t("employees.form.choose")} />
                    </SelectTrigger>
                    <SelectContent>
                        {supervisorOptions.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                                {e.prenom} {e.nom}
                                {e.poste ? ` — ${e.poste}` : ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
            <Field label={t("employees.col.salary") + " (FCFA)"} required>
                <Input
                    type="number"
                    min="0"
                    value={form.salaire_base}
                    onChange={(e) => setForm((f) => ({ ...f, salaire_base: e.target.value }))}
                />
            </Field>
            <Field label={t("employees.form.cnps")}>
                <Input
                    value={form.numero_cnps}
                    onChange={(e) => setForm((f) => ({ ...f, numero_cnps: e.target.value }))}
                    placeholder={t("employees.form.cnpsPlaceholder")}
                />
            </Field>
            <Field label={t("employees.form.bankAccount")}>
                <Input
                    value={form.numero_compte_bancaire}
                    onChange={(e) => setForm((f) => ({ ...f, numero_compte_bancaire: e.target.value }))}
                    placeholder={t("employees.form.bankAccountPlaceholder")}
                />
            </Field>
            <div className="md:col-span-2">
                <Field label={t("employees.form.notes")}>
                    <Input
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    />
                </Field>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
    const t = useTranslations("hrManagement");
    const map: Record<EmployeeStatus, string> = {
        actif: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        suspendu: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        inactif: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    };
    return <Badge className={map[status]}>{t(`employees.status.${status}`)}</Badge>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <Label>
                {label} {required && <span className="text-rose-500">*</span>}
            </Label>
            {children}
        </div>
    );
}

// ─── Leaves panel ──────────────────────────────────────────────────────────
function LeavesPanel({
    employees,
    leaves,
    loading,
    employeeLabel,
    reviewerId,
    onError,
    onSuccess,
}: {
    employees: Employee[];
    leaves: LeaveRequest[];
    loading: boolean;
    employeeLabel: (id: string) => string;
    reviewerId: string;
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const create = useCreateLeaveRequest();
    const review = useReviewLeaveRequest();
    const del = useDeleteLeaveRequest();
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmDel, setConfirmDel] = useState<LeaveRequest | null>(null);
    const [form, setForm] = useState({
        employee_id: "",
        type: "annuel" as LeaveType,
        date_debut: new Date().toISOString().slice(0, 10),
        date_fin: new Date().toISOString().slice(0, 10),
        motif: "",
    });

    const openCreate = () => {
        setForm({
            employee_id: employees[0]?.id ?? "",
            type: "annuel",
            date_debut: new Date().toISOString().slice(0, 10),
            date_fin: new Date().toISOString().slice(0, 10),
            motif: "",
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.employee_id) {
            onError(new Error(t("leaves.selectEmployee")));
            return;
        }
        try {
            await create.mutateAsync({
                employee_id: form.employee_id,
                type: form.type,
                date_debut: form.date_debut,
                date_fin: form.date_fin,
                nb_jours: diffDays(form.date_debut, form.date_fin),
                motif: form.motif.trim() || null,
            });
            onSuccess(t("messages.leaveCreated"));
            setModalOpen(false);
        } catch (e) {
            onError(e);
        }
    };

    const handleReview = async (id: string, statut: "approuve" | "rejete") => {
        try {
            await review.mutateAsync({
                id,
                reviewerId,
                data: { statut, reviewer_comment: null },
            });
            onSuccess(statut === "approuve" ? t("messages.leaveApproved") : t("messages.leaveRejected"));
        } catch (e) {
            onError(e);
        }
    };

    const handleDelete = async () => {
        if (!confirmDel) return;
        try {
            await del.mutateAsync(confirmDel.id);
            onSuccess(t("messages.leaveDeleted"));
            setConfirmDel(null);
        } catch (e) {
            onError(e);
        }
    };

    return (
        <Card className="joda-surface border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" />
                        {t("leaves.title")}
                    </CardTitle>
                    <CardDescription>{t("leaves.description")}</CardDescription>
                </div>
                <Button onClick={openCreate} disabled={employees.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("leaves.add")}
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("leaves.col.employee")}</TableHead>
                            <TableHead>{t("leaves.col.type")}</TableHead>
                            <TableHead>{t("leaves.col.period")}</TableHead>
                            <TableHead>{t("leaves.col.days")}</TableHead>
                            <TableHead>{t("leaves.col.status")}</TableHead>
                            <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <LoadingRow cols={6} />
                        ) : leaves.length === 0 ? (
                            <EmptyRow cols={6} label={t("leaves.empty")} />
                        ) : (
                            leaves.map((l) => (
                                <TableRow key={l.id}>
                                    <TableCell>{employeeLabel(l.employee_id)}</TableCell>
                                    <TableCell>{t(`leaves.type.${l.type}`)}</TableCell>
                                    <TableCell>
                                        {l.date_debut} → {l.date_fin}
                                    </TableCell>
                                    <TableCell>{l.nb_jours}</TableCell>
                                    <TableCell>
                                        <LeaveStatusBadge status={l.statut} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            <DropdownMenu
                                                actions={[
                                                    ...(l.statut === "en_attente"
                                                        ? [
                                                              {
                                                                  label: t("leaves.approve"),
                                                                  icon: <Check className="w-4 h-4" />,
                                                                  onClick: () => handleReview(l.id, "approuve"),
                                                              },
                                                              {
                                                                  label: t("leaves.reject"),
                                                                  icon: <XIcon className="w-4 h-4" />,
                                                                  onClick: () => handleReview(l.id, "rejete"),
                                                              },
                                                          ]
                                                        : []),
                                                    {
                                                        label: t("leaves.confirmDeleteTitle"),
                                                        icon: <Trash2 className="w-4 h-4" />,
                                                        onClick: () => setConfirmDel(l),
                                                        variant: "danger" as const,
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t("leaves.addTitle")} size="md">
                <div className="space-y-3">
                    <Field label={t("leaves.col.employee")} required>
                        <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v || "" })}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("leaves.selectEmployee")}>
                                    {(value: string) => {
                                        const e = employees.find((x) => x.id === value);
                                        return e ? `${e.prenom} ${e.nom}` : t("leaves.selectEmployee");
                                    }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.prenom} {e.nom}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label={t("leaves.col.type")} required>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LeaveType })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LEAVE_TYPES.map((tp) => (
                                    <SelectItem key={tp} value={tp}>
                                        {t(`leaves.type.${tp}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t("leaves.col.from")} required>
                            <Input
                                type="date"
                                value={form.date_debut}
                                onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                            />
                        </Field>
                        <Field label={t("leaves.col.to")} required>
                            <Input
                                type="date"
                                value={form.date_fin}
                                onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                            />
                        </Field>
                    </div>
                    <p className="text-xs text-slate-500">
                        {t("leaves.computedDays", { n: diffDays(form.date_debut, form.date_fin) })}
                    </p>
                    <Field label={t("leaves.form.reason")}>
                        <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} />
                    </Field>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={create.isPending}>
                        {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t("common.create")}
                    </Button>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={!!confirmDel}
                onClose={() => setConfirmDel(null)}
                onConfirm={handleDelete}
                title={t("leaves.confirmDeleteTitle")}
                description={t("leaves.confirmDeleteDesc")}
                isLoading={del.isPending}
            />
        </Card>
    );
}

function LeaveStatusBadge({ status }: { status: LeaveRequest["statut"] }) {
    const t = useTranslations("hrManagement");
    const map = {
        en_attente: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        approuve: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        rejete: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    } as const;
    return <Badge className={map[status]}>{t(`leaves.status.${status}`)}</Badge>;
}

// ─── Payroll panel ─────────────────────────────────────────────────────────
function PayrollPanel({
    employees,
    payslips,
    loading,
    employeesById,
    creatorId,
    onError,
    onSuccess,
}: {
    employees: Employee[];
    payslips: Payslip[];
    loading: boolean;
    employeesById: Map<string, Employee>;
    creatorId: string;
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const create = useCreatePayslip();
    const del = useDeletePayslip();
    const generate = useGenerateDuePayslips();
    const now = new Date();
    const [modalOpen, setModalOpen] = useState(false);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [genMode, setGenMode] = useState<"auto" | "target">("auto");
    const [genYear, setGenYear] = useState<number>(now.getFullYear());
    const [genMonth, setGenMonth] = useState<number>(now.getMonth() + 1);
    const [confirmDel, setConfirmDel] = useState<Payslip | null>(null);
    const [form, setForm] = useState({
        employee_id: "",
        mois: now.getMonth() + 1,
        annee: now.getFullYear(),
        salaire_base: "0",
        adjustments: [] as PayslipAdjustment[],
        jours_absences: "0",
        notes: "",
    });

    // Totaux dérivés des lignes de primes/retenues saisies.
    const primesTotal = useMemo(
        () => form.adjustments.filter((a) => a.type === "bonus").reduce((s, a) => s + (a.montant || 0), 0),
        [form.adjustments]
    );
    const deductionsTotal = useMemo(
        () => form.adjustments.filter((a) => a.type === "deduction").reduce((s, a) => s + (a.montant || 0), 0),
        [form.adjustments]
    );

    const payroll = useMemo(() => computeCameroonPayroll({
        salaireBase: parseInt(form.salaire_base || "0", 10) || 0,
        primes: primesTotal,
        joursAbsences: parseInt(form.jours_absences || "0", 10) || 0,
        autresRetenues: deductionsTotal,
    }), [form.salaire_base, form.jours_absences, primesTotal, deductionsTotal]);
    const net = payroll.netAPayer;

    const addAdjustment = (type: PayslipAdjustment["type"]) =>
        setForm((f) => ({ ...f, adjustments: [...f.adjustments, { type, motif: "", montant: 0 }] }));
    const updateAdjustment = (index: number, patch: Partial<PayslipAdjustment>) =>
        setForm((f) => ({
            ...f,
            adjustments: f.adjustments.map((a, i) => (i === index ? { ...a, ...patch } : a)),
        }));
    const removeAdjustment = (index: number) =>
        setForm((f) => ({ ...f, adjustments: f.adjustments.filter((_, i) => i !== index) }));

    const openCreate = () => {
        const first = employees[0];
        setForm({
            employee_id: first?.id ?? "",
            mois: now.getMonth() + 1,
            annee: now.getFullYear(),
            salaire_base: String(first?.salaire_base ?? 0),
            adjustments: [],
            jours_absences: "0",
            notes: "",
        });
        setModalOpen(true);
    };

    const handleEmployeeChange = (id: string) => {
        const emp = employeesById.get(id);
        setForm((f) => ({ ...f, employee_id: id, salaire_base: String(emp?.salaire_base ?? f.salaire_base) }));
    };

    const handleSubmit = async () => {
        if (!form.employee_id) {
            onError(new Error(t("leaves.selectEmployee")));
            return;
        }
        try {
            const created = await create.mutateAsync({
                employee_id: form.employee_id,
                mois: form.mois,
                annee: form.annee,
                salaire_base: parseInt(form.salaire_base || "0", 10) || 0,
                primes: primesTotal,
                deductions: deductionsTotal,
                adjustments: form.adjustments
                    .filter((a) => (a.montant || 0) > 0)
                    .map((a) => ({ type: a.type, motif: a.motif.trim(), montant: a.montant })),
                jours_absences: parseInt(form.jours_absences || "0", 10) || 0,
                net_a_payer: net,
                notes: form.notes.trim() || null,
                created_by: creatorId || null,
                auto_generated: false,
            });
            onSuccess(t("messages.payslipCreated"));
            setModalOpen(false);

            // Envoi automatique du bulletin par e-mail à l'employé (best-effort).
            const r = await sendPayslipByEmail(created, employeesById.get(created.employee_id)).catch(
                (e): { ok: boolean; skipped?: boolean; error?: string } => ({ ok: false, error: String(e) })
            );
            if (r.ok) onSuccess(t("payroll.email.sentAuto"));
            else if (!r.skipped) onError(new Error(r.error || t("payroll.email.error")));
        } catch (e) {
            onError(e);
        }
    };

    // Génère le PDF côté client et l'envoie en pièce jointe à l'employé via l'API.
    const sendPayslipByEmail = async (
        p: Payslip,
        emp: Employee | undefined
    ): Promise<{ ok: boolean; skipped?: boolean; error?: string }> => {
        if (!emp) return { ok: false, error: "employee not found" };
        if (!emp.email) return { ok: false, skipped: true };
        const { generatePayslip } = await import("../lib/pdfGenerator");
        const pdfBase64 = (await generatePayslip(p, emp, { output: "base64" })) as string;
        const res = await fetch("/api/hr/send-payslip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: emp.email,
                employeeName: `${emp.prenom} ${emp.nom}`.trim(),
                mois: p.mois,
                annee: p.annee,
                reference: payslipReference(p),
                netAPayer: p.net_a_payer,
                pdfBase64,
                langue: emp.langue_preferee ?? null,
            }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data?.error || "send failed" };
        return { ok: true };
    };

    const handleEmailPayslip = async (p: Payslip) => {
        const emp = employeesById.get(p.employee_id);
        try {
            const r = await sendPayslipByEmail(p, emp);
            if (r.skipped) return onError(new Error(t("payroll.email.noEmail")));
            if (!r.ok) return onError(new Error(r.error || t("payroll.email.error")));
            onSuccess(t("payroll.email.sent"));
        } catch (e) {
            onError(e);
        }
    };

    const handleDelete = async () => {
        if (!confirmDel) return;
        try {
            await del.mutateAsync(confirmDel.id);
            onSuccess(t("messages.payslipDeleted"));
            setConfirmDel(null);
        } catch (e) {
            onError(e);
        }
    };

    const handleExportPdf = async (p: Payslip) => {
        const emp = employeesById.get(p.employee_id);
        if (!emp) return;
        try {
            const { generatePayslip } = await import("../lib/pdfGenerator");
            await generatePayslip(p, emp);
        } catch (e) {
            onError(e);
        }
    };

    return (
        <Card className="joda-surface border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5" />
                        {t("payroll.title")}
                    </CardTitle>
                    <CardDescription>{t("payroll.description")}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setGenMode("auto");
                            setGenYear(now.getFullYear());
                            setGenMonth(now.getMonth() + 1);
                            setGenerateOpen(true);
                        }}
                        disabled={generate.isPending}
                        title={t("payroll.generateHint")}
                    >
                        {generate.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4 mr-2" />
                        )}
                        {t("payroll.generate")}
                    </Button>
                    <Button onClick={openCreate} disabled={employees.length === 0}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("payroll.add")}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("payroll.col.reference")}</TableHead>
                            <TableHead>{t("leaves.col.employee")}</TableHead>
                            <TableHead>{t("payroll.col.period")}</TableHead>
                            <TableHead>{t("payroll.col.base")}</TableHead>
                            <TableHead>{t("payroll.col.bonus")}</TableHead>
                            <TableHead>{t("payroll.col.deductions")}</TableHead>
                            <TableHead>{t("payroll.col.absences")}</TableHead>
                            <TableHead>{t("payroll.col.net")}</TableHead>
                            <TableHead>{t("detail.paymentDate")}</TableHead>
                            <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <LoadingRow cols={10} />
                        ) : payslips.length === 0 ? (
                            <EmptyRow cols={10} label={t("payroll.empty")} />
                        ) : (
                            payslips.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-mono text-xs text-gray-600">{payslipReference(p)}</TableCell>
                                    <TableCell>{employeesById.get(p.employee_id)?.prenom} {employeesById.get(p.employee_id)?.nom ?? "—"}</TableCell>
                                    <TableCell>
                                        {monthLabel(p.mois)} {p.annee}
                                    </TableCell>
                                    <TableCell>{fmtMoney(p.salaire_base)}</TableCell>
                                    <TableCell>{fmtMoney(p.primes)}</TableCell>
                                    <TableCell>{fmtMoney(p.deductions)}</TableCell>
                                    <TableCell>{p.jours_absences}</TableCell>
                                    <TableCell className="font-semibold">{fmtMoney(p.net_a_payer)}</TableCell>
                                    <TableCell>
                                        {p.payment_date ?? "—"}
                                        {p.auto_generated && (
                                            <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs">{t("detail.auto")}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end">
                                            <DropdownMenu
                                                actions={[
                                                    {
                                                        label: t("payroll.exportPdf"),
                                                        icon: <Receipt className="w-4 h-4" />,
                                                        onClick: () => handleExportPdf(p),
                                                    },
                                                    {
                                                        label: t("payroll.email.action"),
                                                        icon: <Mail className="w-4 h-4" />,
                                                        onClick: () => handleEmailPayslip(p),
                                                    },
                                                    {
                                                        label: t("payroll.confirmDeleteTitle"),
                                                        icon: <Trash2 className="w-4 h-4" />,
                                                        onClick: () => setConfirmDel(p),
                                                        variant: "danger" as const,
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t("payroll.addTitle")} size="lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label={t("leaves.col.employee")} required>
                        <Select value={form.employee_id} onValueChange={(v) => v && handleEmployeeChange(v)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("leaves.selectEmployee")}>
                                    {(value: string) => {
                                        const e = employeesById.get(value);
                                        return e ? `${e.prenom} ${e.nom}` : t("leaves.selectEmployee");
                                    }}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map((e) => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.prenom} {e.nom}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t("payroll.col.month")} required>
                            <Input
                                type="number"
                                min="1"
                                max="12"
                                value={form.mois}
                                onChange={(e) => setForm({ ...form, mois: parseInt(e.target.value, 10) || 1 })}
                            />
                        </Field>
                        <Field label={t("payroll.col.year")} required>
                            <Input
                                type="number"
                                min="2020"
                                max="2100"
                                value={form.annee}
                                onChange={(e) => setForm({ ...form, annee: parseInt(e.target.value, 10) || now.getFullYear() })}
                            />
                        </Field>
                    </div>
                    <Field label={t("payroll.col.base") + " (FCFA)"} required>
                        <Input
                            type="number"
                            min="0"
                            value={form.salaire_base}
                            onChange={(e) => setForm({ ...form, salaire_base: e.target.value })}
                        />
                    </Field>
                    <Field label={t("payroll.col.absences")}>
                        <Input
                            type="number"
                            min="0"
                            value={form.jours_absences}
                            onChange={(e) => setForm({ ...form, jours_absences: e.target.value })}
                        />
                    </Field>
                    <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                            <Label>{t("payroll.adjustments.title")}</Label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addAdjustment("bonus")}>
                                <Plus className="w-4 h-4 mr-1" />
                                {t("payroll.adjustments.add")}
                            </Button>
                        </div>
                        {form.adjustments.length === 0 ? (
                            <p className="text-sm text-slate-400 dark:text-slate-500 py-1">
                                {t("payroll.adjustments.empty")}
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {form.adjustments.map((a, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 p-2"
                                    >
                                        <div className="inline-flex overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => updateAdjustment(i, { type: "bonus" })}
                                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                                    a.type === "bonus"
                                                        ? "bg-emerald-600 text-white"
                                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                }`}
                                            >
                                                {t("payroll.adjustments.bonus")}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateAdjustment(i, { type: "deduction" })}
                                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                                    a.type === "deduction"
                                                        ? "bg-rose-600 text-white"
                                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                }`}
                                            >
                                                {t("payroll.adjustments.deduction")}
                                            </button>
                                        </div>
                                        <Input
                                            type="number"
                                            min="0"
                                            className="w-32"
                                            placeholder={t("payroll.adjustments.amount")}
                                            value={a.montant === 0 ? "" : String(a.montant)}
                                            onChange={(e) =>
                                                updateAdjustment(i, { montant: parseInt(e.target.value || "0", 10) || 0 })
                                            }
                                        />
                                        <Input
                                            className="flex-1 min-w-[160px]"
                                            placeholder={t("payroll.adjustments.motifPlaceholder")}
                                            value={a.motif}
                                            onChange={(e) => updateAdjustment(i, { motif: e.target.value })}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeAdjustment(i)}
                                            aria-label={t("common.cancel")}
                                        >
                                            <Trash2 className="w-4 h-4 text-rose-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        <Field label={t("employees.form.notes")}>
                            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </Field>
                    </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">{t("payroll.col.base")}</span>
                        <span className="font-medium">{fmtMoney(parseInt(form.salaire_base || "0", 10) || 0)}</span>
                    </div>
                    {primesTotal > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span>{t("payroll.col.bonus")}</span><span>+ {fmtMoney(primesTotal)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-300">{t("payroll.breakdown.brut")}</span>
                        <span className="font-medium">{fmtMoney(payroll.brut)}</span>
                    </div>
                    {payroll.absenceDeduction > 0 && (
                        <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>{t("payroll.col.absences")}</span><span>- {fmtMoney(payroll.absenceDeduction)}</span>
                        </div>
                    )}
                    {payroll.autresRetenues > 0 && (
                        <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>{t("payroll.col.deductions")}</span><span>- {fmtMoney(payroll.autresRetenues)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-300">{t("payroll.computedNet")}</span>
                        <span className="text-lg font-semibold">{fmtMoney(net)}</span>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={create.isPending}>
                        {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t("common.create")}
                    </Button>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={!!confirmDel}
                onClose={() => setConfirmDel(null)}
                onConfirm={handleDelete}
                title={t("payroll.confirmDeleteTitle")}
                description={t("payroll.confirmDeleteDesc")}
                isLoading={del.isPending}
            />

            <Modal
                isOpen={generateOpen}
                onClose={() => setGenerateOpen(false)}
                title={t("payroll.generateTitle")}
                description={t("payroll.generateDesc")}
                size="md"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <input
                                type="radio"
                                name="gen-mode"
                                checked={genMode === "auto"}
                                onChange={() => setGenMode("auto")}
                                className="mt-1"
                            />
                            <div className="text-sm">
                                <div className="font-semibold">{t("payroll.modeAuto")}</div>
                                <div className="text-slate-500 dark:text-slate-400">
                                    {t("payroll.modeAutoHint")}
                                </div>
                            </div>
                        </label>
                        <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <input
                                type="radio"
                                name="gen-mode"
                                checked={genMode === "target"}
                                onChange={() => setGenMode("target")}
                                className="mt-1"
                            />
                            <div className="text-sm flex-1">
                                <div className="font-semibold">{t("payroll.modeTarget")}</div>
                                <div className="text-slate-500 dark:text-slate-400">
                                    {t("payroll.modeTargetHint")}
                                </div>
                            </div>
                        </label>
                    </div>

                    {genMode === "target" && (
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={t("payroll.col.month")} required>
                                <Input
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={genMonth}
                                    onChange={(e) =>
                                        setGenMonth(Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 1)))
                                    }
                                />
                            </Field>
                            <Field label={t("payroll.col.year")} required>
                                <Input
                                    type="number"
                                    min="2020"
                                    max="2100"
                                    value={genYear}
                                    onChange={(e) =>
                                        setGenYear(parseInt(e.target.value, 10) || now.getFullYear())
                                    }
                                />
                            </Field>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setGenerateOpen(false)} disabled={generate.isPending}>
                        {t("common.cancel")}
                    </Button>
                    <Button
                        onClick={async () => {
                            try {
                                const res = await generate.mutateAsync(
                                    genMode === "target"
                                        ? { year: genYear, month: genMonth }
                                        : undefined
                                );
                                onSuccess(t("payroll.generated", { n: res.generated.length }));
                                setGenerateOpen(false);
                            } catch (e) {
                                onError(e);
                            }
                        }}
                        disabled={generate.isPending}
                    >
                        {generate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t("payroll.generate")}
                    </Button>
                </div>
            </Modal>
        </Card>
    );
}

// ─── Reports panel ─────────────────────────────────────────────────────────
function ReportsPanel({
    employees,
    reports,
    loading,
    employeeLabel,
    creatorId,
    onError,
    onSuccess,
}: {
    employees: Employee[];
    reports: DailyReport[];
    loading: boolean;
    employeeLabel: (id: string) => string;
    creatorId: string;
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const create = useCreateDailyReport();
    const del = useDeleteDailyReport();
    const [filterEmp, setFilterEmp] = useState<string>("all");
    const [filterDept, setFilterDept] = useState<string>("all");
    const [filterCountry, setFilterCountry] = useState<string>("all");
    const [filterFrom, setFilterFrom] = useState<string>("");
    const [filterTo, setFilterTo] = useState<string>("");
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmDel, setConfirmDel] = useState<DailyReport | null>(null);
    const [viewing, setViewing] = useState<DailyReport | null>(null);
    const [form, setForm] = useState({
        employee_id: "",
        date: new Date().toISOString().slice(0, 10),
        activites: "",
        heures_travaillees: "8",
        observations: "",
    });

    const employeeById = useMemo(() => {
        const m = new Map<string, Employee>();
        for (const e of employees) m.set(e.id, e);
        return m;
    }, [employees]);

    const employeeCountryCode = useMemo(() => {
        const m = new Map<string, string>();
        for (const e of employees) {
            if (e.telephone) {
                const { countryCode } = splitPhoneNumber(e.telephone);
                if (countryCode) m.set(e.id, countryCode);
            }
        }
        return m;
    }, [employees]);

    const availableDepartments = useMemo(() => {
        const set = new Set<string>();
        for (const e of employees) {
            const d = (e.departement || "").trim();
            if (d) set.add(d);
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [employees]);

    const availableCountries = useMemo(() => {
        const codes = new Set<string>();
        for (const code of employeeCountryCode.values()) codes.add(code);
        // Map code -> first matching label
        const labelByCode = new Map<string, string>();
        for (const entry of PHONE_COUNTRY_CODES) {
            if (codes.has(entry.code) && !labelByCode.has(entry.code)) {
                labelByCode.set(entry.code, entry.country);
            }
        }
        return Array.from(codes)
            .map((code) => ({ code, country: labelByCode.get(code) || code }))
            .sort((a, b) => a.country.localeCompare(b.country));
    }, [employeeCountryCode]);

    const hasActiveFilters =
        filterEmp !== "all" ||
        filterDept !== "all" ||
        filterCountry !== "all" ||
        Boolean(filterFrom) ||
        Boolean(filterTo);

    const resetFilters = () => {
        setFilterEmp("all");
        setFilterDept("all");
        setFilterCountry("all");
        setFilterFrom("");
        setFilterTo("");
    };

    const filtered = useMemo(() => {
        return reports.filter((r) => {
            if (filterEmp !== "all" && r.employee_id !== filterEmp) return false;
            if (filterFrom && r.date < filterFrom) return false;
            if (filterTo && r.date > filterTo) return false;
            if (filterDept !== "all") {
                const emp = employeeById.get(r.employee_id);
                if (!emp || (emp.departement || "") !== filterDept) return false;
            }
            if (filterCountry !== "all") {
                const code = employeeCountryCode.get(r.employee_id);
                if (code !== filterCountry) return false;
            }
            return true;
        });
    }, [reports, filterEmp, filterDept, filterCountry, filterFrom, filterTo, employeeById, employeeCountryCode]);

    const openCreate = () => {
        setForm({
            employee_id: employees[0]?.id ?? "",
            date: new Date().toISOString().slice(0, 10),
            activites: "",
            heures_travaillees: "8",
            observations: "",
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.employee_id) {
            onError(new Error(t("leaves.selectEmployee")));
            return;
        }
        try {
            await create.mutateAsync({
                employee_id: form.employee_id,
                date: form.date,
                activites: form.activites.trim(),
                heures_travaillees: parseFloat(form.heures_travaillees || "0") || 0,
                observations: form.observations.trim() || null,
                created_by: creatorId || null,
            });
            onSuccess(t("messages.reportCreated"));
            setModalOpen(false);
        } catch (e) {
            onError(e);
        }
    };

    const handleDelete = async () => {
        if (!confirmDel) return;
        try {
            await del.mutateAsync(confirmDel.id);
            onSuccess(t("messages.reportDeleted"));
            setConfirmDel(null);
        } catch (e) {
            onError(e);
        }
    };

    return (
        <Card className="joda-surface border-0 shadow-none">
            <CardHeader className="space-y-4">
                <div className="flex flex-row items-start justify-between gap-3 flex-wrap">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="w-5 h-5" />
                            {t("reports.title")}
                        </CardTitle>
                        <CardDescription>{t("reports.description")}</CardDescription>
                    </div>
                    <Button onClick={openCreate} disabled={employees.length === 0}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("reports.add")}
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 pr-1">
                        <FilterIcon className="w-3.5 h-3.5" />
                        {hasActiveFilters && (
                            <span className="rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                                {filtered.length}/{reports.length}
                            </span>
                        )}
                    </div>

                    <Input
                        type="date"
                        value={filterFrom}
                        onChange={(e) => setFilterFrom(e.target.value)}
                        className="h-8 text-xs w-[130px]"
                        title={t("reports.filters.from")}
                    />
                    <Input
                        type="date"
                        value={filterTo}
                        onChange={(e) => setFilterTo(e.target.value)}
                        className="h-8 text-xs w-[130px]"
                        title={t("reports.filters.to")}
                    />

                    <Select value={filterDept} onValueChange={(v) => setFilterDept(v || "all")}>
                        <SelectTrigger className="h-8 text-xs w-[140px]" title={t("reports.filters.department")}>
                            <Briefcase className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                            <SelectValue>
                                {(value: string) =>
                                    value === "all" || !value
                                        ? t("reports.filters.allDepartments")
                                        : value
                                }
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("reports.filters.allDepartments")}</SelectItem>
                            {availableDepartments.length === 0 ? (
                                <SelectItem value="__none" disabled>
                                    {t("reports.filters.noDepartments")}
                                </SelectItem>
                            ) : (
                                availableDepartments.map((d) => (
                                    <SelectItem key={d} value={d}>
                                        {d}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filterCountry}
                        onValueChange={(v) => setFilterCountry(v || "all")}
                    >
                        <SelectTrigger className="h-8 text-xs w-[140px]" title={t("reports.filters.country")}>
                            <Globe className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                            <SelectValue>
                                {(value: string) => {
                                    if (value === "all" || !value)
                                        return t("reports.filters.allCountries");
                                    const c = availableCountries.find((x) => x.code === value);
                                    return c ? `${c.country} (${c.code})` : value;
                                }}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("reports.filters.allCountries")}</SelectItem>
                            {availableCountries.length === 0 ? (
                                <SelectItem value="__none" disabled>
                                    {t("reports.filters.noCountries")}
                                </SelectItem>
                            ) : (
                                availableCountries.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.country} ({c.code})
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>

                    <Select value={filterEmp} onValueChange={(v) => setFilterEmp(v || "all")}>
                        <SelectTrigger className="h-8 text-xs w-[160px]" title={t("reports.filters.employee")}>
                            <UsersIcon className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                            <SelectValue>
                                {(value: string) => {
                                    if (value === "all" || !value)
                                        return t("reports.allEmployees");
                                    const e = employees.find((x) => x.id === value);
                                    return e ? `${e.prenom} ${e.nom}` : t("reports.allEmployees");
                                }}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("reports.allEmployees")}</SelectItem>
                            {employees.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                    {e.prenom} {e.nom}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {hasActiveFilters && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={resetFilters}
                            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-700"
                            title={t("reports.filters.reset")}
                        >
                            <RotateCcw className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("reports.col.date")}</TableHead>
                            <TableHead>{t("leaves.col.employee")}</TableHead>
                            <TableHead>{t("reports.col.activities")}</TableHead>
                            <TableHead>{t("reports.col.hours")}</TableHead>
                            <TableHead>{t("reports.col.observations")}</TableHead>
                            <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <LoadingRow cols={6} />
                        ) : filtered.length === 0 ? (
                            <EmptyRow cols={6} label={t("reports.empty")} />
                        ) : (
                            filtered.map((r) => (
                                <TableRow
                                    key={r.id}
                                    onClick={() => setViewing(r)}
                                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    title={t("reports.viewHint")}
                                >
                                    <TableCell>{r.date}</TableCell>
                                    <TableCell>{employeeLabel(r.employee_id)}</TableCell>
                                    <TableCell className="max-w-md truncate">{r.activites}</TableCell>
                                    <TableCell>{r.heures_travaillees}h</TableCell>
                                    <TableCell className="max-w-xs truncate">{r.observations ?? "—"}</TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end">
                                            <DropdownMenu
                                                actions={[
                                                    {
                                                        label: t("reports.view"),
                                                        icon: <Eye className="w-4 h-4" />,
                                                        onClick: () => setViewing(r),
                                                    },
                                                    {
                                                        label: t("reports.confirmDeleteTitle"),
                                                        icon: <Trash2 className="w-4 h-4" />,
                                                        onClick: () => setConfirmDel(r),
                                                        variant: "danger" as const,
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t("reports.addTitle")} size="lg">
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t("leaves.col.employee")} required>
                            <Select value={form.employee_id} onValueChange={(v) => setForm({ ...form, employee_id: v || "" })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("leaves.selectEmployee")}>
                                        {(value: string) => {
                                            const e = employees.find((x) => x.id === value);
                                            return e ? `${e.prenom} ${e.nom}` : t("leaves.selectEmployee");
                                        }}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map((e) => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.prenom} {e.nom}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={t("reports.col.date")} required>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                            />
                        </Field>
                    </div>
                    <Field label={t("reports.col.activities")} required>
                        <textarea
                            className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={form.activites}
                            onChange={(e) => setForm({ ...form, activites: e.target.value })}
                            placeholder={t("reports.activitiesPlaceholder")}
                        />
                    </Field>
                    <Field label={t("reports.col.hours")}>
                        <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="24"
                            value={form.heures_travaillees}
                            onChange={(e) => setForm({ ...form, heures_travaillees: e.target.value })}
                        />
                    </Field>
                    <Field label={t("reports.col.observations")}>
                        <textarea
                            className="w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={form.observations}
                            onChange={(e) => setForm({ ...form, observations: e.target.value })}
                        />
                    </Field>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={create.isPending}>
                        {create.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t("common.create")}
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={!!viewing}
                onClose={() => setViewing(null)}
                title={t("reports.viewTitle")}
                size="lg"
            >
                {viewing && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                    {t("leaves.col.employee")}
                                </p>
                                <p className="font-medium">{employeeLabel(viewing.employee_id)}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                    {t("reports.col.date")}
                                </p>
                                <p className="font-medium">{viewing.date}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                    {t("reports.col.hours")}
                                </p>
                                <p className="font-medium">{viewing.heures_travaillees}h</p>
                            </div>
                            {viewing.created_at && (
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                        {t("reports.submittedAt")}
                                    </p>
                                    <p className="font-medium">
                                        {new Date(viewing.created_at).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                                {t("reports.col.activities")}
                            </p>
                            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 text-sm whitespace-pre-wrap break-words">
                                {viewing.activites || "—"}
                            </div>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                                {t("reports.col.observations")}
                            </p>
                            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 text-sm whitespace-pre-wrap break-words">
                                {viewing.observations || "—"}
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button variant="outline" onClick={() => setViewing(null)}>
                                {t("common.close")}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                isOpen={!!confirmDel}
                onClose={() => setConfirmDel(null)}
                onConfirm={handleDelete}
                title={t("reports.confirmDeleteTitle")}
                description={t("reports.confirmDeleteDesc")}
                isLoading={del.isPending}
            />
        </Card>
    );
}
