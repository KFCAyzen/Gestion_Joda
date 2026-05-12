"use client";

import { LayoutDashboard, WalletCards, Upload, FileText, MessageSquare } from "lucide-react";
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
  { id: "messaging", label: "Messages", Icon: MessageSquare },
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
                "student-focus-ring",
                active
                  ? "text-white"
                  : "text-white/55 hover:text-white/85",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200",
                  active
                    ? "border-white/18 bg-white/8 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
                    : "border-white/10 bg-white/5",
                ].join(" ")}
              >
                <Icon className={iconCls} />
              </span>
              <span className="truncate">{label}</span>
              {active ? (
                <span
                  className="absolute inset-x-5 top-1 h-1 rounded-full bg-[linear-gradient(90deg,var(--student-ring-move),var(--student-ring-exercise),var(--student-ring-stand))] opacity-90 shadow-[0_10px_26px_rgba(64,156,255,0.16)]"
                  aria-hidden="true"
                />
              ) : null}
              {id === "messaging" && (notificationsBadge ?? 0) > 0 && (
                <span className="absolute right-4 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--student-ring-move),#ff453a)] px-1 text-[10px] font-bold text-white shadow-[0_10px_26px_rgba(255,45,85,0.45)]">
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

