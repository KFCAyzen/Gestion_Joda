"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock,
    History as HistoryIcon,
    KeyRound,
    Loader2,
    LogOut,
    Send,
    UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type PublicEmployee = { id: string; prenom: string; nom: string; poste?: string };
type PublicReport = {
    id: string;
    date: string;
    activites: string;
    heures_travaillees: number;
    observations: string | null;
    created_at: string;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function PublicReportPage() {
    const t = useTranslations("publicReport");
    const [employees, setEmployees] = useState<PublicEmployee[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [employeeId, setEmployeeId] = useState("");
    const [pin, setPin] = useState("");
    const [authError, setAuthError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [session, setSession] = useState<PublicEmployee | null>(null);

    const [form, setForm] = useState({
        date: todayIso(),
        activites: "",
        heures_travaillees: "8",
        observations: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitMsg, setSubmitMsg] = useState<string | null>(null);
    const [submitErr, setSubmitErr] = useState<string | null>(null);

    const [history, setHistory] = useState<PublicReport[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/hr/public/employees");
                const json = await res.json();
                if (!cancelled && res.ok) setEmployees(json.employees ?? []);
            } catch {
                /* ignored */
            } finally {
                if (!cancelled) setLoadingList(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const employeeLabel = useMemo(() => {
        const m = new Map<string, string>();
        for (const e of employees) m.set(e.id, `${e.prenom} ${e.nom}`);
        return (id: string) => m.get(id) ?? t("selectEmployee");
    }, [employees, t]);

    const refreshHistory = async (emp: PublicEmployee, p: string) => {
        setLoadingHistory(true);
        try {
            const res = await fetch("/api/hr/public/list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employee_id: emp.id, pin: p }),
            });
            const json = await res.json();
            if (res.ok) setHistory(json.reports ?? []);
        } catch {
            /* ignored */
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        if (!employeeId || !pin) {
            setAuthError(t("errors.missingFields"));
            return;
        }
        setVerifying(true);
        try {
            const res = await fetch("/api/hr/public/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employee_id: employeeId, pin }),
            });
            const json = await res.json();
            if (!res.ok) {
                setAuthError(json.error || t("errors.invalidCredentials"));
                return;
            }
            const emp: PublicEmployee = json.employee;
            setSession(emp);
            refreshHistory(emp, pin);
        } catch {
            setAuthError(t("errors.network"));
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitErr(null);
        setSubmitMsg(null);
        if (!session) return;
        const activites = form.activites.trim();
        if (!activites) {
            setSubmitErr(t("errors.activitiesRequired"));
            return;
        }
        const hours = parseFloat(form.heures_travaillees || "0");
        if (Number.isNaN(hours) || hours < 0 || hours > 24) {
            setSubmitErr(t("errors.invalidHours"));
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch("/api/hr/public/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employee_id: session.id,
                    pin,
                    date: form.date,
                    activites,
                    heures_travaillees: hours,
                    observations: form.observations.trim() || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                if (json?.code === "daily_limit") {
                    setSubmitErr(t("errors.dailyLimit"));
                } else {
                    setSubmitErr(json.error || t("errors.submitFailed"));
                }
                return;
            }
            setSubmitMsg(t("submitSuccess"));
            setForm({ date: todayIso(), activites: "", heures_travaillees: "8", observations: "" });
            refreshHistory(session, pin);
        } catch {
            setSubmitErr(t("errors.network"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        setSession(null);
        setPin("");
        setEmployeeId("");
        setHistory([]);
        setSubmitMsg(null);
        setSubmitErr(null);
    };

    const today = todayIso();
    const todayCount = useMemo(
        () => history.filter((r) => r.date === today).length,
        [history, today]
    );
    const remainingToday = Math.max(0, 2 - todayCount);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            {/* Branded header */}
            <header className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-600 to-red-700 text-white">
                <div
                    className="pointer-events-none absolute inset-0 opacity-20"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0, transparent 35%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.3) 0, transparent 40%)",
                    }}
                />
                <div className="relative mx-auto flex max-w-4xl items-center gap-4 px-6 py-6">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5">
                        <img
                            src="/Logo.png"
                            alt="Joda Company"
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-100/90">
                            Joda Company
                        </p>
                        <h1 className="truncate text-xl font-bold leading-tight sm:text-2xl">
                            {t("title")}
                        </h1>
                    </div>
                    {session && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleLogout}
                            className="bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm border border-white/20"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">{t("logout")}</span>
                        </Button>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10 space-y-6">
                {!session ? (
                    <>
                        <div className="text-center max-w-xl mx-auto space-y-2">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900">
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                                {t("login.title")}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t("subtitle")}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                            <div className="p-6 sm:p-8">
                                <form onSubmit={handleVerify} className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                                            <UserCircle2 className="w-4 h-4 text-slate-400" />
                                            {t("login.employee")}
                                        </Label>
                                        <Select
                                            value={employeeId}
                                            onValueChange={(v) => setEmployeeId(v || "")}
                                        >
                                            <SelectTrigger className="w-full h-11">
                                                <SelectValue placeholder={t("selectEmployee")}>
                                                    {(value: string) =>
                                                        value ? employeeLabel(value) : t("selectEmployee")
                                                    }
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {loadingList ? (
                                                    <SelectItem value="__loading" disabled>
                                                        {t("loading")}
                                                    </SelectItem>
                                                ) : employees.length === 0 ? (
                                                    <SelectItem value="__empty" disabled>
                                                        {t("noEmployees")}
                                                    </SelectItem>
                                                ) : (
                                                    employees.map((e) => (
                                                        <SelectItem key={e.id} value={e.id}>
                                                            {e.prenom} {e.nom}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                                            <KeyRound className="w-4 h-4 text-slate-400" />
                                            {t("login.pin")}
                                        </Label>
                                        <Input
                                            type="password"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            value={pin}
                                            onChange={(e) => setPin(e.target.value)}
                                            placeholder="••••••"
                                            maxLength={12}
                                            className="h-11 tracking-[0.4em] text-center font-mono text-lg"
                                        />
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {t("login.pinHint")}
                                        </p>
                                    </div>

                                    {authError && (
                                        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                                            {authError}
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm"
                                        disabled={verifying}
                                    >
                                        {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {t("login.submit")}
                                    </Button>
                                </form>
                            </div>
                            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 px-6 py-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                                {t("login.description")}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Welcome + stats banner */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 ring-1 ring-red-100 dark:ring-red-900 font-semibold">
                                        {session.prenom.charAt(0)}
                                        {session.nom.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {t("welcome", { name: "" }).replace(/,\s*$/, "")}
                                        </p>
                                        <p className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                                            {session.prenom} {session.nom}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1 sm:flex-none rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-center">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">
                                            {t("history.col.date")}
                                        </p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                                            {new Date().toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div
                                        className={`flex-1 sm:flex-none rounded-xl px-4 py-2.5 text-center ${
                                            remainingToday === 0
                                                ? "bg-amber-50 dark:bg-amber-950/40"
                                                : "bg-emerald-50 dark:bg-emerald-950/40"
                                        }`}
                                    >
                                        <p
                                            className={`text-[10px] uppercase tracking-wider font-medium ${
                                                remainingToday === 0
                                                    ? "text-amber-700 dark:text-amber-400"
                                                    : "text-emerald-700 dark:text-emerald-400"
                                            }`}
                                        >
                                            {t("remaining")}
                                        </p>
                                        <p
                                            className={`text-sm font-semibold ${
                                                remainingToday === 0
                                                    ? "text-amber-800 dark:text-amber-300"
                                                    : "text-emerald-800 dark:text-emerald-300"
                                            }`}
                                        >
                                            {remainingToday}/2
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Report form */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                            <div className="border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4">
                                <h3 className="font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-red-600" />
                                    {t("form.title")}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {t("form.description")}
                                </p>
                            </div>
                            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                                            <CalendarDays className="w-4 h-4 text-slate-400" />
                                            {t("form.date")}
                                        </Label>
                                        <Input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="flex items-center gap-1.5 text-sm font-medium">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            {t("form.hours")}
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="24"
                                            value={form.heures_travaillees}
                                            onChange={(e) =>
                                                setForm({ ...form, heures_travaillees: e.target.value })
                                            }
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">
                                        {t("form.activities")}
                                    </Label>
                                    <textarea
                                        className="w-full min-h-32 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:border-red-500 resize-y"
                                        value={form.activites}
                                        onChange={(e) => setForm({ ...form, activites: e.target.value })}
                                        placeholder={t("form.activitiesPlaceholder")}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">
                                        {t("form.observations")}
                                    </Label>
                                    <textarea
                                        className="w-full min-h-20 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:border-red-500 resize-y"
                                        value={form.observations}
                                        onChange={(e) =>
                                            setForm({ ...form, observations: e.target.value })
                                        }
                                    />
                                </div>

                                {submitErr && (
                                    <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
                                        {submitErr}
                                    </div>
                                )}
                                {submitMsg && (
                                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {submitMsg}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm"
                                    disabled={submitting || remainingToday === 0}
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4 mr-2" />
                                    )}
                                    {t("form.submit")}
                                </Button>
                            </form>
                        </div>

                        {/* History */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                            <div className="border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4">
                                <h3 className="font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                    <HistoryIcon className="w-4 h-4 text-red-600" />
                                    {t("history.title")}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {t("history.description")}
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                                            <TableHead className="font-semibold">
                                                {t("history.col.date")}
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                {t("history.col.hours")}
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                {t("history.col.activities")}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingHistory ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-10 text-slate-400">
                                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : history.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-10 text-slate-400">
                                                    <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">{t("history.empty")}</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            history.map((r) => (
                                                <TableRow key={r.id}>
                                                    <TableCell className="whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                                                        {r.date}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                            <Clock className="w-3 h-3" />
                                                            {r.heures_travaillees}h
                                                        </span>
                                                    </TableCell>
                                                    <TableCell
                                                        className="max-w-md truncate text-slate-600 dark:text-slate-400"
                                                        title={r.activites}
                                                    >
                                                        {r.activites}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </>
                )}

                <footer className="text-center text-xs text-slate-400 dark:text-slate-600 pt-4">
                    © {new Date().getFullYear()} Joda Company
                </footer>
            </main>
        </div>
    );
}
