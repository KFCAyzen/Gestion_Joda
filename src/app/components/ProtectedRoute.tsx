"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

type UserRole = 'student' | 'user' | 'agent' | 'admin' | 'supervisor' | 'super_admin';

interface User {
    id: string;
    username: string;
    role: UserRole;
    name: string;
    mustChangePassword?: boolean;
}

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
    const [localUser, setLocalUser] = useState<User | null | undefined>(undefined);
    
    // Check localStorage as fallback - synchronously
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    setLocalUser(JSON.parse(savedUser));
                } catch (e) {
                    localStorage.removeItem('currentUser');
                }
            } else {
                setLocalUser(null);
            }
        }
    }, []);

    // If still loading user from localStorage, show loading
    if (localUser === undefined) {
        return (
            <div className="p-8 text-center">
                <div className="text-gray-500">Chargement...</div>
            </div>
        );
    }
    
    // Use either AuthContext user or localStorage user
    const currentUser = user || localUser;
    
    if (!currentUser) {
        return fallback || (
            <div className="p-8 text-center">
                <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
            </div>
        );
    }

    // Check permission
    const checkPermission = () => {
        if (!currentUser) return false;
        
        const roleHierarchy: Record<UserRole, number> = {
            'student': 0,
            'user': 1,
            'agent': 2,
            'supervisor': 3,
            'admin': 4,
            'super_admin': 5
        };
        
        const userRole = currentUser.role as UserRole;
        const requiredRoleNum = roleHierarchy[requiredRole as UserRole] || 0;
        
        return roleHierarchy[userRole] >= requiredRoleNum;
    };

    if (!checkPermission()) {
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