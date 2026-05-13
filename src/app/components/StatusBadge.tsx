"use client";

import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
    status: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
    colorMap?: Record<string, { bg: string; text: string }>;
}

const defaultColorMap: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-300" },
    inactive: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-800 dark:text-gray-300" },
    pending: { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-800 dark:text-yellow-300" },
    approved: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-300" },
    rejected: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-300" },
    paye: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-300" },
    attente: { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-800 dark:text-yellow-300" },
    retard: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-300" },
    en_attente: { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-800 dark:text-yellow-300" },
    en_cours: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-800 dark:text-blue-300" },
    acceptee: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-800 dark:text-green-300" },
    refusee: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-300" },
};

const defaultLabelMap: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    pending: "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
    paye: "Payé",
    attente: "En attente",
    retard: "En retard",
    en_attente: "En attente",
    en_cours: "En cours",
    acceptee: "Acceptée",
    refusee: "Refusée",
};

export default function StatusBadge({ status, variant, colorMap }: StatusBadgeProps) {
    const colors = colorMap || defaultColorMap;
    const color = colors[status] || { bg: "bg-gray-100 dark:bg-gray-700/50", text: "text-gray-800 dark:text-gray-200" };
    const label = defaultLabelMap[status] || status;

    if (variant) {
        return <Badge variant={variant}>{label}</Badge>;
    }

    return <Badge className={`${color.bg} ${color.text}`}>{label}</Badge>;
}
