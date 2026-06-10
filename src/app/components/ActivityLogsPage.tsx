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
import {
  PlusCircle, Pencil, Trash2, CheckCircle2, XCircle,
  LogIn, LogOut, Upload, DollarSign, CreditCard, Settings, Activity,
} from "lucide-react";

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

interface LogGroup {
  label: string;
  dateKey: string;
  logs: ActivityLog[];
}

function getActivityStyle(activityType: string): { icon: React.ElementType; dot: string } {
  if (activityType.includes("delete")) return { icon: Trash2, dot: "bg-red-500 text-white" };
  if (activityType.includes("create")) return { icon: PlusCircle, dot: "bg-emerald-500 text-white" };
  if (activityType.includes("validate")) return { icon: CheckCircle2, dot: "bg-green-500 text-white" };
  if (activityType.includes("reject")) return { icon: XCircle, dot: "bg-rose-500 text-white" };
  if (activityType.includes("update") || activityType.includes("status")) return { icon: Pencil, dot: "bg-blue-500 text-white" };
  if (activityType === "login") return { icon: LogIn, dot: "bg-indigo-500 text-white" };
  if (activityType === "logout") return { icon: LogOut, dot: "bg-slate-400 text-white" };
  if (activityType.includes("upload")) return { icon: Upload, dot: "bg-teal-500 text-white" };
  if (activityType.includes("payment")) return { icon: CreditCard, dot: "bg-violet-500 text-white" };
  if (activityType.includes("accounting")) return { icon: DollarSign, dot: "bg-amber-500 text-white" };
  if (activityType === "config_update") return { icon: Settings, dot: "bg-slate-500 text-white" };
  return { icon: Activity, dot: "bg-gray-400 text-white" };
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  agent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  student: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
};

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500",
  "bg-rose-500", "bg-indigo-500", "bg-teal-500", "bg-amber-500",
];

function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function getUserAvatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getRelativeTime(date: Date, dateLocale: string): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const rtf = new Intl.RelativeTimeFormat(dateLocale, { numeric: "auto" });
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffHour < 24) return rtf.format(-diffHour, "hour");
  if (diffDay < 30) return rtf.format(-diffDay, "day");
  return date.toLocaleDateString(dateLocale, { day: "numeric", month: "short" });
}

function groupLogsByDay(
  logs: ActivityLog[],
  dateLocale: string,
  todayLabel: string,
  yesterdayLabel: string,
): LogGroup[] {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  const groups = new Map<string, LogGroup>();
  for (const log of logs) {
    const d = new Date(log.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!groups.has(key)) {
      let label: string;
      if (key === todayKey) label = todayLabel;
      else if (key === yesterdayKey) label = yesterdayLabel;
      else label = d.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" });
      groups.set(key, { label, dateKey: key, logs: [] });
    }
    groups.get(key)!.logs.push(log);
  }
  return Array.from(groups.values());
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
      if (roleFilter !== "tout") filters.userRole = roleFilter;
      if (activityFilter !== "tout") filters.activityType = activityFilter;
      if (dateFilter !== "tout") {
        const now = new Date();
        if (dateFilter === "today") {
          filters.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        } else if (dateFilter === "week") {
          filters.startDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
        } else if (dateFilter === "month") {
          filters.startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
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

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filteredLogs = logs.filter((log) =>
    searchTerm === "" ||
    log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedData = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter, activityFilter, dateFilter, customStartDate, customEndDate]);

  const goToPage = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  const stats = {
    total: logs.length,
    agents: logs.filter((l) => l.user_role === "agent").length,
    admins: logs.filter((l) => l.user_role === "admin" || l.user_role === "super_admin").length,
    today: logs.filter((l) => new Date(l.created_at).toDateString() === new Date().toDateString()).length,
  };

  const groups = groupLogsByDay(paginatedData, dateLocale, t("days.today"), t("days.yesterday"));

  if (loading) return <LoadingState />;

  return (
    <ProtectedRoute requiredRole="admin" requiredPermission="logs.view">
      <div className="space-y-6">
        <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {t("header.eyebrow")}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t("header.title")}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("header.description")}</p>
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
                <Label className="invisible text-xs font-medium text-slate-600 dark:text-slate-400">{t("filters.searchLabel")}</Label>
                <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={t("filters.searchPlaceholder")} />
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
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("filters.endDate")}</Label>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
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
                <div className="mt-2">
                  {groups.map((group) => (
                    <div key={group.dateKey}>
                      {/* Day separator */}
                      <div className="relative my-5 flex items-center gap-3 first:mt-0">
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                        <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {group.label}
                        </span>
                        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                      </div>

                      {/* Timeline entries */}
                      <div className="relative pl-11">
                        <div className="absolute left-[17px] top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                        <div className="space-y-3">
                          {group.logs.map((log) => {
                            const { icon: Icon, dot } = getActivityStyle(log.activity_type);
                            const initials = getUserInitials(log.user_name);
                            const avatarColor = getUserAvatarColor(log.user_name);
                            const date = new Date(log.created_at);
                            const relTime = getRelativeTime(date, dateLocale);
                            const fullDate = date.toLocaleString(dateLocale);

                            return (
                              <div key={log.id} className="relative flex gap-3">
                                {/* Dot icon */}
                                <div className={`absolute -left-11 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-50 shadow-sm dark:border-slate-900 ${dot}`}>
                                  <Icon size={14} />
                                </div>

                                {/* Card */}
                                <div className="flex-1 rounded-lg border border-slate-100 bg-white p-3 transition-shadow hover:shadow-sm dark:border-slate-700/50 dark:bg-slate-800/30">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${avatarColor}`}>
                                        {initials}
                                      </div>
                                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {log.user_name}
                                      </span>
                                      <Badge className={`py-0 text-[10px] ${ROLE_COLORS[log.user_role] ?? "bg-gray-100 text-gray-700"}`}>
                                        {log.user_role.replace("_", " ")}
                                      </Badge>
                                      <Badge className="py-0 text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                                        {t(`activityTypes.${log.activity_type}`)}
                                      </Badge>
                                    </div>
                                    <span
                                      className="shrink-0 cursor-default text-xs text-slate-400 dark:text-slate-500"
                                      title={fullDate}
                                    >
                                      {relTime}
                                    </span>
                                  </div>

                                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                    {log.description}
                                  </p>

                                  {log.entity_type && (
                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                                      {log.entity_type}
                                      {log.entity_id && ` · ${log.entity_id.substring(0, 8)}…`}
                                    </p>
                                  )}

                                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {Object.entries(log.metadata).map(([k, v]) => (
                                        <span
                                          key={k}
                                          className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-700/60 dark:text-slate-400"
                                        >
                                          {k}:{" "}
                                          <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {String(v)}
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
                  pageSize={pageSize}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
