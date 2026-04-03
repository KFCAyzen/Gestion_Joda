"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    document_manquant:    { label: "Document manquant",   color: "text-orange-600", bg: "bg-orange-100" },
    paiement_valide:      { label: "Paiement validé",     color: "text-green-600",  bg: "bg-green-100" },
    retard_paiement:      { label: "Retard de paiement",  color: "text-red-600",    bg: "bg-red-100" },
    mise_a_jour_dossier:  { label: "Mise à jour dossier", color: "text-blue-600",   bg: "bg-blue-100" },
};

export default function StudentNotifications({ user, onBack }: Props) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("all");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (data) setNotifications(data);
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => { load(); }, [load]);

    const markAsRead = async (id: string) => {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.read);
        await Promise.all(unread.map(n => supabase.from('notifications').update({ read: true }).eq('id', n.id)));
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);
    const unreadCount = notifications.filter(n => !n.read).length;

    const filterBtns: { key: string; label: string }[] = [
        { key: "all", label: `Toutes (${notifications.length})` },
        { key: "retard_paiement", label: "Retards" },
        { key: "document_manquant", label: "Documents" },
        { key: "paiement_valide", label: "Paiements" },
        { key: "mise_a_jour_dossier", label: "Dossiers" },
    ];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button variant="ghost" size="sm" onClick={onBack}>
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Button>
                    )}
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Mes Notifications</h2>
                        <p className="text-sm text-gray-500">{unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est lu"}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
                        Tout lire
                    </Button>
                    <Button variant="outline" size="sm" onClick={load}>↻</Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {filterBtns.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                            filter === f.key ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="text-center py-12">Chargement...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">Aucune notification</div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filtered.map(notif => {
                                const cfg = TYPE_CONFIG[notif.type] || { label: notif.type, color: "text-gray-600", bg: "bg-gray-100" };
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.read && markAsRead(notif.id)}
                                        className={`flex gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.read ? "bg-red-50" : ""}`}
                                    >
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                                            <span className={`text-sm font-bold ${cfg.color}`}>
                                                {notif.type === "retard_paiement" ? "!" :
                                                 notif.type === "paiement_valide" ? "✓" :
                                                 notif.type === "document_manquant" ? "📄" : "📋"}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm font-semibold ${notif.read ? "text-gray-600" : "text-gray-900"}`}>{notif.titre}</p>
                                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                                    {notif.created_at ? new Date(notif.created_at).toLocaleDateString("fr-FR") : '-'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                                            <Badge className={`mt-1 ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
                                        </div>
                                        {!notif.read && <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />}
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
