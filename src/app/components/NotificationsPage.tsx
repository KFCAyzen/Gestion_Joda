"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../lib/supabase/client";
import LoadingSpinner from "./LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { executeBatch } from "../utils/dbOperations";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

type FilterType =
    | "all"
    | "unread"
    | "document_manquant"
    | "paiement_valide"
    | "retard_paiement"
    | "mise_a_jour_dossier";

interface Notification {
    id: string;
    user_id: string;
    type: string;
    titre: string;
    message: string;
    read: boolean;
    metadata: Record<string, any>;
    created_at: string;
}

const TYPE_STYLES: Record<string, { color: string; bg: string; icon: string }> = {
    document_manquant: { color: "text-orange-600", bg: "bg-orange-100", icon: "DOC" },
    paiement_valide: { color: "text-green-600", bg: "bg-green-100", icon: "PAY" },
    retard_paiement: { color: "text-red-600", bg: "bg-red-100", icon: "!" },
    mise_a_jour_dossier: { color: "text-blue-600", bg: "bg-blue-100", icon: "UPD" },
};

export default function NotificationsPage() {
    const t = useTranslations("notifications");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const { user } = useAuth();
    const supabase = createClient();

    const getTypeLabel = (type: string) => {
        return t(`types.${type}`, { fallback: type });
    };
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>("all");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase.from("notifications").select("*").order("created_at", { ascending: false });

            if (user?.role !== "admin" && user?.role !== "super_admin") {
                query = query.eq("user_id", user?.id);
            }

            const { data } = await query;
            if (data) setNotifications(data);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const [autoNotifStatus, setAutoNotifStatus] = useState<string | null>(null);

    const generateAutoNotifications = useCallback(async () => {
        if (user?.role !== "admin" && user?.role !== "super_admin") return;
        setAutoNotifStatus(t("status.generating"));
        try {
            const { data: payments, error: paymentsError } = await supabase
                .from("payments")
                .select("id, student_id, tranche, penalites, status, date_limite, students(created_by)")
                .eq("status", "retard");

            if (paymentsError) {
                setAutoNotifStatus(t("status.error", { error: paymentsError.message }));
                return;
            }
            if (!payments || payments.length === 0) {
                setAutoNotifStatus(t("status.noLatePayments"));
                return;
            }

            const today = new Date();
            const overduePayments = payments.filter(payment => {
                if (!payment.date_limite) return false;
                const dueDate = new Date(payment.date_limite);
                return today > dueDate;
            });

            if (overduePayments.length === 0) {
                setAutoNotifStatus(t("status.noLateToNotify"));
                return;
            }

            await executeBatch(
                overduePayments,
                async (payment) => {
                    const userId = (payment.students as any)?.created_by;
                    if (!userId) return;
                    await supabase.from("notifications").insert({
                        user_id: userId,
                        type: "retard_paiement",
                        titre: t("types.retard_paiement"),
                        message: t("messages.latePayment", {
                            installment: payment.tranche ?? "-",
                            penalties: (payment.penalites ?? 0).toLocaleString(dateLocale),
                        }),
                        read: false,
                    });
                },
                2,
                200
            );

            setAutoNotifStatus(t("status.generated", { count: overduePayments.length }));
            await load();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t("status.unknownError");
            setAutoNotifStatus(t("status.error", { error: msg }));
        }
    }, [user, load, t, dateLocale, supabase]);

    useEffect(() => {
        load();
        const interval = setInterval(load, 60000);
        return () => clearInterval(interval);
    }, [load]);

    const markAsRead = async (id: string) => {
        await supabase.from("notifications").update({ read: true }).eq("id", id);
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter((n) => !n.read);
        await executeBatch(
            unread,
            async (n) => {
                await supabase.from("notifications").update({ read: true }).eq("id", n.id);
            },
            3,
            150
        );
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const filtered = notifications.filter((n) => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.read;
        return n.type === filter;
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    const filters: { key: FilterType; labelKey: string }[] = [
        { key: "all", labelKey: "filters.all" },
        { key: "unread", labelKey: "filters.unread" },
        { key: "retard_paiement", labelKey: "filters.latePayments" },
        { key: "document_manquant", labelKey: "filters.documents" },
        { key: "paiement_valide", labelKey: "filters.payments" },
        { key: "mise_a_jour_dossier", labelKey: "filters.files" },
    ];

    const filterButtons = filters.map(f => {
        if (f.key === "all") {
            return { ...f, label: t(f.labelKey, { count: notifications.length }) };
        }
        if (f.key === "unread") {
            return { ...f, label: t(f.labelKey, { count: unreadCount }) };
        }
        return { ...f, label: t(f.labelKey) };
    });

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        {t("header.alertsCenter")}
                    </p>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("header.notificationsTitle")}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {unreadCount > 0 ? t("header.unreadCount", { count: unreadCount }) : t("header.allRead")}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(user?.role === "admin" || user?.role === "super_admin") && (
                        <div className="flex flex-col items-start gap-1">
                            <Button variant="outline" onClick={generateAutoNotifications} className="border-orange-200 bg-orange-50 text-orange-700">
                                {t("actions.checkLate")}
                            </Button>
                            {autoNotifStatus && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">{autoNotifStatus}</p>
                            )}
                        </div>
                    )}
                    <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0} className="border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                        {t("actions.markAllRead")}
                    </Button>
                    <Button variant="outline" onClick={load}>{t("actions.refresh")}</Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {filterButtons.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            filter === f.key
                                ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_rgba(239,68,68,0.28)]"
                                : "bg-white/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-100"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <Card className="joda-surface border-0 shadow-none">
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">{t("empty")}</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map((notif) => {
                                const cfg = TYPE_STYLES[notif.type] || { color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-700/50", icon: "INF" };
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                        className={`flex cursor-pointer gap-3 p-4 transition-colors hover:bg-slate-50 dark:bg-slate-800/50 ${!notif.read ? "bg-rose-50/70 border-l-4 border-l-rose-400" : ""}`}
                                    >
                                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${cfg.bg}`}>
                                            <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-semibold ${notif.read ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-slate-100"}`}>{notif.titre}</p>
                                                <span className="whitespace-nowrap text-xs text-slate-400">
                                                    {new Date(notif.created_at).toLocaleDateString(dateLocale)}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{notif.message}</p>
                                            <Badge className={`mt-2 ${cfg.bg} ${cfg.color}`}>{getTypeLabel(notif.type)}</Badge>
                                        </div>
                                        {!notif.read && <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-rose-500" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
