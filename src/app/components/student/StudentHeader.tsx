"use client";

import { Bell, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StudentView } from "./types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const VIEW_LABELS: Record<StudentView, string> = {
  dashboard: "Mon espace",
  payments: "Paiements",
  documents: "Documents",
  dossier: "Dossier",
  notifications: "Notifications",
};

const iconBtn =
  "student-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white";

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
  const initials = getInitials(userName);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/35 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="w-[5rem] shrink-0 sm:w-[5.5rem]" aria-hidden />

        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-[15px] font-semibold leading-tight tracking-tight text-white sm:text-base">
            {VIEW_LABELS[view]}
          </h1>
          {statusPill ? (
            <p
              className="mt-0.5 truncate text-[10px] font-medium leading-tight text-white/45"
              title={statusPill}
            >
              {statusPill}
            </p>
          ) : null}
        </div>

        <div className="flex w-[5rem] shrink-0 justify-end gap-1 sm:w-[5.5rem] sm:gap-1.5">
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
              className={`${iconBtn} overflow-hidden border border-white/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] text-[11px] font-bold tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] outline-none data-popup-open:bg-white/15`}
              aria-label="Profil"
            >
              {initials}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="min-w-[13rem] border border-white/10 bg-[#1c1c1e]/96 p-1 text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl ring-white/10"
            >
              <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-white/55">
                <span className="block truncate text-sm font-semibold text-white">
                  {userName}
                </span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-white/40">
                  {tPortal("title")}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                variant="destructive"
                className="cursor-pointer gap-2 rounded-lg px-2 py-2 text-white focus:bg-white/10 focus:text-white data-[variant=destructive]:text-[var(--student-ring-move)] data-[variant=destructive]:focus:bg-[var(--student-ring-move)]/15 data-[variant=destructive]:focus:text-[var(--student-ring-move)]"
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
