"use client";

import { useState } from "react";
import { useActivityLog } from "../context/ActivityLogContext";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import LoadingSpinner from "./LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ActivityHistory() {
    const { logs, getUserLogs, getModuleLogs } = useActivityLog();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("all");
    const [selectedUser, setSelectedUser] = useState("");
    const [selectedModule, setSelectedModule] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleString("fr-FR");

    const getActionIcon = (module: string) => {
        switch (module) {
            case "clients":
                return "CL";
            case "reservations":
                return "RS";
            case "bills":
                return "BL";
            case "rooms":
                return "RM";
            case "users":
                return "US";
            default:
                return "IN";
        }
    };

    const getFilteredLogs = () => {
        let filteredLogs = logs;

        if (activeTab === "user" && selectedUser) {
            filteredLogs = getUserLogs(selectedUser);
        } else if (activeTab === "module" && selectedModule) {
            filteredLogs = getModuleLogs(selectedModule as any);
        }

        return filteredLogs.slice(0, 100);
    };

    const tabs = [
        { id: "all", label: "Toutes les activités" },
        { id: "user", label: "Par utilisateur" },
        { id: "module", label: "Par module" },
    ];

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="space-y-6 p-4 sm:p-6">
                <div className="joda-surface">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Audit interne
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Historique des activités</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Consulte les actions récentes par utilisateur ou par module.
                    </p>
                </div>

                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader className="border-b border-slate-100">
                        <div className="flex flex-wrap gap-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setIsLoading(true);
                                        setTimeout(() => setIsLoading(false), 500);
                                    }}
                                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                        activeTab === tab.id
                                            ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_rgba(239,68,68,0.28)]"
                                            : "bg-white/70 text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
                            {activeTab === "user" && (
                                <Select value={selectedUser} onValueChange={(value) => setSelectedUser(value || "")}>
                                    <SelectTrigger className="w-full sm:w-[250px]">
                                        <SelectValue placeholder="Sélectionner un utilisateur" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="user">User</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}

                            {activeTab === "module" && (
                                <Select value={selectedModule} onValueChange={(value) => setSelectedModule(value || "")}>
                                    <SelectTrigger className="w-full sm:w-[250px]">
                                        <SelectValue placeholder="Sélectionner un module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="clients">Clients</SelectItem>
                                        <SelectItem value="reservations">Réservations</SelectItem>
                                        <SelectItem value="bills">Factures</SelectItem>
                                        <SelectItem value="rooms">Chambres</SelectItem>
                                        <SelectItem value="users">Utilisateurs</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {isLoading ? (
                            <LoadingSpinner size="md" text="Chargement des activités..." />
                        ) : (
                            <div className="space-y-3">
                                {getFilteredLogs().map((log, index) => (
                                    <div key={`log-${log.id}-${index}`} className="joda-surface-muted flex items-start gap-3 p-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-600">
                                            {getActionIcon(log.module)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-800">{log.action}</p>
                                            <p className="text-xs text-slate-500">
                                                {log.username} - {log.module} - {formatTimestamp(log.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {getFilteredLogs().length === 0 && (
                                    <p className="py-8 text-center text-slate-500">Aucune activité trouvée</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
