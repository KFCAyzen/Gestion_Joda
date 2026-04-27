"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import type { User as JodaUser } from '../types/joda';

export type UserRole = 'student' | 'agent' | 'admin' | 'supervisor' | 'user' | 'super_admin';

export interface User {
    id: string;
    username: string;
    role: UserRole;
    name: string;
    email?: string;
    mustChangePassword?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

type AuthUser = User;

interface AuthContextType {
    user: AuthUser | null;
    users: AuthUser[];
    loading: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    hasPermission: (requiredRole: UserRole) => boolean;
    createUser: (userData: { username: string; email: string; password: string; role: UserRole; name: string }) => Promise<boolean>;
    canCreateRole: (role: UserRole) => boolean;
    changePassword: (userId: string, newPassword: string) => Promise<boolean>;
    deleteUser: (userId: string) => Promise<boolean>;
    canDeleteUser: (targetUser: AuthUser) => boolean;
    resetUserPassword: (userId: string, newPassword: string) => Promise<boolean>;
    canResetPassword: (targetUser: AuthUser) => boolean;
    refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkCurrentUser();
    }, []);

    const checkCurrentUser = async () => {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError?.message?.includes('Refresh Token')) {
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }
            if (session?.user) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (userError) {
                    console.error('Erreur récupération user:', userError.message);
                    if (userError.message.includes('No rows')) {
                        const { error: insertError } = await supabase.from('users').insert({
                            id: session.user.id,
                            email: session.user.email,
                            username: session.user.email?.split('@')[0] || 'user',
                            name: session.user.email?.split('@')[0] || 'User',
                            role: 'student',
                            password_hash: 'managed_by_supabase_auth',
                            must_change_password: false
                        });
                        if (!insertError) {
                            const { data: newUserData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
                            if (newUserData) setUser({
                                id: newUserData.id,
                                username: newUserData.username,
                                role: newUserData.role,
                                name: newUserData.name,
                                email: newUserData.email,
                                mustChangePassword: newUserData.must_change_password
                            });
                        }
                    }
                } else if (userData) {
                    setUser({
                        id: userData.id,
                        username: userData.username,
                        role: userData.role,
                        name: userData.name,
                        email: userData.email,
                        mustChangePassword: userData.must_change_password
                    });
                }
            }
        } catch (error) {
            console.error('Erreur vérification session:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, email, role, name, must_change_password')
                .order('created_at', { ascending: false });
            if (error) {
                console.error('Erreur refreshUsers:', error.message);
                return;
            }
            if (data) {
                setUsers(data.map(u => ({
                    id: u.id,
                    username: u.username,
                    email: u.email,
                    role: u.role,
                    name: u.name,
                    mustChangePassword: u.must_change_password
                })));
            }
        } catch (error: any) {
            console.error('Erreur chargement utilisateurs:', error?.message || error);
        }
    };

    const persistAuthenticatedUser = (dbUser: any): boolean => {
        if (!dbUser) return false;
        const currentUser: AuthUser = {
            id: dbUser.id,
            username: dbUser.username,
            role: dbUser.role,
            name: dbUser.name,
            email: dbUser.email,
            mustChangePassword: dbUser.must_change_password
        };
        setUser(currentUser);
        if (typeof window !== 'undefined') {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        return true;
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

            if (authError) {
                if (authError.message !== 'Invalid login credentials') {
                    console.error('Erreur auth:', authError.message);
                }

                if (authError.message === 'Email not confirmed') {
                    const { data: userRow } = await supabase
                        .from('users')
                        .select('id')
                        .eq('email', email)
                        .single();

                    if (userRow?.id) {
                        // Confirmer via API route
                        await fetch('/api/reset-password', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: userRow.id, confirmEmail: true, newPassword: password }),
                        });
                        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password });
                        if (!retryError && retryData.user) {
                            const { data: userData } = await supabase.from('users').select('*').eq('id', retryData.user.id).single();
                            if (userData) return persistAuthenticatedUser(userData);
                        }
                    }
                }

                return false;
            }

            if (authData.user) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                if (userError && userError.message.includes('No rows')) {
                    const { error: insertError } = await supabase.from('users').insert({
                        id: authData.user.id,
                        email: authData.user.email,
                        username: authData.user.email?.split('@')[0] || 'user',
                        name: authData.user.email?.split('@')[0] || 'User',
                        role: 'student',
                        password_hash: 'managed_by_supabase_auth',
                        must_change_password: false
                    });
                    if (insertError) {
                        console.error('Erreur création user:', insertError.message);
                        return false;
                    }
                    const { data: newUserData } = await supabase.from('users').select('*').eq('id', authData.user.id).single();
                    if (newUserData) {
                        const currentUser: AuthUser = {
                            id: newUserData.id,
                            username: newUserData.username,
                            role: newUserData.role,
                            name: newUserData.name,
                            email: newUserData.email,
                            mustChangePassword: newUserData.must_change_password
                        };
                        setUser(currentUser);
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                        return true;
                    }
                } else if (userData) {
                    const currentUser: AuthUser = {
                        id: userData.id,
                        username: userData.username,
                        role: userData.role,
                        name: userData.name,
                        email: userData.email,
                        mustChangePassword: userData.must_change_password
                    };
                    setUser(currentUser);
                    if (typeof window !== 'undefined') {
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Erreur login:', error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('currentUser');
            }
        } catch (error) {
            console.error('Erreur logout:', error);
        }
    };

    const hasPermission = (requiredRole: UserRole): boolean => {
        if (!user) return false;
        const roleHierarchy: Record<UserRole, number> = {
            'student': 0, 'user': 1, 'agent': 2, 'supervisor': 3, 'admin': 4, 'super_admin': 5
        };
        return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    };

    const canCreateRole = (role: UserRole): boolean => {
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'super_admin') return true;
        if (user.role === 'supervisor' && (role === 'agent' || role === 'student')) return true;
        return false;
    };

    // Création via API route (service role key côté serveur)
    const createUser = async (userData: { username: string; email: string; password: string; role: UserRole; name: string }): Promise<boolean> => {
        if (!canCreateRole(userData.role)) return false;
        try {
            const res = await fetch('/api/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            if (!res.ok) return false;
            await refreshUsers();
            return true;
        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            return false;
        }
    };

    const canDeleteUser = (targetUser: AuthUser): boolean => {
        if (!user) return false;
        if (user.id === targetUser.id) return false;
        if (targetUser.role === 'admin' && user.role !== 'super_admin') return false;
        return user.role === 'admin' || user.role === 'super_admin' || user.role === 'supervisor';
    };

    // Suppression via API route (service role key côté serveur)
    const deleteUser = async (userId: string): Promise<boolean> => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser || !canDeleteUser(targetUser)) return false;
        try {
            const res = await fetch('/api/delete-user', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) return false;
            await refreshUsers();
            return true;
        } catch (error) {
            console.error('Erreur suppression utilisateur:', error);
            return false;
        }
    };

    const canResetPassword = (targetUser: AuthUser): boolean => {
        if (!user) return false;
        if (user.id === targetUser.id) return false;
        if (targetUser.role === 'admin' && user.role !== 'super_admin') return false;
        return user.role === 'admin' || user.role === 'super_admin' || user.role === 'supervisor';
    };

    // Reset mot de passe via API route (service role key côté serveur)
    const resetUserPassword = async (userId: string, newPassword: string): Promise<boolean> => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser || !canResetPassword(targetUser)) return false;
        try {
            const res = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, newPassword }),
            });
            if (!res.ok) return false;
            return true;
        } catch (error) {
            console.error('Erreur reset password:', error);
            return false;
        }
    };

    const changePassword = async (userId: string, newPassword: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ must_change_password: false, updated_at: new Date().toISOString() })
                .eq('id', userId);
            if (error) throw error;
            await refreshUsers();
            return true;
        } catch (error) {
            console.error('Erreur changement mot de passe:', error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{
            user, users, loading, login, logout, hasPermission,
            canCreateRole, createUser, canDeleteUser, deleteUser,
            canResetPassword, resetUserPassword, changePassword, refreshUsers
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
