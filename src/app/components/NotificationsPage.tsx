"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getAllDocuments, updateDocument, createNotification, getAllStudents, getOverduePayments } from "../utils/firebaseOperations";
import { Notification } from "../types/joda";
import LoadingSpinner from "./LoadingSpinner";

type FilterType = "all" | "unread" | "document_manquant" | "paiement_valide" | "retard_paiement" | "mise_a_jour_dossier";

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

const TYPE_CONFIG: Record<Notification["type"], { label: string; color: string; bg: string }> = {
  document_manquant:    { label: "Document manquant",  color: "text-orange-600", bg: "bg-orange-100" },
  paiement_valide:      { label: "Paiement validé",    color: "text-green-600",  bg: "bg-green-100"  },
  retard_paiement:      { label: "Retard paiement",    color: "text-red-600",    bg: "bg-red-100"    },
  mise_a_jour_dossier:  { label: "Mise à jour dossier",color: "text-blue-600",   bg: "bg-blue-100"   },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllDocuments<Notification>("notifications");
      const sorted = all
        .filter(n => user?.role === "admin" || user?.role === "super_admin" || n.userId === (user as any)?.id)
        .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
      setNotifications(sorted);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Génération automatique des notifications de retard
  const generateAutoNotifications = useCallback(async () => {
    if (user?.role !== "admin" && user?.role !== "super_admin") return;
    try {
      const overduePayments = await getOverduePayments();
      const students = await getAllStudents();
      for (const payment of overduePayments.slice(0, 10)) {
        const student = students.find(s => s.id === payment.studentId);
        if (!student) continue;
        await createNotification({
          userId: payment.studentId,
          type: "retard_paiement",
          titre: "Retard de paiement",
          message: `Tranche ${payment.tranche} en retard — ${payment.penalites.toLocaleString("fr-FR")} FCFA de pénalités`,
          read: false,
        });
      }
      await load();
    } catch { /* silencieux */ }
  }, [user, load]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const markAsRead = async (id: string) => {
    await updateDocument<Notification>("notifications", id, { read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => updateDocument<Notification>("notifications", n.id, { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filtered = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.read;
    return n.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const filters: { key: FilterType; label: string }[] = [
    { key: "all",                 label: `Toutes (${notifications.length})` },
    { key: "unread",              label: `Non lues (${unreadCount})` },
    { key: "retard_paiement",     label: "Retards" },
    { key: "document_manquant",   label: "Documents" },
    { key: "paiement_valide",     label: "Paiements" },
    { key: "mise_a_jour_dossier", label: "Dossiers" },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">{unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est lu"}</p>
        </div>
        <div className="flex gap-2">
          {(user?.role === "admin" || user?.role === "super_admin") && (
            <button
              onClick={generateAutoNotifications}
              className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
            >
              Vérifier retards
            </button>
          )}
          <button
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-40 transition-colors"
          >
            Tout lire
          </button>
          <button onClick={load} className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            ↻
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
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

      {/* Liste */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Aucune notification</div>
        ) : (
          filtered.map(notif => {
            const cfg = TYPE_CONFIG[notif.type];
            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`flex gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.read ? "bg-red-50 border-l-4 border-l-red-400" : ""}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <span className={`text-sm font-bold ${cfg.color}`}>
                    {notif.type === "retard_paiement" ? "⚠" :
                     notif.type === "paiement_valide" ? "✓" :
                     notif.type === "document_manquant" ? "📄" : "📋"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${notif.read ? "text-gray-600" : "text-gray-900"}`}>{notif.titre}</p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{toDate(notif.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                </div>
                {!notif.read && <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
