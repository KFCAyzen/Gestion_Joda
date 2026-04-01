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
    resetUserPassword: (userId: string) => Promise<boolean>;
    canResetPassword: (targetUser: AuthUser) => boolean;
    refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);

    // Charger les utilisateurs au démarrage
    useEffect(() => {
        refreshUsers();
        checkCurrentUser();
    }, []);

    // Vérifier si un utilisateur est connecté via Supabase Auth
    const checkCurrentUser = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Récupérer les infos utilisateur depuis la table users
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (userData) {
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

    // Rafraîchir la liste des utilisateurs depuis Supabase
    const refreshUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, email, role, name, must_change_password')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
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
        } catch (error) {
            console.error('Erreur chargement utilisateurs:', error);
        }
    };

    // Connexion utilisateur
    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            // Essayer de connecter avec Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) {
                console.error('Erreur auth:', authError.message);
                return false;
            }

            if (authData.user) {
                // Récupérer les infos utilisateur
                const { data: userData } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authData.user.id)
                    .single();

                if (userData) {
                    const currentUser: AuthUser = {
                        id: userData.id,
                        username: userData.username,
                        role: userData.role,
                        name: userData.name,
                        email: userData.email,
                        mustChangePassword: userData.must_change_password
                    };
                    
                    setUser(currentUser);
                    
                    // Sauvegarder dans localStorage comme backup
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

    // Déconnexion
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

    // Vérifier les permissions
    const hasPermission = (requiredRole: UserRole): boolean => {
        if (!user) return false;
        
        const roleHierarchy: Record<UserRole, number> = {
            'student': 0,
            'user': 1,
            'agent': 2,
            'supervisor': 3,
            'admin': 4,
            'super_admin': 5
        };
        
        return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    };

    // Vérifier si peut créer un rôle
    const canCreateRole = (role: UserRole): boolean => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'supervisor' && (role === 'agent' || role === 'student')) return true;
        return false;
    };

    // Créer un nouvel utilisateur
    const createUser = async (userData: { username: string; email: string; password: string; role: UserRole; name: string }): Promise<boolean> => {
        if (!canCreateRole(userData.role)) return false;
        
        try {
            // Créer l'utilisateur dans Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
                user_metadata: {
                    username: userData.username,
                    name: userData.name,
                    role: userData.role
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // Créer l'entrée dans la table users
                const { error: dbError } = await supabase
                    .from('users')
                    .insert({
                        id: authData.user.id,
                        username: userData.username,
                        email: userData.email,
                        password_hash: 'managed_by_supabase_auth',
                        role: userData.role,
                        name: userData.name,
                        must_change_password: false
                    });

                if (dbError) throw dbError;
                
                // Rafraîchir la liste
                await refreshUsers();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erreur création utilisateur:', error);
            return false;
        }
    };

    // Vérifier si peut supprimer un utilisateur
    const canDeleteUser = (targetUser: AuthUser): boolean => {
        if (!user) return false;
        if (user.id === targetUser.id) return false;
        if (targetUser.role === 'admin' && user.role !== 'admin') return false;
        return user.role === 'admin' || user.role === 'supervisor';
    };

    // Supprimer un utilisateur
    const deleteUser = async (userId: string): Promise<boolean> => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser || !canDeleteUser(targetUser)) return false;
        
        try {
            // Supprimer de Supabase Auth
            const { error: authError } = await supabase.auth.admin.deleteUser(userId);
            if (authError) throw authError;
            
            // Rafraîchir la liste
            await refreshUsers();
            return true;
        } catch (error) {
            console.error('Erreur suppression utilisateur:', error);
            return false;
        }
    };

    // Vérifier si peut réinitialiser le mot de passe
    const canResetPassword = (targetUser: AuthUser): boolean => {
        if (!user) return false;
        if (user.id === targetUser.id) return false;
        if (targetUser.role === 'admin' && user.role !== 'admin') return false;
        return user.role === 'admin' || user.role === 'supervisor';
    };

    // Réinitialiser le mot de passe
    const resetUserPassword = async (userId: string): Promise<boolean> => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser || !canResetPassword(targetUser)) return false;
        
        try {
            // Envoyer un email de réinitialisation
            const { error } = await supabase.auth.resetPasswordForEmail(targetUser.email!, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erreur reset password:', error);
            return false;
        }
    };

    // Changer le mot de passe
    const changePassword = async (userId: string, newPassword: string): Promise<boolean> => {
        try {
            // Mettre à jour directement dans la table users (pour les admins)
            const { error } = await supabase
                .from('users')
                .update({ 
                    must_change_password: false, 
                    updated_at: new Date().toISOString() 
                })
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
            user, 
            users,
            loading,
            login, 
            logout, 
            hasPermission, 
            canCreateRole, 
            createUser, 
            canDeleteUser, 
            deleteUser, 
            canResetPassword, 
            resetUserPassword, 
            changePassword,
            refreshUsers
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
