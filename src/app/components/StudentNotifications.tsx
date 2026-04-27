"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    document_manquant: { label: "Document manquant", color: "text-orange-600", bg: "bg-orange-100", icon: "DOC" },
    paiement_valide: { label: "Paiement valide", color: "text-green-600", bg: "bg-green-100", icon: "PAY" },
    retard_paiement: { label: "Retard de paiement", color: "text-red-600", bg: "bg-red-100", icon: "!" },
    mise_a_jour_dossier: { label: "Mise à jour dossier", color: "text-blue-600", bg: "bg-blue-100", icon: "UPD" },
};

export default function StudentNotifications({ user, onBack }: Props) {
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
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter((n) => !n.read);
        await Promise.all(unread.map((n) => supabase.from("notifications").update({ read: true }).eq("id", n.id)));
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
    const unreadCount = notifications.filter((n) => !n.read).length;

    const filterBtns: { key: string; label: string }[] = [
        { key: "all", label: `Toutes (${notifications.length})` },
        { key: "retard_paiement", label: "Retards" },
        { key: "document_manquant", label: "Documents" },
        { key: "paiement_valide", label: "Paiements" },
        { key: "mise_a_jour_dossier", label: "Dossiers" },
    ];

    return (
        <div className="space-y-6">
            <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button variant="ghost" size="sm" onClick={onBack}>
                            Retour
                        </Button>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Mes Notifications</h2>
                        <p className="text-sm text-slate-500">{unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est lu"}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
                        Tout lire
                    </Button>
                    <Button variant="outline" size="sm" onClick={load}>Actualiser</Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {filterBtns.map((f) => (
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
                    {loading ? (
                        <div className="py-12 text-center">Chargement...</div>
                    ) : filtered.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">Aucune notification</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map((notif) => {
                                const cfg = TYPE_CONFIG[notif.type] || { label: notif.type, color: "text-slate-600", bg: "bg-slate-100", icon: "INF" };
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                        className={`flex cursor-pointer gap-3 p-4 transition-colors hover:bg-slate-50 ${!notif.read ? "bg-rose-50/70" : ""}`}
                                    >
                                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${cfg.bg}`}>
                                            <span className={`text-xs font-bold ${cfg.color}`}>{cfg.icon}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-semibold ${notif.read ? "text-slate-600" : "text-slate-900"}`}>{notif.titre}</p>
                                                <span className="whitespace-nowrap text-xs text-slate-400">
                                                    {notif.created_at ? new Date(notif.created_at).toLocaleDateString("fr-FR") : "-"}
                                                </span>
                                            </div>
                                            <p className="mt-0.5 text-sm text-slate-500">{notif.message}</p>
                                            <Badge className={`mt-1 ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
                                        </div>
                                        {!notif.read && <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />}
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
