"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface NotificationProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

export default function Notification({ message, type, onClose }: NotificationProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const getStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200 text-green-800';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
            default:
                return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    return (
        <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
            <div className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg max-w-sm ${getStyles()}`}>
                {getIcon()}
                <p className="text-sm font-medium flex-1">{message}</p>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 h-auto"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </Button>
            </div>
        </div>
    );
}