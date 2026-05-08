"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import { createClient } from "../lib/supabase/client";
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
import { KeyRound, Shield, Check, X } from "lucide-react";

interface DbUser {
    id: string;
    username: string;
    email: string;
    role: string;
    name: string;
    must_change_password: boolean;
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
    const [activeTab, setActiveTab] = useState("users");
    const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        username: "",
        name: "",
        email: "",
        password: "Temp123!",
        role: "student",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [userToReset, setUserToReset] = useState<DbUser | null>(null);
    const [resetLoading, setResetLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
    const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
            if (data) setDbUsers(data);
        } catch (err) {
            console.error("Erreur:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const result = await res.json();

            if (!res.ok) {
                setError(result.error || "Erreur lors de la création");
                return;
            }

            setSuccess("Utilisateur créé ! Un email avec les informations de connexion a été envoyé.");
            setFormData({ username: "", name: "", email: "", password: "Temp123!", role: "student" });
            loadUsers();
        } catch (err: any) {
            setError(err.message);
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
            if (!res.ok) setError(result.error || "Erreur lors de la réinitialisation");
            else setSuccess("Email de réinitialisation envoyé avec succès.");
        } catch (err: any) {
            setError(err.message);
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
            if (!res.ok) setError(result.error || "Erreur lors de la suppression");
            else {
                setSuccess("Utilisateur supprimé");
                loadUsers();
            }
        } catch (err: any) {
            setError(err.message);
        }
        setUserToDelete(null);
    };

    const loadUserPermissions = async (userId: string) => {
        setLoadingPermissions(true);
        try {
            const supabase = createClient();
            const { data } = await supabase
                .from("user_permissions")
                .select("*")
                .eq("user_id", userId);
            if (data) setUserPermissions(data);
        } catch (err) {
            console.error("Erreur:", err);
        } finally {
            setLoadingPermissions(false);
        }
    };

    const togglePermission = async (userId: string, permission: Permission, currentlyGranted: boolean) => {
        try {
            const supabase = createClient();
            if (currentlyGranted) {
                await supabase
                    .from("user_permissions")
                    .delete()
                    .eq("user_id", userId)
                    .eq("permission", permission);
            } else {
                await supabase
                    .from("user_permissions")
                    .insert({
                        user_id: userId,
                        permission,
                        granted: true,
                        granted_by: currentUser?.id,
                    });
            }
            loadUserPermissions(userId);
            setSuccess("Permission mise à jour");
            setTimeout(() => setSuccess(""), 2000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const hasPermission = (userId: string, permission: Permission, role: string): boolean => {
        const customPerm = userPermissions.find(p => p.user_id === userId && p.permission === permission);
        if (customPerm) return customPerm.granted;
        return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) || false;
    };

    const isCustomPermission = (userId: string, permission: Permission): boolean => {
        return userPermissions.some(p => p.user_id === userId && p.permission === permission);
    };

    const getRoleLabel = (role: string) =>
        ({
            super_admin: "Super Admin",
            admin: "Admin",
            agent: "Agent",
            student: "Étudiant",
        }[role] || role);

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="space-y-6 p-4 sm:p-6">
                <div className="joda-surface">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Administration accès
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Gestion des Utilisateurs</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Administre les comptes, les rôles et les droits de la plateforme.
                    </p>
                </div>

                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader className="border-b border-slate-100">
                        <div className="flex flex-wrap gap-2">
                            {["users", "create"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setSelectedUser(null); }}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                        activeTab === tab
                                            ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_rgba(239,68,68,0.28)]"
                                            : "bg-white/70 text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {tab === "users" ? `Utilisateurs (${dbUsers.length})` : "Créer"}
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
                                            <TableHead>Rôle</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dbUsers.map((u) => (
                                            <TableRow key={u.id}>
                                                <TableCell>
                                                    <div className="font-medium">{u.name}</div>
                                                    <div className="text-sm text-slate-500">@{u.username}</div>
                                                </TableCell>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>
                                                    <Badge variant={u.role === "super_admin" || u.role === "admin" ? "destructive" : "default"}>
                                                        {getRoleLabel(u.role)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedUser(u);
                                                                loadUserPermissions(u.id);
                                                            }}
                                                        >
                                                            <Shield className="h-4 w-4 mr-1" />
                                                            Permissions
                                                        </Button>
                                                        {u.id !== currentUser?.id && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setUserToReset(u)}
                                                            >
                                                                <KeyRound className="h-4 w-4 mr-1" />
                                                                Réinit. MDP
                                                            </Button>
                                                        )}
                                                        {currentUser?.role === "super_admin" && u.id !== currentUser.id && (
                                                            <Button variant="destructive" size="sm" onClick={() => setUserToDelete(u.id)}>
                                                                Supprimer
                                                            </Button>
                                                        )}
                                                    </div>
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
                                            Rôle: {getRoleLabel(selectedUser.role)} • @{selectedUser.username}
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
                                                                            onCheckedChange={() => togglePermission(selectedUser.id, perm as Permission, granted)}
                                                                        />
                                                                        <div>
                                                                            <div className="font-medium text-sm">{PERMISSION_LABELS[perm as Permission]}</div>
                                                                            <div className="text-xs text-slate-500">{perm}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {isCustom && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                Personnalisé
                                                                            </Badge>
                                                                        )}
                                                                        {isDefault && !isCustom && (
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                Par défaut
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
                                    <CardTitle>Créer un nouvel utilisateur</CardTitle>
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
                                            <Label htmlFor="name">Nom complet *</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Nom Prénom"
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
                                            <Label htmlFor="role">Rôle *</Label>
                                            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v || "student" })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un rôle" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="student">Étudiant</SelectItem>
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
                                                L'utilisateur devra changer son mot de passe à la première connexion.
                                            </p>
                                        </div>
                                        <Button type="submit" className="w-full">
                                            Créer l'utilisateur
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
                                <h3 className="text-lg font-semibold">Réinitialiser le mot de passe</h3>
                            </div>
                            <p className="mb-1 text-sm text-slate-700">
                                Un email de réinitialisation sera envoyé à <strong>{userToReset.name}</strong>.
                            </p>
                            <p className="mb-6 text-xs text-slate-500">
                                L'utilisateur recevra un lien valable 24 h pour définir un nouveau mot de passe.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setUserToReset(null)} disabled={resetLoading}>
                                    Annuler
                                </Button>
                                <Button
                                    onClick={() => handleResetPassword(userToReset.id)}
                                    disabled={resetLoading}
                                    className="bg-amber-500 hover:bg-amber-600 text-white"
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
                                <Button variant="outline" onClick={() => setUserToDelete(null)}>Annuler</Button>
                                <Button variant="destructive" onClick={() => handleDeleteUser(userToDelete)}>Supprimer</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
