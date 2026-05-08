"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "../utils/imageCompression";
import { FILE_LIMITS } from "../utils/fileValidation";

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

      // Statistiques du stockage (documents uploadés)
      const { data: documents } = await supabase
        .from("documents")
        .select("url");

      if (documents && documents.length > 0) {
        // Estimation basée sur le nombre de documents
        // En production, vous devriez utiliser l'API Storage de Supabase
        const estimatedAvgSize = 1.5 * 1024 * 1024; // 1.5 MB par document en moyenne
        const totalSize = documents.length * estimatedAvgSize;
        
        setStorageStats({
          totalFiles: documents.length,
          totalSize: totalSize,
          averageFileSize: estimatedAvgSize,
          largestFile: FILE_LIMITS.MAX_FILE_SIZE_BYTES,
          documentsCount: documents.length,
          documentsSize: totalSize,
        });
      }

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
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
          <p className="text-slate-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Super Admin
          </p>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Monitoring du Stockage
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Surveillance de l'utilisation de la base de données Supabase
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Dernière mise à jour : {lastRefresh.toLocaleTimeString("fr-FR")}
          </span>
          <Button onClick={loadStats} variant="outline" size="sm">
            Actualiser
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {isCritical && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">⚠️ Alerte critique !</p>
          <p className="mt-1">
            Vous avez utilisé plus de 90% de votre stockage gratuit. Passez au plan Pro rapidement pour éviter une base en lecture seule.
          </p>
        </div>
      )}

      {isWarning && !isCritical && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <p className="font-semibold">⚠️ Attention</p>
          <p className="mt-1">
            Vous approchez de la limite du plan gratuit ({WARNING_THRESHOLD_MB} MB). Pensez à passer au Pro avant d'atteindre {SUPABASE_FREE_LIMIT_MB} MB.
          </p>
        </div>
      )}

      {/* Utilisation du stockage */}
      <Card className="joda-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle>Utilisation du Stockage</CardTitle>
          <CardDescription>
            Plan gratuit Supabase : {SUPABASE_FREE_LIMIT_MB} MB maximum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barre de progression */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  {formatFileSize(storageStats.totalSize)} / {SUPABASE_FREE_LIMIT_MB} MB
                </span>
                <span className={`text-sm font-bold ${isCritical ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-slate-900'}`}>
                  {usagePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 w-full rounded-full bg-slate-200">
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
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Total fichiers</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{storageStats.totalFiles}</p>
                <p className="mt-1 text-xs text-slate-500">Documents uploadés</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Taille moyenne</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatFileSize(storageStats.averageFileSize)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Par fichier</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Limite par fichier</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {FILE_LIMITS.MAX_FILE_SIZE_MB} MB
                </p>
                <p className="mt-1 text-xs text-slate-500">Maximum autorisé</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wider text-slate-400">Espace restant</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatFileSize((SUPABASE_FREE_LIMIT_MB * 1024 * 1024) - storageStats.totalSize)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Disponible</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques de la base de données */}
      <Card className="joda-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle>Statistiques de la Base de Données</CardTitle>
          <CardDescription>Nombre d'enregistrements par table</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Étudiants</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{dbStats.students}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Candidatures</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{dbStats.applications}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Documents</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{dbStats.documents}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Universités</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{dbStats.universities}</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-400">Utilisateurs</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{dbStats.users}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommandations */}
      <Card className="joda-surface border-0 shadow-none">
        <CardHeader>
          <CardTitle>Recommandations d'Optimisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3">
              <span className="text-blue-600">✓</span>
              <div>
                <p className="font-medium text-blue-900">Compression automatique activée</p>
                <p className="text-blue-700">Les images sont compressées à {FILE_LIMITS.MAX_FILE_SIZE_MB} MB maximum</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3">
              <span className="text-blue-600">✓</span>
              <div>
                <p className="font-medium text-blue-900">Validation stricte en place</p>
                <p className="text-blue-700">Seuls les fichiers PDF, JPG, PNG sont acceptés</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-3">
              <span className="text-blue-600">✓</span>
              <div>
                <p className="font-medium text-blue-900">Pagination activée</p>
                <p className="text-blue-700">20 étudiants et 10 candidatures par page</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
              <span className="text-slate-600">💡</span>
              <div>
                <p className="font-medium text-slate-900">Conseil</p>
                <p className="text-slate-700">
                  Passez au plan Pro (25$/mois) quand vous approchez 400-450 MB pour éviter les interruptions
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
