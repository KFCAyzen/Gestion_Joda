"use client";

import { Sparkles } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="student-surface-soft rounded-[2rem] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-slate-800 shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-slate-950 dark:text-white">{title}</p>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          ) : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

