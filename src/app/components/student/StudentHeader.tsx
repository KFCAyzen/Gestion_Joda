"use client";

import { Bell, LogOut, Sun, Moon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StudentView } from "./types";
import { useTheme } from "@/app/context/ThemeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const VIEW_LABELS: Record<StudentView, string> = {
  dashboard: "Mon espace",
  payments: "Paiements",
  documents: "Documents",
  dossier: "Dossier",
  notifications: "Notifications",
  messaging: "Messagerie",
};


const iconBtn =
  "student-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--student-fg-muted)] transition-colors hover:bg-[rgba(220,38,38,0.08)] hover:text-[var(--student-fg)] dark:hover:bg-white/10 dark:hover:text-white";

function getInitials(name: string): string {
  const s = name.trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[parts.length - 1][0] ?? "";
    return (a + b).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

export function StudentHeader({
  userName,
  view,
  onNotifications,
  unreadCount,
  onLogout,
  eyebrow: _eyebrow,
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
  void _eyebrow;
  const tPortal = useTranslations("student.portal");
  const { actualTheme, setTheme } = useTheme();
  const initials = getInitials(userName);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--student-border)] bg-[rgba(185,28,28,0.88)] backdrop-blur-xl dark:bg-black/35">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="w-[7rem] shrink-0 sm:w-[7.5rem]" aria-hidden />

        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight text-[var(--student-fg)] sm:text-base">
            {VIEW_LABELS[view]}
          </h1>
          {statusPill ? (
            <p
              className="mt-0.5 truncate text-[10px] font-medium leading-tight text-[var(--student-fg-muted)]"
              title={statusPill}
            >
              {statusPill}
            </p>
          ) : null}
        </div>

        <div className="flex w-[7rem] shrink-0 justify-end gap-1 sm:w-[7.5rem] sm:gap-1.5">
          <button
            type="button"
            onClick={() => setTheme(actualTheme === "light" ? "dark" : "light")}
            className={iconBtn}
            aria-label="Changer le thème"
          >
            {actualTheme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={onNotifications}
            className={`${iconBtn} relative`}
            aria-label="Ouvrir les notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--student-ring-move)] px-0.5 text-[9px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              className={`${iconBtn} overflow-hidden border border-[rgba(220,38,38,0.20)] bg-[linear-gradient(145deg,rgba(220,38,38,0.10),rgba(220,38,38,0.04))] text-[11px] font-bold tracking-tight text-[var(--student-fg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.60)] outline-none data-popup-open:bg-[rgba(220,38,38,0.12)] dark:border-white/12 dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] dark:data-popup-open:bg-white/15`}
              aria-label="Profil"
            >
              {initials}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="min-w-[13rem] border border-[rgba(255,255,255,0.18)] bg-[rgba(185,28,28,0.96)] p-1 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl dark:border-white/10 dark:bg-[#1c1c1e]/96 dark:text-white dark:shadow-[0_24px_70px_rgba(0,0,0,0.55)]"
            >
              <div className="px-2 py-1.5 text-xs font-normal text-white/65 dark:text-white/55">
                <span className="block truncate text-sm font-semibold text-white dark:text-white">
                  {userName}
                </span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-white/50 dark:text-white/40">
                  {tPortal("title")}
                </span>
              </div>
              <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.15)] dark:bg-white/10" />
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer gap-2 rounded-lg px-2 py-2 text-white focus:bg-white/12 focus:text-white dark:text-white dark:focus:bg-white/10 dark:focus:text-white data-[variant=destructive]:text-white/80 data-[variant=destructive]:focus:bg-white/15 data-[variant=destructive]:focus:text-white"
                onClick={onLogout}
              >
                <LogOut className="size-4 opacity-80" />
                {tPortal("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
