"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
    Bell,
    BookOpenText,
    Building2,
    ChevronDown,
    FileArchive,
    FileClock,
    GraduationCap,
    HandCoins,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Menu,
    ShieldUser,
    SquareChartGantt,
    TrendingUp,
    Users,
    WalletCards,
} from "lucide-react";
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
import { useNotification } from "./hooks/useNotification";
import Notification from "./components/Notification";
import { NotificationProvider } from "./context/NotificationContext";
import { ActivityLogProvider } from "./context/ActivityLogContext";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./components/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ChangePasswordModal from "./components/ChangePasswordModal";
import NotificationsPage from "./components/NotificationsPage";
import StudentPortal from "./components/StudentPortal";
import AccountingPage from "./components/AccountingPage";
import ChangePassword from "./components/ChangePassword";
import { supabase } from "./supabase";

type PageId =
    | "home"
    | "reservations"
    | "chambres"
    | "clients"
    | "facturation"
    | "dossiers"
    | "services"
    | "users"
    | "history"
    | "performance"
    | "notifications"
    | "comptabilite";

type UserRole = "student" | "agent" | "admin" | "super_admin" | "user";

type MenuItem = {
    id: PageId;
    label: string;
    icon: ReactNode;
    badge?: string;
};

type MenuSection = {
    id: string;
    label: string;
    roles?: UserRole[];
    items: MenuItem[];
};

const pageDescriptions: Record<PageId, string> = {
    home: "Vue d'ensemble de la gestion des bourses",
    reservations: "Suivi des candidatures et demandes en cours",
    chambres: "Gestion des universités partenaires",
    clients: "Pilotage des étudiants et de leurs profils",
    facturation: "Gestion des frais et paiements associés",
    dossiers: "Suivi des dossiers de bourse",
    services: "Traitement des demandes de services",
    users: "Administration des comptes utilisateurs",
    history: "Historique des activités et actions",
    performance: "Indicateurs et performances de l'équipe",
    notifications: "Centre de notifications et alertes",
    comptabilite: "Suivi comptable et financier",
};

const pageComponents: Record<PageId, ReactNode> = {
    home: <ScholarshipDashboard />,
    reservations: <ApplicationManagement />,
    chambres: <UniversityManagement />,
    clients: <StudentManagement />,
    facturation: <ApplicationFeeManagement />,
    dossiers: <ScholarshipFileManagement />,
    services: <ServiceRequestManagement />,
    users: <UserManagement />,
    history: <ActivityHistory />,
    performance: <PerformanceHistory />,
    notifications: <NotificationsPage />,
    comptabilite: <AccountingPage />,
};

const iconClassName = "w-4 h-4 flex-shrink-0";

const menuSections: MenuSection[] = [
    {
        id: "pilotage",
        label: "Pilotage",
        items: [
            {
                id: "home",
                label: "Dashboard",
                icon: <LayoutDashboard className={iconClassName} />,
            },
            {
                id: "performance",
                label: "Performances",
                icon: <TrendingUp className={iconClassName} />,
            },
            {
                id: "notifications",
                label: "Notifications",
                badge: "3",
                icon: <Bell className={iconClassName} />,
            },
        ],
    },
    {
        id: "operations",
        label: "Opérations",
        items: [
            {
                id: "reservations",
                label: "Candidatures",
                icon: <FileClock className={iconClassName} />,
            },
            {
                id: "clients",
                label: "Étudiants",
                icon: <GraduationCap className={iconClassName} />,
            },
            {
                id: "dossiers",
                label: "Dossiers",
                icon: <FileArchive className={iconClassName} />,
            },
            {
                id: "services",
                label: "Demandes Services",
                icon: <BookOpenText className={iconClassName} />,
            },
        ],
    },
    {
        id: "ressources",
        label: "Ressources",
        items: [
            {
                id: "chambres",
                label: "Universités",
                icon: <Building2 className={iconClassName} />,
            },
            {
                id: "facturation",
                label: "Frais",
                icon: <WalletCards className={iconClassName} />,
            },
        ],
    },
    {
        id: "finance",
        label: "Finance",
        roles: ["agent", "admin", "super_admin"],
        items: [
            {
                id: "comptabilite",
                label: "Comptabilité",
                icon: <HandCoins className={iconClassName} />,
            },
        ],
    },
    {
        id: "administration",
        label: "Administration",
        roles: ["admin", "super_admin"],
        items: [
            {
                id: "users",
                label: "Utilisateurs",
                icon: <Users className={iconClassName} />,
            },
            {
                id: "history",
                label: "Historique",
                icon: <SquareChartGantt className={iconClassName} />,
            },
        ],
    },
];

