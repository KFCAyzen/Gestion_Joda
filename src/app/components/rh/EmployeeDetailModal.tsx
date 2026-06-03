"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
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
    Trash2,
    UserCircle2,
} from "lucide-react";
import Modal from "../Modal";
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
} from "../../lib/hooks/use-hr";
import type {
    Employee,
    DeductionRule,
    DailyReport,
    LeaveRequest,
    Payslip,
    DeductionOccurrence,
} from "../../types/hr";
import {
    printEmployeeDossier,
    type DossierSection,
    type DossierHistoryRow,
} from "../../lib/printEmployeeDossier";

type DetailTab = "overview" | "history" | "reports" | "leaves" | "payroll" | "deductions";

function fmtMoney(n: number): string {
    return n.toLocaleString("fr-FR") + " FCFA";
}

function monthLabel(m: number): string {
    return ["Janv.", "Févr.", "Mars", "Avril", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."][m - 1] ?? `${m}`;
}

type TFn = (key: string, values?: Record<string, string | number>) => string;

export default function EmployeeDetailModal({
    employee,
    onClose,
    onError,
    onSuccess,
    creatorId,
}: {
    employee: Employee | null;
    onClose: () => void;
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
    creatorId: string;
}) {
    const t = useTranslations("hrManagement");
    const [tab, setTab] = useState<DetailTab>("overview");

    const employeesQ = useEmployees();
    const reportsQ = useDailyReports();
    const leavesQ = useLeaveRequests();
    const payslipsQ = usePayslips();
    const rulesQ = useDeductionRules();
    const occQ = useDeductionOccurrences();

    const reports = useMemo(() => (reportsQ.data ?? []).filter((r) => r.employee_id === employee?.id), [reportsQ.data, employee]);
    const leaves = useMemo(() => (leavesQ.data ?? []).filter((l) => l.employee_id === employee?.id), [leavesQ.data, employee]);
    const payslips = useMemo(() => (payslipsQ.data ?? []).filter((p) => p.employee_id === employee?.id), [payslipsQ.data, employee]);
    const occurrences = useMemo(() => (occQ.data ?? []).filter((o) => o.employee_id === employee?.id), [occQ.data, employee]);
    const rules = rulesQ.data ?? [];

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

    const sections = useMemo<DossierSection[]>(
        () => (employee ? buildProfileSections(employee, supervisorName, t as TFn) : []),
        [employee, supervisorName, t]
    );

    const history = useMemo<DossierHistoryRow[]>(
        () =>
            employee
                ? buildHistory(t as TFn, { reports, leaves, payslips, occurrences, rulesById })
                : [],
        [employee, t, reports, leaves, payslips, occurrences, rulesById]
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
        ],
        [t, totalHours, approvedLeaves, pendingLeaves, totalPaid, employee, totalDeductions, payslips.length, reports.length]
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

    if (!employee) return null;

    return (
        <Modal
            isOpen={!!employee}
            onClose={onClose}
            title={`${employee.prenom} ${employee.nom}`}
            description={employee.poste + (employee.departement ? ` · ${employee.departement}` : "")}
            size="xl"
        >
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex justify-end">
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
                </div>

                {tab === "overview" && (
                    <div className="space-y-5 max-h-[460px] overflow-auto pr-1">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatBox label={t("detail.stats.hoursWorked")} value={`${totalHours} h`} />
                            <StatBox label={t("detail.stats.approvedDays")} value={String(approvedLeaves)} />
                            <StatBox label={t("detail.stats.pendingLeaves")} value={String(pendingLeaves)} />
                            <StatBox label={t("detail.stats.totalPaid")} value={fmtMoney(totalPaid)} />
                            <StatBox label={t("detail.stats.salary")} value={fmtMoney(employee.salaire_base)} />
                            <StatBox label={t("detail.stats.totalDeductions")} value={fmtMoney(totalDeductions)} highlight={totalDeductions > 0} />
                            <StatBox label={t("detail.stats.payslipCount")} value={String(payslips.length)} />
                            <StatBox label={t("detail.stats.reportCount")} value={String(reports.length)} />
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
                    <div className="max-h-[460px] overflow-auto">
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
                    <div className="max-h-[400px] overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t("reports.col.date")}</TableHead>
                                    <TableHead>{t("reports.col.hours")}</TableHead>
                                    <TableHead>{t("reports.col.activities")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reports.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="text-center py-6 text-slate-400">{t("reports.empty")}</TableCell></TableRow>
                                ) : (
                                    reports.map((r) => (
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
                                    <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-400">{t("payroll.empty")}</TableCell></TableRow>
                                ) : (
                                    payslips.map((p) => (
                                        <TableRow key={p.id}>
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
            </div>
        </Modal>
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

    rows.sort((a, b) => (a.sort < b.sort ? 1 : a.sort > b.sort ? -1 : 0));
    return rows.map((r) => ({ date: r.date, type: r.type, detail: r.detail, amount: r.amount }));
}
