"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";
import LoadingSpinner from "./LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    document_manquant: { label: "Document manquant", color: "text-orange-600", bg: "bg-orange-100", icon: "DOC" },
    paiement_valide: { label: "Paiement valide", color: "text-green-600", bg: "bg-green-100", icon: "PAY" },
    retard_paiement: { label: "Retard de paiement", color: "text-red-600", bg: "bg-red-100", icon: "!" },
    mise_a_jour_dossier: { label: "Mise à jour dossier", color: "text-blue-600", bg: "bg-blue-100", icon: "UPD" },
};

export default function NotificationsPage() {
    const { user } = useAuth();
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

    const generateAutoNotifications = useCallback(async () => {
        if (user?.role !== "admin" && user?.role !== "super_admin") return;
        try {
            const { data: payments } = await supabase
                .from("payments")
                .select("id, student_id, tranche, penalites, status, date_limite")
                .eq("status", "retard");

            if (!payments) return;

            const today = new Date();
            for (const payment of payments.slice(0, 10)) {
                const dueDate = new Date(payment.date_limite);
                if (today > dueDate) {
                    await supabase.from("notifications").insert({
                        user_id: payment.student_id,
                        type: "retard_paiement",
                        titre: "Retard de paiement",
                        message: `Tranche ${payment.tranche} en retard - ${payment.penalites.toLocaleString("fr-FR")} FCFA de pénalités`,
                        read: false,
                    });
                }
            }
            await load();
        } catch {
            // silencieux
        }
    }, [user, load]);

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
        await Promise.all(unread.map((n) => supabase.from("notifications").update({ read: true }).eq("id", n.id)));
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const filtered = notifications.filter((n) => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.read;
        return n.type === filter;
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    const filters: { key: FilterType; label: string }[] = [
        { key: "all", label: `Toutes (${notifications.length})` },
        { key: "unread", label: `Non lues (${unreadCount})` },
        { key: "retard_paiement", label: "Retards" },
        { key: "document_manquant", label: "Documents" },
        { key: "paiement_valide", label: "Paiements" },
        { key: "mise_a_jour_dossier", label: "Dossiers" },
    ];

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Centre alertes
                    </p>
                    <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
                    <p className="text-sm text-slate-500">
                        {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est lu"}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(user?.role === "admin" || user?.role === "super_admin") && (
                        <Button variant="outline" onClick={generateAutoNotifications} className="border-orange-200 bg-orange-50 text-orange-700">
                            Vérifier retards
                        </Button>
                    )}
                    <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0} className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Tout lire
                    </Button>
                    <Button variant="outline" onClick={load}>Actualiser</Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                            filter === f.key
                                ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_rgba(239,68,68,0.28)]"
                                : "bg-white/70 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <Card className="joda-surface border-0 shadow-none">
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">Aucune notification</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map((notif) => {
                                const cfg = TYPE_CONFIG[notif.type] || { label: notif.type, color: "text-slate-600", bg: "bg-slate-100", icon: "INF" };
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                        className={`flex cursor-pointer gap-3 p-4 transition-colors hover:bg-slate-50 ${!notif.read ? "bg-rose-50/70 border-l-4 border-l-rose-400" : ""}`}
                                    >
                                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${cfg.bg}`}>
                                            <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-semibold ${notif.read ? "text-slate-600" : "text-slate-900"}`}>{notif.titre}</p>
                                                <span className="whitespace-nowrap text-xs text-slate-400">
                                                    {new Date(notif.created_at).toLocaleDateString("fr-FR")}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-sm text-slate-500">{notif.message}</p>
                                            <Badge className={`mt-2 ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
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
