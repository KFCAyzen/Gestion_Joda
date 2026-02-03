"use client";

import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

type UserRole = 'student' | 'user' | 'admin' | 'super_admin';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: UserRole;
    fallback?: ReactNode;
}

export default function ProtectedRoute({ 
    children, 
    requiredRole = 'user', 
    fallback
}: ProtectedRouteProps) {
    const { user, hasPermission } = useAuth();
    
    if (!user) {
        return fallback || (
            <div className="p-8 text-center">
                <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
            </div>
        );
    }

    if (!hasPermission(requiredRole)) {
        return fallback || (
            <div className="p-8 text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                    <div className="text-red-600 mb-2">
                        <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Accès refusé</h3>
                    <p className="text-red-600">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
                    <p className="text-sm text-red-500 mt-2">Niveau requis: {requiredRole}</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}