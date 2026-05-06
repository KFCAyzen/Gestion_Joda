"use client";

import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
    status: string;
    variant?: "default" | "secondary" | "outline" | "destructive";
    colorMap?: Record<string, { bg: string; text: string }>;
}

const defaultColorMap: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-green-100", text: "text-green-800" },
    inactive: { bg: "bg-gray-100", text: "text-gray-800" },
    pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
    approved: { bg: "bg-green-100", text: "text-green-800" },
    rejected: { bg: "bg-red-100", text: "text-red-800" },
    paye: { bg: "bg-green-100", text: "text-green-800" },
    attente: { bg: "bg-yellow-100", text: "text-yellow-800" },
    retard: { bg: "bg-red-100", text: "text-red-800" },
    en_attente: { bg: "bg-yellow-100", text: "text-yellow-800" },
    en_cours: { bg: "bg-blue-100", text: "text-blue-800" },
    acceptee: { bg: "bg-green-100", text: "text-green-800" },
    refusee: { bg: "bg-red-100", text: "text-red-800" },
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
    const color = colors[status] || { bg: "bg-gray-100", text: "text-gray-800" };
    const label = defaultLabelMap[status] || status;

    if (variant) {
        return <Badge variant={variant}>{label}</Badge>;
    }

    return <Badge className={`${color.bg} ${color.text}`}>{label}</Badge>;
}
