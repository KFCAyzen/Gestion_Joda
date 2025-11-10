"use client";

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { dataCache } from '../utils/dataCache';

interface DashboardData {
    occupiedRooms: number;
    todayReservations: number;
    todayRevenue: number;
    recentActivities: any[];
    occupancyRate: number;
    availableRooms: number;
    maintenanceRooms: number;
    cleaningRooms: number;
    totalRooms: number;
    roomsByCategory: Record<string, any[]>;
    weeklyReservations: any[];
    monthlyRevenue: number;
    totalClients: number;
    totalBills: number;
    dailyStats: any;
    weeklyStats: any;
}

const initialData: DashboardData = {
    occupiedRooms: 0,
    todayReservations: 0,
    todayRevenue: 0,
    recentActivities: [],
    occupancyRate: 0,
    availableRooms: 27,
    maintenanceRooms: 0,
    cleaningRooms: 0,
    totalRooms: 27,
    roomsByCategory: {},
    weeklyReservations: [],
    monthlyRevenue: 0,
    totalClients: 0,
    totalBills: 0,
    dailyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } },
    weeklyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } }
};

export function useDashboardPreloader(user: any) {
    const [data, setData] = useState<DashboardData>(initialData);
    const [loadingStates, setLoadingStates] = useState({
        rooms: false,
        reservations: false,
        revenue: false,
        clients: false,
        activities: false
    });
    const [isPreloading, setIsPreloading] = useState(false);
    
    // Préchargement en arrière-plan
    const preloadData = useCallback(async () => {
        if (isPreloading) return;
        setIsPreloading(true);

        try {
            const cacheKey = `dashboard_${user?.username || 'all'}`;
            const cached = dataCache.get(cacheKey);
            
            if (cached && typeof cached === 'object') {
                setData(cached as DashboardData);
                setIsPreloading(false);
                return;
            }

            // Charger les données de base depuis localStorage ou Firebase
            let rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
            let clients = JSON.parse(localStorage.getItem('clients') || '[]');
            let bills = JSON.parse(localStorage.getItem('bills') || '[]');
            let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');

            // Utiliser données par défaut si localStorage vide (éviter Firebase)
            if (rooms.length === 0) {
                rooms = [];
            }
            if (clients.length === 0) {
                clients = [];
            }
            if (bills.length === 0) {
                bills = [];
            }
            if (reservations.length === 0) {
                reservations = [];
            }

            // Filtrer selon le rôle utilisateur
            if (user?.role === 'user') {
                clients = clients.filter((c: any) => c.createdBy === user.username);
                bills = bills.filter((b: any) => b.createdBy === user.username);
                reservations = reservations.filter((r: any) => r.createdBy === user.username);
            }

            // Calculer les données de base
            const roomStatusCounts = {
                'Disponible': 0,
                'Occupée': 0,
                'Maintenance': 0,
                'Nettoyage': 0
            };

            for (const room of rooms) {
                if (room?.status && roomStatusCounts.hasOwnProperty(room.status)) {
                    roomStatusCounts[room.status as keyof typeof roomStatusCounts]++;
                }
            }

            const today = new Date().toISOString().split('T')[0];
            const todayReservations = reservations.filter((r: any) => r.checkIn === today).length;
            const todayBills = bills.filter((b: any) => b.date === today);
            const todayRevenue = todayBills.reduce((sum: number, bill: any) => sum + (parseInt(bill.amount) || 0), 0);

            const preloadedData: DashboardData = {
                occupiedRooms: roomStatusCounts['Occupée'],
                todayReservations,
                todayRevenue,
                recentActivities: [],
                occupancyRate: Math.round((roomStatusCounts['Occupée'] / rooms.length) * 100),
                availableRooms: roomStatusCounts['Disponible'],
                maintenanceRooms: roomStatusCounts['Maintenance'],
                cleaningRooms: roomStatusCounts['Nettoyage'],
                totalRooms: rooms.length || 27,
                roomsByCategory: {},
                weeklyReservations: [],
                monthlyRevenue: 0,
                totalClients: clients.length,
                totalBills: bills.length,
                dailyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } },
                weeklyStats: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } }
            };

            setData(preloadedData);
            dataCache.set(cacheKey, preloadedData, 10 * 60 * 1000);

        } catch (error) {
            console.warn('Erreur préchargement:', error);
        } finally {
            setIsPreloading(false);
        }
    }, [user?.username, user?.role, isPreloading]);

    // Écouter l'événement de préchargement depuis l'authentification
    useEffect(() => {
        const handleDashboardPreload = (event: CustomEvent) => {
            if (event.detail?.user) {
                preloadData();
            }
        };
        
        window.addEventListener('dashboardPreload', handleDashboardPreload as EventListener);
        
        return () => {
            window.removeEventListener('dashboardPreload', handleDashboardPreload as EventListener);
        };
    }, [preloadData]);

    // Chargement progressif par priorité
    const loadDataByPriority = useCallback(async () => {
        const priorities = ['rooms', 'reservations', 'revenue', 'clients', 'activities'];
        
        for (const priority of priorities) {
            setLoadingStates(prev => ({ ...prev, [priority]: true }));
            
            // Chargement rapide sans délai
            await new Promise(resolve => setTimeout(resolve, 50));
            
            try {
                switch (priority) {
                    case 'rooms':
                        // Les données des chambres sont déjà chargées
                        break;
                    case 'reservations':
                        // Charger les réservations hebdomadaires
                        const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
                        const weeklyReservations = getWeeklyReservations(reservations);
                        setData(prev => ({ ...prev, weeklyReservations }));
                        break;
                    case 'revenue':
                        // Charger les statistiques de revenus
                        const bills = JSON.parse(localStorage.getItem('bills') || '[]');
                        const stats = calculateAllStats(bills);
                        setData(prev => ({ 
                            ...prev, 
                            monthlyRevenue: stats.monthly,
                            dailyStats: stats.daily,
                            weeklyStats: stats.weekly
                        }));
                        break;
                    case 'clients':
                        // Charger les catégories de chambres
                        const rooms = JSON.parse(localStorage.getItem('rooms') || '[]');
                        const roomsByCategory: Record<string, any[]> = {};
                        for (const room of rooms) {
                            if (!roomsByCategory[room.category]) roomsByCategory[room.category] = [];
                            roomsByCategory[room.category].push(room);
                        }
                        setData(prev => ({ ...prev, roomsByCategory }));
                        break;
                    case 'activities':
                        // Charger les activités récentes
                        const recentActivities = getRecentActivities();
                        setData(prev => ({ ...prev, recentActivities }));
                        break;
                }
            } catch (error) {
                console.warn(`Erreur chargement ${priority}:`, error);
            } finally {
                setLoadingStates(prev => ({ ...prev, [priority]: false }));
            }
        }
    }, []);

    const getWeeklyReservations = (reservations: any[]) => {
        if (!Array.isArray(reservations)) return [];
        
        const counts = [0, 0, 0, 0, 0, 0, 0];
        let maxCount = 1;
        
        for (const reservation of reservations) {
            if (reservation?.checkIn) {
                const date = new Date(reservation.checkIn);
                if (!isNaN(date.getTime())) {
                    const dayIndex = (date.getDay() + 6) % 7;
                    counts[dayIndex]++;
                    if (counts[dayIndex] > maxCount) maxCount = counts[dayIndex];
                }
            }
        }
        
        return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => ({
            day,
            count: counts[index],
            maxCount
        }));
    };

    const calculateAllStats = (bills: any[]) => {
        if (!Array.isArray(bills)) return {
            monthly: 0,
            daily: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } },
            weekly: { nuitee: { count: 0, amount: 0 }, repos: { count: 0, amount: 0 } }
        };
        
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        
        let monthly = 0;
        let dailyNuitee = 0, dailyNuiteeAmount = 0, dailyRepos = 0, dailyReposAmount = 0;
        let weeklyNuitee = 0, weeklyNuiteeAmount = 0, weeklyRepos = 0, weeklyReposAmount = 0;
        
        for (const bill of bills) {
            if (!bill?.date) continue;
            
            const amount = parseInt(bill.amount) || 0;
            const billDate = new Date(bill.date);
            
            if (isNaN(billDate.getTime())) continue;
            
            if (billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear) {
                monthly += amount;
            }
            
            if (bill.date === today) {
                if (bill.motif === 'Nuitée') {
                    dailyNuitee++;
                    dailyNuiteeAmount += amount;
                } else if (bill.motif === 'Repos') {
                    dailyRepos++;
                    dailyReposAmount += amount;
                }
            }
            
            if (billDate >= weekStart && billDate <= weekEnd) {
                if (bill.motif === 'Nuitée') {
                    weeklyNuitee++;
                    weeklyNuiteeAmount += amount;
                } else if (bill.motif === 'Repos') {
                    weeklyRepos++;
                    weeklyReposAmount += amount;
                }
            }
        }
        
        return {
            monthly,
            daily: { nuitee: { count: dailyNuitee, amount: dailyNuiteeAmount }, repos: { count: dailyRepos, amount: dailyReposAmount } },
            weekly: { nuitee: { count: weeklyNuitee, amount: weeklyNuiteeAmount }, repos: { count: weeklyRepos, amount: weeklyReposAmount } }
        };
    };

    const getRecentActivities = () => {
        try {
            const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
            const clients = JSON.parse(localStorage.getItem('clients') || '[]');
            const bills = JSON.parse(localStorage.getItem('bills') || '[]');

            const recent = [...reservations.slice(-3), ...clients.slice(-2), ...bills.slice(-2)]
                .filter(item => item && typeof item === 'object')
                .slice(-5)
                .map((item: any) => {
                    if (item.clientName) return { type: 'reservation', message: `Nouvelle réservation - ${item.clientName}`, detail: `Chambre ${item.roomNumber || 'N/A'}` };
                    if (item.name) return { type: 'client', message: `Nouveau client - ${item.name}`, detail: item.phone || 'Téléphone non renseigné' };
                    return { type: 'billing', message: `Nouveau reçu - ${item.receivedFrom || 'Client'}`, detail: `${item.amount || '0'} FCFA` };
                })
                .map(item => ({ ...item, time: 'Il y a quelques minutes' }));

            return recent;
        } catch (error) {
            return [];
        }
    };

    return {
        data,
        loadingStates,
        isPreloading,
        preloadData,
        loadDataByPriority
    };
}