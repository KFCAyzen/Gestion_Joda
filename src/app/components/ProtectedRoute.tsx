"use client";

import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../types/permissions';

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
    /**
     * Permission granulaire requise (en plus du rôle). Si fournie, l'accès n'est
     * accordé que si l'utilisateur possède cette permission (par défaut de rôle
     * ou surcharge personnalisée via la gestion des permissions).
     */
    requiredPermission?: Permission;
    fallback?: ReactNode;
}

export default function ProtectedRoute({
    children,
    requiredRole = 'user',
    requiredPermission,
    fallback
}: ProtectedRouteProps) {
    const { user, hasPermission } = useAuth();
    const { hasPermission: hasGranularPermission, loading: permissionsLoading } = usePermissions();
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
                <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
            </div>
        );
    }
    
    // Use either AuthContext user or localStorage user
    const currentUser = user || localUser;
    
    if (!currentUser) {
        return fallback || (
            <div className="p-8 text-center">
                <p className="text-gray-600 dark:text-gray-400">Vous devez être connecté pour accéder à cette page.</p>
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

    const accessDenied = (detail: ReactNode) =>
        fallback || (
            <div className="p-8 text-center">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6 max-w-md mx-auto">
                    <div className="text-red-600 mb-2">
                        <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-red-800 mb-2">Accès refusé</h3>
                    <p className="text-red-600">Vous n'avez pas les permissions nécessaires pour accéder à cette section.</p>
                    {detail}
                </div>
            </div>
        );

    if (!checkPermission()) {
        return accessDenied(<p className="text-sm text-red-500 mt-2">Niveau requis: {requiredRole}</p>);
    }

    // Vérification de la permission granulaire (le cas échéant).
    if (requiredPermission) {
        // Attendre le chargement des permissions pour éviter un faux « accès refusé ».
        if (permissionsLoading) {
            return (
                <div className="p-8 text-center">
                    <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
                </div>
            );
        }
        if (!hasGranularPermission(requiredPermission)) {
            return accessDenied(
                <p className="text-sm text-red-500 mt-2">Permission requise: {requiredPermission}</p>
            );
        }
    }

    return <>{children}</>;
}