"use client";

import { useState, useEffect } from "react";
import ScholarshipDashboard from "./components/ScholarshipDashboard";
import ApplicationManagement from "./components/ApplicationManagement";
import UniversityManagement from "./components/UniversityManagement";
import StudentManagement from "./components/StudentManagement";
import ApplicationFeeManagement from "./components/ApplicationFeeManagement";
import ScholarshipFileManagement from "./components/ScholarshipFileManagement";
import ServiceRequestManagement from "./components/ServiceRequestManagement";

import UserManagement from "./components/UserManagement";
import ActivityHistory from "./components/ActivityHistory";
import PerformanceHistory from "./components/PerformanceHistory";
// import { useActivityLog } from "./context/ActivityLogContext";
import { syncLocalStorageToFirebase } from "./utils/syncData";
import { useNotification } from "./hooks/useNotification";
import Notification from "./components/Notification";
import { NotificationProvider } from "./context/NotificationContext";
import { ActivityLogProvider } from "./context/ActivityLogContext";
import { AuthProvider } from "./context/AuthContext";

import LoginPage from "./components/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePasswordModal from "./components/ChangePasswordModal";
import CheckoutAlertModal from "./components/CheckoutAlertModal";
import ChangePassword from "./components/ChangePassword";
import NotificationsPage from "./components/NotificationsPage";
import StudentPortal from "./components/StudentPortal";


