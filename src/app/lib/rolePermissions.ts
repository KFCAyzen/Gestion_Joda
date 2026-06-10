import type { SupabaseClient } from "@supabase/supabase-js";
import { Permission, DEFAULT_ROLE_PERMISSIONS, PERMISSION_LABELS } from "../types/permissions";

/**
 * Couche « permissions par défaut éditables par rôle » (table role_permissions).
 *
 * Résolution effective (hors surcharge user_permissions, gérée ailleurs) :
 *   - si le rôle est « configuré » en base (au moins une ligne) → set issu de la DB
 *   - sinon → repli sur DEFAULT_ROLE_PERMISSIONS (code)
 *   - super_admin garde TOUJOURS tout (verrou anti-lockout).
 *
 * Si la table n'existe pas encore (migration non appliquée) ou en cas d'erreur /
 * hors-ligne, on retourne une map vide → tout retombe sur les défauts du code.
 */

// Liste exhaustive des permissions (les clés de PERMISSION_LABELS couvrent tout le type).
export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[];

// role -> ensemble des permissions ACCORDÉES. La présence d'une clé (même Set vide)
// signifie que le rôle est « configuré » et fait donc autorité sur les défauts.
export type RolePermissionMap = Record<string, Set<Permission>>;

interface RolePermissionRow {
  role: string;
  permission: Permission;
  granted: boolean;
}

export async function fetchRolePermissionMap(supabase: SupabaseClient): Promise<RolePermissionMap> {
  try {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("role, permission, granted");
    if (error || !data) return {};
    const map: RolePermissionMap = {};
    for (const row of data as RolePermissionRow[]) {
      if (!map[row.role]) map[row.role] = new Set<Permission>();
      if (row.granted) map[row.role].add(row.permission);
    }
    return map;
  } catch {
    return {};
  }
}

/** Un rôle est-il « configuré » en base (ses défauts ne viennent plus du code) ? */
export function isRoleConfigured(role: string, map: RolePermissionMap): boolean {
  return Object.prototype.hasOwnProperty.call(map, role);
}

/** La permission est-elle accordée par défaut au rôle (DB si configuré, sinon code) ? */
export function roleHasPermission(role: string | null | undefined, permission: Permission, map: RolePermissionMap): boolean {
  if (!role) return false;
  if (role === "super_admin") return true; // verrou anti-lockout
  if (isRoleConfigured(role, map)) return map[role].has(permission);
  return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Ensemble effectif des permissions du rôle (DB si configuré, sinon code). */
export function getEffectiveRolePermissions(role: string, map: RolePermissionMap): Permission[] {
  if (role === "super_admin") return [...ALL_PERMISSIONS];
  if (isRoleConfigured(role, map)) return Array.from(map[role]);
  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}
