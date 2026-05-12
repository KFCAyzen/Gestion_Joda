"use client";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="student-surface p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-white/55">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 text-sm leading-6 text-white/70 sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

