"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import RegisterStepper from "./RegisterStepper";

export default function RegisterPage() {
    const t = useTranslations("register");

    return (
        <div
            className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-10"
            style={{ backgroundImage: "radial-gradient(ellipse at 60% 0%, rgba(220,38,38,0.06) 0%, transparent 60%)" }}
        >
            {/* Header */}
            <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 shadow-md p-2.5">
                    <img src="/Logo.png" alt="Joda Company" className="h-full w-full object-contain" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("pageTitle")}</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("pageSubtitle")}</p>
            </div>

            {/* Card */}
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-gray-100 dark:border-slate-800 p-6 sm:p-8">
                <RegisterStepper />
            </div>

            {/* Back to login */}
            <div className="mt-6 text-center">
                <Link href="/login" className="text-sm text-gray-400 hover:text-red-600 transition-colors">
                    {t("backToLogin")}
                </Link>
            </div>
        </div>
    );
}
