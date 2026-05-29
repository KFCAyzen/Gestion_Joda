"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, ClipboardList, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-600 text-white">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-semibold">{t("title")}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
                </div>

                {!session ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("login.title")}</CardTitle>
                            <CardDescription>{t("login.description")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleVerify} className="space-y-4">
                                <div className="space-y-1">
                                    <Label>{t("login.employee")}</Label>
                                    <Select
                                        value={employeeId}
                                        onValueChange={(v) => setEmployeeId(v || "")}
                                    >
                                        <SelectTrigger className="w-full">
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
                                <div className="space-y-1">
                                    <Label>{t("login.pin")}</Label>
                                    <Input
                                        type="password"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        placeholder="••••••"
                                        maxLength={12}
                                    />
                                    <p className="text-xs text-slate-500">{t("login.pinHint")}</p>
                                </div>
                                {authError && (
                                    <div className="rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                                        {authError}
                                    </div>
                                )}
                                <Button type="submit" className="w-full" disabled={verifying}>
                                    {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {t("login.submit")}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between gap-3">
                                <div>
                                    <CardTitle>
                                        {t("welcome", { name: `${session.prenom} ${session.nom}` })}
                                    </CardTitle>
                                    <CardDescription>{t("form.description")}</CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleLogout}>
                                    <LogOut className="w-4 h-4 mr-2" />
                                    {t("logout")}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label>{t("form.date")}</Label>
                                            <Input
                                                type="date"
                                                value={form.date}
                                                onChange={(e) => setForm({ ...form, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>{t("form.hours")}</Label>
                                            <Input
                                                type="number"
                                                step="0.5"
                                                min="0"
                                                max="24"
                                                value={form.heures_travaillees}
                                                onChange={(e) =>
                                                    setForm({ ...form, heures_travaillees: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t("form.activities")}</Label>
                                        <textarea
                                            className="w-full min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={form.activites}
                                            onChange={(e) => setForm({ ...form, activites: e.target.value })}
                                            placeholder={t("form.activitiesPlaceholder")}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>{t("form.observations")}</Label>
                                        <textarea
                                            className="w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={form.observations}
                                            onChange={(e) => setForm({ ...form, observations: e.target.value })}
                                        />
                                    </div>
                                    {submitErr && (
                                        <div className="rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                                            {submitErr}
                                        </div>
                                    )}
                                    {submitMsg && (
                                        <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            {submitMsg}
                                        </div>
                                    )}
                                    <Button type="submit" className="w-full" disabled={submitting}>
                                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {t("form.submit")}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t("history.title")}</CardTitle>
                                <CardDescription>{t("history.description")}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("history.col.date")}</TableHead>
                                            <TableHead>{t("history.col.hours")}</TableHead>
                                            <TableHead>{t("history.col.activities")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingHistory ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-6 text-slate-400">
                                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : history.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-6 text-slate-400">
                                                    {t("history.empty")}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            history.map((r) => (
                                                <TableRow key={r.id}>
                                                    <TableCell>{r.date}</TableCell>
                                                    <TableCell>{r.heures_travaillees}h</TableCell>
                                                    <TableCell className="max-w-md truncate" title={r.activites}>
                                                        {r.activites}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
