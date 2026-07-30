"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { sanitizePasswordInput } from "../lib/password";

/**
 * Écran d'arrivée du lien de réinitialisation. Le token vient de l'URL ; le mot de
 * passe actuel de l'utilisateur reste valide jusqu'à la validation de ce formulaire.
 */
export default function ResetPasswordPage() {
    const t = useTranslations("resetPassword");
    const router = useRouter();
    const locale = useLocale();
    const token = useSearchParams().get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError(t("errorMissingToken"));
            return;
        }

        // Nettoyage identique à la connexion : sinon un mot de passe défini avec une
        // espace finale serait ensuite refusé par un login qui, lui, la retire.
        const cleaned = sanitizePasswordInput(password);

        if (cleaned.length < 8) {
            setError(t("errorTooShort"));
            return;
        }
        if (cleaned !== sanitizePasswordInput(confirm)) {
            setError(t("errorMismatch"));
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/reset-password/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password: cleaned }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data?.error || t("errorDefault"));
                return;
            }
            setDone(true);
        } catch {
            setError(t("errorDefault"));
        } finally {
            setLoading(false);
        }
    };

    const inputWrap =
        "group flex h-[50px] items-center gap-2.5 rounded-xl border border-zinc-200 bg-gray-50 px-3.5 transition-all focus-within:border-[#f1a3a3] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-red-100 dark:border-zinc-700 dark:bg-zinc-800/50 dark:focus-within:bg-zinc-800 dark:focus-within:ring-red-900/30";
    const inputBase =
        "w-full bg-transparent text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500";
    const labelBase =
        "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500 dark:text-zinc-400";

    return (
        <div className="grid min-h-screen place-items-center bg-gray-50 p-5 dark:bg-zinc-950">
            <div className="w-full max-w-[400px] rounded-2xl border border-zinc-200 bg-white p-7 shadow-[0_4px_24px_-6px_rgba(16,16,20,0.10)] dark:border-zinc-800 dark:bg-zinc-900">
                <img src="/Logo.png" alt="Joda Company" className="mx-auto mb-6 h-7 w-auto object-contain" />

                {done ? (
                    <div className="text-center">
                        <CheckCircle2 className="mx-auto mb-4 h-11 w-11 text-emerald-500" />
                        <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">
                            {t("successTitle")}
                        </h1>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {t("successMessage")}
                        </p>
                        <button
                            onClick={() => router.push(`/${locale}/login`)}
                            className="mt-6 h-11 w-full rounded-[10px] bg-red-600 text-[14px] font-semibold text-white transition-colors hover:bg-red-700"
                        >
                            {t("backToLogin")}
                        </button>
                    </div>
                ) : (
                    <>
                        <h1 className="text-center text-[19px] font-semibold tracking-[-0.02em] text-zinc-900 dark:text-zinc-100">
                            {t("title")}
                        </h1>
                        <p className="mt-2 mb-6 text-center text-[13.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {t("subtitle")}
                        </p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                            <div>
                                <label htmlFor="new-password" className={labelBase}>
                                    {t("passwordLabel")}
                                </label>
                                <div className={inputWrap}>
                                    <Lock className="h-[18px] w-[18px] shrink-0 text-zinc-400 transition-colors group-focus-within:text-red-600" />
                                    <input
                                        id="new-password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={t("passwordPlaceholder")}
                                        required
                                        autoComplete="new-password"
                                        // L'œil bascule le champ en `type="text"`, ce qui réactive
                                        // majuscule et correction automatiques du clavier mobile.
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        data-testid="reset-password"
                                        className={inputBase}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={t("passwordLabel")}
                                        className="shrink-0 text-zinc-400 transition-colors hover:text-red-600"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-[18px] w-[18px]" />
                                        ) : (
                                            <Eye className="h-[18px] w-[18px]" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm-password" className={labelBase}>
                                    {t("confirmLabel")}
                                </label>
                                <div className={inputWrap}>
                                    <Lock className="h-[18px] w-[18px] shrink-0 text-zinc-400 transition-colors group-focus-within:text-red-600" />
                                    <input
                                        id="confirm-password"
                                        type={showPassword ? "text" : "password"}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        placeholder={t("confirmPlaceholder")}
                                        required
                                        autoComplete="new-password"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        data-testid="reset-password-confirm"
                                        className={inputBase}
                                    />
                                </div>
                            </div>

                            {error && (
                                <p
                                    role="alert"
                                    className="rounded-[10px] bg-red-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="h-[50px] w-full rounded-xl bg-red-600 text-sm font-semibold text-white shadow-[0_12px_24px_-8px_rgba(220,38,38,0.45)] transition-colors hover:bg-red-700 disabled:opacity-60"
                            >
                                {loading ? t("submitting") : t("submit")}
                            </button>

                            <button
                                type="button"
                                onClick={() => router.push(`/${locale}/login`)}
                                className="h-11 w-full rounded-[10px] text-[13.5px] font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                                {t("backToLogin")}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
