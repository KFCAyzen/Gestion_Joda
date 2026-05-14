"use client";

import { LayoutDashboard, WalletCards, Upload, FileText, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import type { StudentView } from "./types";

const iconCls = "h-5 w-5";

const ITEM_IDS: Array<{ id: StudentView; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: "dashboard", Icon: LayoutDashboard },
  { id: "payments", Icon: WalletCards },
  { id: "documents", Icon: Upload },
  { id: "dossier", Icon: FileText },
  { id: "messaging", Icon: MessageSquare },
];

const NAV_KEYS: Record<string, string> = {
  dashboard: "home",
  payments: "payments",
  documents: "documents",
  dossier: "dossier",
  messaging: "messages",
};

export function BottomTabs({
  value,
  onChange,
  notificationsBadge,
}: {
  value: StudentView;
  onChange: (next: StudentView) => void;
  notificationsBadge?: number;
}) {
  const t = useTranslations("student.portal.nav");

  return (
    <nav
      className="student-bottom-tabs fixed inset-x-0 bottom-0 z-40 md:hidden"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-7xl items-stretch justify-between px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {ITEM_IDS.map(({ id, Icon }) => {
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
                  ? "text-[var(--student-fg)]"
                  : "text-[var(--student-fg-muted)] hover:text-[var(--student-fg)]",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-2xl border transition-all duration-200",
                  active
                    ? "border-[rgba(255,255,255,0.30)] bg-white/18 shadow-[0_8px_24px_rgba(0,0,0,0.18)] dark:border-white/18 dark:bg-white/8 dark:shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
                    : "border-[rgba(255,255,255,0.12)] bg-white/8 dark:border-white/10 dark:bg-white/5",
                ].join(" ")}
              >
                <Icon className={iconCls} />
              </span>
              <span className="truncate">{t(NAV_KEYS[id] as any)}</span>
              {active ? (
                <span
                  className="absolute inset-x-5 top-1 h-1 rounded-full bg-white opacity-90 shadow-[0_6px_16px_rgba(255,255,255,0.30)]"
                  aria-hidden="true"
                />
              ) : null}
              {id === "messaging" && (notificationsBadge ?? 0) > 0 && (
                <span className="absolute right-4 top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--student-ring-move)] px-1 text-[10px] font-bold text-white shadow-[0_6px_16px_rgba(220,38,38,0.40)]">
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
