"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
    showCloseButton?: boolean;
}

const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
};

export default function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = "md",
    showCloseButton = true,
}: ModalProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isOpen || !mounted) return null;

    const node = (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className={`w-full ${sizeClasses[size]} my-auto rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl`}
                    initial={{ scale: 0.94, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.94, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="mb-4 flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                            {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
                        </div>
                        {showCloseButton && (
                            <Button variant="outline" size="sm" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {children}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    return createPortal(node, document.body);
}
