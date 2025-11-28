"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface User {
    id: string;
    username: string;
    role: UserRole;
    name: string;
    mustChangePassword?: boolean;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultUsers: User[] = [
    { id: '1', username: 'superadmin', role: 'super_admin', name: 'Super Administrateur', mustChangePassword: false },
    { id: '2', username: 'admin', role: 'admin', name: 'Administrateur', mustChangePassword: false },
    { id: '3', username: 'user', role: 'user', name: 'Utilisateur', mustChangePassword: false }
];

const defaultPasswords: Record<string, string> = {
    'superadmin': 'super123',
    'admin': 'admin123',
    'user': 'user123'
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [passwords, setPasswords] = useState<Record<string, string>>({});

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('currentUser');
            const savedUsers = localStorage.getItem('systemUsers');
            const savedPasswords = localStorage.getItem('systemPasswords');
            
            if (savedUser) {
                try {
                    setUser(JSON.parse(savedUser));
                } catch (e) {
                    console.error('Error parsing user:', e);
                }
            }
            
            if (savedUsers) {
                try {
                    setUsers(JSON.parse(savedUsers));
                } catch (e) {
                    setUsers(defaultUsers);
                    localStorage.setItem('systemUsers', JSON.stringify(defaultUsers));
                }
            } else {
                setUsers(defaultUsers);
                localStorage.setItem('systemUsers', JSON.stringify(defaultUsers));
            }
            
            if (savedPasswords) {
                try {
                    setPasswords(JSON.parse(savedPasswords));
                } catch (e) {
                    setPasswords(defaultPasswords);
                    localStorage.setItem('systemPasswords', JSON.stringify(defaultPasswords));
                }
            } else {
                setPasswords(defaultPasswords);
                localStorage.setItem('systemPasswords', JSON.stringify(defaultPasswords));
            }
        }
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        const account = users.find(u => u.username === username);
        if (account && passwords[username] === password) {
            setUser(account);
            if (typeof window !== 'undefined') {
                localStorage.setItem('currentUser', JSON.stringify(account));
            }
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUser');
        }
    };

    const hasPermission = (requiredRole: UserRole): boolean => {
        if (!user) return false;
        const roleHierarchy: Record<UserRole, number> = {
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

    const createUser = async (userData: Omit<User, 'id' | 'mustChangePassword'>): Promise<boolean> => {
        if (!canCreateRole(userData.role)) return false;
        if (users.find(u => u.username === userData.username)) return false;
        
        const newUser: User = { ...userData, id: Date.now().toString(), mustChangePassword: true };
        const updatedUsers = [...users, newUser];
        const updatedPasswords = { ...passwords, [userData.username]: 'temp123' };
        
        setUsers(updatedUsers);
        setPasswords(updatedPasswords);
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('systemUsers', JSON.stringify(updatedUsers));
            localStorage.setItem('systemPasswords', JSON.stringify(updatedPasswords));
        }
        return true;
    };

    const canDeleteUser = (targetUser: User): boolean => {
        if (!user) return false;
        if (user.id === targetUser.id) return false;
        if (targetUser.username === 'superadmin') return false;
        if (user.role === 'super_admin') return targetUser.role !== 'super_admin';
        if (user.role === 'admin') return targetUser.role === 'user';
        return false;
    };

    const deleteUser = async (userId: string): Promise<boolean> => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser || !canDeleteUser(targetUser)) return false;
        
        const updatedUsers = users.filter(u => u.id !== userId);
        const updatedPasswords = { ...passwords };
        delete updatedPasswords[targetUser.username];
        
        setUsers(updatedUsers);
        setPasswords(updatedPasswords);
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('systemUsers', JSON.stringify(updatedUsers));
            localStorage.setItem('systemPasswords', JSON.stringify(updatedPasswords));
        }
        return true;
    };

    const canResetPassword = (targetUser: User): boolean => {
        if (!user) return false;
        if (user.id === targetUser.id) return false;
        if (user.role === 'super_admin') return targetUser.role !== 'super_admin';
        if (user.role === 'admin') return targetUser.role === 'user';
        return false;
    };

    const resetUserPassword = async (userId: string): Promise<boolean> => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser || !canResetPassword(targetUser)) return false;
        
        const updatedUser = { ...targetUser, mustChangePassword: true };
        const updatedUsers = users.map(u => u.id === userId ? updatedUser : u);
        const updatedPasswords = { ...passwords, [targetUser.username]: 'temp123' };
        
        setUsers(updatedUsers);
        setPasswords(updatedPasswords);
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('systemUsers', JSON.stringify(updatedUsers));
            localStorage.setItem('systemPasswords', JSON.stringify(updatedPasswords));
        }
        return true;
    };

    const changePassword = async (newPassword: string): Promise<boolean> => {
        if (!user) return false;
        
        const updatedUser = { ...user, mustChangePassword: false };
        const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
        const updatedPasswords = { ...passwords, [user.username]: newPassword };
        
        setUser(updatedUser);
        setUsers(updatedUsers);
        setPasswords(updatedPasswords);
        
        if (typeof window !== 'undefined') {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            localStorage.setItem('systemUsers', JSON.stringify(updatedUsers));
            localStorage.setItem('systemPasswords', JSON.stringify(updatedPasswords));
        }
        return true;
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            users, 
            login, 
            logout, 
            hasPermission, 
            canCreateRole, 
            createUser, 
            canDeleteUser, 
            deleteUser, 
            canResetPassword, 
            resetUserPassword, 
            changePassword 
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
