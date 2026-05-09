"use client";

import { useState, useRef, useEffect } from "react";
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

export default function DropdownMenu({ actions }: DropdownMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Actions"
            >
                <MoreVertical className="h-5 w-5 text-slate-600" />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                action.onClick();
                                setIsOpen(false);
                            }}
                            disabled={action.disabled}
                            className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm leading-5 transition-colors ${
                                action.disabled
                                    ? "opacity-50 cursor-not-allowed"
                                    : action.variant === "danger"
                                      ? "text-rose-600 hover:bg-rose-50"
                                      : "text-slate-700 hover:bg-slate-50"
                            }`}
                        >
                            {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
                            <span className="min-w-0 flex-1 whitespace-normal break-words">{action.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
