"use client";

import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-12 text-center">
            {Icon && (
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700/50">
                    <Icon className="h-6 w-6 text-slate-400" />
                </div>
            )}
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">{title}</p>
            {description && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            {action && (
                <Button onClick={action.onClick} className="mt-4">
                    {action.label}
                </Button>
            )}
        </div>
    );
}
