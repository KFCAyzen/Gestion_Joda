"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { logActivity } from "../utils/activityLogger";
import ProtectedRoute from "./ProtectedRoute";
import { createClient } from "../lib/supabase/client";
import { useUsers, USERS_KEY } from "../lib/hooks/use-users";
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
import { Permission, PERMISSION_LABELS, PERMISSION_GROUPS, PERMISSION_DESCRIPTIONS } from "../types/permissions";
import { fetchRolePermissionMap, roleHasPermission, isRoleConfigured, ALL_PERMISSIONS, type RolePermissionMap } from "../lib/rolePermissions";
import { Check, KeyRound, Loader2, Power, PowerOff, Shield, Trash2, X } from "lucide-react";
import DropdownMenu from "./shared/DropdownMenu";
import PhoneInput from "./shared/PhoneInput";
import { DEFAULT_PHONE_COUNTRY_CODE, normalizePhoneNumber } from "../lib/phone";

interface DbUser {
    id: string;
    username: string;
    email: string;
    role: string;
    name: string;
    telephone?: string | null;
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
    const t = useTranslations("userManagement");
    const { showNotification } = useNotificationContext();
    const queryClient = useQueryClient();
    const { data: usersData, isLoading: loading } = useUsers();
    const dbUsers = (usersData ?? []) as unknown as DbUser[];
    const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: USERS_KEY });
    const [activeTab, setActiveTab] = useState("users");
    const [formData, setFormData] = useState({
        username: "",
        prenom: "",
        nom: "",
        email: "",
        phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
        telephone: "",
        password: "Temp123!",
        role: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [userToReset, setUserToReset] = useState<DbUser | null>(null);
    const [resetLoading, setResetLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [togglingPermKey, setTogglingPermKey] = useState<string | null>(null);
    const [togglingGroup, setTogglingGroup] = useState<string | null>(null);
    const [roleMap, setRoleMap] = useState<RolePermissionMap>({});
    const [editingRole, setEditingRole] = useState<string>("agent");
    const [togglingRoleKey, setTogglingRoleKey] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<DbUser | null>(null);
    const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    const setFeedback = (nextError = "", nextSuccess = "") => {
        setError(nextError);
        setSuccess(nextSuccess);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback("", "");
        setIsCreating(true);

        if (!formData.role) {
            const message = t("messages.roleRequired");
            setFeedback(message, "");
            showNotification({ title: t("messages.roleRequiredTitle"), message, type: "warning" });
            setIsCreating(false);
            return;
        }

        const trimmedUsername = formData.username.trim();
        if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
            const message = t("messages.usernameInvalid");
            setFeedback(message, "");
            showNotification({ title: t("messages.usernameInvalidTitle"), message, type: "warning" });
            setIsCreating(false);
            return;
        }

        if (formData.password.trim().length < 8) {
            const message = t("messages.passwordTooShort");
            setFeedback(message, "");
            showNotification({ title: t("messages.passwordTooShortTitle"), message, type: "warning" });
            setIsCreating(false);
            return;
        }

        try {
            const fullName = `${formData.prenom} ${formData.nom}`.trim();
            const phoneNumber = normalizePhoneNumber(formData.phoneCountryCode, formData.telephone);
            const res = await fetch("/api/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, telephone: phoneNumber, name: fullName }),
            });

            const result = await res.json();

            if (!res.ok) {
                const message = getFriendlyErrorMessage(result.error, {
                    fallback: t("messages.createError"),
                });
                setFeedback(message, "");
                showNotification({ title: t("messages.createTitle"), message, type: "error" });
                return;
            }

            const successMessage = t("messages.createSuccess");
            setFeedback("", successMessage);
            showNotification({
                title: t("messages.createSuccessTitle"),
                message: t("messages.createSuccessDetail"),
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
            setFormData({
                username: "",
                prenom: "",
                nom: "",
                email: "",
                phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
                telephone: "",
                password: "Temp123!",
                role: "",
            });
            await invalidateUsers();
        } catch (err) {
            const message = getFriendlyErrorMessage(err, {
                fallback: t("messages.createCatchError"),
            });
            setFeedback(message, "");
            showNotification({ title: t("messages.createTitle"), message, type: "error" });
        } finally {
            setIsCreating(false);
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
                    fallback: t("messages.resetError"),
                });
                setFeedback(message, "");
                showNotification({ title: t("messages.resetTitle"), message, type: "error" });
            } else {
                const successMessage = t("messages.resetSuccess");
                setFeedback("", successMessage);
                showNotification({
                    title: t("messages.resetSuccessTitle"),
                    message: t("messages.resetSuccessDetail"),
                    type: "success",
                });
            }
        } catch (err) {
            const message = getFriendlyErrorMessage(err, {
                fallback: t("messages.resetError"),
            });
            setFeedback(message, "");
            showNotification({ title: t("messages.resetTitle"), message, type: "error" });
        }
        setResetLoading(false);
        setUserToReset(null);
    };

    const handleDeleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const res = await fetch("/api/delete-user", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const result = await res.json();

            if (!res.ok) {
                const message = getFriendlyErrorMessage(result.error, {
                    fallback: t("messages.deleteConstraintError"),
                });
                setFeedback(message, "");
                showNotification({ title: t("messages.deleteTitle"), message, type: "error" });
            } else {
                const successMessage = t("messages.deleteSuccess");
                setFeedback("", successMessage);
                showNotification({
                    title: t("messages.deleteSuccessTitle"),
                    message: t("messages.deleteSuccessDetail"),
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
                await invalidateUsers();
            }
        } catch (err) {
            const message = getFriendlyErrorMessage(err, {
                fallback: t("messages.deleteCatchError"),
            });
            setFeedback(message, "");
            showNotification({ title: t("messages.deleteTitle"), message, type: "error" });
        } finally {
            setIsDeleting(false);
            setUserToDelete(null);
        }
    };

    const handleToggleUserActive = async (targetUser: DbUser) => {
        if (!currentUser || targetUser.id === currentUser.id) return;
        setTogglingId(targetUser.id);
        const nextActive = targetUser.is_active === false;
        try {
            const res = await fetch("/api/activate-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: targetUser.id, activate: nextActive }),
            });

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error ?? "Erreur lors de la mise à jour du statut");
            }

            const json = await res.json();

            await logActivity(
                currentUser.id,
                currentUser.name,
                currentUser.role,
                "user_update",
                "users",
                targetUser.id,
                `Compte ${nextActive ? "activé" : "désactivé"} — ${targetUser.name}`,
                {
                    target_user_id: targetUser.id,
                    is_active: nextActive,
                    ...(json.workflow ? { workflow: json.workflow } : {}),
                },
            );

            const message = nextActive
                ? t("messages.accountActivatedDetail", { name: targetUser.name })
                : t("messages.accountDeactivatedDetail", { name: targetUser.name });
            setFeedback("", message);
            showNotification({
                title: nextActive ? t("messages.accountActivatedTitle") : t("messages.accountDeactivatedTitle"),
                message,
                type: "success",
            });
            await invalidateUsers();
        } catch (err) {
            const message = getFriendlyErrorMessage(err, {
                fallback: t("messages.accountStatusError"),
            });
            setFeedback(message, "");
            showNotification({ title: t("messages.accountStatusTitle"), message, type: "error" });
        } finally {
            setTogglingId(null);
        }
    };

    const loadRoleMap = useCallback(async () => {
        try {
            const supabase = createClient();
            setRoleMap(await fetchRolePermissionMap(supabase));
        } catch (err) {
            console.error("Erreur chargement permissions de rôle:", err);
        }
    }, []);

    useEffect(() => {
        void loadRoleMap();
    }, [loadRoleMap]);

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
                fallback: t("messages.permissionsLoadError"),
            });
            setFeedback(message, "");
            showNotification({ title: t("messages.permissionsLoadTitle"), message, type: "error" });
        } finally {
            setLoadingPermissions(false);
        }
    };

    const togglePermission = async (userId: string, permission: Permission, currentlyGranted: boolean) => {
        const key = `${userId}-${permission}`;
        setTogglingPermKey(key);
        try {
            const supabase = createClient();

            const desired = !currentlyGranted;
            const targetRole = selectedUser?.role ?? "";
            const isDefault = roleHasPermission(targetRole, permission, roleMap);

            if (desired === isDefault) {
                // L'état souhaité coïncide avec le défaut du rôle : on retire toute
                // surcharge personnalisée pour revenir au comportement par défaut.
                const { error: deleteError } = await supabase
                    .from("user_permissions")
                    .delete()
                    .eq("user_id", userId)
                    .eq("permission", permission);

                if (deleteError) {
                    throw deleteError;
                }
            } else {
                // Surcharge explicite : accord (granted:true) hors défaut, ou refus
                // (granted:false) d'une permission normalement accordée par le rôle.
                const { error: upsertError } = await supabase
                    .from("user_permissions")
                    .upsert(
                        {
                            user_id: userId,
                            permission,
                            granted: desired,
                            granted_by: currentUser?.id,
                        },
                        { onConflict: "user_id,permission" }
                    );

                if (upsertError) {
                    throw upsertError;
                }
            }

            await loadUserPermissions(userId);
            setFeedback("", t("messages.permissionUpdated"));
            showNotification({
                title: t("messages.permissionsUpdatedTitle"),
                message: currentlyGranted
                    ? t("messages.permissionRemoved")
                    : t("messages.permissionGranted"),
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
                fallback: t("messages.permissionUpdateError"),
            });
            setFeedback(message, "");
            showNotification({ title: t("messages.permissionsUpdateTitle"), message, type: "error" });
        } finally {
            setTogglingPermKey(null);
        }
    };

    // Gestion groupée : accorde tout le groupe s'il n'est pas entièrement accordé,
    // sinon retire tout le groupe. Une seule requête par permission, puis rechargement.
    const toggleGroup = async (userId: string, group: string, permissions: readonly Permission[], grantAll: boolean) => {
        setTogglingGroup(`${userId}-${group}`);
        try {
            const supabase = createClient();
            const targetRole = selectedUser?.role ?? "";

            for (const permission of permissions) {
                const isDefault = roleHasPermission(targetRole, permission, roleMap);
                if (grantAll === isDefault) {
                    // L'état souhaité = défaut du rôle → on retire toute surcharge.
                    const { error: deleteError } = await supabase
                        .from("user_permissions")
                        .delete()
                        .eq("user_id", userId)
                        .eq("permission", permission);
                    if (deleteError) throw deleteError;
                } else {
                    const { error: upsertError } = await supabase
                        .from("user_permissions")
                        .upsert(
                            { user_id: userId, permission, granted: grantAll, granted_by: currentUser?.id },
                            { onConflict: "user_id,permission" }
                        );
                    if (upsertError) throw upsertError;
                }
            }

            await loadUserPermissions(userId);
            showNotification({
                title: t("messages.permissionsUpdatedTitle"),
                message: grantAll ? t("messages.groupGranted", { group }) : t("messages.groupRemoved", { group }),
                type: "success",
            });
            if (currentUser) {
                await logActivity(
                    currentUser.id, currentUser.name, currentUser.role,
                    "user_update", "user_permissions", userId,
                    `Groupe de permissions ${grantAll ? "accordé" : "retiré"} — ${group} → utilisateur ${userId}`,
                    { target_user_id: userId, group, granted: grantAll }
                );
            }
        } catch (err) {
            const message = getFriendlyErrorMessage(err, { fallback: t("messages.permissionUpdateError") });
            setFeedback(message, "");
            showNotification({ title: t("messages.permissionsUpdateTitle"), message, type: "error" });
        } finally {
            setTogglingGroup(null);
        }
    };

    // ---- Gestion des permissions PAR RÔLE (table role_permissions) ----------
    // « Matérialise » un rôle non encore configuré : écrit l'intégralité de son set
    // effectif courant, pour qu'il fasse désormais autorité sur les défauts du code.
    const ensureRoleMaterialized = async (supabase: ReturnType<typeof createClient>, role: string) => {
        if (isRoleConfigured(role, roleMap)) return;
        const rows = ALL_PERMISSIONS.map((permission) => ({
            role,
            permission,
            granted: roleHasPermission(role, permission, roleMap),
            updated_by: currentUser?.id,
        }));
        const { error } = await supabase
            .from("role_permissions")
            .upsert(rows, { onConflict: "role,permission" });
        if (error) throw error;
    };

    const toggleRolePermission = async (role: string, permission: Permission, currentlyGranted: boolean) => {
        setTogglingRoleKey(`${role}-${permission}`);
        try {
            const supabase = createClient();
            await ensureRoleMaterialized(supabase, role);
            const { error } = await supabase
                .from("role_permissions")
                .upsert(
                    { role, permission, granted: !currentlyGranted, updated_by: currentUser?.id, updated_at: new Date().toISOString() },
                    { onConflict: "role,permission" }
                );
            if (error) throw error;
            await loadRoleMap();
            showNotification({
                title: t("messages.permissionsUpdatedTitle"),
                message: currentlyGranted ? t("messages.permissionRemoved") : t("messages.permissionGranted"),
                type: "success",
            });
            if (currentUser) {
                await logActivity(
                    currentUser.id, currentUser.name, currentUser.role,
                    "user_update", "role_permissions", role,
                    `Permission de rôle ${currentlyGranted ? "retirée" : "accordée"} — ${permission} → rôle ${role}`,
                    { role, permission, granted: !currentlyGranted }
                );
            }
        } catch (err) {
            const message = getFriendlyErrorMessage(err, { fallback: t("messages.permissionUpdateError") });
            setFeedback(message, "");
            showNotification({ title: t("messages.permissionsUpdateTitle"), message, type: "error" });
        } finally {
            setTogglingRoleKey(null);
        }
    };

    const toggleRoleGroup = async (role: string, group: string, permissions: readonly Permission[], grantAll: boolean) => {
        setTogglingRoleKey(`${role}-group-${group}`);
        try {
            const supabase = createClient();
            await ensureRoleMaterialized(supabase, role);
            const rows = permissions.map((permission) => ({
                role,
                permission,
                granted: grantAll,
                updated_by: currentUser?.id,
                updated_at: new Date().toISOString(),
            }));
            const { error } = await supabase
                .from("role_permissions")
                .upsert(rows, { onConflict: "role,permission" });
            if (error) throw error;
            await loadRoleMap();
            showNotification({
                title: t("messages.permissionsUpdatedTitle"),
                message: grantAll ? t("messages.groupGranted", { group }) : t("messages.groupRemoved", { group }),
                type: "success",
            });
            if (currentUser) {
                await logActivity(
                    currentUser.id, currentUser.name, currentUser.role,
                    "user_update", "role_permissions", role,
                    `Groupe de permissions de rôle ${grantAll ? "accordé" : "retiré"} — ${group} → rôle ${role}`,
                    { role, group, granted: grantAll }
                );
            }
        } catch (err) {
            const message = getFriendlyErrorMessage(err, { fallback: t("messages.permissionUpdateError") });
            setFeedback(message, "");
            showNotification({ title: t("messages.permissionsUpdateTitle"), message, type: "error" });
        } finally {
            setTogglingRoleKey(null);
        }
    };

    const hasPermission = (userId: string, permission: Permission, role: string): boolean => {
        const customPerm = userPermissions.find((entry) => entry.user_id === userId && entry.permission === permission);
        if (customPerm) return customPerm.granted;
        return roleHasPermission(role, permission, roleMap);
    };

    const isCustomPermission = (userId: string, permission: Permission): boolean => {
        return userPermissions.some((entry) => entry.user_id === userId && entry.permission === permission);
    };

    const getRoleLabel = (role: string) =>
        ({
            super_admin: "Super Admin",
            admin: "Admin",
            agent: "Agent",
            student: t("roles.student"),
            supervisor: t("roles.supervisor"),
        })[role] || role;

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="space-y-6 p-4 sm:p-6">
                <div className="joda-surface">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        {t("header.eyebrow")}
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t("header.title")}</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("header.description")}
                    </p>
                </div>

                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-700">
                        <div className="flex flex-wrap gap-2">
                            {(currentUser?.role === "super_admin" ? ["users", "roles", "create"] : ["users", "create"]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setSelectedUser(null);
                                    }}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                        activeTab === tab
                                            ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_rgba(239,68,68,0.28)]"
                                            : "bg-white/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                    }`}
                                >
                                    {tab === "users" ? t("tabs.users", { count: dbUsers.length }) : tab === "roles" ? t("tabs.roles") : t("tabs.create")}
                                </button>
                            ))}
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {error && <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
                        {success && <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-300">{success}</div>}

                        {activeTab === "users" && !selectedUser &&
                            (loading ? (
                                <div className="py-8 text-center text-slate-500 dark:text-slate-400">{t("loading")}</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t("table.name")}</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>{t("table.role")}</TableHead>
                                            <TableHead>{t("table.status")}</TableHead>
                                            <TableHead>{t("table.actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dbUsers.map((entry) => (
                                            <TableRow key={entry.id} className={entry.is_active === false ? "opacity-60" : ""}>
                                                <TableCell>
                                                    <div className="font-medium">{entry.name}</div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400">@{entry.username}</div>
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
                                                                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
                                                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                                        }
                                                    >
                                                        {entry.is_active === false ? t("status.disabled") : t("status.active")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu
                                                        actions={[
                                                            {
                                                                label: t("actions.permissions"),
                                                                icon: <Shield className="h-4 w-4" />,
                                                                onClick: () => {
                                                                    setSelectedUser(entry);
                                                                    void loadUserPermissions(entry.id);
                                                                },
                                                            },
                                                            ...(entry.id !== currentUser?.id
                                                                ? [
                                                                      {
                                                                          label: t("actions.resetPassword"),
                                                                          icon: <KeyRound className="h-4 w-4" />,
                                                                          onClick: () => setUserToReset(entry),
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...((currentUser?.role === "admin" || currentUser?.role === "super_admin") && entry.id !== currentUser?.id
                                                                ? [
                                                                      {
                                                                          label: togglingId === entry.id
                                                                              ? t("actions.updating")
                                                                              : (entry.is_active === false ? t("actions.activateAccount") : t("actions.deactivateAccount")),
                                                                          icon: togglingId === entry.id
                                                                              ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                              : (entry.is_active === false ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />),
                                                                          onClick: () => { if (!togglingId) void handleToggleUserActive(entry); },
                                                                          variant: entry.is_active === false ? "default" as const : "danger" as const,
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...(currentUser?.role === "super_admin" && entry.id !== currentUser.id
                                                                ? [
                                                                      {
                                                                          label: t("actions.delete"),
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
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {t("permissions.roleLine", { role: getRoleLabel(selectedUser.role), username: selectedUser.username })}
                                        </p>
                                    </div>
                                    <Button variant="outline" onClick={() => setSelectedUser(null)}>
                                        {t("actions.back")}
                                    </Button>
                                </div>

                                {loadingPermissions ? (
                                    <div className="py-8 text-center text-slate-500 dark:text-slate-400">{t("loading")}</div>
                                ) : (
                                    <div className="space-y-6">
                                        {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => {
                                            const groupPerms = permissions as readonly Permission[];
                                            const grantedCount = groupPerms.filter((p) => hasPermission(selectedUser.id, p, selectedUser.role)).length;
                                            const allGranted = grantedCount === groupPerms.length;
                                            const noneGranted = grantedCount === 0;
                                            const groupBusy = togglingGroup === `${selectedUser.id}-${group}`;
                                            return (
                                            <Card key={group} className="joda-surface-muted">
                                                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                                                    <div>
                                                        <CardTitle className="text-base">{group}</CardTitle>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {t("permissions.groupCount", { granted: grantedCount, total: groupPerms.length })}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={groupBusy}
                                                        onClick={() => void toggleGroup(selectedUser.id, group, groupPerms, !allGranted)}
                                                    >
                                                        {allGranted ? t("permissions.revokeAll") : t("permissions.grantAll")}
                                                    </Button>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-3">
                                                        {permissions.map((perm) => {
                                                            const granted = hasPermission(selectedUser.id, perm as Permission, selectedUser.role);
                                                            const isCustom = isCustomPermission(selectedUser.id, perm as Permission);
                                                            const isDefault = roleHasPermission(selectedUser.role, perm as Permission, roleMap);

                                                            return (
                                                                <div key={perm} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <Checkbox
                                                                            checked={granted}
                                                                            disabled={togglingPermKey === `${selectedUser.id}-${perm}` || groupBusy}
                                                                            onCheckedChange={() =>
                                                                                void togglePermission(selectedUser.id, perm as Permission, granted)
                                                                            }
                                                                        />
                                                                        <div>
                                                                            <div className="text-sm font-medium">{PERMISSION_LABELS[perm as Permission]}</div>
                                                                            <div className="text-xs text-slate-500 dark:text-slate-400">{PERMISSION_DESCRIPTIONS[perm as Permission]}</div>
                                                                            <div className="mt-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">{perm}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {isCustom && (
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {t("permissions.custom")}
                                                                            </Badge>
                                                                        )}
                                                                        {isDefault && !isCustom && (
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                {t("permissions.default")}
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
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === "roles" && currentUser?.role === "super_admin" && (
                            <div className="space-y-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">{t("roleEditor.title")}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{t("roleEditor.description")}</p>
                                    </div>
                                    <div className="w-full sm:w-56">
                                        <Select value={editingRole} onValueChange={(v) => setEditingRole(v ?? "agent")}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {["student", "agent", "supervisor", "admin"].map((r) => (
                                                    <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                                    {isRoleConfigured(editingRole, roleMap)
                                        ? t("roleEditor.configured")
                                        : t("roleEditor.usingDefaults")}
                                    {" "}{t("roleEditor.superAdminNote")}
                                </div>

                                {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => {
                                    const groupPerms = permissions as readonly Permission[];
                                    const grantedCount = groupPerms.filter((p) => roleHasPermission(editingRole, p, roleMap)).length;
                                    const allGranted = grantedCount === groupPerms.length;
                                    const groupKey = `${editingRole}-group-${group}`;
                                    return (
                                        <Card key={group} className="joda-surface-muted">
                                            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                                                <div>
                                                    <CardTitle className="text-base">{group}</CardTitle>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {t("permissions.groupCount", { granted: grantedCount, total: groupPerms.length })}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={togglingRoleKey === groupKey}
                                                    onClick={() => void toggleRoleGroup(editingRole, group, groupPerms, !allGranted)}
                                                >
                                                    {allGranted ? t("permissions.revokeAll") : t("permissions.grantAll")}
                                                </Button>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-3">
                                                    {groupPerms.map((perm) => {
                                                        const granted = roleHasPermission(editingRole, perm, roleMap);
                                                        return (
                                                            <div key={perm} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                                                <div className="flex items-center gap-3">
                                                                    <Checkbox
                                                                        checked={granted}
                                                                        disabled={togglingRoleKey === `${editingRole}-${perm}` || togglingRoleKey === groupKey}
                                                                        onCheckedChange={() => void toggleRolePermission(editingRole, perm, granted)}
                                                                    />
                                                                    <div>
                                                                        <div className="text-sm font-medium">{PERMISSION_LABELS[perm]}</div>
                                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{PERMISSION_DESCRIPTIONS[perm]}</div>
                                                                        <div className="mt-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-500">{perm}</div>
                                                                    </div>
                                                                </div>
                                                                {granted ? (
                                                                    <Check className="h-4 w-4 text-emerald-500" />
                                                                ) : (
                                                                    <X className="h-4 w-4 text-slate-300" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}

                        {activeTab === "create" && (
                            <Card className="joda-surface-muted max-w-lg border-0 shadow-none">
                                <CardHeader>
                                    <CardTitle>{t("create.title")}</CardTitle>
                                    <CardDescription>{t("create.description")}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleCreateUser} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="username">{t("create.username")}</Label>
                                            <Input
                                                id="username"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                placeholder="nom_utilisateur"
                                                required
                                                minLength={3}
                                                maxLength={50}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="prenom">{t("create.firstName")}</Label>
                                            <Input
                                                id="prenom"
                                                value={formData.prenom}
                                                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                                placeholder={t("create.firstNamePlaceholder")}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nom">{t("create.lastName")}</Label>
                                            <Input
                                                id="nom"
                                                value={formData.nom}
                                                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                                placeholder={t("create.lastNamePlaceholder")}
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
                                            <Label htmlFor="telephone">{t("create.phone")}</Label>
                                            <PhoneInput
                                                id="telephone"
                                                countryCode={formData.phoneCountryCode}
                                                value={formData.telephone}
                                                onCountryCodeChange={(value) => setFormData({ ...formData, phoneCountryCode: value })}
                                                onValueChange={(value) => setFormData({ ...formData, telephone: value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="role">{t("create.role")}</Label>
                                            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v || "" })}>
                                                <SelectTrigger className={!formData.role ? "text-slate-400" : ""}>
                                                    <SelectValue placeholder={t("create.rolePlaceholder")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="student">{t("roles.student")}</SelectItem>
                                                    <SelectItem value="agent">Agent</SelectItem>
                                                    {(currentUser?.role === "admin" || currentUser?.role === "super_admin") && (
                                                        <>
                                                            <SelectItem value="supervisor">{t("roles.supervisor")}</SelectItem>
                                                            <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                                                        </>
                                                    )}
                                                    {currentUser?.role === "super_admin" && (
                                                        <>
                                                            <SelectItem value="super_admin">{t("roles.superAdmin")}</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="password">{t("create.temporaryPassword")}</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                                minLength={8}
                                            />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {t("create.passwordHint")}
                                            </p>
                                        </div>
                                        <Button type="submit" disabled={isCreating} className="w-full">
                                            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {t("create.submit")}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>

                {userToReset && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                            <div className="mb-4 flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                    <KeyRound className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <h3 className="text-lg font-semibold">{t("reset.title")}</h3>
                            </div>
                            <p className="mb-1 text-sm text-slate-700 dark:text-slate-300">
                                {t.rich("reset.description", { name: userToReset.name, strong: (chunks) => <strong>{chunks}</strong> })}
                            </p>
                            <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
                                {t("reset.hint")}
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setUserToReset(null)} disabled={resetLoading}>
                                    {t("actions.cancel")}
                                </Button>
                                <Button
                                    onClick={() => void handleResetPassword(userToReset.id)}
                                    disabled={resetLoading}
                                    className="bg-amber-500 text-white hover:bg-amber-600"
                                >
                                    {resetLoading ? t("reset.sending") : t("reset.sendLink")}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {userToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                        <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                            <h3 className="mb-4 text-lg font-semibold">{t("delete.title")}</h3>
                            <p className="mb-4">{t("delete.description")}</p>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" disabled={isDeleting} onClick={() => setUserToDelete(null)}>
                                    {t("actions.cancel")}
                                </Button>
                                <Button variant="destructive" disabled={isDeleting} onClick={() => void handleDeleteUser(userToDelete)}>
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t("actions.delete")}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
