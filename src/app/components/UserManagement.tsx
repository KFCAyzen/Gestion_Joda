"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { logActivity } from "../utils/activityLogger";
import ProtectedRoute from "./ProtectedRoute";
import { createClient } from "../lib/supabase/client";
import { getFriendlyErrorMessage } from "../lib/feedback";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Permission, DEFAULT_ROLE_PERMISSIONS, PERMISSION_LABELS, PERMISSION_GROUPS } from "../types/permissions";
import { Check, KeyRound, Power, PowerOff, Shield, Trash2, X } from "lucide-react";
import DropdownMenu from "./shared/DropdownMenu";

interface DbUser {
    id: string;
    username: string;
    email: string;
    role: string;
    name: string;
    must_change_password: boolean;
    is_active?: boolean | null;
    created_at: string;
}

interface UserPermission {
    id: string;
    user_id: string;
    permission: Permission;
    granted: boolean;
    granted_by: string;
    granted_at: string;
}

export default function UserManagement() {
    const { user: currentUser } = useAuth();
    const { showNotification } = useNotificationContext();
    const [activeTab, setActiveTab] = useState("users");
    const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        username: "",
        prenom: "",
        nom: "",
        email: "",
        password: "Temp123!",
        role: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [userToReset, setUserToReset] = useState<DbUser | null>(null);
    const [resetLoading, setResetLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
    const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    const setFeedback = (nextError = "", nextSuccess = "") => {
        setError(nextError);
        setSuccess(nextSuccess);
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error: usersError } = await supabase.from("users").select("*").order("created_at", { ascending: false });

            if (usersError) {
                throw usersError;
            }

            setDbUsers(data || []);
        } catch (err) {
            console.error("Erreur:", err);
            const message = getFriendlyErrorMessage(err, {
                fallback: "Impossible de charger la liste des utilisateurs pour le moment.",
            });
            setFeedback(message, "");
            showNotification({ title: "Chargement des utilisateurs", message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback("", "");

        if (!formData.role) {
            const message = "Selectionnez un role avant de creer le compte.";
            setFeedback(message, "");
            showNotification({ title: "Role requis", message, type: "warning" });
            return;
        }

        if (formData.password.trim().length < 8) {
            const message = "Le mot de passe temporaire doit contenir au moins 8 caracteres.";
            setFeedback(message, "");
            showNotification({ title: "Mot de passe trop court", message, type: "warning" });
            return;
        }

        try {
            const fullName = `${formData.prenom} ${formData.nom}`.trim();
            const res = await fetch("/api/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, name: fullName }),
            });

            const result = await res.json();

            if (!res.ok) {
                const message = getFriendlyErrorMessage(result.error, {
                    fallback: "Impossible de creer cet utilisateur pour le moment.",
                });
                setFeedback(message, "");
                showNotification({ title: "Creation utilisateur", message, type: "error" });
                return;
            }

            const successMessage = "Utilisateur cree. Un email avec les informations de connexion a ete envoye.";
            setFeedback("", successMessage);
            showNotification({
                title: "Utilisateur cree",
                message: "Le compte a bien ete ajoute et l'utilisateur peut finaliser son acces par email.",
                type: "success",
            });
            if (currentUser) {
                const fullName = `${formData.prenom} ${formData.nom}`.trim();
                await logActivity(
                    currentUser.id, currentUser.name, currentUser.role,
                    "user_create", "users", result.userId ?? null,
                    `Utilisateur créé — ${fullName} (${formData.role})`,
                    { username: formData.username, role: formData.role, email: formData.email }
                );
            }
            setFormData({ username: "", prenom: "", nom: "", email: "", password: "Temp123!", role: "" });
            await loadUsers();
        } catch (err) {
            const message = getFriendlyErrorMessage(err, {
                fallback: "La creation de l'utilisateur a echoue. Reessayez dans un instant.",
            });
            setFeedback(message, "");
            showNotification({ title: "Creation utilisateur", message, type: "error" });
        }
    };

    const handleResetPassword = async (userId: string) => {
        setResetLoading(true);
        try {
            const res = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const result = await res.json();

            if (!res.ok) {
                const message = getFriendlyErrorMessage(result.error, {
                    fallback: "Impossible d'envoyer le lien de reinitialisation pour le moment.",
                });
                setFeedback(message, "");
                showNotification({ title: "Reinitialisation du mot de passe", message, type: "error" });
            } else {
                const successMessage = "Email de reinitialisation envoye avec succes.";
                setFeedback("", successMessage);
                showNotification({
                    title: "Lien envoye",
                    message: "L'utilisateur recevra un email pour choisir un nouveau mot de passe.",
                    type: "success",
                });
            }
        } catch (err) {
            const message = getFriendlyErrorMessage(err, {
                fallback: "Impossible d'envoyer le lien de reinitialisation pour le moment.",
            });
            setFeedback(message, "");
            showNotification({ title: "Reinitialisation du mot de passe", message, type: "error" });
        }
        setResetLoading(false);
        setUserToReset(null);
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            const res = await fetch("/api/delete-user", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const result = await res.json();

            if (!res.ok) {
                const message = getFriendlyErrorMessage(result.error, {
                    fallback: "La suppression a echoue. Verifiez qu'aucune contrainte ne bloque ce compte.",
                });
                setFeedback(message, "");
                showNotification({ title: "Suppression utilisateur", message, type: "error" });
            } else {
                const successMessage = "Utilisateur supprime.";
                setFeedback("", successMessage);
                showNotification({
                    title: "Utilisateur supprime",
                    message: "Le compte a bien ete retire de la plateforme.",
                    type: "success",
                });
                if (currentUser) {
                    await logActivity(
                        currentUser.id, currentUser.name, currentUser.role,
                        "user_delete", "users", userId,
                        `Utilisateur supprimé — ID: ${userId}`,
                        { deleted_user_id: userId }
                    );
                }
                await loadUsers();
            }
        } catch (err) {
            const message = getFriendlyErrorMessage(err, {
                fallback: "La suppression a echoue. Reessayez dans un instant.",
            });
            setFeedback(message, "");
            showNotification({ title: "Suppression utilisateur", message, type: "error" });
        }
        setUserToDelete(null);
    };

    const handleToggleUserActive = async (targetUser: DbUser) => {
        if (!currentUser || targetUser.id === currentUser.id) return;

        const nextActive = targetUser.is_active === false;
        try {
            const supabase = createClient();
            const { error: updateError } = await supabase
                .from("users")
                .update({ is_active: nextActive, updated_at: new Date().toISOString() })
                .eq("id", targetUser.id);

            if (updateError) {
                throw updateError;
            }

            await logActivity(
                currentUser.id,
                currentUser.name,
                currentUser.role,
                "user_update",
                "users",
                targetUser.id,
                `Compte ${nextActive ? "activé" : "désactivé"} — ${targetUser.name}`,
                { target_user_id: targetUser.id, is_active: nextActive },
            );

            const message = nextActive
                ? `${targetUser.name} peut de nouveau accéder à la plateforme.`
                : `${targetUser.name} ne pourra plus se connecter tant que le compte reste désactivé.`;
            setFeedback("", message);
            showNotification({
                title: nextActive ? "Compte activé" : "Compte désactivé",
                message,
                type: "success",
            });
            await loadUsers();
        } catch (err) {
            const message = getFriendlyErrorMessage(err, {
                fallback: "Le statut du compte n'a pas pu être modifié. Réessayez dans un instant.",
            });
            setFeedback(message, "");
            showNotification({ title: "Statut du compte", message, type: "error" });
        }
    };

    const loadUserPermissions = async (userId: string) => {
        setLoadingPermissions(true);
        try {
            const supabase = createClient();
            const { data, error: permissionsError } = await supabase
                .from("user_permissions")
                .select("*")
                .eq("user_id", userId);

            if (permissionsError) {
                throw permissionsError;
            }

            setUserPermissions(data || []);
        } catch (err) {
            console.error("Erreur:", err);
            const message = getFriendlyErrorMessage(err, {
                fallback: "Impossible de charger les permissions de cet utilisateur.",
            });
            setFeedback(message, "");
            showNotification({ title: "Chargement des permissions", message, type: "error" });
        } finally {
            setLoadingPermissions(false);
        }
    };

    const togglePermission = async (userId: string, permission: Permission, currentlyGranted: boolean) => {
        try {
            const supabase = createClient();

            if (currentlyGranted) {
                const { error: deleteError } = await supabase
                    .from("user_permissions")
                    .delete()
                    .eq("user_id", userId)
                    .eq("permission", permission);

                if (deleteError) {
                    throw deleteError;
                }
            } else {
                const { error: insertError } = await supabase
                    .from("user_permissions")
                    .insert({
                        user_id: userId,
                        permission,
                        granted: true,
                        granted_by: currentUser?.id,
                    });

                if (insertError) {
                    throw insertError;
                }
            }

            await loadUserPermissions(userId);
            setFeedback("", "Permission mise a jour.");
            showNotification({
                title: "Permissions mises a jour",
                message: currentlyGranted
                    ? "La permission personnalisee a ete retiree."
                    : "La permission personnalisee a ete accordee.",
                type: "success",
            });
            if (currentUser) {
                await logActivity(
                    currentUser.id, currentUser.name, currentUser.role,
                    "user_update", "user_permissions", userId,
                    `Permission ${currentlyGranted ? "retirée" : "accordée"} — ${permission} → utilisateur ${userId}`,
                    { target_user_id: userId, permission, granted: !currentlyGranted }
                );
            }
            setTimeout(() => setSuccess(""), 2000);
        } catch (err) {
            const message = getFriendlyErrorMessage(err, {
                fallback: "Impossible de modifier cette permission pour le moment.",
            });
            setFeedback(message, "");
            showNotification({ title: "Mise a jour des permissions", message, type: "error" });
        }
    };

    const hasPermission = (userId: string, permission: Permission, role: string): boolean => {
        const customPerm = userPermissions.find((entry) => entry.user_id === userId && entry.permission === permission);
        if (customPerm) return customPerm.granted;
        return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) || false;
    };

    const isCustomPermission = (userId: string, permission: Permission): boolean => {
        return userPermissions.some((entry) => entry.user_id === userId && entry.permission === permission);
    };

    const getRoleLabel = (role: string) =>
        ({
            super_admin: "Super Admin",
            admin: "Admin",
            agent: "Agent",
            student: "Etudiant",
            supervisor: "Superviseur",
        })[role] || role;

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="space-y-6 p-4 sm:p-6">
                <div className="joda-surface">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Administration acces
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Gestion des Utilisateurs</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Administre les comptes, les roles et les droits de la plateforme.
                    </p>
                </div>

                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader className="border-b border-slate-100">
                        <div className="flex flex-wrap gap-2">
                            {["users", "create"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setSelectedUser(null);
                                    }}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                        activeTab === tab
                                            ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_rgba(239,68,68,0.28)]"
                                            : "bg-white/70 text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {tab === "users" ? `Utilisateurs (${dbUsers.length})` : "Creer"}
                                </button>
                            ))}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                        {success && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

                        {activeTab === "users" && !selectedUser &&
                            (loading ? (
                                <div className="py-8 text-center text-slate-500">Chargement...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nom</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Statut</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dbUsers.map((entry) => (
                                            <TableRow key={entry.id} className={entry.is_active === false ? "opacity-60" : ""}>
                                                <TableCell>
                                                    <div className="font-medium">{entry.name}</div>
                                                    <div className="text-sm text-slate-500">@{entry.username}</div>
                                                </TableCell>
                                                <TableCell>{entry.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={entry.role === "super_admin" || entry.role === "admin" ? "destructive" : "default"}>
                                                        {getRoleLabel(entry.role)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            entry.is_active === false
                                                                ? "bg-red-100 text-red-700 hover:bg-red-100"
                                                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                                        }
                                                    >
                                                        {entry.is_active === false ? "Désactivé" : "Actif"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu
                                                        actions={[
                                                            {
                                                                label: "Permissions",
                                                                icon: <Shield className="h-4 w-4" />,
                                                                onClick: () => {
                                                                    setSelectedUser(entry);
                                                                    void loadUserPermissions(entry.id);
                                                                },
                                                            },
                                                            ...(entry.id !== currentUser?.id
                                                                ? [
                                                                      {
                                                                          label: "Réinitialiser le mot de passe",
                                                                          icon: <KeyRound className="h-4 w-4" />,
                                                                          onClick: () => setUserToReset(entry),
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...((currentUser?.role === "admin" || currentUser?.role === "super_admin") && entry.id !== currentUser?.id
                                                                ? [
                                                                      {
                                                                          label: entry.is_active === false ? "Activer le compte" : "Désactiver le compte",
                                                                          icon:
                                                                              entry.is_active === false ? (
                                                                                  <Power className="h-4 w-4" />
                                                                              ) : (
                                                                                  <PowerOff className="h-4 w-4" />
                                                                              ),
                                                                          onClick: () => void handleToggleUserActive(entry),
                                                                          variant: entry.is_active === false ? "default" as const : "danger" as const,
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...(currentUser?.role === "super_admin" && entry.id !== currentUser.id
                                                                ? [
                                                                      {
                                                                          label: "Supprimer",
                                                                          icon: <Trash2 className="h-4 w-4" />,
                                                                          onClick: () => setUserToDelete(entry.id),
                                                                          variant: "danger" as const,
                                                                      },
                                                                  ]
                                                                : []),
                                                        ]}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ))}

                        {activeTab === "users" && selectedUser && (
                            <div>
                                <div className="mb-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                                        <p className="text-sm text-slate-500">
                                            Role: {getRoleLabel(selectedUser.role)} - @{selectedUser.username}
                                        </p>
                                    </div>
                                    <Button variant="outline" onClick={() => setSelectedUser(null)}>
                                        Retour
                                    </Button>
                                </div>

                                {loadingPermissions ? (
                                    <div className="py-8 text-center text-slate-500">Chargement...</div>
                                ) : (
                                    <div className="space-y-6">
                                        {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => (
                                            <Card key={group} className="joda-surface-muted">
                                                <CardHeader>
                                                    <CardTitle className="text-base">{group}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-3">
                                                        {permissions.map((perm) => {
                                                            const granted = hasPermission(selectedUser.id, perm as Permission, selectedUser.role);
                                                            const isCustom = isCustomPermission(selectedUser.id, perm as Permission);
                                                            const isDefault = DEFAULT_ROLE_PERMISSIONS[selectedUser.role]?.includes(perm as Permission);

                                                            return (
                                                                <div key={perm} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <Checkbox
                                                                            checked={granted}
                                                                            onCheckedChange={() =>
                                                                                void togglePermission(selectedUser.id, perm as Permission, granted)
                                                                            }
                                                                        />
                                                                        <div>
                                                                            <div className="text-sm font-medium">{PERMISSION_LABELS[perm as Permission]}</div>
                                                                            <div className="text-xs text-slate-500">{perm}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {isCustom && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                Personnalise
                                                                            </Badge>
                                                                        )}
                                                                        {isDefault && !isCustom && (
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                Par defaut
                                                                            </Badge>
                                                                        )}
                                                                        {granted ? (
                                                                            <Check className="h-4 w-4 text-emerald-500" />
                                                                        ) : (
                                                                            <X className="h-4 w-4 text-slate-300" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "create" && (
                            <Card className="joda-surface-muted max-w-lg border-0 shadow-none">
                                <CardHeader>
                                    <CardTitle>Creer un nouvel utilisateur</CardTitle>
                                    <CardDescription>L'utilisateur recevra un email pour confirmer son compte.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleCreateUser} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="username">Nom d'utilisateur *</Label>
                                            <Input
                                                id="username"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                placeholder="nom_utilisateur"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="prenom">Prénom *</Label>
                                            <Input
                                                id="prenom"
                                                value={formData.prenom}
                                                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                                placeholder="Prénom"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nom">Nom *</Label>
                                            <Input
                                                id="nom"
                                                value={formData.nom}
                                                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                                placeholder="Nom de famille"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="email@exemple.com"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="role">Role *</Label>
                                            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v || "" })}>
                                                <SelectTrigger className={!formData.role ? "text-slate-400" : ""}>
                                                    <SelectValue placeholder="Selectionner un role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="student">Etudiant</SelectItem>
                                                    <SelectItem value="agent">Agent</SelectItem>
                                                    {currentUser?.role === "super_admin" && (
                                                        <>
                                                            <SelectItem value="supervisor">Superviseur</SelectItem>
                                                            <SelectItem value="admin">Administrateur</SelectItem>
                                                            <SelectItem value="super_admin">Super Administrateur</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Mot de passe temporaire *</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                            <p className="text-xs text-slate-500">
                                                L'utilisateur devra changer son mot de passe a la premiere connexion.
                                            </p>
                                        </div>
                                        <Button type="submit" className="w-full">
                                            Creer l'utilisateur
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>

                {userToReset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                    <KeyRound className="h-5 w-5 text-amber-600" />
                                </div>
                                <h3 className="text-lg font-semibold">Reinitialiser le mot de passe</h3>
                            </div>
                            <p className="mb-1 text-sm text-slate-700">
                                Un email de reinitialisation sera envoye a <strong>{userToReset.name}</strong>.
                            </p>
                            <p className="mb-6 text-xs text-slate-500">
                                L'utilisateur recevra un lien valable 24 h pour definir un nouveau mot de passe.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setUserToReset(null)} disabled={resetLoading}>
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() => void handleResetPassword(userToReset.id)}
                                    disabled={resetLoading}
                                    className="bg-amber-500 text-white hover:bg-amber-600"
                                >
                                    {resetLoading ? "Envoi..." : "Envoyer le lien"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {userToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                            <h3 className="mb-4 text-lg font-semibold">Confirmer la suppression</h3>
                            <p className="mb-4">Voulez-vous supprimer cet utilisateur ?</p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setUserToDelete(null)}>
                                    Annuler
                                </Button>
                                <Button variant="destructive" onClick={() => void handleDeleteUser(userToDelete)}>
                                    Supprimer
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
