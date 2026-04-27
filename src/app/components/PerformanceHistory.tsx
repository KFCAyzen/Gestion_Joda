"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../utils/formatPrice";
import LoadingSpinner from "./LoadingSpinner";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Bill {
    id: string;
    date: string;
    amount: number;
    motif: "Repos" | "Nuitee";
    created_by: string;
    received_from: string;
}

interface DailyStats {
    date: string;
    nuitee: { count: number; amount: number };
    repos: { count: number; amount: number };
    total: number;
}

export default function PerformanceHistory() {
    const { user } = useAuth();
    const [bills, setBills] = useState<Bill[]>([]);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>("all");
    const [users, setUsers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setIsLoading(true);

        const { data: allBills, error } = await supabase.from("bills").select("*");

        if (error) {
            console.error("Error loading bills:", error);
            setBills([]);
        } else {
            const billsData = (allBills || []) as Bill[];

            let filteredBills: Bill[] = billsData;

            if (user?.role === "user") {
                filteredBills = billsData.filter((b) => b.created_by === user.username);
            }

            setBills(filteredBills);

            if (user?.role === "admin" || user?.role === "super_admin") {
                const uniqueUsers = [...new Set(billsData.map((b) => b.created_by).filter(Boolean))];
                setUsers(uniqueUsers);
            }

            calculateDailyStats(billsData);
        }

        setIsLoading(false);
    };

    const calculateDailyStats = (billsData: Bill[]) => {
        const filteredBills = selectedUser === "all" ? billsData : billsData.filter((b) => b.created_by === selectedUser);

        const dailyGroups: Record<string, Bill[]> = {};
        filteredBills.forEach((bill) => {
            if (!dailyGroups[bill.date]) dailyGroups[bill.date] = [];
            dailyGroups[bill.date].push(bill);
        });

        const stats: DailyStats[] = Object.keys(dailyGroups)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .map((date) => {
                const dayBills = dailyGroups[date];
                const nuitee = dayBills.filter((b) => b.motif === "Nuitee");
                const repos = dayBills.filter((b) => b.motif === "Repos");

                const nuiteeAmount = nuitee.reduce((sum, b) => sum + (b.amount || 0), 0);
                const reposAmount = repos.reduce((sum, b) => sum + (b.amount || 0), 0);

                return {
                    date,
                    nuitee: { count: nuitee.length, amount: nuiteeAmount },
                    repos: { count: repos.length, amount: reposAmount },
                    total: nuiteeAmount + reposAmount,
                };
            });

        setDailyStats(stats);
    };

    useEffect(() => {
        calculateDailyStats(bills);
    }, [selectedUser, bills]);

    const handleDownloadWord = () => {
        const totalNuitee = dailyStats.reduce((sum, day) => sum + day.nuitee.count, 0);
        const totalRepos = dailyStats.reduce((sum, day) => sum + day.repos.count, 0);
        const totalAmount = dailyStats.reduce((sum, day) => sum + day.total, 0);

        const wordContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Historique des Performances</title></head>
        <body>
            <h1>Joda Company</h1>
            <h2>Historique des Performances</h2>
            <p><strong>Utilisateur:</strong> ${selectedUser === "all" ? "Tous les utilisateurs" : selectedUser}</p>
            <p><strong>Généré le :</strong> ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
            <p><strong>Total Nuitées :</strong> ${totalNuitee}</p>
            <p><strong>Total Repos:</strong> ${totalRepos}</p>
            <p><strong>Chiffre d'Affaires Total:</strong> ${formatPrice(totalAmount.toString())}</p>
            <table border='1' cellpadding='6' cellspacing='0'>
                <tr><th>Date</th><th>Nuitées</th><th>Montant Nuitées</th><th>Repos</th><th>Montant Repos</th><th>Total</th></tr>
                ${dailyStats
                    .map(
                        (day) => `
                    <tr>
                        <td>${new Date(day.date).toLocaleDateString("fr-FR")}</td>
                        <td>${day.nuitee.count}</td>
                        <td>${formatPrice(day.nuitee.amount.toString())}</td>
                        <td>${day.repos.count}</td>
                        <td>${formatPrice(day.repos.amount.toString())}</td>
                        <td>${formatPrice(day.total.toString())}</td>
                    </tr>`,
                    )
                    .join("")}
            </table>
        </body>
        </html>
        `;

        const blob = new Blob([wordContent], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Historique_Performances_${selectedUser === "all" ? "Global" : selectedUser}_${new Date().toISOString().split("T")[0]}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const totalNuitee = dailyStats.reduce((sum, day) => sum + day.nuitee.count, 0);
        const totalRepos = dailyStats.reduce((sum, day) => sum + day.repos.count, 0);
        const totalAmount = dailyStats.reduce((sum, day) => sum + day.total, 0);

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head><title>Historique des Performances</title></head>
        <body>
            <h1>Joda Company</h1>
            <h2>Historique des Performances</h2>
            <p><strong>Utilisateur:</strong> ${selectedUser === "all" ? "Tous les utilisateurs" : selectedUser}</p>
            <p><strong>Total Nuitées:</strong> ${totalNuitee}</p>
            <p><strong>Total Repos:</strong> ${totalRepos}</p>
            <p><strong>Chiffre d'Affaires Total:</strong> ${formatPrice(totalAmount.toString())}</p>
            <table border="1" cellpadding="6" cellspacing="0">
                <tr><th>Date</th><th>Nuitées</th><th>Montant Nuitées</th><th>Repos</th><th>Montant Repos</th><th>Total</th></tr>
                ${dailyStats
                    .map(
                        (day) => `
                    <tr>
                        <td>${new Date(day.date).toLocaleDateString("fr-FR")}</td>
                        <td>${day.nuitee.count}</td>
                        <td>${formatPrice(day.nuitee.amount.toString())}</td>
                        <td>${day.repos.count}</td>
                        <td>${formatPrice(day.repos.amount.toString())}</td>
                        <td>${formatPrice(day.total.toString())}</td>
                    </tr>`,
                    )
                    .join("")}
            </table>
        </body>
        </html>`;

        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    if (!user) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
            </div>
        );
    }

    const isAdmin = user?.role === "admin" || user?.role === "super_admin";
    const totalNuitee = dailyStats.reduce((sum, day) => sum + day.nuitee.count, 0);
    const totalRepos = dailyStats.reduce((sum, day) => sum + day.repos.count, 0);
    const totalAmount = dailyStats.reduce((sum, day) => sum + day.total, 0);

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Reporting activité
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Historique des Performances</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Analyse quotidienne des encaissements et activités par utilisateur.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button onClick={handlePrint} style={{ backgroundColor: "#dc2626" }}>
                        Imprimer
                    </Button>
                    {isAdmin && (
                        <Button onClick={handleDownloadWord} className="bg-blue-600 hover:bg-blue-700">
                            Télécharger Word
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card className="joda-surface border-0 shadow-none">
                    <CardContent className="pt-4">
                        <p className="mb-1 text-xs text-slate-500">Total nuitées</p>
                        <p className="text-xl font-bold text-blue-700">{totalNuitee}</p>
                    </CardContent>
                </Card>
                <Card className="joda-surface border-0 shadow-none">
                    <CardContent className="pt-4">
                        <p className="mb-1 text-xs text-slate-500">Total Repos</p>
                        <p className="text-xl font-bold text-emerald-700">{totalRepos}</p>
                    </CardContent>
                </Card>
                <Card className="joda-surface border-0 shadow-none">
                    <CardContent className="pt-4">
                        <p className="mb-1 text-xs text-slate-500">Chiffre d'affaires</p>
                        <p className="text-xl font-bold text-rose-700">{formatPrice(totalAmount.toString())}</p>
                    </CardContent>
                </Card>
            </div>

            {isAdmin && (
                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Filtrer par utilisateur</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedUser} onValueChange={(value) => setSelectedUser(value || "all")}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Tous les utilisateurs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tous les utilisateurs</SelectItem>
                                {users.map((u, index) => (
                                    <SelectItem key={`user-${u}-${index}`} value={u}>
                                        {u}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            )}

            <Card className="joda-surface border-0 shadow-none">
                <CardHeader>
                    <CardTitle>
                        Performances {selectedUser === "all" ? "Globales" : `de ${selectedUser}`}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <LoadingSpinner size="lg" text="Chargement des performances..." />
                    ) : dailyStats.length === 0 ? (
                        <div className="py-8 text-center">
                            <p className="text-slate-500">Aucune donnée disponible</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {dailyStats.map((day, index) => (
                                <Card key={`performance-${day.date}-${index}`} className="joda-surface-muted border-0 shadow-none">
                                    <CardContent className="p-4">
                                        <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                                            <h3 className="font-semibold text-slate-800">
                                                {new Date(day.date).toLocaleDateString("fr-FR")}
                                            </h3>
                                            <Badge variant="destructive" className="text-sm">
                                                {formatPrice(day.total.toString())}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="rounded-xl bg-blue-50 p-3">
                                                <p className="text-sm font-medium text-blue-800">Nuitées</p>
                                                <p className="text-xs text-blue-600">{day.nuitee.count} chambres</p>
                                                <p className="font-bold text-blue-600">{formatPrice(day.nuitee.amount.toString())}</p>
                                            </div>
                                            <div className="rounded-xl bg-green-50 p-3">
                                                <p className="text-sm font-medium text-green-800">Repos</p>
                                                <p className="text-xs text-green-600">{day.repos.count} chambres</p>
                                                <p className="font-bold text-green-600">{formatPrice(day.repos.amount.toString())}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
