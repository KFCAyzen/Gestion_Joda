"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    BadgePercent,
    CalendarClock,
    Loader2,
    Pencil,
    Plus,
    Settings2,
    Trash2,
    Wallet,
} from "lucide-react";
import Modal from "../Modal";
import ConfirmDialog from "../ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { DropdownMenu } from "../shared";
import {
    useDeductionRules,
    useCreateDeductionRule,
    useUpdateDeductionRule,
    useDeleteDeductionRule,
    usePaymentSchedules,
    useCreatePaymentSchedule,
    useUpdatePaymentSchedule,
    useDeletePaymentSchedule,
    useEmployeePayConfigs,
    useUpsertEmployeePayConfig,
} from "../../lib/hooks/use-hr";
import type {
    Employee,
    DeductionRule,
    DeductionType,
    DeductionAmountType,
    PaymentSchedule,
    ScheduleScope,
    EmployeePayConfig,
} from "../../types/hr";

const DEDUCTION_TYPES: DeductionType[] = [
    "absence_non_justifiee",
    "retard",
    "manquement_personnalise",
];

type SubTab = "rules" | "schedules" | "pay_configs";

function fmtMoney(n: number): string {
    return n.toLocaleString("fr-FR") + " FCFA";
}

export default function HRConfigPanel({
    employees,
    onError,
    onSuccess,
}: {
    employees: Employee[];
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const [sub, setSub] = useState<SubTab>("rules");

    return (
        <Card className="joda-surface border-0 shadow-none">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5" />
                    {t("config.title")}
                </CardTitle>
                <CardDescription>{t("config.description")}</CardDescription>
                <div className="flex flex-wrap gap-2 pt-2">
                    <SubTabButton active={sub === "rules"} onClick={() => setSub("rules")} icon={<BadgePercent className="w-4 h-4" />}>
                        {t("config.tabs.rules")}
                    </SubTabButton>
                    <SubTabButton active={sub === "schedules"} onClick={() => setSub("schedules")} icon={<CalendarClock className="w-4 h-4" />}>
                        {t("config.tabs.schedules")}
                    </SubTabButton>
                    <SubTabButton active={sub === "pay_configs"} onClick={() => setSub("pay_configs")} icon={<Wallet className="w-4 h-4" />}>
                        {t("config.tabs.payConfigs")}
                    </SubTabButton>
                </div>
            </CardHeader>
            <CardContent>
                {sub === "rules" && <DeductionRulesSection onError={onError} onSuccess={onSuccess} />}
                {sub === "schedules" && <PaymentSchedulesSection employees={employees} onError={onError} onSuccess={onSuccess} />}
                {sub === "pay_configs" && <PayConfigsSection employees={employees} onError={onError} onSuccess={onSuccess} />}
            </CardContent>
        </Card>
    );
}

function SubTabButton({
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
            className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 border transition-colors ${
                active
                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
            }`}
        >
            {icon}
            {children}
        </button>
    );
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

// ─── Deduction rules section ──────────────────────────────────────────────
function DeductionRulesSection({
    onError,
    onSuccess,
}: {
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const rulesQ = useDeductionRules();
    const create = useCreateDeductionRule();
    const update = useUpdateDeductionRule();
    const del = useDeleteDeductionRule();

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<DeductionRule | null>(null);
    const [confirmDel, setConfirmDel] = useState<DeductionRule | null>(null);
    const [form, setForm] = useState({
        code: "",
        label: "",
        type: "absence_non_justifiee" as DeductionType,
        amount_type: "fixed" as DeductionAmountType,
        amount: "0",
        actif: true,
    });

    const openCreate = () => {
        setEditing(null);
        setForm({ code: "", label: "", type: "absence_non_justifiee", amount_type: "fixed", amount: "0", actif: true });
        setModalOpen(true);
    };

    const openEdit = (r: DeductionRule) => {
        setEditing(r);
        setForm({
            code: r.code,
            label: r.label,
            type: r.type,
            amount_type: r.amount_type,
            amount: String(r.amount),
            actif: r.actif,
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                code: form.code.trim(),
                label: form.label.trim(),
                type: form.type,
                amount_type: form.amount_type,
                amount: parseFloat(form.amount || "0") || 0,
                actif: form.actif,
            };
            if (editing) {
                await update.mutateAsync({ id: editing.id, data: payload });
                onSuccess(t("config.rules.updated"));
            } else {
                await create.mutateAsync(payload);
                onSuccess(t("config.rules.created"));
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
            onSuccess(t("config.rules.deleted"));
            setConfirmDel(null);
        } catch (e) {
            onError(e);
        }
    };

    const rules = rulesQ.data ?? [];

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("config.rules.add")}
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("config.rules.col.code")}</TableHead>
                        <TableHead>{t("config.rules.col.label")}</TableHead>
                        <TableHead>{t("config.rules.col.type")}</TableHead>
                        <TableHead>{t("config.rules.col.amount")}</TableHead>
                        <TableHead>{t("config.rules.col.status")}</TableHead>
                        <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rulesQ.isLoading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            </TableCell>
                        </TableRow>
                    ) : rules.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="p-0">
                                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-10 text-center my-2">
                                    <p className="text-base font-medium text-slate-700 dark:text-slate-300">{t("config.rules.empty")}</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        rules.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell><code className="text-xs">{r.code}</code></TableCell>
                                <TableCell className="font-medium">{r.label}</TableCell>
                                <TableCell>{t(`config.rules.type.${r.type}`)}</TableCell>
                                <TableCell>
                                    {r.amount_type === "fixed"
                                        ? fmtMoney(r.amount)
                                        : `${r.amount}% ${t("config.rules.ofBase")}`}
                                </TableCell>
                                <TableCell>
                                    <Badge className={r.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                                        {r.actif ? t("config.rules.active") : t("config.rules.inactive")}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end">
                                        <DropdownMenu
                                            actions={[
                                                { label: t("config.rules.edit"), icon: <Pencil className="w-4 h-4" />, onClick: () => openEdit(r) },
                                                {
                                                    label: t("config.rules.delete"),
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

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? t("config.rules.editTitle") : t("config.rules.addTitle")}
                size="md"
            >
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t("config.rules.col.code")} required>
                            <Input
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                                placeholder="absence_jour"
                            />
                        </Field>
                        <Field label={t("config.rules.col.label")} required>
                            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                        </Field>
                    </div>
                    <Field label={t("config.rules.col.type")}>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as DeductionType })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DEDUCTION_TYPES.map((tp) => (
                                    <SelectItem key={tp} value={tp}>
                                        {t(`config.rules.type.${tp}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t("config.rules.amountTypeLabel")}>
                            <Select value={form.amount_type} onValueChange={(v) => setForm({ ...form, amount_type: v as DeductionAmountType })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">{t("config.rules.amountType.fixed")}</SelectItem>
                                    <SelectItem value="percent_base">{t("config.rules.amountType.percent_base")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={form.amount_type === "fixed" ? `${t("config.rules.col.amount")} (FCFA)` : `${t("config.rules.col.amount")} (%)`} required>
                            <Input
                                type="number"
                                min="0"
                                step={form.amount_type === "fixed" ? "1" : "0.1"}
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            />
                        </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.actif}
                            onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                        />
                        {t("config.rules.activeLabel")}
                    </label>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
                        {(create.isPending || update.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {editing ? t("common.save") : t("common.create")}
                    </Button>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={!!confirmDel}
                onClose={() => setConfirmDel(null)}
                onConfirm={handleDelete}
                title={t("config.rules.confirmDeleteTitle")}
                description={confirmDel ? t("config.rules.confirmDeleteDesc", { label: confirmDel.label }) : ""}
                isLoading={del.isPending}
            />
        </div>
    );
}

// ─── Payment schedules section ────────────────────────────────────────────
function PaymentSchedulesSection({
    employees,
    onError,
    onSuccess,
}: {
    employees: Employee[];
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const schedQ = usePaymentSchedules();
    const create = useCreatePaymentSchedule();
    const update = useUpdatePaymentSchedule();
    const del = useDeletePaymentSchedule();

    const departments = useMemo(() => {
        const set = new Set<string>();
        for (const e of employees) if (e.departement) set.add(e.departement);
        return Array.from(set).sort();
    }, [employees]);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<PaymentSchedule | null>(null);
    const [confirmDel, setConfirmDel] = useState<PaymentSchedule | null>(null);
    const [form, setForm] = useState({
        label: "",
        scope: "all" as ScheduleScope,
        target_department: "",
        target_employee_id: "",
        day_of_month: 28,
        actif: true,
    });

    const openCreate = () => {
        setEditing(null);
        setForm({ label: "", scope: "all", target_department: "", target_employee_id: "", day_of_month: 28, actif: true });
        setModalOpen(true);
    };

    const openEdit = (s: PaymentSchedule) => {
        setEditing(s);
        setForm({
            label: s.label,
            scope: s.scope,
            target_department: s.target_department ?? "",
            target_employee_id: s.target_employee_id ?? "",
            day_of_month: s.day_of_month,
            actif: s.actif,
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                label: form.label.trim(),
                scope: form.scope,
                target_department: form.scope === "department" ? form.target_department || null : null,
                target_employee_id: form.scope === "employee" ? form.target_employee_id || null : null,
                day_of_month: form.day_of_month,
                actif: form.actif,
            };
            if (editing) {
                await update.mutateAsync({ id: editing.id, data: payload });
                onSuccess(t("config.schedules.updated"));
            } else {
                await create.mutateAsync(payload);
                onSuccess(t("config.schedules.created"));
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
            onSuccess(t("config.schedules.deleted"));
            setConfirmDel(null);
        } catch (e) {
            onError(e);
        }
    };

    const scopeLabel = (s: PaymentSchedule): string => {
        if (s.scope === "all") return t("config.schedules.scopeAll");
        if (s.scope === "department") return `${t("config.schedules.scopeDept")} : ${s.target_department}`;
        const emp = employees.find((e) => e.id === s.target_employee_id);
        return `${t("config.schedules.scopeEmp")} : ${emp ? `${emp.prenom} ${emp.nom}` : "?"}`;
    };

    const schedules = schedQ.data ?? [];

    return (
        <div className="space-y-3">
            <div className="flex justify-end">
                <Button onClick={openCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("config.schedules.add")}
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("config.schedules.col.label")}</TableHead>
                        <TableHead>{t("config.schedules.col.scope")}</TableHead>
                        <TableHead>{t("config.schedules.col.day")}</TableHead>
                        <TableHead>{t("config.schedules.col.lastRun")}</TableHead>
                        <TableHead>{t("config.schedules.col.status")}</TableHead>
                        <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {schedQ.isLoading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            </TableCell>
                        </TableRow>
                    ) : schedules.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="p-0">
                                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-10 text-center my-2">
                                    <p className="text-base font-medium text-slate-700 dark:text-slate-300">{t("config.schedules.empty")}</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        schedules.map((s) => (
                            <TableRow key={s.id}>
                                <TableCell className="font-medium">{s.label}</TableCell>
                                <TableCell>{scopeLabel(s)}</TableCell>
                                <TableCell>{t("config.schedules.dayOf", { day: s.day_of_month })}</TableCell>
                                <TableCell>{s.last_run_period ?? "—"}</TableCell>
                                <TableCell>
                                    <Badge className={s.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}>
                                        {s.actif ? t("config.rules.active") : t("config.rules.inactive")}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end">
                                        <DropdownMenu
                                            actions={[
                                                { label: t("config.rules.edit"), icon: <Pencil className="w-4 h-4" />, onClick: () => openEdit(s) },
                                                {
                                                    label: t("config.rules.delete"),
                                                    icon: <Trash2 className="w-4 h-4" />,
                                                    onClick: () => setConfirmDel(s),
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

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? t("config.schedules.editTitle") : t("config.schedules.addTitle")}
                size="md"
            >
                <div className="space-y-3">
                    <Field label={t("config.schedules.col.label")} required>
                        <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Paie fin de mois" />
                    </Field>
                    <Field label={t("config.schedules.col.scope")}>
                        <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as ScheduleScope })}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("config.schedules.scopeAll")}</SelectItem>
                                <SelectItem value="department">{t("config.schedules.scopeDept")}</SelectItem>
                                <SelectItem value="employee">{t("config.schedules.scopeEmp")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                    {form.scope === "department" && (
                        <Field label={t("employees.col.department")} required>
                            <Select value={form.target_department} onValueChange={(v) => setForm({ ...form, target_department: v ?? "" })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("config.schedules.selectDept")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map((d) => (
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}
                    {form.scope === "employee" && (
                        <Field label={t("leaves.col.employee")} required>
                            <Select value={form.target_employee_id} onValueChange={(v) => setForm({ ...form, target_employee_id: v ?? "" })}>
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
                                        <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}
                    <Field label={t("config.schedules.col.day")} required>
                        <Input
                            type="number"
                            min="1"
                            max="31"
                            value={form.day_of_month}
                            onChange={(e) => setForm({ ...form, day_of_month: parseInt(e.target.value, 10) || 1 })}
                        />
                        <p className="text-xs text-slate-500 mt-1">{t("config.schedules.dayHint")}</p>
                    </Field>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.actif}
                            onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                        />
                        {t("config.rules.activeLabel")}
                    </label>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
                        {(create.isPending || update.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {editing ? t("common.save") : t("common.create")}
                    </Button>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={!!confirmDel}
                onClose={() => setConfirmDel(null)}
                onConfirm={handleDelete}
                title={t("config.schedules.confirmDeleteTitle")}
                description={confirmDel ? t("config.schedules.confirmDeleteDesc", { label: confirmDel.label }) : ""}
                isLoading={del.isPending}
            />
        </div>
    );
}

// ─── Pay configs section (primes / salaire personnalisé) ──────────────────
function PayConfigsSection({
    employees,
    onError,
    onSuccess,
}: {
    employees: Employee[];
    onError: (e: unknown) => void;
    onSuccess: (msg: string) => void;
}) {
    const t = useTranslations("hrManagement");
    const configsQ = useEmployeePayConfigs();
    const upsert = useUpsertEmployeePayConfig();

    const [modalOpen, setModalOpen] = useState(false);
    const [target, setTarget] = useState<Employee | null>(null);
    const [form, setForm] = useState({
        primes_recurrentes: "0",
        salaire_personnalise: "",
        notes: "",
    });

    const configByEmp = useMemo(() => {
        const m = new Map<string, EmployeePayConfig>();
        for (const c of configsQ.data ?? []) m.set(c.employee_id, c);
        return m;
    }, [configsQ.data]);

    const openEdit = (e: Employee) => {
        const c = configByEmp.get(e.id);
        setTarget(e);
        setForm({
            primes_recurrentes: String(c?.primes_recurrentes ?? 0),
            salaire_personnalise: c?.salaire_personnalise != null ? String(c.salaire_personnalise) : "",
            notes: c?.notes ?? "",
        });
        setModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!target) return;
        try {
            const salPers = form.salaire_personnalise.trim();
            await upsert.mutateAsync({
                employee_id: target.id,
                primes_recurrentes: parseInt(form.primes_recurrentes || "0", 10) || 0,
                salaire_personnalise: salPers ? parseInt(salPers, 10) || 0 : null,
                notes: form.notes.trim() || null,
            });
            onSuccess(t("config.payConfigs.saved"));
            setModalOpen(false);
        } catch (e) {
            onError(e);
        }
    };

    return (
        <div className="space-y-3">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("leaves.col.employee")}</TableHead>
                        <TableHead>{t("employees.col.salary")}</TableHead>
                        <TableHead>{t("config.payConfigs.customSalary")}</TableHead>
                        <TableHead>{t("config.payConfigs.recurringBonus")}</TableHead>
                        <TableHead>{t("config.payConfigs.effective")}</TableHead>
                        <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="p-0">
                                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-10 text-center my-2">
                                    <p className="text-base font-medium text-slate-700 dark:text-slate-300">{t("employees.empty")}</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        employees.map((e) => {
                            const c = configByEmp.get(e.id);
                            const effective = (c?.salaire_personnalise ?? e.salaire_base) + (c?.primes_recurrentes ?? 0);
                            return (
                                <TableRow key={e.id}>
                                    <TableCell className="font-medium">{e.prenom} {e.nom}</TableCell>
                                    <TableCell>{fmtMoney(e.salaire_base)}</TableCell>
                                    <TableCell>{c?.salaire_personnalise != null ? fmtMoney(c.salaire_personnalise) : "—"}</TableCell>
                                    <TableCell>{c ? fmtMoney(c.primes_recurrentes) : "—"}</TableCell>
                                    <TableCell className="font-semibold">{fmtMoney(effective)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                                            <Pencil className="w-4 h-4 mr-1" />
                                            {t("config.payConfigs.editBtn")}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={target ? t("config.payConfigs.editTitle", { name: `${target.prenom} ${target.nom}` }) : ""}
                size="md"
            >
                <div className="space-y-3">
                    <p className="text-xs text-slate-500">{t("config.payConfigs.hint")}</p>
                    <Field label={`${t("config.payConfigs.customSalary")} (FCFA)`}>
                        <Input
                            type="number"
                            min="0"
                            value={form.salaire_personnalise}
                            onChange={(e) => setForm({ ...form, salaire_personnalise: e.target.value })}
                            placeholder={target ? String(target.salaire_base) : ""}
                        />
                    </Field>
                    <Field label={`${t("config.payConfigs.recurringBonus")} (FCFA)`}>
                        <Input
                            type="number"
                            min="0"
                            value={form.primes_recurrentes}
                            onChange={(e) => setForm({ ...form, primes_recurrentes: e.target.value })}
                        />
                    </Field>
                    <Field label={t("employees.form.notes")}>
                        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </Field>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>{t("common.cancel")}</Button>
                    <Button onClick={handleSubmit} disabled={upsert.isPending}>
                        {upsert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t("common.save")}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
