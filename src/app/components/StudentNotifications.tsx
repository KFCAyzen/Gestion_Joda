"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { executeBatch } from "../utils/dbOperations";
import { SectionHeader } from "./student/SectionHeader";
import { EmptyState } from "./student/EmptyState";

interface Notification {
    id: string;
    user_id: string;
    type: string;
    titre: string;
    message: string;
    read: boolean;
    created_at: string;
}

interface User {
    id: string;
    name?: string;
}

interface Props {
    user: User;
    onBack?: () => void;
    onUnreadChange?: (n: number) => void;
}

const TYPE_CONFIG: Record<string, { labelKey: string; tone: "move" | "exercise" | "stand" | "neutral"; icon: string }> = {
    document_manquant: { labelKey: "document_manquant", tone: "move", icon: "DOC" },
    paiement_valide: { labelKey: "paiement_valide", tone: "exercise", icon: "PAY" },
    retard_paiement: { labelKey: "retard_paiement", tone: "move", icon: "!" },
    mise_a_jour_dossier: { labelKey: "mise_a_jour_dossier", tone: "stand", icon: "UPD" },
};

function toneToText(tone: "move" | "exercise" | "stand" | "neutral") {
    if (tone === "move") return "text-[var(--student-ring-move)]";
    if (tone === "exercise") return "text-[var(--student-ring-exercise)]";
    if (tone === "stand") return "text-[var(--student-ring-stand)]";
    return "text-white/70";
}

export default function StudentNotifications({ user, onBack, onUnreadChange }: Props) {
    const t = useTranslations("studentNotifications");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
            if (data) setNotifications(data);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        load();
    }, [load]);

    const markAsRead = async (id: string) => {
        await supabase.from("notifications").update({ read: true }).eq("id", id);
        setNotifications((prev) => {
            const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
            onUnreadChange?.(next.filter((n) => !n.read).length);
            return next;
        });
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
        onUnreadChange?.(0);
    };

    const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
    const unreadCount = notifications.filter((n) => !n.read).length;

    const filterBtns: { key: string; label: string }[] = [
        { key: "all", label: t("filters.all", { count: notifications.length }) },
        { key: "retard_paiement", label: t("filters.latePayments") },
        { key: "document_manquant", label: t("filters.documents") },
        { key: "paiement_valide", label: t("filters.payments") },
        { key: "mise_a_jour_dossier", label: t("filters.files") },
    ];

    return (
        <div className="space-y-6">
            <SectionHeader
                eyebrow="Centre"
                title={t("title")}
                subtitle={unreadCount > 0 ? t("unreadCount", { count: unreadCount }) : t("allRead")}
                className=""
                right={
                    <div className="flex flex-wrap gap-2">
                        {onBack ? (
                            <Button variant="outline" size="sm" className="student-chip rounded-2xl border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" onClick={onBack}>
                                {t("actions.back")}
                            </Button>
                        ) : null}
                        <Button
                            variant="outline"
                            size="sm"
                            className="student-chip rounded-2xl border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                            onClick={markAllAsRead}
                            disabled={unreadCount === 0}
                        >
                            {t("actions.markAllRead")}
                        </Button>
                        <Button variant="outline" size="sm" className="student-chip rounded-2xl border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white" onClick={load}>
                            {t("actions.refresh")}
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-wrap gap-2">
                {filterBtns.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={[
                            "student-focus-ring rounded-full px-4 py-2 text-sm font-medium transition-all",
                            filter === f.key
                                ? "border border-white/12 bg-[linear-gradient(135deg,rgba(255,45,85,0.22),rgba(64,156,255,0.12))] text-white shadow-[0_16px_44px_rgba(0,0,0,0.35)]"
                                : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
                        ].join(" ")}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="student-surface overflow-hidden">
                <div className="p-0">
                    {loading ? (
                        <div className="py-12 text-center text-[var(--student-fg-muted)]">{t("loading")}</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4">
                            <EmptyState title={t("empty")} description="Quand l’équipe valide un paiement ou un document, tu reçois une notification ici." />
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--student-border)]">
                            {filtered.map((notif) => {
                                const cfg = TYPE_CONFIG[notif.type] || { labelKey: "unknown", tone: "neutral" as const, icon: "INF" };
                                const toneCls = toneToText(cfg.tone);
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                        className={[
                                            "flex cursor-pointer gap-3 p-4 transition-colors hover:bg-[var(--student-surface-2)]",
                                            !notif.read ? "bg-[var(--student-surface-2)]" : "",
                                        ].join(" ")}
                                    >
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--student-border)] bg-[var(--student-surface-2)] shadow-[0_14px_34px_rgba(0,0,0,0.35)]">
                                            <span className={`text-xs font-bold ${toneCls}`}>{cfg.icon}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-semibold ${notif.read ? "text-[var(--student-fg-muted)]" : "text-[var(--student-fg)]"}`}>{notif.titre}</p>
                                                <span className="whitespace-nowrap text-xs text-[var(--student-fg-muted)]">
                                                    {notif.created_at ? new Date(notif.created_at).toLocaleDateString(dateLocale) : "-"}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-sm text-[var(--student-fg-muted)]">{notif.message}</p>
                                            <Badge className={`mt-1 rounded-full border border-[var(--student-border)] bg-[var(--student-surface-2)] ${toneCls}`}>
                                                {cfg.labelKey === "unknown" ? notif.type : t(`types.${cfg.labelKey}`)}
                                            </Badge>
                                        </div>
                                        {!notif.read && (
                                            <div
                                                className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--student-ring-move)] shadow-[0_0_8px_var(--student-ring-move)]"
                                                aria-label="Non lu"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
