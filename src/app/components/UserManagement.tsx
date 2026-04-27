"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import { supabase } from "../supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DbUser {
    id: string;
    username: string;
    email: string;
    role: string;
    name: string;
    must_change_password: boolean;
    created_at: string;
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

    const loadUsers = async () => {
        setLoading(true);
        try {
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

    const rolePermissions: Record<string, string[]> = {
        super_admin: ["Accès complet", "Gestion utilisateurs", "Configuration"],
        admin: ["Gestion modules", "Rapports"],
        agent: ["Gestion dossiers", "Paiements", "Suivi étudiants"],
        student: ["Consultation", "Paiements", "Documents"],
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
                            {["users", "permissions", "create"].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                        activeTab === tab
                                            ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_rgba(239,68,68,0.28)]"
                                            : "bg-white/70 text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {tab === "users" ? `Utilisateurs (${dbUsers.length})` : tab === "permissions" ? "Permissions" : "Créer"}
                                </button>
                            ))}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
                        {success && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>}

                        {activeTab === "users" &&
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
                                                    {currentUser?.role === "super_admin" && u.id !== currentUser.id && (
                                                        <Button variant="destructive" size="sm" onClick={() => setUserToDelete(u.id)}>
                                                            Supprimer
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ))}

                        {activeTab === "permissions" && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {Object.entries(rolePermissions).map(([role, perms]) => (
                                    <Card key={role} className="joda-surface-muted p-1">
                                        <CardHeader>
                                            <CardTitle>{getRoleLabel(role)}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {perms.map((p, i) => (
                                                    <li key={i} className="flex items-center gap-2">
                                                        <span className="text-emerald-500">OK</span>
                                                        <span>{p}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
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
