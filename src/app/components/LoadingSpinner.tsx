"use client";

import { motion } from "framer-motion";
import { fadeIn } from "../utils/animations";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    text?: string;
}

const SIZES = { sm: "h-6 w-6", md: "h-10 w-10", lg: "h-14 w-14" };
const PADDING = { sm: "p-4", md: "p-8", lg: "p-12" };

export default function LoadingSpinner({ size = "md", text = "Chargement..." }: LoadingSpinnerProps) {
    return (
        <motion.div
            className={`flex flex-col items-center justify-center ${PADDING[size]}`}
            variants={fadeIn}
            initial="initial"
            animate="animate"
        >
            <div className="relative">
                <motion.div className={`${SIZES[size]} rounded-full border-4 border-slate-200`} />
                <motion.div
                    className={`${SIZES[size]} absolute inset-0 rounded-full border-4 border-transparent`}
                    style={{ borderTopColor: "#dc2626", borderRightColor: "rgba(220,38,38,0.35)" }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                    className="absolute inset-2 rounded-full bg-red-50"
                    animate={{ scale: [1, 0.85, 1], opacity: [0.55, 0.9, 0.55] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>
            {text && (
                <motion.p
                    className="mt-4 text-sm font-medium text-slate-600"
                    animate={{ opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    {text}
                </motion.p>
            )}
        </motion.div>
    );
}
