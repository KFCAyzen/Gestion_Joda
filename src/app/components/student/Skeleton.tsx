"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/10",
        className,
      )}
      aria-hidden="true"
    />
  );
}

