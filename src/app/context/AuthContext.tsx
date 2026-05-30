"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { getFriendlyErrorMessage } from "../lib/feedback";
import { createClient } from "../lib/supabase/client";
import { getDirectClient } from "../lib/desktop/offline-client";

const supabase = createClient();
// Lectures du profil applicatif (table `users`) : toujours interroger Supabase
// en direct. Sur desktop, le wrapper offline lirait le cache SQLite encore vide
// au 1er login (la sync qui le peuple a elle-même besoin du token du login).
const profileDb = getDirectClient(supabase);

/** Lit le profil utilisateur mis en cache (pour la reprise hors-ligne sur desktop). */
function readCachedUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("currentUser");
        return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
        return null;
    }
}

/** Détecte une panne réseau (vs un vrai rejet d'auth) pour ne pas déconnecter hors-ligne. */
function isNetworkError(err: unknown): boolean {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
    const msg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
    return /failed to fetch|networkerror|fetch failed|enotfound|etimedout|econnrefused|timeout|err_internet|err_network|load failed|network request failed/i.test(msg);
}

export type UserRole = "student" | "agent" | "admin" | "supervisor" | "user" | "super_admin";

export interface User {
    id: string;
    username: string;
    role: UserRole;
    name: string;
    email?: string;
    mustChangePassword?: boolean;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

type AuthUser = User;

type LoginResult = {
    success: boolean;
    message?: string;
};

interface AuthContextType {
    user: AuthUser | null;
    users: AuthUser[];
    loading: boolean;
    login: (email: string, password: string) => Promise<LoginResult>;
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
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void checkCurrentUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === "SIGNED_OUT") {
                setUser(null);
                if (typeof window !== "undefined") {
                    localStorage.removeItem("currentUser");
                    // Desktop : informer le main process que la session est terminée
                    // pour qu'il arrête la sync RLS-protégée.
                    void window.jodaDesktop?.sync?.setAuth(null, null);
                }
            } else if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && session?.user) {
                if (event === "TOKEN_REFRESHED") await loadUserProfile(session.user.id);
                // Desktop : pousser le nouveau token au main process pour que le
                // sync engine puisse accéder aux tables RLS-protégées.
                if (typeof window !== "undefined" && window.jodaDesktop?.sync) {
                    void window.jodaDesktop.sync.setAuth(session.access_token, session.refresh_token);
                }
            }
        });

        // Au montage : si on a déjà une session active (page reload, premier mount),
        // pousser immédiatement le token au main process.
        if (typeof window !== "undefined" && window.jodaDesktop?.sync) {
            void supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    void window.jodaDesktop!.sync.setAuth(session.access_token, session.refresh_token);
                }
            }).catch(() => { /* hors-ligne : la session sera poussée au prochain SIGNED_IN */ });
        }

        return () => subscription.unsubscribe();
    }, []);

    const loadUserProfile = async (authUserId: string) => {
        const { data: userData, error: userError } = await profileDb
            .from("users")
            .select("*")
            .eq("id", authUserId)
            .single();

        if (userError) {
            // Panne réseau transitoire (ex. desktop hors-ligne) : ne pas déconnecter,
            // on conserve le profil en cache s'il existe.
            if (isNetworkError(userError)) {
                const cached = readCachedUser();
                if (cached) setUser(cached);
                return;
            }
            console.error("Erreur récupération user:", userError.message);
            await supabase.auth.signOut();
            return;
        }

        if (userData.is_active === false) {
            await supabase.auth.signOut();
            if (typeof window !== "undefined") {
                localStorage.removeItem("currentUser");
            }
            return;
        }

        const profile: AuthUser = {
            id: userData.id,
            username: userData.username,
            role: userData.role,
            name: userData.name,
            email: userData.email,
            mustChangePassword: userData.must_change_password === true,
            isActive: userData.is_active !== false,
        };
        setUser(profile);
        // Rafraîchit le cache pour la reprise hors-ligne au prochain démarrage.
        if (typeof window !== "undefined") {
            localStorage.setItem("currentUser", JSON.stringify(profile));
        }
    };

    const checkCurrentUser = async () => {
        try {
            // getUser() valide le token côté serveur → nécessite le réseau.
            let authUser: { id: string } | null = null;
            let authError: unknown = null;
            try {
                const res = await supabase.auth.getUser();
                authUser = res.data.user;
                authError = res.error;
            } catch (e) {
                authError = e;
            }

            if (authError) {
                // Desktop offline-first : hors-ligne avec un profil en cache → on
                // reste connecté avec l'identité mise en cache (les données viennent
                // du SQLite local). On ne déconnecte que sur un vrai rejet d'auth en ligne.
                const cached = readCachedUser();
                if (isNetworkError(authError) && cached) {
                    setUser(cached);
                    return;
                }
                const msg = String((authError as { message?: unknown })?.message ?? authError);
                if (/refresh_token|Refresh Token|Invalid|JWT|session/i.test(msg)) {
                    await supabase.auth.signOut();
                    setUser(null);
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("currentUser");
                    }
                }
                return;
            }

            if (authUser) {
                await loadUserProfile(authUser.id);
            }
        } catch (error) {
            // Erreur inattendue : si c'est réseau et qu'on a un cache, rester connecté.
            const cached = readCachedUser();
            if (isNetworkError(error) && cached) {
                setUser(cached);
            } else {
                console.error("Erreur vérification session:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    const refreshUsers = async () => {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("id, username, email, role, name, must_change_password, is_active")
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Erreur refreshUsers:", error.message);
                return;
            }

            if (data) {
                setUsers(
                    data.map((entry) => ({
                        id: entry.id,
                        username: entry.username,
                        email: entry.email,
                        role: entry.role,
                        name: entry.name,
                        mustChangePassword: entry.must_change_password,
                        isActive: entry.is_active !== false,
                    })),
                );
            }
        } catch (error: any) {
            console.error("Erreur chargement utilisateurs:", error?.message || error);
        }
    };

    const login = async (email: string, password: string): Promise<LoginResult> => {
        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

            if (authError) {
                if (authError.message !== "Invalid login credentials") {
                    console.error("Erreur auth:", authError.message);
                }

                return {
                    success: false,
                    message: getFriendlyErrorMessage(authError, {
                        fallback: "Connexion impossible pour le moment. Vérifiez vos identifiants puis réessayez.",
                    }),
                };
            }

            if (authData.user) {
                const { data: userData, error: userError } = await profileDb
                    .from("users")
                    .select("*")
                    .eq("id", authData.user.id)
                    .single();

                if (userError) {
                    console.error("Erreur récupération user DB:", userError.message);
                    await supabase.auth.signOut();
                    return {
                        success: false,
                        message: "Le compte est authentifié mais son profil applicatif est introuvable. Contactez un administrateur.",
                    };
                }

                if (userData) {
                    if (userData.is_active === false) {
                        await supabase.auth.signOut();
                        if (typeof window !== "undefined") {
                            localStorage.removeItem("currentUser");
                        }
                        return {
                            success: false,
                            message: "Ce compte n'est pas encore actif. Si vous venez de vous inscrire, votre compte est en attente de validation par l'équipe Joda Company. Sinon, contactez un administrateur.",
                        };
                    }

                    const currentUser: AuthUser = {
                        id: userData.id,
                        username: userData.username,
                        role: userData.role,
                        name: userData.name,
                        email: userData.email,
                        mustChangePassword: userData.must_change_password === true,
                        isActive: userData.is_active !== false,
                    };

                    setUser(currentUser);

                    if (typeof window !== "undefined") {
                        localStorage.setItem("currentUser", JSON.stringify(currentUser));
                    }

                    return { success: true };
                }
            }

            return {
                success: false,
                message: "Connexion incomplète. Réessayez ou contactez l'administration si le problème persiste.",
            };
        } catch (error) {
            console.error("Erreur login:", error);
            return {
                success: false,
                message: getFriendlyErrorMessage(error, {
                    fallback: "Une erreur inattendue a empêché la connexion. Réessayez dans un instant.",
                }),
            };
        }
    };

    const logout = async () => {
        try {
            // scope: 'local' ne tue que la session du navigateur courant. Sans ce flag,
            // un signOut() invalide toutes les sessions actives du user (autres
            // onglets, autres appareils) — ce qui est trop agressif pour un logout
            // utilisateur volontaire.
            await supabase.auth.signOut({ scope: "local" });
            setUser(null);
            if (typeof window !== "undefined") {
                localStorage.removeItem("currentUser");
            }
        } catch (error) {
            console.error("Erreur logout:", error);
        }
    };

    const hasPermission = (requiredRole: UserRole): boolean => {
        if (!user) return false;
        const roleHierarchy: Record<UserRole, number> = {
            student: 0,
            user: 1,
            agent: 2,
            supervisor: 3,
            admin: 4,
            super_admin: 5,
        };
        return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    };

    const canCreateRole = (role: UserRole): boolean => {
        if (!user) return false;
        if (user.role === "admin" || user.role === "super_admin") return true;
        if (user.role === "supervisor" && (role === "agent" || role === "student")) return true;
        return false;
    };

    const createUser = async (userData: {
        username: string;
        email: string;
        password: string;
        role: UserRole;
        name: string;
    }): Promise<boolean> => {
        if (!canCreateRole(userData.role)) return false;
        try {
            const res = await fetch("/api/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            });
            if (!res.ok) return false;
            await refreshUsers();
            return true;
        } catch (error) {
            console.error("Erreur création utilisateur:", error);
            return false;
        }
    };

    const canDeleteUser = (targetUser: AuthUser): boolean => {
        if (!user) return false;
        if (user.id === targetUser.id) return false;
        if ((targetUser.role === "super_admin" || targetUser.role === "admin") && user.role !== "super_admin") {
            return false;
        }
        if (user.role === "supervisor") return targetUser.role === "agent" || targetUser.role === "student";
        return user.role === "admin" || user.role === "super_admin";
    };

    const deleteUser = async (userId: string): Promise<boolean> => {
        const targetUser = users.find((entry) => entry.id === userId);
        if (!targetUser || !canDeleteUser(targetUser)) return false;
        try {
            const res = await fetch("/api/delete-user", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) return false;
            await refreshUsers();
            return true;
        } catch (error) {
            console.error("Erreur suppression utilisateur:", error);
            return false;
        }
    };

    const canResetPassword = (targetUser: AuthUser): boolean => {
        if (!user) return false;
        if (user.id === targetUser.id) return false;
        if ((targetUser.role === "super_admin" || targetUser.role === "admin") && user.role !== "super_admin") {
            return false;
        }
        if (user.role === "supervisor") return targetUser.role === "agent" || targetUser.role === "student";
        return user.role === "admin" || user.role === "super_admin";
    };

    const resetUserPassword = async (userId: string, _newPassword: string): Promise<boolean> => {
        const targetUser = users.find((entry) => entry.id === userId);
        if (!targetUser || !canResetPassword(targetUser)) return false;
        try {
            const res = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) return false;
            return true;
        } catch (error) {
            console.error("Erreur reset password:", error);
            return false;
        }
    };

    const changePassword = async (userId: string, _newPassword: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from("users")
                .update({ must_change_password: false, updated_at: new Date().toISOString() })
                .eq("id", userId);
            if (error) throw error;
            await refreshUsers();
            return true;
        } catch (error) {
            console.error("Erreur changement mot de passe:", error);
            return false;
        }
    };

    return (
        <AuthContext.Provider
            value={{
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
                refreshUsers,
                refreshProfile: async () => {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (authUser) await loadUserProfile(authUser.id);
                },
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
