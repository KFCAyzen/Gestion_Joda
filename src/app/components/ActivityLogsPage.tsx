"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getActivityLogs, ACTIVITY_LABELS, ActivityType } from "../utils/activityLogger";
import ProtectedRoute from "./ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchBar, FilterSelect, LoadingState, EmptyState } from "./shared";
import Pagination from "./Pagination";

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  activity_type: ActivityType;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  agent: "bg-green-100 text-green-700",
  student: "bg-gray-100 text-gray-700",
};

const ACTIVITY_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  status_change: "bg-orange-100 text-orange-700",
  validate: "bg-green-100 text-green-700",
  reject: "bg-rose-100 text-rose-700",
  login: "bg-indigo-100 text-indigo-700",
  logout: "bg-slate-100 text-slate-700",
};

function getActivityColor(activityType: string): string {
  if (activityType.includes("create")) return ACTIVITY_COLORS.create;
  if (activityType.includes("update")) return ACTIVITY_COLORS.update;
  if (activityType.includes("delete")) return ACTIVITY_COLORS.delete;
  if (activityType.includes("status")) return ACTIVITY_COLORS.status_change;
  if (activityType.includes("validate")) return ACTIVITY_COLORS.validate;
  if (activityType.includes("reject")) return ACTIVITY_COLORS.reject;
  if (activityType === "login") return ACTIVITY_COLORS.login;
  if (activityType === "logout") return ACTIVITY_COLORS.logout;
  return "bg-gray-100 text-gray-700";
}

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};

      if (roleFilter !== "all") {
        filters.userRole = roleFilter;
      }

      if (activityFilter !== "all") {
        filters.activityType = activityFilter;
      }

      if (dateFilter !== "all") {
        const now = new Date();
        if (dateFilter === "today") {
          filters.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        } else if (dateFilter === "week") {
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          filters.startDate = weekAgo.toISOString();
        } else if (dateFilter === "month") {
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          filters.startDate = monthAgo.toISOString();
        }
      }

      const data = await getActivityLogs(filters);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, activityFilter, dateFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredLogs.length / 20);
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedData = filteredLogs.slice((currentPage - 1) * 20, currentPage * 20);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const stats = {
    total: logs.length,
    agents: logs.filter((l) => l.user_role === "agent").length,
    admins: logs.filter((l) => l.user_role === "admin" || l.user_role === "super_admin").length,
    today: logs.filter((l) => {
      const logDate = new Date(l.created_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length,
  };

  if (loading) return <LoadingState />;

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-6">
        <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              Administration
            </p>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Logs d'Activités</h1>
            <p className="mt-1 text-sm text-slate-500">
              Historique des actions sensibles effectuées dans l'application
            </p>
          </div>
          <div className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600">
            Admin uniquement
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="joda-surface border-0 shadow-none">
            <CardContent className="pt-4">
              <p className="mb-1 text-xs text-slate-500">Total activités</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="joda-surface border-0 shadow-none">
            <CardContent className="pt-4">
              <p className="mb-1 text-xs text-slate-500">Actions agents</p>
              <p className="text-2xl font-bold text-green-600">{stats.agents}</p>
            </CardContent>
          </Card>
          <Card className="joda-surface border-0 shadow-none">
            <CardContent className="pt-4">
              <p className="mb-1 text-xs text-slate-500">Actions admins</p>
              <p className="text-2xl font-bold text-blue-600">{stats.admins}</p>
            </CardContent>
          </Card>
          <Card className="joda-surface border-0 shadow-none">
            <CardContent className="pt-4">
              <p className="mb-1 text-xs text-slate-500">Aujourd'hui</p>
              <p className="text-2xl font-bold text-orange-600">{stats.today}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="joda-surface border-0 shadow-none">
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Rechercher par utilisateur, action..."
              />
              <FilterSelect
                label="Rôle"
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: "all", label: "Tous les rôles" },
                  { value: "agent", label: "Agents" },
                  { value: "admin", label: "Admins" },
                  { value: "super_admin", label: "Super Admins" },
                ]}
              />
              <FilterSelect
                label="Action"
                value={activityFilter}
                onChange={setActivityFilter}
                options={[
                  { value: "all", label: "Toutes les actions" },
                  { value: "student_create", label: "Création étudiant" },
                  { value: "student_update", label: "Modification étudiant" },
                  { value: "student_delete", label: "Suppression étudiant" },
                  { value: "application_create", label: "Création candidature" },
                  { value: "application_update", label: "Modification candidature" },
                  { value: "application_delete", label: "Suppression candidature" },
                  { value: "dossier_delete", label: "Suppression dossier" },
                  { value: "payment_validate", label: "Validation paiement" },
                ]}
              />
              <FilterSelect
                label="Période"
                value={dateFilter}
                onChange={setDateFilter}
                options={[
                  { value: "all", label: "Toutes les dates" },
                  { value: "today", label: "Aujourd'hui" },
                  { value: "week", label: "7 derniers jours" },
                  { value: "month", label: "30 derniers jours" },
                ]}
              />
            </div>

            {paginatedData.length === 0 ? (
              <EmptyState
                title="Aucun log d'activité trouvé"
                description="Ajustez les filtres pour voir plus de résultats"
                action={
                  searchTerm || roleFilter !== "all" || activityFilter !== "all"
                    ? {
                        label: "Réinitialiser les filtres",
                        onClick: () => {
                          setSearchTerm("");
                          setRoleFilter("all");
                          setActivityFilter("all");
                          setDateFilter("all");
                        },
                      }
                    : undefined
                }
              />
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedData.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 rounded-lg border border-slate-100 bg-white p-4 transition-all hover:shadow-md"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={ROLE_COLORS[log.user_role] || "bg-gray-100 text-gray-700"}>
                            {log.user_name}
                          </Badge>
                          <Badge className={getActivityColor(log.activity_type)}>
                            {ACTIVITY_LABELS[log.activity_type] || log.activity_type}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {new Date(log.created_at).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">{log.description}</p>
                        {log.entity_type && (
                          <p className="text-xs text-slate-500">
                            Entité: <span className="font-medium">{log.entity_type}</span>
                            {log.entity_id && ` (ID: ${log.entity_id.substring(0, 8)}...)`}
                          </p>
                        )}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="text-xs text-slate-500">
                            <summary className="cursor-pointer hover:text-slate-700">
                              Détails supplémentaires
                            </summary>
                            <pre className="mt-2 rounded bg-slate-50 p-2">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  hasNextPage={currentPage < totalPages}
                  hasPrevPage={currentPage > 1}
                  totalCount={filteredLogs.length}
                  pageSize={20}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
