"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { toastVariants } from "../utils/animations";
import type { NotificationType } from "../lib/feedback";

interface NotificationProps {
    title?: string;
    message: string;
    type: NotificationType;
    onClose: () => void;
}

const CONFIG = {
    success: {
        title: "Action réussie",
        bg: "from-emerald-50 to-white",
        border: "border-emerald-200 dark:border-emerald-700",
        text: "text-emerald-950",
        muted: "text-emerald-700 dark:text-emerald-300",
        bar: "bg-emerald-500",
        iconBg: "bg-emerald-100",
        Icon: CheckCircle2,
    },
    error: {
        title: "Action impossible",
        bg: "from-rose-50 to-white",
        border: "border-rose-200",
        text: "text-rose-950",
        muted: "text-rose-700",
        bar: "bg-rose-500",
        iconBg: "bg-rose-100",
        Icon: XCircle,
    },
    warning: {
        title: "Attention requise",
        bg: "from-amber-50 to-white",
        border: "border-amber-200",
        text: "text-amber-950",
        muted: "text-amber-700",
        bar: "bg-amber-500",
        iconBg: "bg-amber-100",
        Icon: AlertTriangle,
    },
    info: {
        title: "Information",
        bg: "from-sky-50 to-white",
        border: "border-sky-200",
        text: "text-sky-950",
        muted: "text-sky-700",
        bar: "bg-sky-500",
        iconBg: "bg-sky-100",
        Icon: Info,
    },
} satisfies Record<NotificationType, unknown>;

export default function Notification({ title, message, type, onClose }: NotificationProps) {
    const cfg = CONFIG[type];

    useEffect(() => {
        const timeout = type === "error" ? 6000 : 4500;
        const t = setTimeout(onClose, timeout);
        return () => clearTimeout(t);
    }, [onClose, type]);

    return (
        <motion.div
            className="w-full max-w-sm"
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            layout
        >
            <div
                className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${cfg.bg} ${cfg.border} shadow-[0_22px_55px_rgba(15,23,42,0.18)]`}
            >
                <div className="flex items-start gap-3 p-4">
                    <motion.div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${cfg.iconBg}`}
                        initial={{ scale: 0, rotate: -160 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 320, damping: 20, delay: 0.08 }}
                    >
                        <cfg.Icon className={`h-5 w-5 ${cfg.muted}`} />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${cfg.text}`}>{title || cfg.title}</p>
                        <p className={`mt-1 text-sm leading-5 ${cfg.muted}`}>{message}</p>
                    </div>
                    <motion.button
                        onClick={onClose}
                        className="flex-shrink-0 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-400"
                        whileHover={{ scale: 1.12, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                    >
                        <X className="h-4 w-4" />
                    </motion.button>
                </div>

                <motion.div
                    className={`absolute bottom-0 left-0 h-1 ${cfg.bar}`}
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: type === "error" ? 6 : 4.5, ease: "linear" }}
                />
            </div>
        </motion.div>
    );
}
