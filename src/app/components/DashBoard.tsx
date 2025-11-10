import { Images } from "./Images";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { formatPrice } from "../utils/formatPrice";
import { useAuth } from "../context/AuthContext";
import { useDashboardPreloader } from "../hooks/useDashboardPreloader";
import ProgressiveLoader from "./ProgressiveLoader";
import { generateTestData, clearAllData, resetRoomsToDefault } from "../utils/generateTestData";

interface Activity {
    type: string;
    message: string;
    detail: string;
    time: string;
}

interface WeeklyReservation {
    day: string;
    count: number;
    maxCount: number;
}

interface Room {
    id: string;
    number: string;
    price: string;
    status: string;
    category: string;
}

// Memoized stat card component avec indicateur de chargement
const StatCard = memo(({ stat, index, isLoading }: { stat: any; index: number; isLoading?: boolean }) => (
    <div key={index} className={`${stat.bgColor} rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 ${isLoading ? 'animate-pulse' : ''}`}>
        <div className="flex items-center justify-between mb-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center text-white p-2`}>
                <Image src={stat.icon} alt={stat.title} width={24} height={24} className="filter brightness-0 invert" />
            </div>
            <div className="text-right">
                <div className={`text-xl sm:text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {isLoading ? (
                        <div className="w-16 h-6 bg-slate-200 rounded animate-pulse"></div>
                    ) : (
                        stat.value
                    )}
                </div>
            </div>
        </div>
        <h3 className="text-sm sm:text-base font-semibold text-slate-700 mb-1">{stat.title}</h3>
        <p className="text-xs sm:text-sm text-slate-500">{stat.subtitle}</p>
    </div>
));

StatCard.displayName = 'StatCard';

function DashBoard() {
    const { user } = useAuth();
    const [showSpinner, setShowSpinner] = useState(true);
    const [hasStartedLoading, setHasStartedLoading] = useState(false);
    const { data: dashboardData, loadingStates, preloadData, loadDataByPriority } = useDashboardPreloader(user);



    const refreshData = useCallback(async () => {
        await preloadData();
        await loadDataByPriority();
    }, [preloadData, loadDataByPriority]);
    
    // Gestion du spinner et du chargement progressif
    useEffect(() => {
        // Démarrer le préchargement immédiatement
        preloadData();
        
        // Masquer le spinner après 5 secondes maximum
        const spinnerTimer = setTimeout(() => {
            setShowSpinner(false);
            if (!hasStartedLoading) {
                setHasStartedLoading(true);
                loadDataByPriority();
            }
        }, 5000);
        
        return () => clearTimeout(spinnerTimer);
    }, [preloadData, loadDataByPriority, hasStartedLoading]);
    
    // Démarrer le chargement progressif dès que les données de base sont disponibles
    useEffect(() => {
        if (dashboardData.totalRooms > 0 && !hasStartedLoading) {
            setShowSpinner(false);
            setHasStartedLoading(true);
            loadDataByPriority();
        }
    }, [dashboardData.totalRooms, hasStartedLoading, loadDataByPriority]);
    
    // Gestion des événements de mise à jour
    useEffect(() => {
        const handleDataUpdate = () => {
            preloadData();
            loadDataByPriority();
        };
        
        window.addEventListener('dashboardUpdate', handleDataUpdate);
        window.addEventListener('roomStatusChanged', handleDataUpdate);
        window.addEventListener('dataChanged', handleDataUpdate);
        
        return () => {
            window.removeEventListener('dashboardUpdate', handleDataUpdate);
            window.removeEventListener('roomStatusChanged', handleDataUpdate);
            window.removeEventListener('dataChanged', handleDataUpdate);
        };
    }, [preloadData, loadDataByPriority]);

    const stats = useMemo(() => [
        {
            title: user?.role === 'user' ? "Universités Partenaires" : "Universités Partenaires",
            value: dashboardData.occupiedRooms.toString(),
            subtitle: `sur ${dashboardData.totalRooms} universités`,
            color: "from-blue-500 to-blue-600",
            bgColor: "bg-blue-50",
            icon: Images.room
        },
        {
            title: user?.role === 'user' ? "Mes Candidatures" : "Candidatures Aujourd&apos;hui",
            value: dashboardData.todayReservations.toString(),
            subtitle: user?.role === 'user' ? "mes candidatures" : "nouvelles candidatures",
            color: "from-green-500 to-green-600",
            bgColor: "bg-green-50",
            icon: Images.reservation
        },
        {
            title: user?.role === 'user' ? "Mes Frais" : "Revenus du Jour",
            value: formatPrice(dashboardData.todayRevenue.toString()),
            subtitle: user?.role === 'user' ? "mes frais" : "chiffre d&apos;affaires",
            color: "from-purple-500 to-purple-600",
            bgColor: "bg-purple-50",
            icon: Images.billing
        }
    ], [dashboardData.occupiedRooms, dashboardData.totalRooms, dashboardData.todayReservations, dashboardData.todayRevenue, user?.role]);

    if (showSpinner) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement du tableau de bord...</p>
                    <p className="text-xs text-slate-400 mt-2">Maximum 5 secondes</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">Tableau de Bord</h1>
                        <p className="text-sm sm:text-base text-slate-600">
                            {user?.role === 'user' 
                                ? 'Vue d\'ensemble de vos candidatures' 
                                : 'Vue d\'ensemble de l\'agence'
                            }
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={refreshData}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
                        >
                            Actualiser
                        </button>
                        {user?.role === 'super_admin' && (
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={async () => {
                                        if (confirm('Générer des données de test ? Cela ajoutera des clients, réservations et factures fictives.')) {
                                            const success = await generateTestData();
                                            if (success) {
                                                alert('Données de test générées avec succès!');
                                                refreshData();
                                            } else {
                                                alert('Erreur lors de la génération des données');
                                            }
                                        }
                                    }}
                                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs sm:text-sm transition-colors"
                                >
                                    <span className="hidden sm:inline">Générer données test</span>
                                    <span className="sm:hidden">Données test</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Réinitialiser les chambres aux 27 par défaut ?')) {
                                            resetRoomsToDefault();
                                            alert('Chambres réinitialisées aux 27 par défaut');
                                            refreshData();
                                        }
                                    }}
                                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs sm:text-sm transition-colors"
                                >
                                    <span className="hidden sm:inline">Reset chambres</span>
                                    <span className="sm:hidden">Reset</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Supprimer toutes les données ? Cette action est irréversible.')) {
                                            clearAllData();
                                            alert('Toutes les données ont été supprimées');
                                            refreshData();
                                        }
                                    }}
                                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm transition-colors"
                                >
                                    <span className="hidden sm:inline">Vider données</span>
                                    <span className="sm:hidden">Vider</span>
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Nettoyer les données parasites ? Cela supprimera les données de test et fictives.')) {
                                            // Nettoyer les clients fictifs
                                            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
                                            const cleanClients = clients.filter((client: any) => 
                                                !(client.name === 'Jean Dupont' && client.phone === '+237 690 123 456') &&
                                                !client.id?.startsWith('fictif_')
                                            );
                                            localStorage.setItem('clients', JSON.stringify(cleanClients));
                                            
                                            // Nettoyer les factures de test
                                            const bills = JSON.parse(localStorage.getItem('bills') || '[]');
                                            const cleanBills = bills.filter((bill: any) => !bill.id?.startsWith('test_'));
                                            localStorage.setItem('bills', JSON.stringify(cleanBills));
                                            
                                            // Nettoyer les réservations de test
                                            const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
                                            const cleanReservations = reservations.filter((res: any) => !res.id?.startsWith('test_'));
                                            localStorage.setItem('reservations', JSON.stringify(cleanReservations));
                                            
                                            // Nettoyer les chambres dupliquées
                                            const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
                                            const uniqueRooms = [];
                                            const seenNumbers = new Set();
                                            
                                            for (const room of rooms) {
                                                if (!seenNumbers.has(room.number)) {
                                                    seenNumbers.add(room.number);
                                                    uniqueRooms.push(room);
                                                }
                                            }
                                            
                                            // Si plus de 50 chambres, garder seulement les 27 prédéfinies
                                            if (uniqueRooms.length > 50) {
                                                const predefinedRooms = [
                                                    // Standard (4)
                                                    { id: 'std_101', number: '101', price: '15000', status: 'Disponible', category: 'Standard' },
                                                    { id: 'std_102', number: '102', price: '15000', status: 'Disponible', category: 'Standard' },
                                                    { id: 'std_103', number: '103', price: '15000', status: 'Disponible', category: 'Standard' },
                                                    { id: 'std_104', number: '104', price: '15000', status: 'Disponible', category: 'Standard' },
                                                    // Confort (13)
                                                    { id: 'conf_201', number: '201', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_202', number: '202', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_203', number: '203', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_301', number: '301', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_302', number: '302', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_303', number: '303', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_304', number: '304', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_305', number: '305', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_306', number: '306', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_307', number: '307', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_308', number: '308', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_309', number: '309', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    { id: 'conf_310', number: '310', price: '25000', status: 'Disponible', category: 'Confort' },
                                                    // VIP (9)
                                                    { id: 'vip_311', number: '311', price: '45000', status: 'Disponible', category: 'VIP' },
                                                    { id: 'vip_312', number: '312', price: '45000', status: 'Disponible', category: 'VIP' },
                                                    { id: 'vip_313', number: '313', price: '45000', status: 'Disponible', category: 'VIP' },
                                                    { id: 'vip_314', number: '314', price: '45000', status: 'Disponible', category: 'VIP' },
                                                    { id: 'vip_315', number: '315', price: '45000', status: 'Disponible', category: 'VIP' },
                                                    { id: 'vip_316', number: '316', price: '45000', status: 'Disponible', category: 'VIP' },
                                                    { id: 'vip_317', number: '317', price: '45000', status: 'Disponible', category: 'VIP' },
                                                    { id: 'vip_318', number: '318', price: '45000', status: 'Disponible', category: 'VIP' },
                                                    { id: 'vip_319', number: '319', price: '45000', status: 'Disponible', category: 'VIP' },
                                                    // Suite (1)
                                                    { id: 'suite_320', number: '320', price: '75000', status: 'Disponible', category: 'Suite' }
                                                ];
                                                localStorage.setItem('rooms', JSON.stringify(predefinedRooms));
                                            } else {
                                                localStorage.setItem('rooms', JSON.stringify(uniqueRooms));
                                            }
                                            
                                            // Vider le cache
                                            ['dashboard_all', 'dashboard_superadmin', 'dashboard_admin', 'dashboard_user'].forEach(key => {
                                                localStorage.removeItem(key);
                                            });
                                            
                                            alert(`Données nettoyées ! Chambres: ${rooms.length} → ${uniqueRooms.length > 50 ? 27 : uniqueRooms.length}`);
                                            refreshData();
                                        }
                                    }}
                                    className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs sm:text-sm transition-colors"
                                >
                                    <span className="hidden sm:inline">Nettoyer données</span>
                                    <span className="sm:hidden">Nettoyer</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {stats.map((stat, index) => (
                    <StatCard key={index} stat={stat} index={index} isLoading={loadingStates.rooms && index === 0} />
                ))}
            </div>

            {(user?.role === 'admin' || user?.role === 'super_admin') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Aperçu Rapide</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600">Taux de réussite</span>
                                    <span className={`font-semibold ${
                                        dashboardData.occupancyRate > 80 ? 'text-green-600' :
                                        dashboardData.occupancyRate > 60 ? 'text-yellow-600' :
                                        dashboardData.occupancyRate > 30 ? 'text-orange-600' :
                                        'text-red-600'
                                    }`}>
                                        {dashboardData.occupancyRate}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-3">
                                    <div 
                                        className={`h-3 rounded-full transition-all duration-500 ${
                                            dashboardData.occupancyRate > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                            dashboardData.occupancyRate > 60 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                                            dashboardData.occupancyRate > 30 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                            'bg-gradient-to-r from-green-500 to-green-600'
                                        }`}
                                        style={{width: `${dashboardData.occupancyRate}%`}}
                                    ></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                                        <div className="text-lg font-bold text-slate-800">{dashboardData.availableRooms}</div>
                                        <div className="text-xs text-slate-600">En attente</div>
                                    </div>
                                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                                        <div className="text-lg font-bold text-slate-800">{dashboardData.occupiedRooms}</div>
                                        <div className="text-xs text-slate-600">Acceptées</div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-200">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">Revenus aujourd&apos;hui</span>
                                        <span className="font-semibold" style={{color: '#7D3837'}}>
                                            {formatPrice(dashboardData.todayRevenue.toString())}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Statut des Candidatures</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{dashboardData.availableRooms}</div>
                                <div className="text-sm text-blue-700">En attente</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{dashboardData.occupiedRooms}</div>
                                <div className="text-sm text-green-700">Acceptées</div>
                            </div>
                            <div className="text-center p-4 bg-yellow-50 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-600">{dashboardData.maintenanceRooms}</div>
                                <div className="text-sm text-yellow-700">En cours</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                <div className="text-2xl font-bold text-red-600">{dashboardData.cleaningRooms}</div>
                                <div className="text-sm text-red-700">Refusées</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Statistiques de rendement - Section importante */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                {/* Rendement journalier */}
                <ProgressiveLoader isLoading={loadingStates.revenue}>
                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Rendement Journalier</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-blue-800">Bourses complètes</p>
                                <p className="text-xs text-blue-600">{dashboardData.dailyStats?.nuitee?.count || 0} étudiants</p>
                            </div>
                            <p className="text-lg font-bold text-blue-600">{formatPrice((dashboardData.dailyStats?.nuitee?.amount || 0).toString())}</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-green-800">Bourses partielles</p>
                                <p className="text-xs text-green-600">{dashboardData.dailyStats?.repos?.count || 0} étudiants</p>
                            </div>
                            <p className="text-lg font-bold text-green-600">{formatPrice((dashboardData.dailyStats?.repos?.amount || 0).toString())}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-200">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Total journalier</span>
                                <span className="font-bold" style={{color: '#7D3837'}}>
                                    {formatPrice(((dashboardData.dailyStats?.nuitee?.amount || 0) + (dashboardData.dailyStats?.repos?.amount || 0)).toString())}
                                </span>
                            </div>
                        </div>
                    </div>
                    </div>
                </ProgressiveLoader>
                
                {/* Revenus mensuels */}
                <ProgressiveLoader isLoading={loadingStates.revenue}>
                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">Revenus du Mois</h3>
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold" style={{color: '#7D3837'}}>
                                {formatPrice(dashboardData.monthlyRevenue.toString())}
                            </div>
                            <div className="text-sm text-slate-500">Revenus du mois en cours</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-lg font-bold text-green-600">{dashboardData.totalClients}</div>
                                <div className="text-xs text-slate-600">Total étudiants</div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-lg font-bold text-blue-600">{dashboardData.totalBills}</div>
                                <div className="text-xs text-slate-600">Total paiements</div>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-200">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Objectif mensuel</span>
                                <span className="font-semibold text-slate-800">2,500,000 FCFA</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                                <div 
                                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                                    style={{width: `${Math.min((dashboardData.monthlyRevenue / 2500000) * 100, 100)}%`}}
                                ></div>
                            </div>
                        </div>
                    </div>
                    </div>
                </ProgressiveLoader>
            </div>
            
            {/* Activités récentes et Chambres par catégorie */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                <ProgressiveLoader isLoading={loadingStates.activities}>
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">Activités Récentes</h3>
                        <button 
                            onClick={refreshData}
                            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
                        >
                            Actualiser
                        </button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                        {dashboardData.recentActivities.length === 0 ? (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center p-1">
                                    <Image src={Images.dashboard} alt="Dashboard" width={16} height={16} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Aucune activité récente</p>
                                    <p className="text-xs text-slate-500">Les dernières actions apparaîtront ici</p>
                                </div>
                            </div>
                        ) : (
                            dashboardData.recentActivities.map((activity, index) => {
                                const getIcon = (type: string) => {
                                    switch(type) {
                                        case 'reservation': return Images.reservation;
                                        case 'client': return Images.client;
                                        case 'billing': return Images.billing;
                                        default: return Images.dashboard;
                                    }
                                };
                                
                                const getBgColor = (type: string) => {
                                    switch(type) {
                                        case 'reservation': return 'bg-green-100';
                                        case 'client': return 'bg-blue-100';
                                        case 'billing': return 'bg-purple-100';
                                        default: return 'bg-slate-100';
                                    }
                                };
                                
                                return (
                                    <div key={`activity-${index}-${activity.type}-${activity.message.slice(0, 10)}-${Date.now()}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                        <div className={`w-8 h-8 ${getBgColor(activity.type)} rounded-full flex items-center justify-center p-1`}>
                                            <Image src={getIcon(activity.type)} alt={activity.type} width={16} height={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-700">{activity.message}</p>
                                            <p className="text-xs text-slate-500">{activity.detail} • {activity.time}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    </div>
                </ProgressiveLoader>

                {/* Chambres par catégorie */}
                <ProgressiveLoader isLoading={loadingStates.clients}>
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Universités par Type</h3>
                    <div className="space-y-3">
                        {[
                            { name: 'Publiques', color: 'bg-blue-500' },
                            { name: 'Privées', color: 'bg-green-500' },
                            { name: 'Techniques', color: 'bg-purple-500' },
                            { name: 'Médicales', color: 'bg-amber-500' }
                        ].map((category, index) => {
                            const categoryRooms = dashboardData.roomsByCategory[category.name] || [];
                            const totalCount = categoryRooms.length;
                            const occupiedCount = categoryRooms.filter((r: Room) => r.status === 'Occupée').length;
                            const rate = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;
                            
                            return (
                                <div key={`category-${category.name}-${index}-${totalCount}-${occupiedCount}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                                        <span className="text-sm font-medium text-slate-700">{category.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold text-slate-800">{occupiedCount}/{totalCount}</div>
                                        <div className="text-xs text-slate-500">{rate}%</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </div>
                </ProgressiveLoader>
            </div>
            
            {/* Sections secondaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 sm:mt-6">
                {/* Rendement hebdomadaire */}
                <ProgressiveLoader isLoading={loadingStates.revenue}>
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Rendement Hebdomadaire</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-purple-800">Nuitées</p>
                                <p className="text-xs text-purple-600">{dashboardData.weeklyStats?.nuitee?.count || 0} chambres</p>
                            </div>
                            <p className="text-lg font-bold text-purple-600">{formatPrice((dashboardData.weeklyStats?.nuitee?.amount || 0).toString())}</p>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium text-orange-800">Repos</p>
                                <p className="text-xs text-orange-600">{dashboardData.weeklyStats?.repos?.count || 0} chambres</p>
                            </div>
                            <p className="text-lg font-bold text-orange-600">{formatPrice((dashboardData.weeklyStats?.repos?.amount || 0).toString())}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-200">
                            <div className="flex justify-between">
                                <span className="text-sm text-slate-600">Total hebdomadaire</span>
                                <span className="font-bold" style={{color: '#7D3837'}}>
                                    {formatPrice(((dashboardData.weeklyStats?.nuitee?.amount || 0) + (dashboardData.weeklyStats?.repos?.amount || 0)).toString())}
                                </span>
                            </div>
                        </div>
                    </div>
                    </div>
                </ProgressiveLoader>

                {/* Clients récents */}
                <ProgressiveLoader isLoading={loadingStates.activities}>
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Derniers Étudiants</h3>
                    <div className="space-y-3">
                        {dashboardData.recentActivities.filter((a: Activity) => a.type === 'client').slice(0, 4).map((client, index) => (
                            <div key={`client-${index}-${client.message}-${client.detail}-${Date.now()}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-semibold text-blue-600">
                                        {client.message.split(' - ')[1]?.charAt(0) || 'C'}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-700">
                                        {client.message.split(' - ')[1] || 'Client'}
                                    </p>
                                    <p className="text-xs text-slate-500">{client.detail}</p>
                                </div>
                            </div>
                        ))}
                        {dashboardData.recentActivities.filter((a: Activity) => a.type === 'client').length === 0 && (
                            <div className="text-center py-4 text-slate-500 text-sm">
                                Aucun étudiant récent
                            </div>
                        )}
                    </div>
                    </div>
                </ProgressiveLoader>

                {/* Réservations par jour de la semaine */}
                <ProgressiveLoader isLoading={loadingStates.reservations}>
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Candidatures par Jour</h3>
                    <div className="space-y-3">
                        {dashboardData.weeklyReservations.map((dayData, index) => (
                            <div key={`day-${dayData.day}-${index}-${dayData.count}-${dayData.maxCount}`} className="flex items-center gap-3">
                                <div className="w-8 text-xs text-slate-600">{dayData.day}</div>
                                <div className="flex-1 bg-slate-200 rounded-full h-2">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{width: `${(dayData.count / dayData.maxCount) * 100}%`}}
                                    ></div>
                                </div>
                                <div className="w-6 text-xs text-slate-700 font-medium">{dayData.count}</div>
                            </div>
                        ))}
                    </div>
                    </div>
                </ProgressiveLoader>
            </div>
            

        </div>
    );
}

export default memo(DashBoard);