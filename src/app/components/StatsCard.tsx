"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
    label: string;
    value: string | number;
    description?: string;
    icon?: LucideIcon;
    color?: string;
}

export default function StatsCard({ label, value, description, icon: Icon, color = "#dc2626" }: StatsCardProps) {
    return (
        <Card className="joda-surface border-0 shadow-none">
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{label}</p>
                        <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
                        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
                    </div>
                    {Icon && (
                        <div
                            className="rounded-lg p-2"
                            style={{ backgroundColor: `${color}15` }}
                        >
                            <Icon className="h-5 w-5" style={{ color }} />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
