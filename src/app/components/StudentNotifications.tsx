"use client";

import { useState, useEffect, useCallback } from "react";
import { getAllDocuments, updateDocument } from "../utils/firebaseOperations";
import { Notification } from "../types/joda";

function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val?.toDate) return val.toDate();
  return new Date(val);
}

const TYPE_CONFIG: Record<Notification["type"], { label: string; color: string; bg: string; icon: string }> = {
  document_manquant:    { label: "Document manquant",   color: "text-orange-600", bg: "bg-orange-100", icon: "📄" },
  paiement_valide:      { label: "Paiement validé",     color: "text-green-600",  bg: "bg-green-100",  icon: "✅" },
  retard_paiement:      { label: "Retard de paiement",  color: "text-red-600",    bg: "bg-red-100",    icon: "⚠️" },
  mise_a_jour_dossier:  { label: "Mise à jour dossier", color: "text-blue-600",   bg: "bg-blue-100",   icon: "📋" },
};

interface Props {
  userId: string;
  onBack?: () => void;
}

export default function StudentNotifications({ userId, onBack }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Notification["type"]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllDocuments<Notification>("notifications");
      const mine = all
        .filter(n => n.userId === userId)
        .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
      setNotifications(mine);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const markAsRead = async (id: string) => {
    await updateDocument<Notification>("notifications", id, { read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => updateDocument<Notification>("notifications", n.id, { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);
  const unreadCount = notifications.filter(n => !n.read).length;

  const filterBtns: { key: "all" | Notification["type"]; label: string }[] = [
    { key: "all",                 label: "Toutes" },
    { key: "retard_paiement",     label: "Retards" },
    { key: "document_manquant",   label: "Documents" },
    { key: "paiement_valide",     label: "Paiements" },
    { key: "mise_a_jour_dossier", label: "Dossiers" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
            <p className="text-xs text-gray-500">
              {unreadCount > 0 ? `${unreadCount} non lue(s)` : "Tout est lu"}
            </p>
          </div>
        </div>
        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
        >
          Tout lire
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {filterBtns.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filter === f.key ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🔔</p>
          <p className="text-sm">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const cfg = TYPE_CONFIG[notif.type];
            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  notif.read ? "bg-white border-gray-100" : "bg-red-50 border-red-200"
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-base ${cfg.bg}`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-semibold ${notif.read ? "text-gray-600" : "text-gray-900"}`}>{notif.titre}</p>
                    {!notif.read && <div className="w-2 h-2 bg-red-500 rounded-full mt-1 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{toDate(notif.createdAt).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
