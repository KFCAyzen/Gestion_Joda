"use client";

import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudentView } from "./types";

const VIEW_LABELS: Record<StudentView, string> = {
  dashboard: "Mon espace",
  payments: "Paiements",
  documents: "Documents",
  dossier: "Dossier",
  notifications: "Notifications",
};

export function StudentHeader({
  userName,
  view,
  onNotifications,
  unreadCount,
  onLogout,
  eyebrow,
  statusPill,
}: {
  userName: string;
  view: StudentView;
  onNotifications: () => void;
  unreadCount: number;
  onLogout: () => void;
  eyebrow?: string;
  statusPill?: string | null;
}) {
  return (
    <header className="glass-header sticky top-0 z-30 border-b border-white/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            {eyebrow ?? "Portail étudiant"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              {VIEW_LABELS[view]}
            </h1>
            {statusPill ? (
              <span className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {statusPill}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
            Bonjour, {userName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onNotifications}
            className="relative rounded-2xl border border-white/70 bg-white/60 p-2.5 text-slate-600 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition-colors hover:bg-white/80 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            aria-label="Ouvrir les notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-1 text-[10px] font-bold text-white shadow-[0_10px_24px_rgba(239,68,68,0.35)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <Button
            variant="outline"
            size="sm"
            className="hidden rounded-2xl border-white/70 bg-white/60 text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.06)] hover:bg-white/80 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:inline-flex"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Quitter
          </Button>
        </div>
      </div>
    </header>
  );
}

