"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'super_admin' | 'admin' | 'user' | 'student';

export interface User {
    id: string;
    username: string;
    role: UserRole;
    name: string;
    mustChangePassword: boolean;
}

interface AuthContextType {
    user: User | null;
    users: User[];
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    hasPermission: (requiredRole: UserRole) => boolean;
    createUser: (userData: Omit<User, 'id' | 'mustChangePassword'>) => Promise<boolean>;
    canCreateRole: (role: UserRole) => boolean;
    changePassword: (newPassword: string) => Promise<boolean>;
    deleteUser: (userId: string) => Promise<boolean>;
    canDeleteUser: (targetUser: User) => boolean;
    resetUserPassword: (userId: string) => Promise<boolean>;
    canResetPassword: (targetUser: User) => boolean;
    isLoaded: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACCOUNTS = {
    'student': { id: '4', username: 'student', role: 'student' as UserRole, name: 'Marie Dupont', mustChangePassword: false, password: 'student123' },
    'user': { id: '3', username: 'user', role: 'user' as UserRole, name: 'Utilisateur', mustChangePassword: false, password: 'user123' },
    'admin': { id: '2', username: 'admin', role: 'admin' as UserRole, name: 'Administrateur', mustChangePassword: false, password: 'admin123' },
    'superadmin': { id: '1', username: 'superadmin', role: 'super_admin' as UserRole, name: 'Super Administrateur', mustChangePassword: false, password: 'super123' }
};

export function ClientOnlyAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const users = Object.values(ACCOUNTS).map(({ password, ...user }) => user);

    useEffect(() => {
        // Charger l'utilisateur depuis localStorage côté client uniquement
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                localStorage.removeItem('currentUser');
            }
        }
        setIsLoaded(true);
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        const account = ACCOUNTS[username as keyof typeof ACCOUNTS];
        if (account && account.password === password) {
            const { password: _, ...userWithoutPassword } = account;
            setUser(userWithoutPassword);
            localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('currentUser');
    };

    const hasPermission = (requiredRole: UserRole): boolean => {
        if (!user) return false;
        const roleHierarchy: Record<UserRole, number> = {
            'student': 0,
            'user': 1,
            'admin': 2,
            'super_admin': 3
        };
        return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    };

    const canCreateRole = (role: UserRole): boolean => {
        if (!user) return false;
        if (user.role === 'super_admin') return true;
        if (user.role === 'admin' && role === 'user') return true;
        return false;
    };

    const createUser = async (): Promise<boolean> => false;
    const changePassword = async (): Promise<boolean> => false;
    const deleteUser = async (): Promise<boolean> => false;
    const canDeleteUser = (): boolean => false;
    const resetUserPassword = async (): Promise<boolean> => false;
    const canResetPassword = (): boolean => false;

    return (
        <AuthContext.Provider value={{ 
            user, 
            users, 
            login, 
            logout, 
            hasPermission, 
            createUser, 
            canCreateRole, 
            changePassword, 
            deleteUser, 
            canDeleteUser, 
            resetUserPassword, 
            canResetPassword,
            isLoaded
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within a ClientOnlyAuthProvider');
    }
    return context;
}