"use client";

import { LayoutDashboard, WalletCards, Upload, FileText, Bell } from "lucide-react";
import type { StudentView } from "./types";

const iconCls = "h-5 w-5";

const ITEMS: Array<{
  id: StudentView;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "dashboard", label: "Accueil", Icon: LayoutDashboard },
  { id: "payments", label: "Paiements", Icon: WalletCards },
  { id: "documents", label: "Documents", Icon: Upload },
  { id: "dossier", label: "Dossier", Icon: FileText },
  { id: "notifications", label: "Notifs", Icon: Bell },
];

export function BottomTabs({
  value,
  onChange,
  notificationsBadge,
}: {
  value: StudentView;
  onChange: (next: StudentView) => void;
  notificationsBadge?: number;
}) {
  return (
    <nav
      className="student-bottom-tabs fixed inset-x-0 bottom-0 z-40 md:hidden"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-7xl items-stretch justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {ITEMS.map(({ id, label, Icon }) => {
          const active = id === value;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={[
                "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "text-slate-950 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200",
                  active
                    ? "border-white/80 bg-[linear-gradient(135deg,rgba(255,247,237,0.95),rgba(254,242,242,0.9))] shadow-[0_14px_30px_rgba(244,63,94,0.12)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(127,29,29,0.9),rgba(15,23,42,0.6))]"
                    : "border-white/70 bg-white/50 dark:border-white/10 dark:bg-white/5",
                ].join(" ")}
              >
                <Icon className={iconCls} />
              </span>
              <span className="truncate">{label}</span>
              {id === "notifications" && (notificationsBadge ?? 0) > 0 && (
                <span className="absolute right-4 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-1 text-[10px] font-bold text-white shadow-[0_10px_24px_rgba(239,68,68,0.35)]">
                  {notificationsBadge! > 99 ? "99+" : notificationsBadge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

