"use client";

import { useState } from "react";
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
import { Permission, DEFAULT_ROLE_PERMISSIONS, PERMISSION_LABELS, PERMISSION_GROUPS } from "../types/permissions";
import { Check, KeyRound, Power, PowerOff, Shield, Trash2, X } from "lucide-react";
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

        if (!formData.role) {
            const message = t("messages.roleRequired");
            setFeedback(message, "");
            showNotification({ title: t("messages.roleRequiredTitle"), message, type: "warning" });
            return;
        }

        if (formData.password.trim().length < 8) {
            const message = t("messages.passwordTooShort");
            setFeedback(message, "");
            showNotification({ title: t("messages.passwordTooShortTitle"), message, type: "warning" });
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
                fallback: t("messages.permissionsLoadError"),
            });
            setFeedback(message, "");
            showNotification({ title: t("messages.permissionsLoadTitle"), message, type: "error" });
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
                                            : "bg-white/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                    }`}
                                >
                                    {tab === "users" ? t("tabs.users", { count: dbUsers.length }) : t("tabs.create")}
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
                                                                          label: entry.is_active === false ? t("actions.activateAccount") : t("actions.deactivateAccount"),
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
                                                                <div key={perm} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <Checkbox
                                                                            checked={granted}
                                                                            onCheckedChange={() =>
                                                                                void togglePermission(selectedUser.id, perm as Permission, granted)
                                                                            }
                                                                        />
                                                                        <div>
                                                                            <div className="text-sm font-medium">{PERMISSION_LABELS[perm as Permission]}</div>
                                                                            <div className="text-xs text-slate-500 dark:text-slate-400">{perm}</div>
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
                                        ))}
                                    </div>
                                )}
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
                                                    {currentUser?.role === "super_admin" && (
                                                        <>
                                                            <SelectItem value="supervisor">{t("roles.supervisor")}</SelectItem>
                                                            <SelectItem value="admin">{t("roles.admin")}</SelectItem>
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
                                            />
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {t("create.passwordHint")}
                                            </p>
                                        </div>
                                        <Button type="submit" className="w-full">
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
                                <Button variant="outline" onClick={() => setUserToDelete(null)}>
                                    {t("actions.cancel")}
                                </Button>
                                <Button variant="destructive" onClick={() => void handleDeleteUser(userToDelete)}>
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
