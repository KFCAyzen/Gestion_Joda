"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../utils/formatPrice";
import LoadingSpinner from "./LoadingSpinner";
import { createClient } from "../lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PaymentRow {
    id: string;
    student_id: string;
    type: string;
    montant: number;
    status: string;
    date_paiement: string | null;
    created_at: string;
}

interface StudentRow {
    id: string;
    nom: string;
    prenom: string;
    created_by: string | null;
}

interface UserRow {
    id: string;
    username: string;
    name: string;
}

interface DailyStats {
    date: string;
    courses: { count: number; amount: number };
    procedures: { count: number; amount: number };
    total: number;
}

type FilterOption = {
    value: string;
    label: string;
};

const COURSE_TYPES = new Set(["mandarin", "anglais"]);

const toDateKey = (value: string) => new Date(value).toISOString().split("T")[0];

export default function PerformanceHistory() {
    const { user } = useAuth();
    const t = useTranslations("performanceHistory");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [studentsById, setStudentsById] = useState<Record<string, StudentRow>>({});
    const [selectedCreator, setSelectedCreator] = useState<string>("all");
    const [creatorOptions, setCreatorOptions] = useState<FilterOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            void loadData();
        }
    }, [user]);

    const loadData = async () => {
        setIsLoading(true);
        setLoadError(null);

        try {
            const [paymentsRes, studentsRes, usersRes] = await Promise.all([
                supabase
                    .from("payments")
                    .select("id, student_id, type, montant, status, date_paiement, created_at")
                    .eq("status", "paye")
                    .order("date_paiement", { ascending: false, nullsFirst: false }),
                supabase.from("students").select("id, nom, prenom, created_by"),
                supabase.from("users").select("id, username, name"),
            ]);

            if (paymentsRes.error) {
                throw paymentsRes.error;
            }
            if (studentsRes.error) {
                throw studentsRes.error;
            }
            if (usersRes.error) {
                throw usersRes.error;
            }

            const nextPayments = (paymentsRes.data || []) as PaymentRow[];
            const nextStudents = (studentsRes.data || []) as StudentRow[];
            const nextUsers = (usersRes.data || []) as UserRow[];

            const studentMap = nextStudents.reduce<Record<string, StudentRow>>((acc, student) => {
                acc[student.id] = student;
                return acc;
            }, {});

            const userMap = nextUsers.reduce<Record<string, UserRow>>((acc, entry) => {
                acc[entry.id] = entry;
                return acc;
            }, {});

            const scopedPayments =
                user?.role === "user"
                    ? nextPayments.filter((payment) => studentMap[payment.student_id]?.created_by === user.id)
                    : nextPayments;

            setPayments(scopedPayments);
            setStudentsById(studentMap);

            if (user?.role === "admin" || user?.role === "super_admin") {
                const options = Array.from(
                    new Set(
                        nextStudents
                            .map((student) => student.created_by)
                            .filter((value): value is string => Boolean(value)),
                    ),
                )
                    .map((creatorId) => ({
                        value: creatorId,
                        label: userMap[creatorId]?.name || userMap[creatorId]?.username || creatorId,
                    }))
                    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

                setCreatorOptions(options);
            } else {
                setCreatorOptions([]);
            }
        } catch (error) {
            console.error("Error loading performance data:", error);
            setPayments([]);
            setStudentsById({});
            setCreatorOptions([]);
            setLoadError(t("states.loadError"));
        } finally {
            setIsLoading(false);
        }
    };

    const filteredPayments = useMemo(() => {
        if (selectedCreator === "all") {
            return payments;
        }

        return payments.filter((payment) => studentsById[payment.student_id]?.created_by === selectedCreator);
    }, [payments, selectedCreator, studentsById]);

    const dailyStats = useMemo<DailyStats[]>(() => {
        const dailyGroups: Record<string, PaymentRow[]> = {};

        filteredPayments.forEach((payment) => {
            const dateKey = toDateKey(payment.date_paiement || payment.created_at);
            if (!dailyGroups[dateKey]) {
                dailyGroups[dateKey] = [];
            }
            dailyGroups[dateKey].push(payment);
        });

        return Object.keys(dailyGroups)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map((date) => {
                const dayPayments = dailyGroups[date];
                const courses = dayPayments.filter((payment) => COURSE_TYPES.has(payment.type));
                const procedures = dayPayments.filter((payment) => !COURSE_TYPES.has(payment.type));

                const coursesAmount = courses.reduce((sum, payment) => sum + (payment.montant || 0), 0);
                const proceduresAmount = procedures.reduce((sum, payment) => sum + (payment.montant || 0), 0);

                return {
                    date,
                    courses: { count: courses.length, amount: coursesAmount },
                    procedures: { count: procedures.length, amount: proceduresAmount },
                    total: coursesAmount + proceduresAmount,
                };
            });
    }, [filteredPayments]);

    const selectedCreatorLabel =
        selectedCreator === "all"
            ? t("filters.allManagers")
            : creatorOptions.find((option) => option.value === selectedCreator)?.label || selectedCreator;

    const totalCourses = dailyStats.reduce((sum, day) => sum + day.courses.count, 0);
    const totalProcedures = dailyStats.reduce((sum, day) => sum + day.procedures.count, 0);
    const totalAmount = dailyStats.reduce((sum, day) => sum + day.total, 0);

    const handleDownloadWord = () => {
        const wordContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${t("export.title")}</title></head>
        <body>
            <h1>Joda Company</h1>
            <h2>${t("export.title")}</h2>
            <p><strong>${t("export.manager")} :</strong> ${selectedCreatorLabel}</p>
            <p><strong>${t("export.generatedAt")} :</strong> ${new Date().toLocaleDateString(dateLocale)} ${t("export.at")} ${new Date().toLocaleTimeString(dateLocale)}</p>
            <p><strong>${t("export.totalCourses")} :</strong> ${totalCourses}</p>
            <p><strong>${t("export.totalProcedures")} :</strong> ${totalProcedures}</p>
            <p><strong>${t("export.totalRevenue")} :</strong> ${formatPrice(totalAmount.toString())}</p>
            <table border='1' cellpadding='6' cellspacing='0'>
                <tr><th>${t("table.date")}</th><th>${t("table.courses")}</th><th>${t("table.courseAmount")}</th><th>${t("table.procedures")}</th><th>${t("table.procedureAmount")}</th><th>${t("table.total")}</th></tr>
                ${dailyStats
                    .map(
                        (day) => `
                    <tr>
                        <td>${new Date(day.date).toLocaleDateString(dateLocale)}</td>
                        <td>${day.courses.count}</td>
                        <td>${formatPrice(day.courses.amount.toString())}</td>
                        <td>${day.procedures.count}</td>
                        <td>${formatPrice(day.procedures.amount.toString())}</td>
                        <td>${formatPrice(day.total.toString())}</td>
                    </tr>`,
                    )
                    .join("")}
            </table>
        </body>
        </html>
        `;

        const blob = new Blob([wordContent], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${t("export.filePrefix")}_${selectedCreator === "all" ? t("export.globalScope") : selectedCreator}_${new Date().toISOString().split("T")[0]}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const printContent = `
        <!DOCTYPE html>
        <html lang="${locale}">
        <head><title>${t("export.title")}</title></head>
        <body>
            <h1>Joda Company</h1>
            <h2>${t("export.title")}</h2>
            <p><strong>${t("export.manager")} :</strong> ${selectedCreatorLabel}</p>
            <p><strong>${t("export.totalCourses")} :</strong> ${totalCourses}</p>
            <p><strong>${t("export.totalProcedures")} :</strong> ${totalProcedures}</p>
            <p><strong>${t("export.totalRevenue")} :</strong> ${formatPrice(totalAmount.toString())}</p>
            <table border="1" cellpadding="6" cellspacing="0">
                <tr><th>${t("table.date")}</th><th>${t("table.courses")}</th><th>${t("table.courseAmount")}</th><th>${t("table.procedures")}</th><th>${t("table.procedureAmount")}</th><th>${t("table.total")}</th></tr>
                ${dailyStats
                    .map(
                        (day) => `
                    <tr>
                        <td>${new Date(day.date).toLocaleDateString(dateLocale)}</td>
                        <td>${day.courses.count}</td>
                        <td>${formatPrice(day.courses.amount.toString())}</td>
                        <td>${day.procedures.count}</td>
                        <td>${formatPrice(day.procedures.amount.toString())}</td>
                        <td>${formatPrice(day.total.toString())}</td>
                    </tr>`,
                    )
                    .join("")}
            </table>
        </body>
        </html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    if (!user) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">{t("states.authRequired")}</p>
            </div>
        );
    }

    const isAdmin = user.role === "admin" || user.role === "super_admin";

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        {t("header.tag")}
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t("header.title")}</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("header.subtitle")}
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={handlePrint} style={{ backgroundColor: "#dc2626" }}>
                        {t("actions.print")}
                    </Button>
                    {isAdmin && (
                        <Button onClick={handleDownloadWord} className="bg-blue-600 hover:bg-blue-700">
                            {t("actions.downloadWord")}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="joda-surface border-0 shadow-none">
                    <CardContent className="pt-4">
                        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.courses")}</p>
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{totalCourses}</p>
                    </CardContent>
                </Card>
                <Card className="joda-surface border-0 shadow-none">
                    <CardContent className="pt-4">
                        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.procedures")}</p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{totalProcedures}</p>
                    </CardContent>
                </Card>
                <Card className="joda-surface border-0 shadow-none">
                    <CardContent className="pt-4">
                        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.revenue")}</p>
                        <p className="text-xl font-bold text-rose-700">{formatPrice(totalAmount.toString())}</p>
                    </CardContent>
                </Card>
            </div>

            {isAdmin && creatorOptions.length > 0 && (
                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{t("filters.title")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedCreator} onValueChange={(value) => setSelectedCreator(value || "all")}>
                            <SelectTrigger className="w-full sm:w-[260px]">
                                <SelectValue placeholder={t("filters.allManagers")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("filters.allManagers")}</SelectItem>
                                {creatorOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}

            <Card className="joda-surface border-0 shadow-none">
                <CardHeader>
                    <CardTitle>
                        {selectedCreator === "all"
                            ? t("list.titleAll")
                            : t("list.titleByManager", { manager: selectedCreatorLabel })}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <LoadingSpinner size="lg" text={t("states.loading")} />
                    ) : loadError ? (
                        <div className="py-8 text-center">
                            <p className="text-sm text-rose-600">{loadError}</p>
                        </div>
                    ) : dailyStats.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-slate-500 dark:text-slate-400">{t("states.empty")}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dailyStats.map((day, index) => (
                                <Card key={`performance-${day.date}-${index}`} className="joda-surface-muted border-0 shadow-none">
                                    <CardContent className="p-4">
                                        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                                {new Date(day.date).toLocaleDateString(dateLocale)}
                                            </h3>
                                            <Badge variant="destructive" className="text-sm">
                                                {formatPrice(day.total.toString())}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3">
                                                <p className="text-sm font-medium text-blue-800">{t("cards.languageCourses")}</p>
                                                <p className="text-xs text-blue-600">{t("cards.paymentsCount", { count: day.courses.count })}</p>
                                                <p className="font-bold text-blue-600">{formatPrice(day.courses.amount.toString())}</p>
                                            </div>
                                            <div className="rounded-xl bg-green-50 p-3">
                                                <p className="text-sm font-medium text-green-800">{t("cards.procedures")}</p>
                                                <p className="text-xs text-green-600">{t("cards.paymentsCount", { count: day.procedures.count })}</p>
                                                <p className="font-bold text-green-600">{formatPrice(day.procedures.amount.toString())}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
