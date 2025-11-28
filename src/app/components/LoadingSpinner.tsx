"use client";

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export default function LoadingSpinner({ size = 'md', text = 'Chargement...' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    const containerClasses = {
        sm: 'p-4',
        md: 'p-8',
        lg: 'p-12'
    };

    return (
        <div className={`flex flex-col items-center justify-center ${containerClasses[size]}`}>
            <div className={`${sizeClasses[size]} border-4 border-slate-200 border-t-4 rounded-full animate-spin mb-4`} 
                 style={{borderTopColor: '#dc2626'}}></div>
            <p className="text-sm text-slate-600 font-medium">{text}</p>
        </div>
    );
}