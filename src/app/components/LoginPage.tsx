"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRouter as useIntlRouter, usePathname } from "@/i18n/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
    User,
    Mail,
    Lock,
    Eye,
    EyeOff,
    GraduationCap,
    Shield,
    ShieldCheck,
    Check,
    ArrowRight,
    Globe,
    Moon,
    Sun,
    ChevronDown,
    Users,
    Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "../context/ThemeContext";
import { locales } from "@/i18n/config";
import { buildStudentAuthEmail } from "../lib/student-auth";

type Audience = "etudiant" | "equipe";

export default function LoginPage() {
    const router = useRouter();
    const intlRouter = useIntlRouter();
    const pathname = usePathname();
    const { login, user } = useAuth();
    const { theme, setTheme } = useTheme();
    const locale = useLocale();
    const t = useTranslations("login");
    const reduceMotion = useReducedMotion();

    const [audience, setAudience] = useState<Audience>("etudiant");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [shakeError, setShakeError] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotInput, setForgotInput] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);
    const [forgotChannel, setForgotChannel] = useState<"email" | "sms">("email");
    const [showLangMenu, setShowLangMenu] = useState(false);
    const langMenuRef = useRef<HTMLDivElement>(null);

    const isStudent = audience === "etudiant";

    // Close language menu on Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && showLangMenu) setShowLangMenu(false);
        };
        if (showLangMenu) {
            document.addEventListener("keydown", handleEscape);
            return () => document.removeEventListener("keydown", handleEscape);
        }
    }, [showLangMenu]);

    // Close language menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
                setShowLangMenu(false);
            }
        };
        if (showLangMenu) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showLangMenu]);

    useEffect(() => {
        if (user) {
            router.push(user.role === "student" ? "/etudiant" : "/tableau-de-bord");
        }
    }, [user, router]);

    const triggerShake = () => {
        if (reduceMotion) return;
        setShakeError(true);
        setTimeout(() => setShakeError(false), 600);
    };

    const resolveEmail = (value: string) =>
        value.includes("@") ? value.trim() : buildStudentAuthEmail(value.trim());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await login(resolveEmail(identifier), password);
            if (result.success) return; // useEffect handles redirect
            setError(result.message || t("errorDefault"));
            triggerShake();
        } catch {
            setError(t("errorDefault"));
            triggerShake();
        }

        setLoading(false);
    };

    const forgotIsEmail = forgotInput.includes("@");

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotInput.trim()) return;
        setForgotLoading(true);
        try {
            const body = forgotIsEmail
                ? { email: forgotInput.trim() }
                : { username: forgotInput.trim(), channel: forgotChannel };
            await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        } catch {
            // Silently ignore — always show success to prevent enumeration
        }
        setForgotLoading(false);
        setForgotSent(true);
    };

    const closeForgotPassword = () => {
        setShowForgotPassword(false);
        setForgotInput("");
        setForgotSent(false);
        setForgotChannel("email");
    };

    const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

    const switchLocale = (newLocale: string) => {
        intlRouter.replace(pathname, { locale: newLocale });
        setShowLangMenu(false);
    };

    const getThemeLabel = () => (theme === "dark" ? t("lightMode") : t("darkMode"));

    // ---- top-right controls (locale + theme) ----
    const TopControls = (
        <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-5 sm:top-5">
            <div className="relative" ref={langMenuRef}>
                <button
                    type="button"
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    aria-label={t("changeLanguage")}
                    aria-haspopup="true"
                    aria-expanded={showLangMenu}
                    data-testid="lang-switcher"
                    className="flex h-[38px] items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-zinc-800 shadow-[0_1px_2px_rgba(16,16,20,0.05)] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                    <Globe className="h-[15px] w-[15px]" />
                    {locale === "fr" ? "FR" : "EN"}
                    <ChevronDown className="h-[13px] w-[13px]" />
                </button>
                <AnimatePresence>
                    {showLangMenu && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-36 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                        >
                            {locales.map((loc) => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => switchLocale(loc)}
                                    data-testid={`lang-option-${loc}`}
                                    className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 ${
                                        locale === loc
                                            ? "bg-red-50 text-red-600 dark:bg-red-900/20"
                                            : "text-zinc-700 dark:text-zinc-300"
                                    }`}
                                >
                                    <span className="text-xs">{loc === "fr" ? "🇫🇷" : "🇬🇧"}</span>
                                    {loc === "fr" ? t("french") : t("english")}
                                    {locale === loc && <Check className="ml-auto h-4 w-4 text-red-600" />}
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <button
                type="button"
                onClick={toggleTheme}
                aria-label={getThemeLabel()}
                data-testid="theme-toggle"
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-[0_1px_2px_rgba(16,16,20,0.05)] transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
                {theme === "dark" ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4" />}
            </button>
        </div>
    );

    // ---- the shared form (JSX element, not a component — avoids remount/focus loss) ----
    const staffForm = (
        <div className="w-full max-w-[360px]">
            {/* Logo — shown above the form on mobile only (brand panel carries it on desktop) */}
            <div className="mb-6 lg:hidden">
                <img src="/Logo.png" alt="Joda Company" className="h-[38px] w-auto object-contain" />
            </div>

            <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-400 dark:text-zinc-500">
                    {t("eyebrow")}
                </p>
                <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.025em] text-zinc-900 dark:text-zinc-50">
                    {t("greeting")}
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("subtitle")}</p>
            </div>

            {/* Segmented control — display-only audience hint */}
            <div
                role="tablist"
                aria-label={t("eyebrow")}
                className="mb-[18px] grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={isStudent}
                    onClick={() => setAudience("etudiant")}
                    className={`flex h-[38px] items-center justify-center gap-2 rounded-[9px] text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${
                        isStudent
                            ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,16,20,0.05)] dark:bg-zinc-950 dark:text-zinc-50"
                            : "text-zinc-500 dark:text-zinc-400"
                    }`}
                >
                    <GraduationCap
                        className={`h-[15px] w-[15px] ${isStudent ? "text-red-600" : "text-zinc-400"}`}
                    />
                    {t("audienceStudent")}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={!isStudent}
                    onClick={() => setAudience("equipe")}
                    className={`flex h-[38px] items-center justify-center gap-2 rounded-[9px] text-[13px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${
                        !isStudent
                            ? "bg-white text-zinc-900 shadow-[0_1px_2px_rgba(16,16,20,0.05)] dark:bg-zinc-950 dark:text-zinc-50"
                            : "text-zinc-500 dark:text-zinc-400"
                    }`}
                >
                    <Shield className={`h-[15px] w-[15px] ${!isStudent ? "text-red-600" : "text-zinc-400"}`} />
                    {t("audienceTeam")}
                </button>
            </div>

            <motion.form
                onSubmit={handleSubmit}
                className="flex flex-col gap-3.5"
                animate={shakeError ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
                transition={{ duration: 0.5 }}
            >
                <div>
                    <label
                        htmlFor="login-identifier"
                        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500 dark:text-zinc-400"
                    >
                        {isStudent ? t("identifierStudentLabel") : t("identifierTeamLabel")}
                    </label>
                    <div className="group flex h-[50px] items-center gap-2.5 rounded-xl border border-zinc-200 bg-gray-50 px-3.5 transition-all focus-within:border-[#f1a3a3] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-red-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:focus-within:bg-zinc-800 dark:focus-within:ring-red-900/30">
                        {isStudent ? (
                            <User className="h-[18px] w-[18px] shrink-0 text-zinc-400 transition-colors group-focus-within:text-red-600" />
                        ) : (
                            <Mail className="h-[18px] w-[18px] shrink-0 text-zinc-400 transition-colors group-focus-within:text-red-600" />
                        )}
                        <input
                            id="login-identifier"
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder={
                                isStudent
                                    ? t("identifierStudentPlaceholder")
                                    : t("identifierTeamPlaceholder")
                            }
                            required
                            autoComplete="username"
                            inputMode={isStudent ? "text" : "email"}
                            data-testid="login-identifier"
                            className="w-full bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        />
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="login-password"
                        className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500 dark:text-zinc-400"
                    >
                        {t("password")}
                    </label>
                    <div className="group flex h-[50px] items-center gap-2.5 rounded-xl border border-zinc-200 bg-gray-50 px-3.5 transition-all focus-within:border-[#f1a3a3] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-red-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:focus-within:bg-zinc-800 dark:focus-within:ring-red-900/30">
                        <Lock className="h-[18px] w-[18px] shrink-0 text-zinc-400 transition-colors group-focus-within:text-red-600" />
                        <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t("passwordPlaceholder")}
                            required
                            autoComplete="current-password"
                            data-testid="login-password"
                            className="w-full bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? t("password") : t("password")}
                            className="shrink-0 text-zinc-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:text-red-600"
                        >
                            {showPassword ? (
                                <Eye className="h-[18px] w-[18px]" />
                            ) : (
                                <EyeOff className="h-[18px] w-[18px]" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="mt-0.5 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => setRemember(!remember)}
                        className="inline-flex items-center gap-2 text-[13px] text-zinc-500 focus-visible:outline-none dark:text-zinc-400"
                    >
                        <span
                            className={`grid h-[18px] w-[18px] place-items-center rounded-md border transition-colors ${
                                remember
                                    ? "border-red-600 bg-red-600 text-white"
                                    : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800"
                            }`}
                        >
                            {remember && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        {t("rememberMe")}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowForgotPassword(true);
                            setForgotInput("");
                            setForgotSent(false);
                        }}
                        data-testid="login-forgot-btn"
                        className="text-[13px] font-semibold text-red-600 transition-colors hover:text-red-700 focus-visible:outline-none focus-visible:underline"
                    >
                        {t("forgotPassword")}
                    </button>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-center text-[13px] font-medium text-red-600 dark:border-red-800 dark:bg-red-900/20"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    type="submit"
                    disabled={loading}
                    data-testid="login-submit"
                    className="mt-1 flex h-[50px] w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-[14.5px] font-semibold text-white shadow-[0_12px_24px_-8px_rgba(220,38,38,0.45)] transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? t("submitting") : t("submit")}
                    {!loading && <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.1} />}
                </button>
            </motion.form>

            <div className="mt-4 flex items-start gap-2.5 rounded-[9px] border border-zinc-200 bg-gray-50 px-3.5 py-3 dark:border-zinc-700 dark:bg-zinc-800/40">
                {isStudent ? (
                    <Sparkles className="mt-px h-[15px] w-[15px] shrink-0 text-zinc-400" />
                ) : (
                    <ShieldCheck className="mt-px h-[15px] w-[15px] shrink-0 text-zinc-400" />
                )}
                <span className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {isStudent ? t("noteStudent") : t("noteTeam")}
                </span>
            </div>

            <div className="my-4 flex items-center gap-3 text-xs text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
                {t("or")}
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <a
                href={`/${locale}/register`}
                className="flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
                <Users className="h-4 w-4" />
                {t("createStudentAccount")}
            </a>
        </div>
    );

    return (
        <motion.div
            className="fixed inset-0 z-[9999] overflow-y-auto bg-white dark:bg-zinc-950"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {TopControls}

            <div className="grid min-h-full lg:grid-cols-[42%_58%]">
                {/* Brand panel — desktop only */}
                <aside className="relative hidden flex-col overflow-hidden border-r border-zinc-200 p-10 dark:border-zinc-800 lg:flex bg-[radial-gradient(120%_80%_at_100%_0%,rgba(220,38,38,0.07),transparent_52%),radial-gradient(90%_70%_at_0%_100%,rgba(220,38,38,0.05),transparent_50%),linear-gradient(160deg,#ffffff,#f7f7f8)] dark:bg-[linear-gradient(160deg,#09090b,#18181b)]">
                    {/* Watermark */}
                    <svg
                        aria-hidden
                        viewBox="0 0 64 64"
                        className="pointer-events-none absolute -bottom-20 -left-16 h-[420px] w-[420px] text-red-600 opacity-[0.05]"
                        fill="currentColor"
                    >
                        <path
                            d="M44 8H20a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h10v28a8 8 0 0 1-16 0v-2a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2a23 23 0 0 0 46 0V10a2 2 0 0 0-2-2z"
                            opacity=".55"
                        />
                        <path d="M40 20 16 30l7.5 2.6L26 41l3.6-5.8z" />
                    </svg>

                    <div className="relative">
                        <img src="/Logo.png" alt="Joda Company" className="h-[38px] w-auto object-contain" />
                    </div>

                    <div className="relative mt-auto">
                        <h2 className="text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-zinc-900 dark:text-zinc-50">
                            {t("brandTitle")}
                        </h2>
                        <p className="mb-7 mt-3 max-w-[300px] text-[14.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {t("brandText")}
                        </p>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] border border-red-100 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20">
                                    <GraduationCap className="h-[18px] w-[18px]" />
                                </div>
                                <div>
                                    <div className="text-[14.5px] font-semibold text-zinc-900 dark:text-zinc-100">
                                        {t("trustStudentsTitle")}
                                    </div>
                                    <div className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                                        {t("trustStudentsText")}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] border border-red-100 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20">
                                    <ShieldCheck className="h-[18px] w-[18px]" />
                                </div>
                                <div>
                                    <div className="text-[14.5px] font-semibold text-zinc-900 dark:text-zinc-100">
                                        {t("trustSecureTitle")}
                                    </div>
                                    <div className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
                                        {t("trustSecureText")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Form panel */}
                <main className="flex items-center justify-center px-7 py-16 sm:px-10 lg:px-12 lg:py-10">
                    {staffForm}
                </main>
            </div>

            {/* Forgot password overlay */}
            <AnimatePresence>
                {showForgotPassword && (
                    <motion.div
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeForgotPassword}
                    >
                        <motion.div
                            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_24px_50px_-16px_rgba(16,16,20,0.2)] dark:border-zinc-800 dark:bg-zinc-900"
                            initial={{ scale: 0.94, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {forgotSent ? (
                                <div className="py-4 text-center">
                                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-green-100 dark:bg-green-900/30">
                                        <Check className="h-7 w-7 text-green-600" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                        {t("credentialsSent")}
                                    </h3>
                                    <p className="mb-6 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                                        {t("credentialsSentMessage")}
                                    </p>
                                    <button
                                        onClick={closeForgotPassword}
                                        className="h-[46px] w-full rounded-xl bg-red-600 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                                    >
                                        {t("backToLogin")}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                            {t("forgotTitle")}
                                        </h3>
                                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                            {t("forgotDescription")}
                                        </p>
                                    </div>
                                    <form onSubmit={handleForgotPassword} className="space-y-4">
                                        <input
                                            type="text"
                                            value={forgotInput}
                                            onChange={(e) => setForgotInput(e.target.value)}
                                            placeholder={t("forgotInputPlaceholder")}
                                            required
                                            data-testid="forgot-input"
                                            className="h-[50px] w-full rounded-xl border border-zinc-200 bg-gray-50 px-4 text-sm text-zinc-900 outline-none transition-all focus:border-[#f1a3a3] focus:bg-white focus:ring-[3px] focus:ring-red-100 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-100 dark:focus:bg-zinc-800"
                                        />
                                        {forgotInput.trim() && !forgotIsEmail && (
                                            <div className="space-y-2">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500 dark:text-zinc-400">
                                                    {t("channelLabel")}
                                                </p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setForgotChannel("email")}
                                                        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                                                            forgotChannel === "email"
                                                                ? "border-red-500 bg-red-50 text-red-600 dark:border-red-400 dark:bg-red-900/20"
                                                                : "border-zinc-200 text-zinc-500 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                                                        }`}
                                                    >
                                                        <Mail className="h-4 w-4" />
                                                        Email
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setForgotChannel("sms")}
                                                        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                                                            forgotChannel === "sms"
                                                                ? "border-red-500 bg-red-50 text-red-600 dark:border-red-400 dark:bg-red-900/20"
                                                                : "border-zinc-200 text-zinc-500 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                                                        }`}
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                        SMS
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={forgotLoading}
                                            data-testid="forgot-submit"
                                            className="h-[50px] w-full rounded-xl bg-red-600 text-sm font-semibold text-white shadow-[0_12px_24px_-8px_rgba(220,38,38,0.45)] transition-colors hover:bg-red-700 disabled:opacity-60"
                                        >
                                            {forgotLoading ? t("sending") : t("sendCredentials")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={closeForgotPassword}
                                            data-testid="forgot-cancel"
                                            className="h-[46px] w-full rounded-xl border border-zinc-200 text-sm font-medium text-zinc-500 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                                        >
                                            {t("cancel")}
                                        </button>
                                    </form>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
