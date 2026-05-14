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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--student-border)] bg-[var(--student-surface)] text-[var(--student-fg)] shadow-[var(--student-shadow-2)]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-[var(--student-fg)]">{title}</p>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-[var(--student-fg-muted)]">
              {description}
            </p>
          ) : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

