"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

interface DropdownAction {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "danger";
    disabled?: boolean;
}

interface DropdownMenuProps {
    actions: DropdownAction[];
}

interface MenuPos {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
}

export default function DropdownMenu({ actions }: DropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [pos, setPos] = useState<MenuPos>({});
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const calcPosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const menuWidth = 256;
        const estimatedHeight = actions.length * 40 + 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const next: MenuPos = {};

        // Vertical : au-dessus si pas assez de place en dessous
        if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
            next.bottom = window.innerHeight - rect.top + 4;
        } else {
            next.top = rect.bottom + 4;
        }

        // Horizontal : aligner à droite du bouton, replier à gauche si débordement
        if (rect.right - menuWidth < 8) {
            next.left = Math.max(8, rect.left);
        } else {
            next.right = Math.max(8, window.innerWidth - rect.right);
        }

        setPos(next);
    }, [actions.length]);

    useEffect(() => {
        if (isOpen) calcPosition();
    }, [isOpen, calcPosition]);

    useEffect(() => {
        if (!isOpen) return;

        const onDown = (e: MouseEvent) => {
            if (
                !menuRef.current?.contains(e.target as Node) &&
                !buttonRef.current?.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        const onClose = () => setIsOpen(false);

        document.addEventListener("mousedown", onDown);
        window.addEventListener("scroll", onClose, true);
        window.addEventListener("resize", onClose);
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("scroll", onClose, true);
            window.removeEventListener("resize", onClose);
        };
    }, [isOpen]);

    const menu = (
        <div
            ref={menuRef}
            style={{ ...pos, position: "fixed", zIndex: 9999 }}
            className="w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-xl"
        >
            {actions.map((action, i) => (
                <button
                    key={i}
                    onClick={() => { action.onClick(); setIsOpen(false); }}
                    disabled={action.disabled}
                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm leading-5 transition-colors ${
                        action.disabled
                            ? "cursor-not-allowed opacity-50"
                            : action.variant === "danger"
                              ? "text-rose-600 hover:bg-rose-50"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-800/50"
                    }`}
                >
                    {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
                    <span className="min-w-0 flex-1 whitespace-normal break-words">{action.label}</span>
                </button>
            ))}
        </div>
    );

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v); }}
                className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:bg-slate-700/50"
                aria-label="Actions"
                aria-expanded={isOpen}
            >
                <MoreVertical className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>

            {isOpen && typeof document !== "undefined" && createPortal(menu, document.body)}
        </div>
    );
}
