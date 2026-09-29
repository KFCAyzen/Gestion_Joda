"use client";

import { useState, type ReactNode } from "react";
import ProtectedRoute from "../ProtectedRoute";
import AnomaliesPanel from "./AnomaliesPanel";
import ArretesPanel from "./ArretesPanel";
import CloturesPanel from "./CloturesPanel";
import ReglagesPanel from "./ReglagesPanel";

type Onglet = "anomalies" | "arretes" | "clotures" | "reglages";

const ONGLETS: { id: Onglet; label: string }[] = [
    { id: "anomalies", label: "Anomalies" },
    { id: "arretes", label: "Arrêtés de caisse" },
    { id: "clotures", label: "Clôtures mensuelles" },
    { id: "reglages", label: "Budgets et réglages" },
];

/**
 * Contrôle de la trésorerie (phase 3) : vérifier que la caisse réelle
 * correspond aux livres, figer les mois terminés et repérer ce qui mérite
 * un regard.
 */
export default function ControleComptable({ viewSwitcher }: { viewSwitcher?: ReactNode }) {
    const [onglet, setOnglet] = useState<Onglet>("anomalies");

    return (
        <ProtectedRoute requiredRole="agent" requiredPermission="accounting.view">
            <div className="-m-4 sm:-m-5 flex flex-col bg-white dark:bg-slate-900" style={{ minHeight: "calc(100vh - 130px)" }}>
                <div className="border-b border-gray-100 px-6 py-4 dark:border-slate-700">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            Finance &rsaquo; Contrôle
                        </p>
                        {viewSwitcher}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contrôle de la trésorerie</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Comptage de la caisse, clôture des mois terminés, budgets et signaux à vérifier.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {ONGLETS.map((o) => (
                            <button
                                key={o.id}
                                onClick={() => setOnglet(o.id)}
                                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                    onglet === o.id
                                        ? "bg-gray-900 text-white"
                                        : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                }`}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                </div>

                {onglet === "anomalies" && <AnomaliesPanel />}
                {onglet === "arretes" && <ArretesPanel />}
                {onglet === "clotures" && <CloturesPanel />}
                {onglet === "reglages" && <ReglagesPanel />}
            </div>
        </ProtectedRoute>
    );
}
