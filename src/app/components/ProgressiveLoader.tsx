"use client";

import { ReactNode } from 'react';

interface ProgressiveLoaderProps {
    isLoading: boolean;
    children: ReactNode;
    fallback?: ReactNode;
    className?: string;
}

export default function ProgressiveLoader({ isLoading, children, fallback, className = "" }: ProgressiveLoaderProps) {
    if (isLoading) {
        return (
            <div className={`animate-pulse ${className}`}>
                {fallback || (
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <div className="space-y-4">
                            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                            <div className="space-y-2">
                                <div className="h-3 bg-slate-200 rounded"></div>
                                <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                                <div className="h-3 bg-slate-200 rounded w-4/6"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return <>{children}</>;
}