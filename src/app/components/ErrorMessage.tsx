"use client";

import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

interface ErrorMessageProps {
    message: string;
    type?: "error" | "success" | "info" | "warning";
    onClose?: () => void;
}

const typeConfig = {
    error: {
        icon: AlertCircle,
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        iconColor: "text-red-500",
    },
    success: {
        icon: CheckCircle,
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        iconColor: "text-green-500",
    },
    info: {
        icon: Info,
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        iconColor: "text-blue-500",
    },
    warning: {
        icon: AlertTriangle,
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        iconColor: "text-yellow-500",
    },
};

export default function ErrorMessage({ message, type = "error", onClose }: ErrorMessageProps) {
    const config = typeConfig[type];
    const Icon = config.icon;

    return (
        <div className={`rounded-xl border ${config.border} ${config.bg} px-4 py-3 ${config.text}`}>
            <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor}`} />
                <p className="flex-1 text-sm">{message}</p>
                {onClose && (
                    <button onClick={onClose} className="flex-shrink-0 hover:opacity-70">
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}
