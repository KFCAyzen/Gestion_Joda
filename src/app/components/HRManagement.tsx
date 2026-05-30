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
    Pencil,
    Plus,
    Receipt,
    RotateCcw,
    Trash2,
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
} from "../lib/hooks/use-hr";
import type {
    Employee,
    EmployeeStatus,
    LeaveRequest,
    LeaveType,
    Payslip,
    DailyReport,
} from "../types/hr";

const TABS = ["employees", "leaves", "payroll", "reports"] as const;
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
            </div>

            {/* Panels */}
            {tab === "employees" && (
                <EmployeesPanel
                    employees={employees}
                    loading={employeesQ.isLoading}
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

// ─── Employees panel ───────────────────────────────────────────────────────
type EmployeeFormState = {
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
    onError,
    onSuccess,
}: {
    employees: Employee[];
    loading: boolean;
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
        setModalOpen(true);
    };

    const openEdit = (e: Employee) => {
        setEditing(e);
        const { countryCode, localNumber } = splitPhoneNumber(e.telephone);
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
        });
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
                        <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v as EmployeeStatus })}>
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
                        <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
                    </Field>
                    <Field label={t("employees.form.lastname")} required>
                        <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                    </Field>
                    <Field label={t("employees.col.position")} required>
                        <Input value={form.poste} onChange={(e) => setForm({ ...form, poste: e.target.value })} />
                    </Field>
                    <Field label={t("employees.col.department")}>
                        <Input value={form.departement} onChange={(e) => setForm({ ...form, departement: e.target.value })} />
                    </Field>
                    <Field label="Email">
                        <Input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </Field>
                    <Field label={t("employees.form.phone")}>
                        <PhoneInput
                            id="employee-telephone"
                            countryCode={form.phoneCountryCode}
                            value={form.telephone}
                            onCountryCodeChange={(value) => setForm({ ...form, phoneCountryCode: value })}
                            onValueChange={(value) => setForm({ ...form, telephone: value })}
                        />
                    </Field>
                    <Field label={t("employees.col.hiredAt")} required>
                        <Input
                            type="date"
                            value={form.date_embauche}
                            onChange={(e) => setForm({ ...form, date_embauche: e.target.value })}
                        />
                    </Field>
                    <Field label={t("employees.col.salary") + " (FCFA)"} required>
                        <Input
                            type="number"
                            min="0"
                            value={form.salaire_base}
                            onChange={(e) => setForm({ ...form, salaire_base: e.target.value })}
                        />
                    </Field>
                    <div className="md:col-span-2">
                        <Field label={t("employees.form.notes")}>
                            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </Field>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setModalOpen(false)}>
                        {t("common.cancel")}
                    </Button>
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
    const now = new Date();
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmDel, setConfirmDel] = useState<Payslip | null>(null);
    const [form, setForm] = useState({
        employee_id: "",
        mois: now.getMonth() + 1,
        annee: now.getFullYear(),
        salaire_base: "0",
        primes: "0",
        deductions: "0",
        jours_absences: "0",
        notes: "",
    });

    const net = useMemo(() => {
        const b = parseInt(form.salaire_base || "0", 10) || 0;
        const p = parseInt(form.primes || "0", 10) || 0;
        const d = parseInt(form.deductions || "0", 10) || 0;
        const ja = parseInt(form.jours_absences || "0", 10) || 0;
        const dailyRate = Math.round(b / 30);
        return Math.max(0, b + p - d - dailyRate * ja);
    }, [form]);

    const openCreate = () => {
        const first = employees[0];
        setForm({
            employee_id: first?.id ?? "",
            mois: now.getMonth() + 1,
            annee: now.getFullYear(),
            salaire_base: String(first?.salaire_base ?? 0),
            primes: "0",
            deductions: "0",
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
            await create.mutateAsync({
                employee_id: form.employee_id,
                mois: form.mois,
                annee: form.annee,
                salaire_base: parseInt(form.salaire_base || "0", 10) || 0,
                primes: parseInt(form.primes || "0", 10) || 0,
                deductions: parseInt(form.deductions || "0", 10) || 0,
                jours_absences: parseInt(form.jours_absences || "0", 10) || 0,
                net_a_payer: net,
                notes: form.notes.trim() || null,
                created_by: creatorId || null,
            });
            onSuccess(t("messages.payslipCreated"));
            setModalOpen(false);
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
                <Button onClick={openCreate} disabled={employees.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("payroll.add")}
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("leaves.col.employee")}</TableHead>
                            <TableHead>{t("payroll.col.period")}</TableHead>
                            <TableHead>{t("payroll.col.base")}</TableHead>
                            <TableHead>{t("payroll.col.bonus")}</TableHead>
                            <TableHead>{t("payroll.col.deductions")}</TableHead>
                            <TableHead>{t("payroll.col.absences")}</TableHead>
                            <TableHead>{t("payroll.col.net")}</TableHead>
                            <TableHead className="text-right">{t("employees.col.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <LoadingRow cols={8} />
                        ) : payslips.length === 0 ? (
                            <EmptyRow cols={8} label={t("payroll.empty")} />
                        ) : (
                            payslips.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell>{employeesById.get(p.employee_id)?.prenom} {employeesById.get(p.employee_id)?.nom ?? "—"}</TableCell>
                                    <TableCell>
                                        {monthLabel(p.mois)} {p.annee}
                                    </TableCell>
                                    <TableCell>{fmtMoney(p.salaire_base)}</TableCell>
                                    <TableCell>{fmtMoney(p.primes)}</TableCell>
                                    <TableCell>{fmtMoney(p.deductions)}</TableCell>
                                    <TableCell>{p.jours_absences}</TableCell>
                                    <TableCell className="font-semibold">{fmtMoney(p.net_a_payer)}</TableCell>
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
                    <Field label={t("payroll.col.bonus") + " (FCFA)"}>
                        <Input
                            type="number"
                            min="0"
                            value={form.primes}
                            onChange={(e) => setForm({ ...form, primes: e.target.value })}
                        />
                    </Field>
                    <Field label={t("payroll.col.deductions") + " (FCFA)"}>
                        <Input
                            type="number"
                            min="0"
                            value={form.deductions}
                            onChange={(e) => setForm({ ...form, deductions: e.target.value })}
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
                        <Field label={t("employees.form.notes")}>
                            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </Field>
                    </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{t("payroll.computedNet")}</span>
                    <span className="text-lg font-semibold">{fmtMoney(net)}</span>
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

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <FilterIcon className="w-4 h-4" />
                            {t("reports.filters.title")}
                            {hasActiveFilters && (
                                <span className="rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-2 py-0.5 text-[10px] font-semibold">
                                    {filtered.length}/{reports.length}
                                </span>
                            )}
                        </div>
                        {hasActiveFilters && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={resetFilters}
                                className="h-7 text-xs text-slate-500 hover:text-slate-700"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                {t("reports.filters.reset")}
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {t("reports.filters.from")}
                            </Label>
                            <Input
                                type="date"
                                value={filterFrom}
                                onChange={(e) => setFilterFrom(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {t("reports.filters.to")}
                            </Label>
                            <Input
                                type="date"
                                value={filterTo}
                                onChange={(e) => setFilterTo(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {t("reports.filters.department")}
                            </Label>
                            <Select value={filterDept} onValueChange={(v) => setFilterDept(v || "all")}>
                                <SelectTrigger className="h-9 text-sm">
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
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {t("reports.filters.country")}
                            </Label>
                            <Select
                                value={filterCountry}
                                onValueChange={(v) => setFilterCountry(v || "all")}
                            >
                                <SelectTrigger className="h-9 text-sm">
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
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                <UsersIcon className="w-3 h-3" />
                                {t("reports.filters.employee")}
                            </Label>
                            <Select value={filterEmp} onValueChange={(v) => setFilterEmp(v || "all")}>
                                <SelectTrigger className="h-9 text-sm">
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
                        </div>
                    </div>
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
