"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../lib/supabase/client";
import { Permission, DEFAULT_ROLE_PERMISSIONS } from "../types/permissions";

interface UserPermission {
  permission: Permission;
  granted: boolean;
}

export function usePermissions() {
  const { user } = useAuth();
  const [customPermissions, setCustomPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("user_permissions")
          .select("permission, granted")
          .eq("user_id", user.id);
        
        if (data) setCustomPermissions(data as UserPermission[]);
      } catch (err) {
        console.error("Erreur chargement permissions:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user?.id]);

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;

    // Vérifier les permissions personnalisées
    const customPerm = customPermissions.find(p => p.permission === permission);
    if (customPerm !== undefined) return customPerm.granted;

    // Vérifier les permissions par défaut du rôle
    return DEFAULT_ROLE_PERMISSIONS[user.role]?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading,
  };
}
