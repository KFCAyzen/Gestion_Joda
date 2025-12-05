"use client";


import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { formatPrice } from "../utils/formatPrice";

import { loadFromFirebase } from "../utils/syncData";
import { DashboardData } from "../types/scholarship";
import { generateAllScholarshipTestData, clearAllScholarshipData } from "../utils/scholarshipData";
import NewStatsCards from "./NewStatsCards";

const StatCard = memo(({ stat, index, isLoading }: { stat: any; index: number; isLoading?: boolean }) => (
    <div key={index} className={`bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group ${isLoading ? 'animate-pulse' : ''}`}>
        <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
            </div>
            <div className="text-right">
                <div className="text-2xl font-bold text-slate-800">
                    {isLoading ? (
                        <div className="w-16 h-6 bg-slate-200 rounded animate-pulse"></div>
                    ) : (
                        stat.value
                    )}
                </div>
                <div className={`text-xs font-medium bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.change}
                </div>
            </div>
        </div>
        <h3 className="text-sm font-semibold text-slate-600 mb-1">{stat.title}</h3>
        <p className="text-xs text-slate-400">{stat.subtitle}</p>
    </div>
));

StatCard.displayName = 'StatCard';

export default function ScholarshipDashboard() {
    const [user, setUser] = useState<any>(null);
    const [showSpinner, setShowSpinner] = useState(true);
    const [dashboardData, setDashboardData] = useState<DashboardData>({
        totalUniversities: 0,
        availableUniversities: 0,
        todayApplications: 0,
        todayRevenue: 0,
        totalStudents: 0,
        acceptedApplications: 0,
        pendingApplications: 0,
        rejectedApplications: 0
    });

    const loadDashboardData = useCallback(async () => {
        try {
            const [universities, applications, students, fees] = await Promise.all([
                loadFromFirebase('universities'),
                loadFromFirebase('applications'),
                loadFromFirebase('students'),
                loadFromFirebase('applicationFees')
            ]);

            const today = new Date().toISOString().split('T')[0];
            
            const todayApplications = Array.isArray(applications) 
                ? applications.filter(app => app.applicationDate === today).length 
                : 0;
            
            const todayRevenue = Array.isArray(fees)
                ? fees.filter(fee => fee.date === today)
                       .reduce((sum, fee) => sum + parseInt(fee.amount || '0'), 0)
                : 0;

            const acceptedApplications = Array.isArray(applications)
                ? applications.filter(app => app.status === 'Acceptée').length
                : 0;

            const pendingApplications = Array.isArray(applications)
                ? applications.filter(app => app.status === 'En attente' || app.status === 'En cours').length
                : 0;

            const rejectedApplications = Array.isArray(applications)
                ? applications.filter(app => app.status === 'Refusée').length
                : 0;

            setDashboardData({
                totalUniversities: Array.isArray(universities) ? universities.length : 0,
                availableUniversities: Array.isArray(universities) 
                    ? universities.filter(uni => uni.status === 'Disponible').length 
                    : 0,
                todayApplications,
                todayRevenue,
                totalStudents: Array.isArray(students) ? students.length : 0,
                acceptedApplications,
                pendingApplications,
                rejectedApplications
            });
        } catch (error) {
            console.warn('Erreur chargement dashboard:', error);
        } finally {
            setShowSpinner(false);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                setUser(JSON.parse(currentUser));
            }
        }
        loadDashboardData();
        
        const handleDataUpdate = () => {
            loadDashboardData();
        };
        
        window.addEventListener('dashboardUpdate', handleDataUpdate);
        window.addEventListener('dataChanged', handleDataUpdate);
        
        return () => {
            window.removeEventListener('dashboardUpdate', handleDataUpdate);
            window.removeEventListener('dataChanged', handleDataUpdate);
        };
    }, [loadDashboardData]);

    const stats = useMemo(() => [
        {
            title: "Universités Partenaires",
            value: dashboardData.availableUniversities.toString(),
            subtitle: `sur ${dashboardData.totalUniversities} universités`,
            color: "from-blue-500 to-blue-600",
            change: "+12%",
            icon: <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
        },
        {
            title: user?.role === 'user' ? "Mes Candidatures" : "Candidatures Aujourd'hui",
            value: dashboardData.todayApplications.toString(),
            subtitle: user?.role === 'user' ? "candidatures actives" : "nouvelles candidatures",
            color: "from-green-500 to-green-600",
            change: "+8%",
            icon: <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        },
        {
            title: user?.role === 'user' ? "Mes Frais" : "Revenus du Jour",
            value: formatPrice(dashboardData.todayRevenue.toString()),
            subtitle: user?.role === 'user' ? "frais payés" : "chiffre d'affaires",
            color: "from-purple-500 to-purple-600",
            change: "+15%",
            icon: <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        },
        {
            title: "Étudiants Inscrits",
            value: dashboardData.totalStudents.toString(),
            subtitle: "étudiants enregistrés",
            color: "from-red-500 to-red-600",
            change: "+5%",
            icon: <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
        }
    ], [dashboardData, user?.role]);

    if (showSpinner) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement du tableau de bord...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6">
            {/* Header with greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:p-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        Bonjour, {user?.name} 👋
                    </h1>
                    <p className="text-gray-500">
                        Voici un aperçu de vos candidatures de bourses d'études aujourd'hui
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={loadDashboardData}
                        className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Actualiser
                    </button>
                        {user?.role === 'super_admin' && (
                            <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={async () => {
                                    if (confirm('Générer des données de test ? Cela ajoutera des étudiants, universités, candidatures et frais fictifs.')) {
                                        const success = await generateAllScholarshipTestData();
                                        if (success) {
                                            alert('Données de test générées avec succès!');
                                            loadDashboardData();
                                        } else {
                                            alert('Erreur lors de la génération des données');
                                        }
                                    }
                                }}
                                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                Données test
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm('Nettoyer toutes les données ? Cette action est irréversible.')) {
                                        const success = await clearAllScholarshipData();
                                        if (success) {
                                            alert('Données nettoyées avec succès!');
                                            loadDashboardData();
                                        } else {
                                            alert('Erreur lors du nettoyage');
                                        }
                                    }
                                }}
                                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
                            >
                                Nettoyer
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Stats Cards */}
            <NewStatsCards dashboardData={dashboardData} />

            {/* Project Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-2xl p-4 sm:p-6 border" style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(220, 38, 38, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Statistiques des Candidatures</h3>
                            <p className="text-xs sm:text-sm text-gray-500">Évolution mensuelle</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                <span className="text-xs text-gray-600">Soumises</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-green-300 rounded-full"></div>
                                <span className="text-xs text-gray-600">Acceptées</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">486</div>
                            <div className="text-xs text-gray-500">Total Soumises</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">365</div>
                            <div className="text-xs text-gray-500">Total Acceptées</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">75%</div>
                            <div className="text-xs text-gray-500">Taux de Réussite</div>
                        </div>
                    </div>
                    
                    {/* Chart Area */}
                    <div className="h-64 flex items-end justify-between space-x-2 mb-4">
                        {/* Jan */}
                        <div className="flex flex-col items-center space-y-2 flex-1">
                            <div className="w-full flex flex-col items-center space-y-1">
                                <div className="w-8 bg-green-300/60 rounded-t" style={{height: '60px'}}></div>
                                <div className="w-8 bg-blue-500 rounded-b" style={{height: '80px'}}></div>
                            </div>
                            <span className="text-xs text-gray-500">Jan</span>
                        </div>
                        {/* Feb */}
                        <div className="flex flex-col items-center space-y-2 flex-1">
                            <div className="w-full flex flex-col items-center space-y-1">
                                <div className="w-8 bg-green-300/60 rounded-t" style={{height: '45px'}}></div>
                                <div className="w-8 bg-blue-500 rounded-b" style={{height: '70px'}}></div>
                            </div>
                            <span className="text-xs text-gray-500">Feb</span>
                        </div>
                        {/* Mar */}
                        <div className="flex flex-col items-center space-y-2 flex-1">
                            <div className="w-full flex flex-col items-center space-y-1">
                                <div className="w-8 bg-green-300/60 rounded-t" style={{height: '75px'}}></div>
                                <div className="w-8 bg-blue-500 rounded-b" style={{height: '95px'}}></div>
                            </div>
                            <span className="text-xs text-gray-500">Mar</span>
                        </div>
                        {/* Apr */}
                        <div className="flex flex-col items-center space-y-2 flex-1">
                            <div className="w-full flex flex-col items-center space-y-1">
                                <div className="w-8 bg-green-300/60 rounded-t" style={{height: '55px'}}></div>
                                <div className="w-8 bg-blue-500 rounded-b" style={{height: '85px'}}></div>
                            </div>
                            <span className="text-xs text-gray-500">Apr</span>
                        </div>
                        {/* May */}
                        <div className="flex flex-col items-center space-y-2 flex-1">
                            <div className="w-full flex flex-col items-center space-y-1">
                                <div className="w-8 bg-green-300/60 rounded-t" style={{height: '85px'}}></div>
                                <div className="w-8 bg-blue-500 rounded-b" style={{height: '110px'}}></div>
                            </div>
                            <span className="text-xs text-gray-500">May</span>
                        </div>
                        {/* Jun */}
                        <div className="flex flex-col items-center space-y-2 flex-1">
                            <div className="w-full flex flex-col items-center space-y-1">
                                <div className="w-8 bg-green-300/60 rounded-t" style={{height: '70px'}}></div>
                                <div className="w-8 bg-blue-500 rounded-b" style={{height: '100px'}}></div>
                            </div>
                            <span className="text-xs text-gray-500">Jun</span>
                        </div>
                    </div>
                </div>

                {/* Project Progress */}
                <div className="rounded-2xl p-4 sm:p-6 border" style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(220, 38, 38, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Suivi des Objectifs</h3>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Voir tout</button>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6">
                        {/* Progress Item 1 */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Candidatures Q1</p>
                                        <p className="text-xs text-gray-500">24 candidatures</p>
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-gray-900">75%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{width: '75%'}}></div>
                            </div>
                        </div>
                        
                        {/* Progress Item 2 */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Acceptations</p>
                                        <p className="text-xs text-gray-500">{dashboardData.acceptedApplications} acceptées</p>
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-gray-900">92%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{width: '92%'}}></div>
                            </div>
                        </div>
                        
                        {/* Progress Item 3 */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Paiements</p>
                                        <p className="text-xs text-gray-500">{formatPrice(dashboardData.todayRevenue.toString())} collectés</p>
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-gray-900">68%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-purple-500 h-2 rounded-full" style={{width: '68%'}}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Applications & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Applications */}
                <div className="rounded-2xl p-4 sm:p-6 border" style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(220, 38, 38, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Candidatures Récentes</h3>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Voir tout</button>
                    </div>
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                        <div className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-600">MA</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Marie Dubois</p>
                                <p className="text-xs text-gray-500">Université de Pékin - Informatique</p>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Acceptée
                                </span>
                                <p className="text-xs text-gray-500 mt-1">Il y a 2h</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-green-600">JM</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Jean Martin</p>
                                <p className="text-xs text-gray-500">Université Tsinghua - Ingénierie</p>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    En attente
                                </span>
                                <p className="text-xs text-gray-500 mt-1">Il y a 4h</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-purple-600">SL</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Sophie Laurent</p>
                                <p className="text-xs text-gray-500">Université Fudan - Médecine</p>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    En cours
                                </span>
                                <p className="text-xs text-gray-500 mt-1">Il y a 6h</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="rounded-2xl p-4 sm:p-6 border" style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(220, 38, 38, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Activité Récente</h3>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Voir tout</button>
                    </div>
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                        <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs sm:text-sm text-gray-900"><span className="font-medium">Marie Dubois</span> a été acceptée à l'Université de Pékin</p>
                                <p className="text-xs text-gray-500">Il y a 2 heures</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs sm:text-sm text-gray-900">Nouvelle candidature de <span className="font-medium">Thomas Petit</span></p>
                                <p className="text-xs text-gray-500">Il y a 3 heures</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs sm:text-sm text-gray-900">Paiement reçu de <span className="font-medium">Sophie Laurent</span></p>
                                <p className="text-xs text-gray-500">Il y a 5 heures</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
                                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs sm:text-sm text-gray-900">Document manquant pour <span className="font-medium">Jean Martin</span></p>
                                <p className="text-xs text-gray-500">Il y a 1 jour</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Universities & Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Universities */}
                <div className="lg:col-span-2 rounded-2xl p-4 sm:p-6 border" style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(220, 38, 38, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Universités Populaires</h3>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Voir toutes</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:p-4">
                        <div className="flex items-center space-x-4 p-3 sm:p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center">
                                <span className="text-lg font-bold text-red-600">P</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">Université de Pékin</h4>
                                <p className="text-xs sm:text-sm text-gray-500">24 candidatures</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-green-600">85%</p>
                                <p className="text-xs text-gray-500">Taux succès</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 p-3 sm:p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                <span className="text-lg font-bold text-blue-600">T</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">Tsinghua</h4>
                                <p className="text-xs sm:text-sm text-gray-500">18 candidatures</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-green-600">92%</p>
                                <p className="text-xs text-gray-500">Taux succès</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 p-3 sm:p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center">
                                <span className="text-lg font-bold text-green-600">F</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">Fudan</h4>
                                <p className="text-xs sm:text-sm text-gray-500">15 candidatures</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-green-600">78%</p>
                                <p className="text-xs text-gray-500">Taux succès</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4 p-3 sm:p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                                <span className="text-lg font-bold text-purple-600">S</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">Shanghai Jiao Tong</h4>
                                <p className="text-xs sm:text-sm text-gray-500">12 candidatures</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-green-600">88%</p>
                                <p className="text-xs text-gray-500">Taux succès</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calendar/Deadlines */}
                <div className="rounded-2xl p-4 sm:p-6 border" style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(220, 38, 38, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                }}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Échéances</h3>
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Calendrier</button>
                    </div>
                    <div className="space-y-2 sm:space-y-3 md:space-y-4">
                        <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-xl">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Date limite candidatures</p>
                                <p className="text-xs text-gray-500">Université de Pékin</p>
                                <p className="text-xs text-red-600 font-medium">Dans 3 jours</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-xl">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Entretiens prévus</p>
                                <p className="text-xs text-gray-500">5 étudiants</p>
                                <p className="text-xs text-yellow-600 font-medium">Cette semaine</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-xl">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Résultats attendus</p>
                                <p className="text-xs text-gray-500">Tsinghua University</p>
                                <p className="text-xs text-blue-600 font-medium">Semaine prochaine</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-xl">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Paiements dus</p>
                                <p className="text-xs text-gray-500">3 étudiants</p>
                                <p className="text-xs text-green-600 font-medium">Fin du mois</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}