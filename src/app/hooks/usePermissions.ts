"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createClient } from "../lib/supabase/client";
import { Permission } from "../types/permissions";
import { fetchRolePermissionMap, roleHasPermission, type RolePermissionMap } from "../lib/rolePermissions";

interface UserPermissionRow {
  permission: Permission;
  granted: boolean;
}

/**
 * Récupère le rôle de l'utilisateur mis en cache (reprise hors-ligne desktop).
 * Le contexte d'auth peut être vide au démarrage hors-ligne alors que le profil
 * est encore disponible dans localStorage — on s'appuie dessus pour les
 * permissions par défaut du rôle.
 */
function readCachedRole(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: string };
    return parsed?.role ?? null;
  } catch {
    return null;
  }
}

export function usePermissions() {
  const { user } = useAuth();
  const [customPermissions, setCustomPermissions] = useState<UserPermissionRow[]>([]);
  const [roleMap, setRoleMap] = useState<RolePermissionMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const supabase = createClient();

        // Défauts par rôle (table role_permissions) — repli silencieux sur le code
        // si la table est absente / hors-ligne (fetchRolePermissionMap renvoie {}).
        const map = await fetchRolePermissionMap(supabase);
        if (!cancelled) setRoleMap(map);

        // Surcharges personnalisées de l'utilisateur courant (si connecté).
        if (user?.id) {
          const { data } = await supabase
            .from("user_permissions")
            .select("permission, granted")
            .eq("user_id", user.id);
          if (!cancelled && data) setCustomPermissions(data as UserPermissionRow[]);
        } else if (!cancelled) {
          setCustomPermissions([]);
        }
      } catch (err) {
        console.error("Erreur chargement permissions:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Rôle effectif : contexte d'auth en priorité, sinon profil en cache (hors-ligne).
  const role = user?.role ?? readCachedRole();

  const hasPermission = (permission: Permission): boolean => {
    // Une surcharge personnalisée (accord OU refus explicite) prime toujours.
    const customPerm = customPermissions.find((p) => p.permission === permission);
    if (customPerm) return customPerm.granted;

    // Sinon, défauts du rôle : set éditable en base si configuré, sinon code.
    return roleHasPermission(role, permission, roleMap);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading,
  };
}
