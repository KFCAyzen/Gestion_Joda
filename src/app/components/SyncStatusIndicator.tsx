"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, AlertTriangle } from "lucide-react";

type SyncStatus = {
  online: boolean;
  syncing: boolean;
  pendingMutations: number;
  pendingConflicts: number;
  lastPullAt: number | null;
  lastPushAt: number | null;
  lastError: string | null;
};

// La déclaration globale `window.jodaDesktop` se trouve dans `src/app/lib/desktop/offline-client.ts`.

/**
 * Pastille de statut sync affichée dans le header desktop.
 * - Vert  : online et tout est synchronisé
 * - Bleu  : sync en cours
 * - Orange: mutations en attente de push (offline ou erreur réseau)
 * - Rouge : conflit non résolu (paiement nécessite arbitrage)
 * - Gris  : offline complet
 *
 * Ne s'affiche QUE dans la version desktop (window.jodaDesktop présent).
 */
export default function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.jodaDesktop) return;

    let unsub: (() => void) | null = null;
    void window.jodaDesktop.sync.status().then(setStatus);
    unsub = window.jodaDesktop.sync.subscribe(setStatus);
    return () => {
      unsub?.();
    };
  }, []);

  if (!status) return null;

  const handleClick = async () => {
    if (!window.jodaDesktop) return;
    const next = await window.jodaDesktop.sync.trigger();
    setStatus(next);
  };

  const { online, syncing, pendingMutations, pendingConflicts } = status;

  let color: string;
  let icon: React.ReactNode;
  let label: string;
  let tooltip: string;

  if (pendingConflicts > 0) {
    color = "text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    icon = <AlertTriangle className="h-3.5 w-3.5" />;
    label = `${pendingConflicts} conflit${pendingConflicts > 1 ? "s" : ""}`;
    tooltip = "Conflits à résoudre — cliquez pour gérer";
  } else if (syncing) {
    color = "text-sky-600 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-300 border-sky-200 dark:border-sky-800";
    icon = <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    label = "Synchronisation…";
    tooltip = "Synchronisation en cours avec Supabase";
  } else if (!online) {
    color = "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    icon = <CloudOff className="h-3.5 w-3.5" />;
    label = pendingMutations > 0 ? `Hors ligne · ${pendingMutations}` : "Hors ligne";
    tooltip = pendingMutations > 0
      ? `Hors ligne · ${pendingMutations} action(s) en attente de synchronisation`
      : "Hors ligne · données locales utilisées";
  } else if (pendingMutations > 0) {
    color = "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    icon = <Cloud className="h-3.5 w-3.5" />;
    label = `${pendingMutations} en attente`;
    tooltip = `${pendingMutations} action(s) en attente de push vers Supabase. Cliquez pour forcer la sync.`;
  } else {
    color = "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    icon = <Cloud className="h-3.5 w-3.5" />;
    label = "Synchronisé";
    tooltip = "Tout est à jour avec Supabase. Cliquez pour forcer un cycle sync.";
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip}
      data-testid="sync-status"
      className={`hidden lg:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${color}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
