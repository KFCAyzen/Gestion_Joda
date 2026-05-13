"use client";

interface LoadingStateProps {
    message?: string;
    size?: "sm" | "md" | "lg";
}

const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
};

export default function LoadingState({ message = "Chargement...", size = "md" }: LoadingStateProps) {
    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
                <div
                    className={`${sizeClasses[size]} mx-auto mb-4 animate-spin rounded-full border-b-2 border-blue-600`}
                />
                <p className="text-slate-600 dark:text-slate-400">{message}</p>
            </div>
        </div>
    );
}
