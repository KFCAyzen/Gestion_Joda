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
    <div className="student-surface-soft p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-white shadow-[0_14px_34px_rgba(0,0,0,0.35)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-white">{title}</p>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-white/70">
              {description}
            </p>
          ) : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

