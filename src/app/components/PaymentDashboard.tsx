"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { formatPrice } from "../utils/formatPrice";
import LoadingSpinner from "./LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Payment {
    id: string;
    student_id: string;
    type: string;
    tranche: number | null;
    montant: number;
    status: string;
    date_limite: string;
    date_paiement: string | null;
    penalites: number;
    validated_at: string | null;
    created_at: string;
}

interface PaymentStats {
    totalRevenue: number;
    totalPenalties: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    revenueByType: Record<string, number>;
    monthlyRevenue: Record<string, number>;
}

export default function PaymentDashboard() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<PaymentStats>({
        totalRevenue: 0,
        totalPenalties: 0,
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        revenueByType: {},
        monthlyRevenue: {}
    });

    useEffect(() => {
        const loadPayments = async () => {
            setLoading(true);
            const { data } = await supabase.from('payments').select('*');
            if (data) setPayments(data);
            setLoading(false);
        };
        loadPayments();
    }, []);

    const calculatePenalty = (payment: Payment): number => {
        if (payment.status === "paye" || !payment.date_limite) return 0;
        
        const today = new Date();
        const deadline = new Date(payment.date_limite);
        const gracePeriod = payment.type.includes("mandarin") || payment.type.includes("anglais") ? 30 : 3;
        
        const graceDate = new Date(deadline);
        graceDate.setDate(graceDate.getDate() + gracePeriod);
        
        if (today <= graceDate) return 0;
        
        const daysLate = Math.floor((today.getTime() - graceDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (payment.type === "mandarin" || payment.type === "anglais") {
            return daysLate * 1000;
        }
        return daysLate * 10000;
    };

    useEffect(() => {
        if (payments.length === 0) return;

        const newStats: PaymentStats = {
            totalRevenue: 0,
            totalPenalties: 0,
            paidCount: 0,
            pendingCount: 0,
            overdueCount: 0,
            revenueByType: {},
            monthlyRevenue: {}
        };

        payments.forEach(payment => {
            const penalty = calculatePenalty(payment);
            
            if (payment.status === "paye") {
                newStats.paidCount++;
                newStats.totalRevenue += payment.montant;
            } else if (payment.status === "attente") {
                newStats.pendingCount++;
            } else if (payment.status === "retard") {
                newStats.overdueCount++;
            }

            newStats.totalPenalties += penalty;

            const typeKey = getPaymentCategory(payment.type);
            newStats.revenueByType[typeKey] = (newStats.revenueByType[typeKey] || 0) + 
                (payment.status === "paye" ? payment.montant : 0);

            if (payment.status === "paye" && payment.validated_at) {
                const month = new Date(payment.validated_at).toLocaleDateString('fr-FR', { 
                    year: 'numeric', 
                    month: 'long' 
                });
                newStats.monthlyRevenue[month] = (newStats.monthlyRevenue[month] || 0) + payment.montant;
            }
        });

        setStats(newStats);
    }, [payments]);

    const getPaymentCategory = (type: string): string => {
        if (type.includes("bourse")) return "Bourses d'Études";
        if (type.includes("mandarin")) return "Cours de Mandarin";
        if (type.includes("anglais")) return "Cours d'Anglais";
        return "Autres";
    };

    const getTypeColor = (type: string): string => {
        switch (type) {
            case "Bourses d'Études": return "bg-blue-500";
            case "Cours de Mandarin": return "bg-red-500";
            case "Cours d'Anglais": return "bg-green-500";
            default: return "bg-gray-500";
        }
    };

    if (loading) return <LoadingSpinner />;

    const totalPayments = stats.paidCount + stats.pendingCount + stats.overdueCount;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord - Paiements</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-green-100 text-green-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Revenus Totaux</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {formatPrice(stats.totalRevenue.toString())}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-red-100 text-red-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pénalités</p>
                                <p className="text-2xl font-semibold text-gray-900">
                                    {formatPrice(stats.totalPenalties.toString())}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Paiements Validés</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.paidCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center">
                            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">En Attente</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.pendingCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenus par Type de Service</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {Object.entries(stats.revenueByType).map(([type, amount]) => {
                                const percentage = stats.totalRevenue > 0 ? (amount / stats.totalRevenue) * 100 : 0;
                                return (
                                    <div key={type}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-gray-700">{type}</span>
                                            <span className="text-sm text-gray-600">
                                                {formatPrice(amount.toString())} ({percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full ${getTypeColor(type)}`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Statuts des Paiements</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                                    <span className="text-sm font-medium text-gray-700">Payés</span>
                                </div>
                                <span className="text-sm text-gray-600">
                                    {stats.paidCount} ({totalPayments > 0 ? ((stats.paidCount / totalPayments) * 100).toFixed(1) : 0}%)
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                                    <span className="text-sm font-medium text-gray-700">En attente</span>
                                </div>
                                <span className="text-sm text-gray-600">
                                    {stats.pendingCount} ({totalPayments > 0 ? ((stats.pendingCount / totalPayments) * 100).toFixed(1) : 0}%)
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                                    <span className="text-sm font-medium text-gray-700">En retard</span>
                                </div>
                                <span className="text-sm text-gray-600">
                                    {stats.overdueCount} ({totalPayments > 0 ? ((stats.overdueCount / totalPayments) * 100).toFixed(1) : 0}%)
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Évolution des Revenus Mensuels</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <div className="flex space-x-4 min-w-full">
                            {Object.entries(stats.monthlyRevenue)
                                .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                                .map(([month, amount]) => {
                                    const maxAmount = Math.max(...Object.values(stats.monthlyRevenue));
                                    const height = maxAmount > 0 ? (amount / maxAmount) * 200 : 0;
                                    
                                    return (
                                        <div key={month} className="flex flex-col items-center min-w-0">
                                            <div className="flex items-end h-52 mb-2">
                                                <div 
                                                    className="bg-blue-500 rounded-t w-12 min-h-[4px]"
                                                    style={{ height: `${height}px` }}
                                                    title={formatPrice(amount.toString())}
                                                ></div>
                                            </div>
                                            <div className="text-xs text-gray-600 text-center w-16 truncate">
                                                {month}
                                            </div>
                                            <div className="text-xs font-medium text-gray-800 text-center">
                                                {formatPrice(amount.toString())}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
