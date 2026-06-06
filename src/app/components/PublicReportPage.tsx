"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
    AlertTriangle,
    ArrowRight,
    CalendarDays,
    Check,
    ClipboardList,
    Clock,
    History as HistoryIcon,
    KeyRound,
    Loader2,
    LogOut,
    Send,
    Shield,
    User,
    Zap,
} from "lucide-react";

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
const initials = (e: PublicEmployee) =>
    `${e.prenom?.charAt(0) ?? ""}${e.nom?.charAt(0) ?? ""}`.toUpperCase();

// ============================================================
// Custom employee select
// ============================================================
function EmployeeSelect({
    employees,
    value,
    loading,
    onChange,
}: {
    employees: PublicEmployee[];
    value: string;
    loading: boolean;
    onChange: (id: string) => void;
}) {
    const t = useTranslations("publicReport");
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const sel = employees.find((e) => e.id === value);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) {
            document.addEventListener("mousedown", handler);
            return () => document.removeEventListener("mousedown", handler);
        }
    }, [open]);

    return (
        <div className="relative" ref={wrapRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`flex h-12 w-full items-center gap-2.5 rounded-[10px] border bg-gray-50 px-3.5 text-[14.5px] transition-all ${
                    open
                        ? "border-[#f1a3a3] bg-white ring-[3px] ring-red-100"
                        : "border-zinc-200 hover:border-zinc-300"
                }`}
            >
                <User
                    className={`h-[18px] w-[18px] shrink-0 ${open ? "text-red-600" : "text-zinc-400"}`}
                />
                <span className={`flex-1 text-left ${sel ? "text-zinc-900" : "text-zinc-400"}`}>
                    {sel ? `${sel.prenom} ${sel.nom}` : t("selectEmployee")}
                </span>
                <svg
                    className="h-[18px] w-[18px] shrink-0 text-zinc-400 transition-transform"
                    style={{ transform: open ? "rotate(180deg)" : "none" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[230px] overflow-y-auto rounded-[10px] border border-zinc-200 bg-white p-1.5 shadow-[0_24px_50px_-16px_rgba(16,16,20,0.18),0_8px_18px_-10px_rgba(16,16,20,0.1)]"
                    >
                        {loading ? (
                            <div className="px-2.5 py-3 text-[13.5px] text-zinc-400">{t("loading")}</div>
                        ) : employees.length === 0 ? (
                            <div className="px-2.5 py-3 text-[13.5px] text-zinc-400">
                                {t("noEmployees")}
                            </div>
                        ) : (
                            employees.map((e) => {
                                const active = e.id === value;
                                return (
                                    <button
                                        type="button"
                                        key={e.id}
                                        onClick={() => {
                                            onChange(e.id);
                                            setOpen(false);
                                        }}
                                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[13.5px] transition-colors ${
                                            active ? "bg-red-50" : "hover:bg-gray-50"
                                        }`}
                                    >
                                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-600 text-[11px] font-bold text-white">
                                            {initials(e)}
                                        </span>
                                        <span className="min-w-0 flex-1 leading-tight">
                                            <span className="block truncate text-zinc-900">
                                                {e.prenom} {e.nom}
                                            </span>
                                            {e.poste && (
                                                <span className="block truncate text-[11px] text-zinc-500">
                                                    {e.poste}
                                                </span>
                                            )}
                                        </span>
                                        {active && (
                                            <Check className="h-4 w-4 shrink-0 text-red-600" strokeWidth={2.4} />
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================
// OTP input (6 boxes)
// ============================================================
function Otp({
    value,
    onChange,
    error,
}: {
    value: string[];
    onChange: (next: string[]) => void;
    error: boolean;
}) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);

    const setAt = (i: number, v: string) => {
        const digit = v.replace(/\D/g, "").slice(-1);
        const next = [...value];
        next[i] = digit;
        onChange(next);
        if (digit && i < 5) refs.current[i + 1]?.focus();
    };
    const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
        if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
        if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
    };
    const onPaste = (e: React.ClipboardEvent) => {
        const txt = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
        if (!txt) return;
        e.preventDefault();
        const next = ["", "", "", "", "", ""];
        for (let k = 0; k < txt.length; k++) next[k] = txt[k];
        onChange(next);
        refs.current[Math.min(txt.length, 5)]?.focus();
    };

    return (
        <div className={`flex gap-2.5 ${error ? "rp-shake" : ""}`} onPaste={onPaste}>
            {value.map((v, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        refs.current[i] = el;
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    value={v}
                    onChange={(e) => setAt(i, e.target.value)}
                    onKeyDown={(e) => onKey(i, e)}
                    onFocus={(e) => e.target.select()}
                    className={`h-[54px] min-w-0 flex-1 rounded-[10px] border-[1.5px] bg-gray-50 p-0 text-center font-mono text-[22px] font-semibold text-zinc-900 outline-none transition-all focus:border-red-600 focus:bg-white focus:ring-[3px] focus:ring-red-100 ${
                        error
                            ? "border-red-200"
                            : v
                              ? "border-zinc-300 bg-white"
                              : "border-zinc-200"
                    }`}
                />
            ))}
        </div>
    );
}

// ============================================================
// Brand panel (login, large screens)
// ============================================================
function BrandPanel() {
    const t = useTranslations("publicReport");
    const trust = [
        { icon: Zap, title: t("brand.fastTitle"), text: t("brand.fastText") },
        { icon: Shield, title: t("brand.secureTitle"), text: t("brand.secureText") },
        { icon: HistoryIcon, title: t("brand.trackTitle"), text: t("brand.trackText") },
    ];
    return (
        <aside
            className="relative hidden shrink-0 flex-col overflow-hidden border-r border-zinc-200 p-10 md:flex md:basis-[40%] lg:basis-[46%] lg:p-[44px_46px]"
            style={{
                background:
                    "radial-gradient(120% 80% at 100% 0%, rgba(220,38,38,.08), transparent 52%), radial-gradient(90% 80% at 0% 100%, rgba(220,38,38,.05), transparent 50%), linear-gradient(160deg, #ffffff, #f6f6f7)",
            }}
        >
            {/* Watermark "J" mark */}
            <svg
                width="380"
                height="380"
                viewBox="0 0 64 64"
                fill="currentColor"
                aria-hidden
                className="pointer-events-none absolute -bottom-20 -left-16 text-red-600"
                style={{ opacity: 0.05 }}
            >
                <path
                    d="M44 8H20a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h10v28a8 8 0 0 1-16 0v-2a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2a23 23 0 0 0 46 0V10a2 2 0 0 0-2-2z"
                    opacity=".55"
                />
                <path d="M40 20 16 30l7.5 2.6L26 41l3.6-5.8z" />
            </svg>

            <div className="relative shrink-0">
                <img src="/Logo.png" alt="Joda Company" className="h-9 w-auto object-contain" />
            </div>

            <div className="relative mt-auto">
                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    {t("brand.eyebrow")}
                </p>
                <h2 className="m-0 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-900">
                    {t("brand.title")}
                </h2>
                <p className="mt-3 max-w-[320px] text-[14.5px] leading-relaxed text-zinc-500">
                    {t("brand.text")}
                </p>
                <div className="mt-7 flex flex-col gap-[15px]">
                    {trust.map(({ icon: Icon, title, text }) => (
                        <div key={title} className="flex items-center gap-[13px]">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-100 bg-red-50 text-red-600">
                                <Icon className="h-[18px] w-[18px]" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-zinc-900">{title}</div>
                                <div className="text-[12.5px] text-zinc-500">{text}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </aside>
    );
}

export default function PublicReportPage() {
    const t = useTranslations("publicReport");
    const locale = useLocale();

    const [employees, setEmployees] = useState<PublicEmployee[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [employeeId, setEmployeeId] = useState("");
    const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
    const [pinErr, setPinErr] = useState(false);
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
    const [submitErr, setSubmitErr] = useState<string | null>(null);

    const [history, setHistory] = useState<PublicReport[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [showSuccess, setShowSuccess] = useState(false);
    const [freshActive, setFreshActive] = useState(false);
    const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const freshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const pinValue = pin.join("");

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

    useEffect(
        () => () => {
            if (successTimer.current) clearTimeout(successTimer.current);
            if (freshTimer.current) clearTimeout(freshTimer.current);
        },
        []
    );

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
        if (!employeeId) {
            setAuthError(t("errors.noEmployee"));
            return;
        }
        if (pinValue.length < 6) {
            setPinErr(true);
            setAuthError(t("errors.pinIncomplete"));
            setTimeout(() => setPinErr(false), 500);
            return;
        }
        setVerifying(true);
        try {
            const res = await fetch("/api/hr/public/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employee_id: employeeId, pin: pinValue }),
            });
            const json = await res.json();
            if (!res.ok) {
                setPinErr(true);
                setAuthError(json.error || t("errors.invalidCredentials"));
                setTimeout(() => setPinErr(false), 500);
                return;
            }
            const emp: PublicEmployee = json.employee;
            setSession(emp);
            refreshHistory(emp, pinValue);
        } catch {
            setAuthError(t("errors.network"));
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitErr(null);
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
                    pin: pinValue,
                    date: form.date,
                    activites,
                    heures_travaillees: hours,
                    observations: form.observations.trim() || null,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                setSubmitErr(
                    json?.code === "daily_limit"
                        ? t("errors.dailyLimit")
                        : json.error || t("errors.submitFailed")
                );
                return;
            }
            setForm({ date: todayIso(), activites: "", heures_travaillees: "8", observations: "" });
            await refreshHistory(session, pinValue);
            // success overlay
            setShowSuccess(true);
            if (successTimer.current) clearTimeout(successTimer.current);
            successTimer.current = setTimeout(() => setShowSuccess(false), 2600);
            // fresh-row highlight
            setFreshActive(true);
            if (freshTimer.current) clearTimeout(freshTimer.current);
            freshTimer.current = setTimeout(() => setFreshActive(false), 2200);
        } catch {
            setSubmitErr(t("errors.network"));
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        setSession(null);
        setPin(["", "", "", "", "", ""]);
        setEmployeeId("");
        setHistory([]);
        setSubmitErr(null);
        setAuthError(null);
        setShowSuccess(false);
        setForm({ date: todayIso(), activites: "", heures_travaillees: "8", observations: "" });
    };

    const dismissSuccess = () => {
        if (successTimer.current) clearTimeout(successTimer.current);
        setShowSuccess(false);
    };

    const today = todayIso();
    const todayCount = useMemo(
        () => history.filter((r) => r.date === today).length,
        [history, today]
    );
    const remainingToday = Math.max(0, 2 - todayCount);
    const atLimit = remainingToday <= 0;

    const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
    const fmtDate = (s: string) =>
        new Date(`${s}T00:00:00`).toLocaleDateString(dateLocale, {
            weekday: "short",
            day: "numeric",
            month: "short",
        });

    const year = new Date().getFullYear();

    // ---- shared style block (keyframes the design relies on) ----
    const styleBlock = (
        <style>{`
            @keyframes rp-shake { 10%,90%{transform:translateX(-1px)} 30%,70%{transform:translateX(2px)} 50%{transform:translateX(-3px)} }
            .rp-shake { animation: rp-shake .4s; }
            @keyframes rp-freshfade { 0%{background:#dcfce7} 100%{background:transparent} }
            .rp-fresh { animation: rp-freshfade 2.2s ease forwards; }
        `}</style>
    );

    // ============================================================
    // Login step
    // ============================================================
    if (!session) {
        const loginForm = (showBadge: boolean) => (
            <div className="w-full max-w-[380px]">
                {/* mobile logo */}
                <div className="mb-4 md:hidden">
                    <img
                        src="/Logo.png"
                        alt="Joda Company"
                        className="h-[26px] w-auto object-contain"
                    />
                </div>

                {showBadge && (
                    <div className="mx-auto mb-4 grid h-[52px] w-[52px] place-items-center rounded-2xl border border-red-100 bg-red-50 text-red-600">
                        <ClipboardList className="h-6 w-6" />
                    </div>
                )}
                <div className={`mb-[22px] ${showBadge ? "text-center" : "text-left"}`}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                        {t("eyebrow")}
                    </p>
                    <h1 className="mt-1.5 text-[25px] font-semibold tracking-[-0.025em] text-zinc-900">
                        {t("login.heading")}
                    </h1>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                        {t("login.headingSubtitle")}
                    </p>
                </div>

                <form
                    onSubmit={handleVerify}
                    className="overflow-hidden rounded-[14px] border border-zinc-200 bg-white shadow-[0_4px_12px_-3px_rgba(16,16,20,0.08),0_2px_5px_-3px_rgba(16,16,20,0.05)]"
                >
                    <div className="flex flex-col gap-[18px] p-5">
                        <div className="flex flex-col gap-[7px]">
                            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500">
                                <User className="h-[13px] w-[13px]" />
                                {t("login.employee")}
                            </label>
                            <EmployeeSelect
                                employees={employees}
                                value={employeeId}
                                loading={loadingList}
                                onChange={(v) => {
                                    setEmployeeId(v);
                                    setAuthError(null);
                                }}
                            />
                        </div>

                        <div className="flex flex-col gap-[7px]">
                            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500">
                                <KeyRound className="h-[13px] w-[13px]" />
                                {t("login.pin")}
                            </label>
                            <Otp
                                value={pin}
                                error={pinErr}
                                onChange={(v) => {
                                    setPin(v);
                                    setPinErr(false);
                                    setAuthError(null);
                                }}
                            />
                            <span className="text-xs leading-snug text-zinc-400">
                                {t("login.pinHint")}
                            </span>
                        </div>

                        {authError && (
                            <div className="flex items-start gap-2.5 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2.5 text-[12.5px] leading-snug text-red-700">
                                <AlertTriangle className="mt-px h-[15px] w-[15px] shrink-0" />
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={verifying}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-red-600 text-[14.5px] font-semibold text-white shadow-[0_12px_22px_-10px_rgba(220,38,38,0.55)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {verifying && <Loader2 className="h-[18px] w-[18px] animate-spin" />}
                            {t("login.submit")}
                            {!verifying && <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.1} />}
                        </button>

                        <div className="flex items-start gap-2.5 rounded-[10px] border border-zinc-200 bg-gray-50 px-3 py-2.5 text-[12.5px] leading-snug text-zinc-500">
                            <Shield className="mt-px h-[15px] w-[15px] shrink-0" />
                            {t("login.securityNote")}
                        </div>
                    </div>
                </form>

                <p className="mt-3.5 text-center text-[11px] text-zinc-400">
                    {t("footer", { year })}
                </p>
            </div>
        );

        return (
            <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-gray-50 md:flex-row">
                {styleBlock}
                {/* Mobile top bar */}
                <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-5 md:hidden">
                    <img src="/Logo.png" alt="Joda" className="h-[26px] w-auto" />
                    <span className="h-[22px] w-px bg-zinc-200" />
                    <div className="text-[13.5px] font-semibold text-zinc-900">{t("topbarTitle")}</div>
                </div>

                <BrandPanel />

                <main className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-7 md:px-11 md:py-10 lg:px-14">
                    <div className="md:hidden">{loginForm(true)}</div>
                    <div className="hidden md:block">{loginForm(false)}</div>
                </main>
            </div>
        );
    }

    // ============================================================
    // Authenticated step
    // ============================================================
    const e = session;

    const formCard = (
        <div className="overflow-hidden rounded-[14px] border border-zinc-200 bg-white shadow-[0_4px_12px_-3px_rgba(16,16,20,0.08),0_2px_5px_-3px_rgba(16,16,20,0.05)]">
            <div className="flex items-start gap-[11px] border-b border-zinc-100 px-5 py-4">
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] border border-red-100 bg-red-50 text-red-600">
                    <ClipboardList className="h-[18px] w-[18px]" />
                </span>
                <div>
                    <div className="text-[14.5px] font-semibold text-zinc-900">{t("form.title")}</div>
                    <div className="mt-px text-xs text-zinc-500">{t("form.description")}</div>
                </div>
            </div>
            <div className="p-5">
                {atLimit ? (
                    <div className="rounded-[10px] border border-amber-100 bg-amber-50 px-[22px] py-6 text-center">
                        <div className="mx-auto mb-3 grid h-[54px] w-[54px] place-items-center rounded-2xl border border-amber-100 bg-white text-amber-600">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="text-base font-bold text-amber-700">{t("limit.title")}</div>
                        <div className="mx-auto mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-amber-700/85">
                            {t("limit.text")}
                        </div>
                        <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-amber-100 bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            {t("limit.chip")}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                            <div className="flex flex-col gap-[7px]">
                                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500">
                                    <CalendarDays className="h-[13px] w-[13px]" />
                                    {t("form.date")}
                                </label>
                                <input
                                    type="date"
                                    value={form.date}
                                    max={today}
                                    onChange={(ev) => setForm({ ...form, date: ev.target.value })}
                                    className="h-12 rounded-[10px] border border-zinc-200 bg-gray-50 px-3.5 text-[14.5px] text-zinc-900 outline-none transition-all hover:border-zinc-300 focus:border-[#f1a3a3] focus:bg-white focus:ring-[3px] focus:ring-red-100"
                                />
                            </div>
                            <div className="flex flex-col gap-[7px]">
                                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500">
                                    <Clock className="h-[13px] w-[13px]" />
                                    {t("form.hours")}
                                </label>
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="24"
                                    value={form.heures_travaillees}
                                    onChange={(ev) =>
                                        setForm({ ...form, heures_travaillees: ev.target.value })
                                    }
                                    className="h-12 rounded-[10px] border border-zinc-200 bg-gray-50 px-3.5 text-[14.5px] tabular-nums text-zinc-900 outline-none transition-all hover:border-zinc-300 focus:border-[#f1a3a3] focus:bg-white focus:ring-[3px] focus:ring-red-100"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-[7px]">
                            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500">
                                {t("form.activities")} <span className="text-red-600">*</span>
                            </label>
                            <textarea
                                value={form.activites}
                                onChange={(ev) => {
                                    setForm({ ...form, activites: ev.target.value });
                                    setSubmitErr(null);
                                }}
                                placeholder={t("form.activitiesPlaceholder")}
                                className="min-h-[96px] resize-none rounded-[10px] border border-zinc-200 bg-gray-50 px-3.5 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all hover:border-zinc-300 focus:border-[#f1a3a3] focus:bg-white focus:ring-[3px] focus:ring-red-100 placeholder:text-zinc-400"
                            />
                        </div>

                        <div className="flex flex-col gap-[7px]">
                            <label className="text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500">
                                {t("form.observations")}
                            </label>
                            <textarea
                                value={form.observations}
                                onChange={(ev) => setForm({ ...form, observations: ev.target.value })}
                                placeholder={t("form.observationsPlaceholder")}
                                className="min-h-[72px] resize-none rounded-[10px] border border-zinc-200 bg-gray-50 px-3.5 py-3 text-sm leading-relaxed text-zinc-900 outline-none transition-all hover:border-zinc-300 focus:border-[#f1a3a3] focus:bg-white focus:ring-[3px] focus:ring-red-100 placeholder:text-zinc-400"
                            />
                        </div>

                        {submitErr && (
                            <div className="flex items-start gap-2.5 rounded-[10px] border border-red-100 bg-red-50 px-3 py-2.5 text-[12.5px] leading-snug text-red-700">
                                <AlertTriangle className="mt-px h-[15px] w-[15px] shrink-0" />
                                {submitErr}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-red-600 text-[14.5px] font-semibold text-white shadow-[0_12px_22px_-10px_rgba(220,38,38,0.55)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? (
                                <Loader2 className="h-[17px] w-[17px] animate-spin" />
                            ) : (
                                <Send className="h-[17px] w-[17px]" />
                            )}
                            {t("form.submit")}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );

    const historyCard = (
        <div className="overflow-hidden rounded-[14px] border border-zinc-200 bg-white shadow-[0_4px_12px_-3px_rgba(16,16,20,0.08),0_2px_5px_-3px_rgba(16,16,20,0.05)]">
            <div className="flex items-center gap-[11px] border-b border-zinc-100 px-5 py-4">
                <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] border border-red-100 bg-red-50 text-red-600">
                    <HistoryIcon className="h-[18px] w-[18px]" />
                </span>
                <div className="flex-1">
                    <div className="text-[14.5px] font-semibold text-zinc-900">{t("history.title")}</div>
                    <div className="mt-px text-xs text-zinc-500">{t("history.description")}</div>
                </div>
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-zinc-800">
                    {history.length}
                </span>
            </div>
            {loadingHistory ? (
                <div className="py-10 text-center text-zinc-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </div>
            ) : history.length === 0 ? (
                <div className="px-5 py-10 text-center text-zinc-400">
                    <HistoryIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="text-[13px]">{t("history.empty")}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                {[t("history.col.date"), t("history.col.hours"), t("history.col.activities")].map(
                                    (h) => (
                                        <th
                                            key={h}
                                            className="border-b border-zinc-200 bg-gray-50 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] text-zinc-500"
                                        >
                                            {h}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((r, idx) => (
                                <tr
                                    key={r.id}
                                    className={`border-b border-zinc-100 last:border-0 ${
                                        freshActive && idx === 0 ? "rp-fresh" : ""
                                    }`}
                                >
                                    <td className="whitespace-nowrap px-4 py-3 align-top text-[13px] font-semibold text-zinc-800">
                                        {fmtDate(r.date)}
                                        {r.date === today && (
                                            <span className="ml-1.5 inline-block rounded-full border border-red-100 bg-red-50 px-1.5 py-px align-middle text-[9.5px] font-bold uppercase tracking-[0.06em] text-red-600">
                                                {t("todayBadge")}
                                            </span>
                                        )}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 align-top">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11.5px] font-semibold tabular-nums text-zinc-800">
                                            <Clock className="h-3 w-3" />
                                            {r.heures_travaillees}h
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-top text-[13px] leading-relaxed text-zinc-500">
                                        {r.activites.length > 90
                                            ? `${r.activites.slice(0, 90)}…`
                                            : r.activites}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-gray-50">
            {styleBlock}

            {/* Top app bar */}
            <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-5">
                <img src="/Logo.png" alt="Joda" className="h-[26px] w-auto" />
                <span className="h-[22px] w-px bg-zinc-200" />
                <div className="leading-tight">
                    <div className="text-[13.5px] font-semibold text-zinc-900">{t("topbarTitle")}</div>
                    <div className="text-[11px] font-medium text-zinc-400">{t("topbarSubtitle")}</div>
                </div>
                <div className="flex-1" />
                <div className="hidden items-center gap-2.5 rounded-full border border-zinc-200 bg-white py-[5px] pl-2.5 pr-1.5 sm:inline-flex">
                    <span className="text-right leading-tight">
                        <span className="block text-[12.5px] font-semibold text-zinc-900">
                            {e.prenom} {e.nom}
                        </span>
                        {e.poste && <span className="block text-[10.5px] text-zinc-500">{e.poste}</span>}
                    </span>
                    <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-red-600 text-[11px] font-bold text-white">
                        {initials(e)}
                    </span>
                </div>
                <button
                    onClick={handleLogout}
                    className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-zinc-200 bg-white px-3 text-[12.5px] font-semibold text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-gray-50 hover:text-red-600"
                >
                    <LogOut className="h-[15px] w-[15px]" />
                    <span className="hidden sm:inline">{t("logout")}</span>
                </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-[620px] px-4 py-6 lg:max-w-[1060px] lg:px-7 lg:py-8">
                    <div className="flex flex-col gap-4">
                        {/* Statbar */}
                        <div className="flex flex-wrap items-center gap-4 rounded-[14px] border border-zinc-200 bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(16,16,20,0.05)]">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-red-600 text-base font-bold text-white">
                                    {initials(e)}
                                </span>
                                <div className="min-w-0">
                                    <div className="text-[11.5px] text-zinc-500">{t("greeting")}</div>
                                    <div className="truncate text-base font-semibold tracking-[-0.01em] text-zinc-900">
                                        {e.prenom} {e.nom}
                                    </div>
                                    {e.poste && (
                                        <div className="truncate text-xs text-zinc-500">{e.poste}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2.5">
                                <div className="min-w-[96px] rounded-xl border border-zinc-200 bg-gray-50 px-3.5 py-2.5 text-center">
                                    <div className="flex items-center justify-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-zinc-500">
                                        <CalendarDays className="h-[11px] w-[11px]" />
                                        {t("dateLabel")}
                                    </div>
                                    <div className="mt-0.5 text-[15px] font-bold tabular-nums text-zinc-900">
                                        {new Date().toLocaleDateString(dateLocale, {
                                            day: "2-digit",
                                            month: "2-digit",
                                        })}
                                    </div>
                                </div>
                                <div
                                    className={`min-w-[96px] rounded-xl border px-3.5 py-2.5 text-center ${
                                        atLimit
                                            ? "border-amber-100 bg-amber-50"
                                            : "border-green-100 bg-green-50"
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.08em] ${
                                            atLimit ? "text-amber-700" : "text-green-700"
                                        }`}
                                    >
                                        <ClipboardList className="h-[11px] w-[11px]" />
                                        {t("remainingShort")}
                                    </div>
                                    <div
                                        className={`mt-0.5 text-[15px] font-bold tabular-nums ${
                                            atLimit ? "text-amber-700" : "text-green-700"
                                        }`}
                                    >
                                        {remainingToday}/2
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form + history */}
                        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                            {formCard}
                            {historyCard}
                        </div>
                    </div>
                    <p className="mt-[18px] text-center text-[11px] text-zinc-400">
                        {t("footerShort", { year })}
                    </p>
                </div>
            </div>

            {/* Success overlay */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        className="absolute inset-0 z-[60] grid place-items-center p-6"
                        style={{ background: "rgba(24,24,27,.42)", backdropFilter: "blur(3px)" }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={dismissSuccess}
                    >
                        <motion.div
                            className="w-full max-w-[320px] rounded-[20px] bg-white px-[26px] py-[30px] text-center shadow-[0_24px_50px_-16px_rgba(16,16,20,0.18),0_8px_18px_-10px_rgba(16,16,20,0.1)]"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.32, ease: [0.34, 1.56, 0.64, 1] }}
                            onClick={(ev) => ev.stopPropagation()}
                        >
                            <div className="mx-auto mb-4 grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-green-100 bg-green-50 text-green-600">
                                <Check className="h-9 w-9" strokeWidth={3} />
                            </div>
                            <div className="text-lg font-bold text-zinc-900">{t("success.title")}</div>
                            <div className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-500">
                                {t("success.message", { name: e.prenom })}{" "}
                                {remainingToday > 0
                                    ? t("success.remaining", { count: remainingToday })
                                    : t("success.limitReached")}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
