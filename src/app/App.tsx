"use client";

import { useState, useEffect } from "react";
import DashBoard from "./components/DashBoard";
import ReservationPage from "./components/ReservationPage";
import RoomsPage from "./components/RoomsPage";
import StudentsPage from "./components/StudentsPage";
import BillingPage from "./components/BillingPage";
import UserManagement from "./components/UserManagement";
import ActivityHistory from "./components/ActivityHistory";
import PerformanceHistory from "./components/PerformanceHistory";
import { Images } from "./components/Images";
import { useActivityLog } from "./context/ActivityLogContext";
import Image from "next/image";
import { syncLocalStorageToFirebase } from "./utils/syncData";
import { useNotification } from "./hooks/useNotification";
import Notification from "./components/Notification";
import { NotificationProvider } from "./context/NotificationContext";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePasswordModal from "./components/ChangePasswordModal";
import CheckoutAlertModal from "./components/CheckoutAlertModal";
import ChangePassword from "./components/ChangePassword";
import NotificationsPage from "./components/NotificationsPage";
import WelcomeScreen from "./components/WelcomeScreen";

/**
 * Composant principal de l'agence de voyage pour bourses d'études en Chine
 * Gère l'authentification, la navigation et l'affichage des pages
 */
export default function App() {
    // État de la page actuelle
    const [currentPage, setCurrentPage] = useState("home");
    // État du menu mobile (ouvert/fermé)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    // Hooks personnalisés
    const { notifications, showNotification, removeNotification } = useNotification();
    const { user, logout } = useAuth();
    useActivityLog();
    const [showLogin, setShowLogin] = useState(!user);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showCheckoutAlert, setShowCheckoutAlert] = useState(false);
    const [showUserPasswordChange, setShowUserPasswordChange] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        if (user && user.mustChangePassword) {
            setShowPasswordChange(true);
        } else {
            setShowPasswordChange(false);
        }
    }, [user]);

    useEffect(() => {
        if (user && !showPasswordChange) {
            setShowWelcome(true);
        }
    }, [user, showPasswordChange]);

    useEffect(() => {
        // Initialiser la synchronisation des données au démarrage
        syncLocalStorageToFirebase();
        
        // Démarrer la synchronisation automatique périodique (toutes les 30 secondes)
        const syncInterval = setInterval(() => {
            syncLocalStorageToFirebase();
        }, 30000);
        
        // Synchroniser avant fermeture de page
        const handleBeforeUnload = () => {
            syncLocalStorageToFirebase();
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Nettoyer les listeners au démontage
        return () => {
            clearInterval(syncInterval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    /**
     * Fonction pour rendre la page correspondant à l'état actuel
     * @returns Composant de la page à afficher
     */
    const renderPage = () => {
        switch (currentPage) {
            case "home":
                return <DashBoard />;
            case "reservations":
                return <ReservationPage />;
            case "chambres":
                return <RoomsPage />;
            case "clients":
                return <StudentsPage />;
            case "facturation":
                return <BillingPage />;
            case "users":
                return <UserManagement />;
            case "history":
                return <ActivityHistory />;
            case "performance":
                return <PerformanceHistory />;
            case "notifications":
                return <NotificationsPage />;
            default:
                return <DashBoard />;
        }
    };

    // Affichage de la page de connexion si non authentifié
    if (showLogin || !user) {
        return (
            <>
                <LoginPage onLoginSuccess={() => setShowLogin(false)} />
                {notifications.map((notification, index) => (
                    <Notification
                        key={`login-notification-${notification.id}-${index}`}
                        message={notification.message}
                        type={notification.type}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </>
        );
    }

    // Affichage du modal de changement de mot de passe si requis
    if (showPasswordChange) {
        return (
            <>
                <ChangePasswordModal onPasswordChanged={() => setShowPasswordChange(false)} />
                {notifications.map((notification, index) => (
                    <Notification
                        key={`password-notification-${notification.id}-${index}`}
                        message={notification.message}
                        type={notification.type}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
            {/* Top Navigation Bar */}
            <header className="bg-gradient-to-r from-[#7D3837] via-[#8B4A49] to-[#7D3837] shadow-xl border-b border-white/10">
                <div className="px-4 sm:px-6 py-1">
                    <div className="flex items-center justify-between">
                        {/* Logo et titre */}
                        <button onClick={() => setCurrentPage("home")} className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                            <Image src={Images.logo} alt="Logo SINO EDUCATION" width={32} height={32} className="sm:w-10 sm:h-10 rounded-lg" />
                            <h1 className="text-lg sm:text-xl font-bold text-white">
                                SINO EDUCATION
                            </h1>
                        </button>
                        
                        {/* Navigation horizontale - Desktop */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {/* Section principale */}
                            <div className="flex items-center gap-1 mr-4">
                            <button onClick={() => setCurrentPage("home")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "home" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "home" ? Images.dashboard : Images.dashboardActif} alt="Dashboard" width={16} height={16} />
                                    Dashboard
                                </button>
                            <button onClick={() => setCurrentPage("reservations")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "reservations" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "reservations" ? Images.reservation : Images.reservationActif} alt="Bourses" width={16} height={16} />
                                    Bourses
                                </button>
                            <button onClick={() => setCurrentPage("chambres")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "chambres" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "chambres" ? Images.room : Images.roomActif} alt="Universités" width={16} height={16} />
                                    Universités
                                </button>
                            <button onClick={() => setCurrentPage("clients")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "clients" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "clients" ? Images.client : Images.clientActif} alt="Étudiants" width={16} height={16} />
                                    Étudiants
                                </button>
                            </div>
                            
                            {/* Section secondaire */}
                            <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage("facturation")} className={`px-4 py-4 flex items-center gap-2 transition-all duration-300 font-medium text-sm cursor-pointer relative ${
                                currentPage === "facturation" 
                                    ? 'bg-white text-[#7D3837] rounded-t-xl shadow-lg border-b-4 border-white -mb-1 z-10' 
                                    : 'text-white hover:bg-white/15 hover:text-amber-200 rounded-lg'
                            }`}>
                                    <Image src={currentPage === "facturation" ? Images.billing : Images.billingActif} alt="Paiements" width={16} height={16} />
                                    Paiements
                                </button>
                                <button onClick={() => setCurrentPage("performance")} className={`p-2 rounded-lg transition-all duration-300 cursor-pointer relative overflow-hidden ${
                                    currentPage === "performance" 
                                        ? 'bg-gradient-to-r from-white/95 to-white/90 text-[#7D3837] shadow-lg border-b-2 border-amber-400 transform scale-110 backdrop-blur-sm' 
                                        : 'text-white hover:bg-white/15 hover:text-amber-200 hover:shadow-md hover:scale-105'
                                }`} title="Performances">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Performances
                                </button>
                                <div className="relative">
                                <button onClick={() => setCurrentPage("notifications")} className={`p-2 rounded-lg transition-all duration-300 cursor-pointer relative overflow-hidden ${
                                    currentPage === "notifications" 
                                        ? 'bg-gradient-to-r from-white/95 to-white/90 text-[#7D3837] shadow-lg border-b-2 border-amber-400 transform scale-110 backdrop-blur-sm' 
                                        : 'text-white hover:bg-white/15 hover:text-amber-200 hover:shadow-md hover:scale-105'
                                }`} title="Notifications">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 515.5-7.21" />
                                        </svg>
                                    </button>
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">3</span>
                                </div>
                                {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                    <>
                                        <div className="w-px h-6 bg-white bg-opacity-30 mx-2"></div>
                                        <button onClick={() => setCurrentPage("users")} className={`p-2 rounded-lg transition-all duration-300 cursor-pointer relative overflow-hidden ${
                                            currentPage === "users" 
                                                ? 'bg-gradient-to-r from-white/95 to-white/90 text-[#7D3837] shadow-lg border-b-2 border-amber-400 transform scale-110 backdrop-blur-sm' 
                                                : 'text-white hover:bg-white/15 hover:text-amber-200 hover:shadow-md hover:scale-105'
                                        }`} title="Utilisateurs">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                            </svg>
                                        </button>
                                        <button onClick={() => setCurrentPage("history")} className={`p-2 rounded-lg transition-all duration-300 cursor-pointer relative overflow-hidden ${
                                            currentPage === "history" 
                                                ? 'bg-gradient-to-r from-white/95 to-white/90 text-[#7D3837] shadow-lg border-b-2 border-amber-400 transform scale-110 backdrop-blur-sm' 
                                                : 'text-white hover:bg-white/15 hover:text-amber-200 hover:shadow-md hover:scale-105'
                                        }`} title="Historique">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </nav>
                        
                        {/* Boutons mobile et déconnexion */}
                        <div className="flex items-center gap-2">
                            {/* Informations utilisateur */}
                            <div className="hidden md:flex items-center gap-3 text-white text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">{user?.name}</span>
                                    <span className={`px-2 py-1 rounded text-xs ${
                                        user?.role === 'super_admin' ? 'bg-red-100 text-red-800 sm:text-red-800 text-amber-800' :
                                        user?.role === 'admin' ? 'bg-orange-100 text-orange-800 sm:text-orange-800 text-amber-800' :
                                        'bg-green-100 text-green-800 sm:text-green-800 text-amber-800'
                                    }`}>
                                        {user?.role === 'super_admin' ? 'Super Admin' :
                                         user?.role === 'admin' ? 'Admin' : 'Utilisateur'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Bouton modifier mot de passe - Desktop */}
                            <button
                                onClick={() => setShowUserPasswordChange(true)}
                                className="hidden sm:block p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors cursor-pointer"
                                title="Modifier mot de passe"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </button>
                            
                            {/* Bouton de déconnexion - Desktop */}
                            <button
                                onClick={() => {logout(); setShowLogin(true);}}
                                className="hidden sm:block p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors cursor-pointer"
                                title="Déconnexion"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                            
                            {/* Menu hamburger - Mobile */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors cursor-pointer"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    {/* Menu mobile */}
                    {isMobileMenuOpen && (
                        <div className="lg:hidden mt-4 pb-4 border-t border-slate-600">
                            <nav className="flex flex-col gap-2 mt-4">
                                <button onClick={() => {setCurrentPage("home"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "home" ? 'white' : 'transparent', color: currentPage === "home" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "home" ? Images.dashboard : Images.dashboardActif} alt="Dashboard" width={20} height={20} />
                                    Tableau de Bord
                                </button>
                                <button onClick={() => {setCurrentPage("reservations"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "reservations" ? 'white' : 'transparent', color: currentPage === "reservations" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "reservations" ? Images.reservation : Images.reservationActif} alt="Bourses" width={20} height={20} />
                                    Bourses d'études
                                </button>
                                <button onClick={() => {setCurrentPage("chambres"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "chambres" ? 'white' : 'transparent', color: currentPage === "chambres" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "chambres" ? Images.room : Images.roomActif} alt="Universités" width={20} height={20} />
                                    Universités
                                </button>
                                <button onClick={() => {setCurrentPage("clients"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "clients" ? 'white' : 'transparent', color: currentPage === "clients" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "clients" ? Images.client : Images.clientActif} alt="Étudiants" width={20} height={20} />
                                    Étudiants
                                </button>
                                <button onClick={() => {setCurrentPage("facturation"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "facturation" ? 'white' : 'transparent', color: currentPage === "facturation" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <Image src={currentPage === "facturation" ? Images.billing : Images.billingActif} alt="Paiements" width={20} height={20} />
                                    Paiements
                                </button>
                                <button onClick={() => {setCurrentPage("performance"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "performance" ? 'white' : 'transparent', color: currentPage === "performance" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Performances
                                </button>
                                <div className="relative">
                                    <button onClick={() => {setCurrentPage("notifications"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "notifications" ? 'white' : 'transparent', color: currentPage === "notifications" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 515.5-7.21" />
                                        </svg>
                                        Notifications
                                    </button>
                                    <span className="absolute top-2 left-8 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">3</span>
                                </div>
                                {user?.role === 'admin' || user?.role === 'super_admin' ? (
                                    <>
                                        <button onClick={() => {setCurrentPage("users"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "users" ? 'white' : 'transparent', color: currentPage === "users" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                            </svg>
                                            Utilisateurs
                                        </button>
                                        <button onClick={() => {setCurrentPage("history"); setIsMobileMenuOpen(false);}} style={{backgroundColor: currentPage === "history" ? 'white' : 'transparent', color: currentPage === "history" ? '#7D3837' : 'white'}} className="w-full px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-20 flex items-center gap-3 transition-all duration-200 font-medium text-left cursor-pointer">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Historique
                                        </button>
                                    </>
                                ) : null}
                                
                                {/* Informations utilisateur mobile */}
                                <div className="md:hidden w-full mt-2 px-4 py-2 bg-white bg-opacity-10 rounded-lg text-white text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{user?.name}</span>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            user?.role === 'super_admin' ? 'bg-red-100 text-red-800 sm:text-red-800 text-amber-800' :
                                            user?.role === 'admin' ? 'bg-orange-100 text-orange-800 sm:text-orange-800 text-amber-800' :
                                            'bg-green-100 text-green-800 sm:text-green-800 text-amber-800'
                                        }`}>
                                            {user?.role === 'super_admin' ? 'Super Admin' :
                                             user?.role === 'admin' ? 'Admin' : 'Utilisateur'}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Bouton modifier mot de passe mobile */}
                                <button
                                    onClick={() => {setShowUserPasswordChange(true); setIsMobileMenuOpen(false);}}
                                    className="sm:hidden w-full mt-2 px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                                    </svg>
                                    Modifier mot de passe
                                </button>
                                
                                {/* Bouton de déconnexion mobile */}
                                <button
                                    onClick={() => {logout(); setShowLogin(true); setIsMobileMenuOpen(false);}}
                                    className="sm:hidden w-full mt-2 px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Déconnexion
                                </button>
                            </nav>
                        </div>
                    )}
                </div>
            </header>

            {/* Contenu principal */}
            <main className="flex-1 p-3 sm:p-6">
                <div className="glass-effect shadow-elegant rounded-xl p-3 sm:p-6 min-h-[500px]">
                    <NotificationProvider showNotification={showNotification}>
                        <ProtectedRoute requiredRole="user">
                            {renderPage()}
                        </ProtectedRoute>
                    </NotificationProvider>
                </div>
            </main>

            {/* Notifications */}
            {notifications.map((notification, index) => (
                <Notification
                    key={`main-notification-${notification.id}-${index}`}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}

            {/* Modaux globaux */}
            <CheckoutAlertModal 
                isOpen={showCheckoutAlert} 
                onClose={() => setShowCheckoutAlert(false)} 
            />
            
            {/* Modal de changement de mot de passe utilisateur */}
            {showUserPasswordChange && (
                <ChangePassword onClose={() => setShowUserPasswordChange(false)} />
            )}
            
            {/* Écran de bienvenue */}
            {showWelcome && (
                <WelcomeScreen onComplete={() => {
                    setShowWelcome(false);
                    setShowCheckoutAlert(true);
                }} />
            )}
        </div>
    );
}