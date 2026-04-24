"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toastVariants } from "../utils/animations";

interface NotificationProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const CONFIG = {
    success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', bar: 'bg-green-500', icon: (
        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    )},
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', bar: 'bg-red-500', icon: (
        <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    )},
    info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', bar: 'bg-blue-500', icon: (
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )},
};

export default function Notification({ message, type, onClose }: NotificationProps) {
    const cfg = CONFIG[type];

    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <motion.div
            className="fixed top-4 right-4 z-[9999] max-w-sm w-full"
            variants={toastVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <div className={`relative flex items-start gap-3 p-4 rounded-xl border shadow-2xl overflow-hidden ${cfg.bg} ${cfg.border}`}>
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
                >
                    {cfg.icon}
                </motion.div>
                <p className={`text-sm font-medium flex-1 ${cfg.text}`}>{message}</p>
                <motion.button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    whileHover={{ scale: 1.2, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </motion.button>

                {/* Barre de progression */}
                <motion.div
                    className={`absolute bottom-0 left-0 h-0.5 ${cfg.bar}`}
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 4, ease: "linear" }}
                />
            </div>
        </motion.div>
    );
}
