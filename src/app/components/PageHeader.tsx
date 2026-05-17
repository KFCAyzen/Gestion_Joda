"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ActionDef {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive";
    disabled?: boolean;
    isLoading?: boolean;
}

interface PageHeaderProps {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: ActionDef;
    secondaryAction?: ActionDef;
}

export default function PageHeader({ eyebrow, title, description, action, secondaryAction }: PageHeaderProps) {
    return (
        <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                {eyebrow && (
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500 dark:text-slate-400">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{title}</h1>
                {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            {(action || secondaryAction) && (
                <div className="flex gap-2">
                    {secondaryAction && (
                        <Button
                            variant={secondaryAction.variant || "outline"}
                            disabled={secondaryAction.disabled || secondaryAction.isLoading}
                            onClick={secondaryAction.onClick}
                        >
                            {secondaryAction.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {secondaryAction.label}
                        </Button>
                    )}
                    {action && (
                        <Button
                            variant={action.variant || "default"}
                            disabled={action.disabled || action.isLoading}
                            onClick={action.onClick}
                        >
                            {action.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {action.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
