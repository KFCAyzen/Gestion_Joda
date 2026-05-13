"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "../context/AuthContext";
import { getActivityLogs, ActivityType } from "../utils/activityLogger";
import ProtectedRoute from "./ProtectedRoute";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  admin: "bg-blue-100 text-blue-700 dark:text-blue-300",
  agent: "bg-green-100 text-green-700",
  student: "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300",
};

const ACTIVITY_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:text-emerald-300",
  update: "bg-blue-100 text-blue-700 dark:text-blue-300",
  delete: "bg-red-100 text-red-700 dark:text-red-300",
  status_change: "bg-orange-100 text-orange-700",
  validate: "bg-green-100 text-green-700",
  reject: "bg-rose-100 text-rose-700",
  login: "bg-indigo-100 text-indigo-700",
  logout: "bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300",
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
  return "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300";
}

export default function ActivityLogsPage() {
  const t = useTranslations("activityLogs");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("tout");
  const [activityFilter, setActivityFilter] = useState<string>("tout");
  const [dateFilter, setDateFilter] = useState<string>("tout");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};

      if (roleFilter !== "tout") {
        filters.userRole = roleFilter;
      }

      if (activityFilter !== "tout") {
        filters.activityType = activityFilter;
      }

      if (dateFilter !== "tout") {
        const now = new Date();
        if (dateFilter === "today") {
          filters.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        } else if (dateFilter === "week") {
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          filters.startDate = weekAgo.toISOString();
        } else if (dateFilter === "month") {
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          filters.startDate = monthAgo.toISOString();
        } else if (dateFilter === "custom") {
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            filters.startDate = start.toISOString();
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);
            filters.endDate = end.toISOString();
          }
        }
      }

      const data = await getActivityLogs(filters);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, activityFilter, dateFilter, customStartDate, customEndDate]);

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

  // Reset pagination when filters/search change.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, activityFilter, dateFilter, customStartDate, customEndDate]);

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
              {t("header.eyebrow")}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t("header.title")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("header.description")}
            </p>
          </div>
          <div className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
            {t("header.adminOnly")}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="joda-surface border-0 shadow-none">
            <CardContent className="pt-4">
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.total")}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="joda-surface border-0 shadow-none">
            <CardContent className="pt-4">
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.agents")}</p>
              <p className="text-2xl font-bold text-green-600">{stats.agents}</p>
            </CardContent>
          </Card>
          <Card className="joda-surface border-0 shadow-none">
            <CardContent className="pt-4">
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.admins")}</p>
              <p className="text-2xl font-bold text-blue-600">{stats.admins}</p>
            </CardContent>
          </Card>
          <Card className="joda-surface border-0 shadow-none">
            <CardContent className="pt-4">
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.today")}</p>
              <p className="text-2xl font-bold text-orange-600">{stats.today}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="joda-surface border-0 shadow-none">
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_320px_200px]">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 invisible">{t("filters.searchLabel")}</Label>
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={t("filters.searchPlaceholder")}
                />
              </div>
              <FilterSelect
                label={t("filters.role")}
                value={roleFilter}
                onChange={setRoleFilter}
                options={[
                  { value: "tout", label: t("roles.all") },
                  { value: "agent", label: t("roles.agent") },
                  { value: "admin", label: t("roles.admin") },
                  { value: "super_admin", label: t("roles.superAdmin") },
                ]}
              />
              <FilterSelect
                label={t("filters.action")}
                value={activityFilter}
                onChange={setActivityFilter}
                options={[
                  { value: "tout", label: t("activityTypes.all") },
                  { value: "student_create", label: t("activityTypes.student_create") },
                  { value: "student_update", label: t("activityTypes.student_update") },
                  { value: "student_delete", label: t("activityTypes.student_delete") },
                  { value: "application_create", label: t("activityTypes.application_create") },
                  { value: "application_update", label: t("activityTypes.application_update") },
                  { value: "application_delete", label: t("activityTypes.application_delete") },
                  { value: "dossier_delete", label: t("activityTypes.dossier_delete") },
                  { value: "payment_validate", label: t("activityTypes.payment_validate") },
                ]}
              />
              <FilterSelect
                label={t("filters.period")}
                value={dateFilter}
                onChange={setDateFilter}
                options={[
                  { value: "tout", label: t("periods.all") },
                  { value: "today", label: t("periods.today") },
                  { value: "week", label: t("periods.week") },
                  { value: "month", label: t("periods.month") },
                  { value: "custom", label: t("periods.custom") },
                ]}
              />
            </div>

            {dateFilter === "custom" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("filters.startDate")}</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("filters.endDate")}</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {paginatedData.length === 0 ? (
              <EmptyState
                title={t("empty.title")}
                description={t("empty.description")}
                action={
                  searchTerm || roleFilter !== "tout" || activityFilter !== "tout"
                    ? {
                        label: t("actions.resetFilters"),
                        onClick: () => {
                          setSearchTerm("");
                          setRoleFilter("tout");
                          setActivityFilter("tout");
                          setDateFilter("tout");
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
                      className="flex items-start gap-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-white p-4 transition-all hover:shadow-md"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={ROLE_COLORS[log.user_role] || "bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300"}>
                            {log.user_name}
                          </Badge>
                          <Badge className={getActivityColor(log.activity_type)}>
                            {t(`activityTypes.${log.activity_type}`)}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {new Date(log.created_at).toLocaleString(dateLocale)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{log.description}</p>
                        {log.entity_type && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {t("log.entity")}: <span className="font-medium">{log.entity_type}</span>
                            {log.entity_id && ` (ID: ${log.entity_id.substring(0, 8)}...)`}
                          </p>
                        )}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="text-xs text-slate-500 dark:text-slate-400">
                            <summary className="cursor-pointer hover:text-slate-700 dark:text-slate-300">
                              {t("log.extraDetails")}
                            </summary>
                            <pre className="mt-2 rounded bg-slate-50 dark:bg-slate-800/50 p-2">
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
