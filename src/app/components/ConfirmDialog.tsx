"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "destructive";
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel,
    cancelLabel,
    variant = "destructive",
}: ConfirmDialogProps) {
    const t = useTranslations("confirmDialog");
    const resolvedConfirm = confirmLabel ?? t("confirm");
    const resolvedCancel = cancelLabel ?? t("cancel");
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", backgroundColor: "rgba(15,23,42,0.25)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
                    className="w-full max-w-md rounded-2xl border border-white/30 p-6 shadow-2xl dark:border-white/10 dark:[background:rgba(15,23,42,0.85)]"
                    initial={{ scale: 0.94, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.94, opacity: 0 }}
                >
                    {variant === "destructive" && (
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100/80">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                    )}
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={onClose}>
                            {resolvedCancel}
                        </Button>
                        <Button variant={variant} onClick={onConfirm}>
                            {resolvedConfirm}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
