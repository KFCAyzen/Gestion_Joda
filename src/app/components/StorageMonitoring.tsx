"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "../utils/imageCompression";
import { FILE_LIMITS } from "../utils/fileValidation";
import ProtectedRoute from "./ProtectedRoute";

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  largestFile: number;
  documentsCount: number;
  documentsSize: number;
}

interface DatabaseStats {
  students: number;
  applications: number;
  documents: number;
  universities: number;
  users: number;
}

export default function StorageMonitoring() {
  const supabase = createClient();
  const t = useTranslations("storageMonitoring");
  const locale = useLocale();
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalFiles: 0,
    totalSize: 0,
    averageFileSize: 0,
    largestFile: 0,
    documentsCount: 0,
    documentsSize: 0,
  });
  
  const [dbStats, setDbStats] = useState<DatabaseStats>({
    students: 0,
    applications: 0,
    documents: 0,
    universities: 0,
    users: 0,
  });

  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const SUPABASE_FREE_LIMIT_MB = 500;
  const WARNING_THRESHOLD_MB = 400;

  const loadStats = async () => {
    setLoading(true);
    try {
      // Statistiques de la base de données
      const [studentsRes, appsRes, docsRes, univRes, usersRes] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("dossier_bourses").select("*", { count: "exact", head: true }),
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase.from("universities").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }),
      ]);

      setDbStats({
        students: studentsRes.count || 0,
        applications: appsRes.count || 0,
        documents: docsRes.count || 0,
        universities: univRes.count || 0,
        users: usersRes.count || 0,
      });

      // Statistiques réelles du stockage : on parcourt le bucket `student-documents`
      // et on somme la taille effective de chaque fichier (metadata.size), au lieu
      // d'une estimation. Les fichiers sont rangés par dossier (student_id) → on
      // descend récursivement dans chaque sous-dossier.
      const BUCKET = "student-documents";
      const walkBucket = async (
        prefix = ""
      ): Promise<{ size: number; count: number }> => {
        const { data: entries, error } = await supabase.storage
          .from(BUCKET)
          .list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
        if (error || !entries) return { size: 0, count: 0 };

        let size = 0;
        let count = 0;
        for (const entry of entries) {
          // Un dossier n'a ni id ni metadata ; un fichier porte metadata.size.
          const isFolder = entry.id === null || entry.metadata == null;
          if (isFolder) {
            const sub = await walkBucket(prefix ? `${prefix}/${entry.name}` : entry.name);
            size += sub.size;
            count += sub.count;
          } else {
            size += (entry.metadata?.size as number) ?? 0;
            count += 1;
          }
        }
        return { size, count };
      };

      const { size: totalSize, count: totalFiles } = await walkBucket();

      setStorageStats({
        totalFiles,
        totalSize,
        averageFileSize: totalFiles > 0 ? totalSize / totalFiles : 0,
        largestFile: FILE_LIMITS.MAX_FILE_SIZE_BYTES,
        documentsCount: totalFiles,
        documentsSize: totalSize,
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error("Erreur chargement stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const usagePercentage = (storageStats.totalSize / (SUPABASE_FREE_LIMIT_MB * 1024 * 1024)) * 100;
  const isWarning = storageStats.totalSize > WARNING_THRESHOLD_MB * 1024 * 1024;
  const isCritical = storageStats.totalSize > (SUPABASE_FREE_LIMIT_MB * 0.9) * 1024 * 1024;

  if (loading) {
    return (
      <ProtectedRoute requiredRole="super_admin" requiredPermission="storage.view">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
            <p className="text-slate-600 dark:text-slate-400">{t("loading")}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="super_admin" requiredPermission="storage.view">
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {t("eyebrow")}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("lastRefresh", { time: lastRefresh.toLocaleTimeString(locale === "en" ? "en-US" : "fr-FR") })}
          </span>
          <Button onClick={loadStats} variant="outline" size="sm" className="border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
            {t("refresh")}
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {isCritical && (
        <div className="rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">{t("criticalAlert")}</p>
          <p className="mt-1">{t("criticalMessage")}</p>
        </div>
      )}

      {isWarning && !isCritical && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <p className="font-semibold">{t("warningAlert")}</p>
          <p className="mt-1">{t("warningMessage", { threshold: WARNING_THRESHOLD_MB, limit: SUPABASE_FREE_LIMIT_MB })}</p>
        </div>
      )}

      {/* Utilisation du stockage */}
      <Card className="joda-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle>{t("storageTitle")}</CardTitle>
          <CardDescription>
            {t("storageDescription", { limit: SUPABASE_FREE_LIMIT_MB })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barre de progression */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {formatFileSize(storageStats.totalSize)} / {SUPABASE_FREE_LIMIT_MB} MB
                </span>
                <span className={`text-sm font-bold ${isCritical ? 'text-red-500 dark:text-red-400' : isWarning ? 'text-orange-500 dark:text-orange-400' : 'text-slate-900 dark:text-slate-100'}`}>
                  {usagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-4 rounded-full transition-all duration-500 ${
                    isCritical ? 'bg-red-600' : isWarning ? 'bg-orange-500' : 'bg-gradient-to-r from-red-500 to-orange-400'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Statistiques détaillées */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">{t("stats.totalFiles")}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{storageStats.totalFiles}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.uploadedDocs")}</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">{t("stats.avgSize")}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatFileSize(storageStats.averageFileSize)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.perFile")}</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">{t("stats.fileLimit")}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {FILE_LIMITS.MAX_FILE_SIZE_MB} MB
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.maxAllowed")}</p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">{t("stats.remaining")}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {formatFileSize((SUPABASE_FREE_LIMIT_MB * 1024 * 1024) - storageStats.totalSize)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("stats.available")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques de la base de données */}
      <Card className="joda-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle>{t("dbTitle")}</CardTitle>
          <CardDescription>{t("dbDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{t("stats.students")}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{dbStats.students}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{t("stats.applications")}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{dbStats.applications}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{t("stats.documents")}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{dbStats.documents}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{t("stats.universities")}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{dbStats.universities}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">{t("stats.users")}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{dbStats.users}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommandations */}
      <Card className="joda-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle>{t("recommendationsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
              <span className="text-blue-600">✓</span>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200">{t("recommendations.compressionTitle")}</p>
                <p className="text-blue-700 dark:text-blue-300">{t("recommendations.compressionDesc", { limit: FILE_LIMITS.MAX_FILE_SIZE_MB })}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
              <span className="text-blue-600">✓</span>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200">{t("recommendations.validationTitle")}</p>
                <p className="text-blue-700 dark:text-blue-300">{t("recommendations.validationDesc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
              <span className="text-blue-600">✓</span>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200">{t("recommendations.paginationTitle")}</p>
                <p className="text-blue-700 dark:text-blue-300">{t("recommendations.paginationDesc")}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3">
              <span className="text-slate-600 dark:text-slate-400">💡</span>
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-100">{t("recommendations.tipTitle")}</p>
                <p className="text-slate-700 dark:text-slate-300">{t("recommendations.tipDesc")}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </ProtectedRoute>
  );
}