function AppContent() {
    const [currentPage, setCurrentPage] = useState("home");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { notifications, showNotification, removeNotification } = useNotification();
    const [user, setUser] = useState<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    // useActivityLog();
    const [showLogin, setShowLogin] = useState(true);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showCheckoutAlert, setShowCheckoutAlert] = useState(false);
    const [showUserPasswordChange, setShowUserPasswordChange] = useState(false);
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    const parsedUser = JSON.parse(savedUser);
                    setUser(parsedUser);
                    setShowLogin(false);
                } catch (e) {
                    localStorage.removeItem('currentUser');
                }
            }
        }
        setIsLoaded(true);
    }, []);
    
    const logout = () => {
        setUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('currentUser');
        }
        setShowLogin(true);
    };


    useEffect(() => {
        if (user && user.mustChangePassword) {
            setShowPasswordChange(true);
        } else {
            setShowPasswordChange(false);
        }
    }, [user]);



    useEffect(() => {
        if (typeof window !== 'undefined') {
            syncLocalStorageToFirebase();
            const syncInterval = setInterval(() => {
                syncLocalStorageToFirebase();
            }, 30000);
            const handleBeforeUnload = () => {
                syncLocalStorageToFirebase();
            };
            window.addEventListener('beforeunload', handleBeforeUnload);
            return () => {
                clearInterval(syncInterval);
                window.removeEventListener('beforeunload', handleBeforeUnload);
            };
        }
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case "home":
                return <ScholarshipDashboard />;
            case "reservations":
                return <ApplicationManagement />;
            case "chambres":
                return <UniversityManagement />;
            case "clients":
                return <StudentManagement />;
            case "facturation":
                return <ApplicationFeeManagement />;
            case "dossiers":
                return <ScholarshipFileManagement />;
            case "services":
                return <ServiceRequestManagement />;
            case "users":
                return <UserManagement />;
            case "history":
                return <ActivityHistory />;
            case "performance":
                return <PerformanceHistory />;
            case "notifications":
                return <NotificationsPage />;
            default:
                return <ScholarshipDashboard />;
        }
    };

    if (!isLoaded) {
        return <div className="fixed inset-0 bg-black flex items-center justify-center">
            <div className="text-white">Chargement...</div>
        </div>;
    }
    
    if (showLogin || !user) {
        return (
            <>
                <LoginPage onLoginSuccess={(loggedUser) => {
                    setUser(loggedUser);
                    setShowLogin(false);
                }} />
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

    if (user?.role === 'student') {
        return <StudentPortal user={user} onLogout={logout} />;
    }

    return (
        <div className="h-screen gradient-bg flex">
            {/* Sidebar */}
            <div className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out flex flex-col glass-sidebar`}>
                {/* Logo */}
                <div className="flex items-center px-4 py-4 border-b border-gray-100">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-2 shadow-sm flex-shrink-0">
                        <img src="/0.png" alt="Joda Company Logo" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-bold text-gray-900 truncate">Joda Company</h1>
                        <p className="text-xs text-gray-500 truncate">Gestion des bourses</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                    <div className="space-y-4">
                        {/* Main Menu */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Menu Principal</h3>
                            <div className="space-y-1">
                                <button
                                    onClick={() => {setCurrentPage("home"); setIsMobileMenuOpen(false);}}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === "home" 
                                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                    </svg>
                                    Dashboard
                                </button>
                                <button
                                    onClick={() => {setCurrentPage("reservations"); setIsMobileMenuOpen(false);}}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === "reservations" 
                                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Candidatures
                                </button>
                                <button
                                    onClick={() => {setCurrentPage("chambres"); setIsMobileMenuOpen(false);}}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === "chambres" 
                                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    Universités
                                </button>
                                <button
                                    onClick={() => {setCurrentPage("clients"); setIsMobileMenuOpen(false);}}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === "clients" 
                                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                    </svg>
                                    Étudiants
                                </button>
                                <button
                                    onClick={() => {setCurrentPage("facturation"); setIsMobileMenuOpen(false);}}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === "facturation" 
                                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Frais
                                </button>
                                <button
                                    onClick={() => {setCurrentPage("dossiers"); setIsMobileMenuOpen(false);}}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === "dossiers" 
                                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Dossiers
                                </button>
                                <button
                                    onClick={() => {setCurrentPage("services"); setIsMobileMenuOpen(false);}}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === "services" 
                                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    Demandes Services
                                </button>
                            </div>
                        </div>

                        {/* Tools */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Outils</h3>
                            <div className="space-y-1">
                                <button
                                    onClick={() => {setCurrentPage("performance"); setIsMobileMenuOpen(false);}}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === "performance" 
                                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Performances
                                </button>
                                <button
                                    onClick={() => {setCurrentPage("notifications"); setIsMobileMenuOpen(false);}}
                                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        currentPage === "notifications" 
                                            ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 515.5-7.21" />
                                    </svg>
                                    Notifications
                                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
                                </button>
                            </div>
                        </div>

                        {/* Admin */}
                        {(user?.role === 'admin' || user?.role === 'super_admin') && (
                            <div>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Administration</h3>
                                <div className="space-y-1">
                                    <button
                                        onClick={() => {setCurrentPage("users"); setIsMobileMenuOpen(false);}}
                                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                            currentPage === "users" 
                                                ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                        </svg>
                                        Utilisateurs
                                    </button>
                                    <button
                                        onClick={() => {setCurrentPage("history"); setIsMobileMenuOpen(false);}}
                                        className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                            currentPage === "history" 
                                                ? 'bg-red-50 text-red-700 border-r-2 border-red-500' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Historique
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                {/* User Profile */}
                <div className="border-t border-gray-100 p-4">
                    <div className="flex items-center mb-4">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-gray-700">{user?.name?.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                            <p className={`text-xs px-2 py-1 rounded-full inline-block ${
                                user?.role === 'super_admin' ? 'bg-red-100 text-red-700' :
                                user?.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                                {user?.role === 'super_admin' ? 'Super Admin' :
                                 user?.role === 'admin' ? 'Admin' : 'Utilisateur'}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <button
                            onClick={() => {setShowUserPasswordChange(true); setIsMobileMenuOpen(false);}}
                            className="w-full flex items-center px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                            </svg>
                            Changer mot de passe
                        </button>
                        <button
                            onClick={() => {logout(); setShowLogin(true); setIsMobileMenuOpen(false);}}
                            className="w-full flex items-center px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Déconnexion
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="px-6 py-4 glass-header">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-4"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {currentPage === "home" ? "Dashboard" :
                                     currentPage === "reservations" ? "Candidatures" :
                                     currentPage === "chambres" ? "Universités" :
                                     currentPage === "clients" ? "Étudiants" :
                                     currentPage === "facturation" ? "Frais" :
                                     currentPage === "dossiers" ? "Dossiers" :
                                     currentPage === "services" ? "Demandes Services" :
                                     currentPage === "performance" ? "Performances" :
                                     currentPage === "notifications" ? "Notifications" :
                                     currentPage === "users" ? "Utilisateurs" :
                                     currentPage === "history" ? "Historique" : "Dashboard"}
                                </h1>
                                <p className="text-sm text-gray-500">Gestion des bourses d'études en Chine</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="hidden md:flex items-center text-sm text-gray-500">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                En ligne
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto gradient-bg">
                    <div className="p-6">
                        <NotificationProvider showNotification={showNotification}>
                            <ProtectedRoute requiredRole="user" user={user}>
                                {renderPage()}
                            </ProtectedRoute>
                        </NotificationProvider>
                    </div>
                </main>
            </div>

            {/* Notifications */}
            {notifications.map((notification, index) => (
                <Notification
                    key={`main-notification-${notification.id}-${index}`}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}

            {/* Modals */}
            <CheckoutAlertModal 
                isOpen={showCheckoutAlert} 
                onClose={() => setShowCheckoutAlert(false)} 
            />
            
            {showUserPasswordChange && (
                <ChangePassword onClose={() => setShowUserPasswordChange(false)} />
            )}
            

        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <ActivityLogProvider>
                <AppContent />
            </ActivityLogProvider>
        </AuthProvider>
    );
}