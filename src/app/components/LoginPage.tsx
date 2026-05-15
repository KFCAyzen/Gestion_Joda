"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useRouter as useIntlRouter, usePathname } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "../context/ThemeContext";
import { locales, defaultLocale } from "@/i18n/config";
import { buildStudentAuthEmail } from "../lib/student-auth";
import {
    slideUp,
    scaleIn,
    fadeIn,
    overlayVariants,
    buttonTap,
    heroEntrance,
    titleReveal,
    staggerContainer,
    staggerItem,
} from "../utils/animations";

export default function LoginPage() {
    const router = useRouter();
    const intlRouter = useIntlRouter();
    const pathname = usePathname();
    const { login, user } = useAuth();
    const { theme, setTheme } = useTheme();
    const locale = useLocale();
    const t = useTranslations("login");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [shakeError, setShakeError] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotInput, setForgotInput] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotSent, setForgotSent] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const langMenuRef = useRef<HTMLDivElement>(null);

    // Close language menu when clicking outside or pressing Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && showLangMenu) {
                setShowLangMenu(false);
            }
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

    useEffect(() => {
        if (typeof window !== "undefined") {
            document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.width = "100%";
            document.body.style.height = "100%";
            return () => {
                document.body.style.overflow = "";
                document.body.style.position = "";
                document.body.style.width = "";
                document.body.style.height = "";
            };
        }
    }, []);

    const triggerShake = () => {
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

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotInput.trim()) return;
        setForgotLoading(true);
        try {
            const isEmail = forgotInput.includes("@");
            await fetch("/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
                    isEmail
                        ? { email: forgotInput.trim() }
                        : { username: forgotInput.trim() }
                ),
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
    };

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const switchLocale = (newLocale: string) => {
        intlRouter.replace(pathname, { locale: newLocale });
        setShowLangMenu(false);
    };

    const getThemeLabel = () => {
        return theme === "dark" ? t("lightMode") : t("darkMode");
    };

    const EyeIcon = ({ visible }: { visible: boolean }) =>
        visible ? (
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
        ) : (
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
        );

    return (
        <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black"
            style={{ touchAction: "none" }}
            variants={fadeIn}
            initial="initial"
            animate="animate"
        >
            <motion.img
                src="/3353.jpg"
                alt="Background"
                className="absolute inset-0 h-full w-full object-cover"
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <motion.div className="absolute inset-0 bg-black/70" variants={overlayVariants} initial="initial" animate="animate" />

            {[...Array(6)].map((_, index) => (
                <motion.div
                    key={index}
                    className="absolute rounded-full bg-red-500/20 blur-xl"
                    style={{
                        width: 80 + index * 40,
                        height: 80 + index * 40,
                        left: `${10 + index * 15}%`,
                        top: `${20 + (index % 3) * 25}%`,
                    }}
                    animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.2], scale: [1, 1.1, 1] }}
                    transition={{ duration: 3 + index, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 }}
                />
            ))}

            <motion.div
                className="relative w-full max-w-5xl h-full sm:h-[85vh] sm:w-[90vw] lg:h-[75vh] lg:w-[80vw]"
                variants={scaleIn}
                initial="initial"
                animate="animate"
            >
                {/* Settings Buttons - Top Right */}
                <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
                    {/* Dark Mode Toggle */}
                    <motion.button
                        onClick={toggleTheme}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg transition-colors hover:bg-gray-100 dark:bg-gray-800/90 dark:hover:bg-gray-700"
                        aria-label={getThemeLabel()}
                        whileHover={{ scale: 1.1 }}
                        whileTap={buttonTap}
                    >
                        {theme === "dark" ? (
                            <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                            </svg>
                        )}
                    </motion.button>

                    {/* Language Switcher */}
                    <div className="relative" ref={langMenuRef}>
                        <motion.button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex h-10 items-center gap-1.5 rounded-full bg-white/90 px-3 backdrop-blur-sm shadow-lg transition-colors hover:bg-gray-100 dark:bg-gray-800/90 dark:hover:bg-gray-700"
                            aria-label={t("changeLanguage")}
                            aria-haspopup="true"
                            aria-expanded={showLangMenu}
                            whileHover={{ scale: 1.05 }}
                            whileTap={buttonTap}
                        >
                            <svg className="h-4 w-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            <span className="text-sm font-medium uppercase text-gray-700 dark:text-gray-300">
                                {locale === "fr" ? "FR" : "EN"}
                            </span>
                            <svg className="h-3 w-3 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </motion.button>

                        {/* Language Dropdown */}
                        <AnimatePresence>
                            {showLangMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-32 rounded-xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-50"
                                >
                                    {locales.map((loc) => (
                                        <button
                                            key={loc}
                                            onClick={() => switchLocale(loc)}
                                            className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 ${
                                                locale === loc ? "text-red-600 bg-red-50 dark:bg-red-900/20" : "text-gray-700 dark:text-gray-300"
                                            }`}
                                        >
                                            <span className="flex h-4 w-4 items-center justify-center text-xs font-bold uppercase">
                                                {loc === "fr" ? "🇫🇷" : "🇬🇧"}
                                            </span>
                                            {loc === "fr" ? t("french") : t("english")}
                                            {locale === loc && (
                                                <svg className="ml-auto h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <motion.div
                    className="relative h-full w-full overflow-hidden sm:rounded-2xl"
                    style={{
                        background: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(40px) saturate(180%)",
                        border: "1px solid rgba(220,38,38,0.3)",
                        boxShadow: "0 50px 100px rgba(0,0,0,0.8), 0 0 60px rgba(220,38,38,0.25), inset 0 1px 0 rgba(220,38,38,0.15)",
                    }}
                    animate={{
                        boxShadow: [
                            "0 50px 100px rgba(0,0,0,0.8), 0 0 40px rgba(220,38,38,0.15)",
                            "0 50px 100px rgba(0,0,0,0.8), 0 0 80px rgba(220,38,38,0.35)",
                            "0 50px 100px rgba(0,0,0,0.8), 0 0 40px rgba(220,38,38,0.15)",
                        ],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="flex h-full flex-col lg:grid lg:grid-cols-[1.2fr_1fr]">
                        {/* Panneau image */}
                        <motion.div
                            className="relative overflow-hidden h-48 sm:h-2/5 lg:h-full"
                            initial={{ x: -60, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <motion.img
                                src="/23704.jpg"
                                alt="Login visual"
                                className="absolute inset-0 h-full w-full object-cover"
                                initial={{ scale: 1.15 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <motion.div className="px-4 text-center" variants={staggerContainer} initial="initial" animate="animate">
                                    <motion.div
                                        className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-white p-3 shadow-[0_10px_25px_rgba(0,0,0,0.5)] sm:mb-4 sm:h-24 sm:w-24 sm:p-4 lg:mb-6 lg:h-28 lg:w-28 lg:p-5"
                                        variants={heroEntrance}
                                        whileHover={{ rotate: [0, -5, 5, 0], scale: 1.08, transition: { duration: 0.4 } }}
                                    >
                                        <img src="/Logo.png" alt="Joda Company Logo" className="h-full w-full object-contain" />
                                    </motion.div>
                                    <motion.h1 className="text-xl font-bold tracking-wider text-black lg:text-3xl" variants={titleReveal}>
                                        Joda Company
                                    </motion.h1>
                                    <motion.p className="text-sm font-semibold text-black lg:text-lg" variants={staggerItem}>
                                        Gestion des bourses
                                    </motion.p>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Panneau formulaire */}
                        <motion.div
                            className="flex flex-1 flex-col justify-center overflow-y-auto px-6 py-8 text-gray-900 dark:text-gray-100 sm:p-8 lg:p-10 bg-white/[0.97] dark:bg-slate-900/[0.97]"
                            style={{ backdropFilter: "blur(20px)" }}
                            initial={{ x: 60, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                        >
                            <motion.div
                                className="mx-auto w-full max-w-sm self-center"
                                variants={slideUp}
                                initial="initial"
                                animate="animate"
                            >
                                <motion.div
                                    className="mb-6 lg:mb-8"
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.5 }}
                                >
                                    <h2 className="mb-1 text-2xl font-light lg:text-3xl">{t("title")}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
                                </motion.div>

                                <motion.form
                                    onSubmit={handleSubmit}
                                    className="space-y-4"
                                    animate={shakeError ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            {t("identifier")}
                                        </label>
                                        <motion.input
                                            type="text"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-red-400 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30"
                                            required
                                            autoComplete="username"
                                            whileFocus={{ scale: 1.01 }}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 }}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                            {t("password")}
                                        </label>
                                        <motion.div className="relative" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.38 }}>
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3.5 pr-12 text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-red-400 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900/30"
                                                placeholder={t("passwordPlaceholder")}
                                                required
                                                autoComplete="current-password"
                                            />
                                            <motion.button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-red-500"
                                                whileTap={buttonTap}
                                            >
                                                <EyeIcon visible={showPassword} />
                                            </motion.button>
                                        </motion.div>
                                    </div>

                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                variants={slideUp}
                                                initial="initial"
                                                animate="animate"
                                                exit="exit"
                                                className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-2 text-center text-xs font-medium text-red-500 sm:rounded-xl sm:p-3 sm:text-sm"
                                            >
                                                {error}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full rounded-xl bg-red-600 px-4 py-4 text-base font-semibold text-white shadow-[0_16px_32px_rgba(220,38,38,0.35)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={buttonTap}
                                        initial={{ opacity: 0, y: 15 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        {loading ? (
                                            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                                                {t("submitting")}
                                            </motion.span>
                                        ) : (
                                            t("submit")
                                        )}
                                    </motion.button>
                                </motion.form>

                                <motion.div
                                    className="mt-6 text-center"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => { setShowForgotPassword(true); setForgotInput(""); setForgotSent(false); }}
                                        className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                        {t("forgotPassword")}
                                    </button>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Forgot password overlay */}
            <AnimatePresence>
                {showForgotPassword && (
                    <motion.div
                        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeForgotPassword}
                    >
                        <motion.div
                            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl"
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {forgotSent ? (
                                    <div className="text-center py-4">
                                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                                            <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{t("emailSent")}</h3>
                                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                            {t("emailSentMessage")}
                                        </p>
                                        <button
                                            onClick={closeForgotPassword}
                                            className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                                        >
                                            {t("backToLogin")}
                                        </button>
                                    </div>
                            ) : (
                                <>
                                    <div className="mb-5">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("forgotTitle")}</h3>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
                                            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                                        />
                                        <button
                                            type="submit"
                                            disabled={forgotLoading}
                                            className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] hover:bg-red-700 disabled:opacity-50 transition-colors"
                                        >
                                            {forgotLoading ? t("sending") : t("sendLink")}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={closeForgotPassword}
                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-800/50 transition-colors"
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
