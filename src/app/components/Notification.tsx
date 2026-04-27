"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { toastVariants } from "../utils/animations";

interface NotificationProps {
    message: string;
    type: "success" | "error" | "info";
    onClose: () => void;
}

const CONFIG = {
    success: {
        bg: "from-emerald-50 to-white",
        border: "border-emerald-200",
        text: "text-emerald-900",
        bar: "bg-emerald-500",
        iconBg: "bg-emerald-100",
        icon: "OK",
    },
    error: {
        bg: "from-rose-50 to-white",
        border: "border-rose-200",
        text: "text-rose-900",
        bar: "bg-rose-500",
        iconBg: "bg-rose-100",
        icon: "ERR",
    },
    info: {
        bg: "from-sky-50 to-white",
        border: "border-sky-200",
        text: "text-sky-900",
        bar: "bg-sky-500",
        iconBg: "bg-sky-100",
        icon: "INF",
    },
};

export default function Notification({ message, type, onClose }: NotificationProps) {
    const cfg = CONFIG[type];

    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <motion.div
            className="fixed right-4 top-4 z-[9999] w-full max-w-sm"
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${cfg.bg} ${cfg.border} shadow-[0_20px_50px_rgba(15,23,42,0.14)]`}>
                <div className="flex items-start gap-3 p-4">
                    <motion.div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${cfg.iconBg}`}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                    >
                        {cfg.icon}
                    </motion.div>
                    <div className="flex-1">
                        <p className={`text-sm font-medium ${cfg.text}`}>{message}</p>
                    </div>
                    <motion.button
                        onClick={onClose}
                        className="flex-shrink-0 text-slate-400 hover:text-slate-600"
                        whileHover={{ scale: 1.15, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </motion.button>
                </div>

                <motion.div
                    className={`absolute bottom-0 left-0 h-1 ${cfg.bar}`}
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 4, ease: "linear" }}
                />
            </div>
        </motion.div>
    );
}
