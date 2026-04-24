"use client";

import { motion } from "framer-motion";
import { fadeIn } from "../utils/animations";

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

const SIZES = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
const PADDING = { sm: 'p-4', md: 'p-8', lg: 'p-12' };

export default function LoadingSpinner({ size = 'md', text = 'Chargement...' }: LoadingSpinnerProps) {
    return (
        <motion.div
            className={`flex flex-col items-center justify-center ${PADDING[size]}`}
            variants={fadeIn} initial="initial" animate="animate"
        >
            <div className="relative">
                <motion.div
                    className={`${SIZES[size]} rounded-full border-4 border-gray-200`}
                />
                <motion.div
                    className={`${SIZES[size]} rounded-full border-4 border-transparent absolute inset-0`}
                    style={{ borderTopColor: '#dc2626' }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
            </div>
            {text && (
                <motion.p
                    className="text-sm text-slate-600 font-medium mt-4"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    {text}
                </motion.p>
            )}
        </motion.div>
    );
}