function AppContent() {
    const [currentPage, setCurrentPage] = useState<PageId>("home");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { notifications, showNotification, removeNotification } = useNotification();
    const [user, setUser] = useState<any>(null);
    const [showLogin, setShowLogin] = useState(true);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showUserPasswordChange, setShowUserPasswordChange] = useState(false);

    const availableSections = useMemo(() => {
        return menuSections.filter((section) => {
            if (!section.roles) {
                return true;
            }

            return user?.role && section.roles.includes(user.role);
        });
    }, [user?.role]);

    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
        menuSections.reduce<Record<string, boolean>>((acc, section, index) => {
            acc[section.id] = index < 3;
            return acc;
        }, {}),
    );

    const currentSection = useMemo(() => {
        return availableSections.find((section) =>
            section.items.some((item) => item.id === currentPage),
        );
    }, [availableSections, currentPage]);

    const currentItem = useMemo(() => {
        return currentSection?.items.find((item) => item.id === currentPage);
    }, [currentPage, currentSection]);

    useEffect(() => {
        if (user && user.mustChangePassword) {
            setShowPasswordChange(true);
        } else {
            setShowPasswordChange(false);
        }
    }, [user]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const savedUser = localStorage.getItem("currentUser");
        if (!savedUser) {
            return;
        }

        try {
            setUser(JSON.parse(savedUser));
            setShowLogin(false);
        } catch {
            localStorage.removeItem("currentUser");
        }
    }, []);

    useEffect(() => {
        if (!currentSection) {
            return;
        }

        setOpenSections((prev) => ({
            ...prev,
            [currentSection.id]: true,
        }));
    }, [currentSection]);

    const toggleSection = (sectionId: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }));
    };

    const navigateToPage = (page: PageId) => {
        setCurrentPage(page);
        setIsMobileMenuOpen(false);
    };

    const logout = async () => {
        setUser(null);
        await supabase.auth.signOut();
        if (typeof window !== "undefined") {
            localStorage.removeItem("currentUser");
        }
        setShowLogin(true);
    };

    if (showLogin || !user) {
        return (
            <>
                <LoginPage
                    onLoginSuccess={(loggedUser) => {
                        setUser(loggedUser);
                        setShowLogin(false);
                    }}
                />
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
                <ChangePasswordModal
                    onPasswordChanged={() => {
                        setShowPasswordChange(false);
                        setUser((currentUser: any) =>
                            currentUser ? { ...currentUser, mustChangePassword: false } : currentUser,
                        );
                    }}
                />
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

    if (user?.role === "student") {
        return (
            <>
                <NotificationProvider showNotification={showNotification}>
                    <StudentPortal user={user} onLogout={logout} />
                </NotificationProvider>
                {notifications.map((notification, index) => (
                    <Notification
                        key={`student-notification-${notification.id}-${index}`}
                        message={notification.message}
                        type={notification.type}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </>
        );
    }

    return (
        <NotificationProvider showNotification={showNotification}>
        <div className="h-screen gradient-bg app-shell flex">
            <div className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-80 transition-transform duration-300 ease-in-out flex flex-col glass-sidebar sidebar-shell`}>
                <div className="sidebar-orb sidebar-orb-top" />
                <div className="sidebar-orb sidebar-orb-bottom" />

                <div className="relative flex items-start gap-3 px-5 py-5 border-b border-white/50">
                    <div className="sidebar-brand-mark">
                        <img src="/0.png" alt="Joda Company Logo" className="w-9 h-9 object-contain" />
                    </div>
                    <div className="min-w-0">
                        <p className="sidebar-eyebrow">Workspace Joda</p>
                        <h1 className="text-lg font-semibold text-slate-900 tracking-tight truncate">Joda Company</h1>
                        <p className="text-xs text-slate-500 truncate">Gestion des bourses et opérations</p>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.8)]" />
                            Système actif
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-5 overflow-y-auto">
                    <div className="space-y-3.5">
                        {availableSections.map((section) => {
                            const isOpen = openSections[section.id] ?? false;
                            const hasActiveItem = section.items.some((item) => item.id === currentPage);

                            return (
                                <div key={section.id} className="sidebar-section-card">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold rounded-[1.25rem] transition-all duration-300 ${
                                            hasActiveItem
                                                ? "text-slate-900 bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                                                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`sidebar-section-dot ${hasActiveItem ? "sidebar-section-dot-active" : ""}`} />
                                            <div className="text-left">
                                                <span className="block">{section.label}</span>
                                                <span className="text-[11px] font-medium text-slate-400">
                                                    {section.items.length} module{section.items.length > 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {isOpen && (
                                        <div className="px-2 pb-2 pt-1 space-y-1.5">
                                            {section.items.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => navigateToPage(item.id)}
                                                    className={`sidebar-item-button ${
                                                        currentPage === item.id
                                                            ? "sidebar-item-active"
                                                            : "sidebar-item-idle"
                                                    }`}
                                                >
                                                    <span className={`sidebar-item-icon ${currentPage === item.id ? "sidebar-item-icon-active" : ""}`}>
                                                        {item.icon}
                                                    </span>
                                                    <span className="truncate text-left">{item.label}</span>
                                                    {item.badge && (
                                                        <span className="ml-auto rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-white text-[11px] h-5 min-w-5 px-1.5 flex items-center justify-center shadow-[0_8px_20px_rgba(239,68,68,0.35)]">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </nav>

                <div className="border-t border-white/50 p-4">
                    <div className="sidebar-user-card">
                        <div className="flex items-center mb-4">
                            <div className="sidebar-user-avatar">
                                <span className="text-sm font-semibold text-slate-700">{user?.name?.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                                <p
                                    className={`mt-1 text-xs px-2 py-1 rounded-full inline-block ${
                                        user?.role === "super_admin"
                                            ? "bg-rose-100 text-rose-700"
                                            : user?.role === "admin"
                                              ? "bg-sky-100 text-sky-700"
                                              : "bg-emerald-100 text-emerald-700"
                                    }`}
                                >
                                    {user?.role === "super_admin"
                                        ? "Super Admin"
                                        : user?.role === "admin"
                                          ? "Admin"
                                          : "Utilisateur"}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <button
                                onClick={() => {
                                    setShowUserPasswordChange(true);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="sidebar-user-action text-slate-600 hover:text-slate-900"
                            >
                                <KeyRound className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                                Changer mot de passe
                            </button>
                            <button
                                onClick={() => {
                                    void logout();
                                    setShowLogin(true);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="sidebar-user-action text-rose-600 hover:text-rose-700"
                            >
                                <LogOut className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                            Déconnexion
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <header className="glass-header app-topbar px-5 py-3.5 sm:px-6 sm:py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-4"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">{currentItem?.label ?? "Dashboard"}</h1>
                                <p className="text-xs text-slate-500 sm:text-sm">{pageDescriptions[currentPage]}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="app-status-pill hidden md:flex">
                                <ShieldUser className="w-3.5 h-3.5 text-emerald-600" />
                                En ligne
                            </div>
                        </div>
                    </div>

                    <div className="app-breadcrumb mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <button
                            onClick={() => navigateToPage("home")}
                            className="app-breadcrumb-chip"
                        >
                            Accueil
                        </button>
                        {currentSection && (
                            <>
                                <span className="text-slate-300">/</span>
                                <button
                                    onClick={() => toggleSection(currentSection.id)}
                                    className="app-breadcrumb-chip"
                                >
                                    {currentSection.label}
                                </button>
                            </>
                        )}
                        {currentItem && currentPage !== "home" && (
                            <>
                                <span className="text-slate-300">/</span>
                                <span className="app-breadcrumb-current">{currentItem.label}</span>
                            </>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-auto gradient-bg app-main">
                    <div className="p-2 sm:p-6">
                        <ProtectedRoute requiredRole="user">
                            <div className="app-content-shell">
                                {pageComponents[currentPage]}
                            </div>
                        </ProtectedRoute>
                    </div>
                </main>
            </div>

            {notifications.map((notification, index) => (
                <Notification
                    key={`main-notification-${notification.id}-${index}`}
                    message={notification.message}
                    type={notification.type}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}

            {showUserPasswordChange && <ChangePassword onClose={() => setShowUserPasswordChange(false)} />}
        </div>
        </NotificationProvider>
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
