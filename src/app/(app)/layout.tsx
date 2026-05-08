"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
    Bell,
    BookOpen,
    Building2,
    ChevronDown,
    Database,
    FileArchive,
    FileClock,
    GraduationCap,
    HandCoins,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Menu,
    ShieldUser,
    TrendingUp,
    Users,
    WalletCards,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../hooks/useNotification";
import Notification from "../components/Notification";
import { NotificationProvider } from "../context/NotificationContext";
import ChangePasswordModal from "../components/ChangePasswordModal";
import ChangePassword from "../components/ChangePassword";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { createClient } from "../lib/supabase/client";
import type { UserRole } from "../types/joda";

type RouteId =
    | "home"
    | "reservations"
    | "chambres"
    | "clients"
    | "facturation"
    | "dossiers"
    | "cours_langues"
    | "users"
    | "performance"
    | "notifications"
    | "comptabilite"
    | "storage"
    | "activity_logs";

const ROUTES: Record<RouteId, string> = {
    home: "/tableau-de-bord",
    reservations: "/candidatures",
    chambres: "/universites",
    clients: "/etudiants",
    facturation: "/frais",
    dossiers: "/dossiers",
    cours_langues: "/cours-langues",
    users: "/utilisateurs",
    performance: "/performances",
    notifications: "/notifications",
    comptabilite: "/comptabilite",
    storage: "/stockage",
    activity_logs: "/logs-activites",
};

const PAGE_DESCRIPTIONS: Record<RouteId, string> = {
    home: "Vue d'ensemble de la gestion des bourses",
    reservations: "Suivi des candidatures et demandes en cours",
    chambres: "Gestion des universités partenaires",
    clients: "Pilotage des étudiants et de leurs profils",
    facturation: "Gestion des frais et paiements associés",
    dossiers: "Suivi des dossiers de bourse",
    cours_langues: "Cours de Mandarin et d'Anglais pour étudiants",
    users: "Administration des comptes utilisateurs",
    performance: "Indicateurs et performances de l'équipe",
    notifications: "Centre de notifications et alertes",
    comptabilite: "Suivi comptable et financier",
    storage: "Monitoring du stockage et de la base de données",
    activity_logs: "Logs des activités sensibles des agents",
};

type MenuItem = { id: RouteId; label: string; icon: ReactNode };
type MenuSection = { id: string; label: string; roles?: UserRole[]; items: MenuItem[] };

const iconCls = "w-4 h-4 flex-shrink-0";

const menuSections: MenuSection[] = [
    {
        id: "pilotage",
        label: "Pilotage",
        items: [
            { id: "home", label: "Dashboard", icon: <LayoutDashboard className={iconCls} /> },
            { id: "performance", label: "Performances", icon: <TrendingUp className={iconCls} /> },
        ],
    },
    {
        id: "operations",
        label: "Opérations",
        items: [
            { id: "reservations", label: "Candidatures", icon: <FileClock className={iconCls} /> },
            { id: "clients", label: "Étudiants", icon: <GraduationCap className={iconCls} /> },
            { id: "dossiers", label: "Dossiers", icon: <FileArchive className={iconCls} /> },
        ],
    },
    {
        id: "ressources",
        label: "Ressources",
        items: [
            { id: "chambres", label: "Universités", icon: <Building2 className={iconCls} /> },
            { id: "facturation", label: "Frais", icon: <WalletCards className={iconCls} /> },
            { id: "cours_langues", label: "Cours de langues", icon: <BookOpen className={iconCls} /> },
        ],
    },
    {
        id: "finance",
        label: "Finance",
        roles: ["agent", "admin", "super_admin"] as UserRole[],
        items: [
            { id: "comptabilite", label: "Comptabilité", icon: <HandCoins className={iconCls} /> },
        ],
    },
    {
        id: "administration",
        label: "Administration",
        roles: ["admin", "super_admin"] as UserRole[],
        items: [
            { id: "users", label: "Utilisateurs", icon: <Users className={iconCls} /> },
            { id: "activity_logs", label: "Logs Activités", icon: <FileClock className={iconCls} /> },
        ],
    },
    {
        id: "systeme",
        label: "Système",
        roles: ["super_admin"] as UserRole[],
        items: [
            { id: "storage", label: "Stockage", icon: <Database className={iconCls} /> },
        ],
    },
];

function AppShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, loading } = useAuth();
    const supabase = createClient();
    const { notifications, showNotification, removeNotification } = useNotification();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showUserPasswordChange, setShowUserPasswordChange] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [passwordJustChanged, setPasswordJustChanged] = useState(false);

    useEffect(() => {
        if (user?.role === "student") {
            router.replace("/etudiant");
        }
    }, [user, router]);

    useEffect(() => {
        if (user?.mustChangePassword && user.role !== "student" && !passwordJustChanged) {
            setShowPasswordChange(true);
        }
    }, [user, passwordJustChanged]);

    useEffect(() => {
        if (!user) return;
        supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false)
            .then(({ count }) => setUnreadCount(count ?? 0));
    }, [user, pathname]);

    const activeRouteId = useMemo<RouteId>(() => {
        const entry = Object.entries(ROUTES).find(([, path]) => path === pathname);
        return (entry?.[0] as RouteId) ?? "home";
    }, [pathname]);

    const availableSections = useMemo(() => {
        return menuSections.filter((section) => {
            if (!section.roles) return true;
            return user?.role && section.roles.includes(user.role as UserRole);
        });
    }, [user?.role]);

    const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
        menuSections.reduce<Record<string, boolean>>((acc, section, index) => {
            acc[section.id] = index < 3;
            return acc;
        }, {})
    );

    const activeSection = useMemo(
        () => availableSections.find((s) => s.items.some((item) => item.id === activeRouteId)),
        [availableSections, activeRouteId]
    );

    const activeItem = useMemo(
        () => activeSection?.items.find((item) => item.id === activeRouteId),
        [activeSection, activeRouteId]
    );

    useEffect(() => {
        if (activeSection) {
            setOpenSections((prev) => ({ ...prev, [activeSection.id]: true }));
        }
    }, [activeSection]);

    const navigateTo = (id: RouteId) => {
        router.push(ROUTES[id]);
        setIsMobileMenuOpen(false);
    };

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    if (loading || !user) {
        return (
            <div className="fixed inset-0 bg-white flex items-center justify-center">
                <div className="text-slate-500 text-base">Chargement...</div>
            </div>
        );
    }

    if (showPasswordChange) {
        return (
            <>
                <ChangePasswordModal
                    onPasswordChanged={() => {
                        setPasswordJustChanged(true);
                        setShowPasswordChange(false);
                    }}
                />
                <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(100vw-2rem,24rem)] flex-col gap-3">
                    {notifications.map((n, i) => (
                        <div key={`pw-${n.id}-${i}`} className="pointer-events-auto">
                            <Notification
                                title={n.title}
                                message={n.message}
                                type={n.type}
                                onClose={() => removeNotification(n.id)}
                            />
                        </div>
                    ))}
                </div>
            </>
        );
    }

    return (
        <div className="h-screen gradient-bg app-shell flex">
            {/* Sidebar */}
            <div
                className={`${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-80 transition-transform duration-300 ease-in-out flex flex-col glass-sidebar sidebar-shell`}
            >
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
                            const hasActive = section.items.some((item) => item.id === activeRouteId);
                            return (
                                <div key={section.id} className="sidebar-section-card">
                                    <button
                                        onClick={() =>
                                            setOpenSections((prev) => ({
                                                ...prev,
                                                [section.id]: !prev[section.id],
                                            }))
                                        }
                                        className={`w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold rounded-[1.25rem] transition-all duration-300 ${
                                            hasActive
                                                ? "text-slate-900 bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                                                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`sidebar-section-dot ${hasActive ? "sidebar-section-dot-active" : ""}`} />
                                            <div className="text-left">
                                                <span className="block">{section.label}</span>
                                                <span className="text-[11px] font-medium text-slate-400">
                                                    {section.items.length} module{section.items.length > 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronDown
                                            className={`w-4 h-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>

                                    {isOpen && (
                                        <div className="px-2 pb-2 pt-1 space-y-1.5">
                                            {section.items.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => navigateTo(item.id)}
                                                    className={`sidebar-item-button ${
                                                        item.id === activeRouteId
                                                            ? "sidebar-item-active"
                                                            : "sidebar-item-idle"
                                                    }`}
                                                >
                                                    <span
                                                        className={`sidebar-item-icon ${
                                                            item.id === activeRouteId ? "sidebar-item-icon-active" : ""
                                                        }`}
                                                    >
                                                        {item.icon}
                                                    </span>
                                                    <span className="truncate text-left">{item.label}</span>
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
                                <span className="text-sm font-semibold text-slate-700">{user.name?.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                                <p
                                    className={`mt-1 text-xs px-2 py-1 rounded-full inline-block ${
                                        user.role === "super_admin"
                                            ? "bg-rose-100 text-rose-700"
                                            : user.role === "admin"
                                              ? "bg-sky-100 text-sky-700"
                                              : "bg-emerald-100 text-emerald-700"
                                    }`}
                                >
                                    {user.role === "super_admin"
                                        ? "Super Admin"
                                        : user.role === "admin"
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
                                onClick={() => void handleLogout()}
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
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
                                    {activeItem?.label ?? "Dashboard"}
                                </h1>
                                <p className="text-xs text-slate-500 sm:text-sm">
                                    {PAGE_DESCRIPTIONS[activeRouteId]}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigateTo("notifications")}
                                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-[10px] font-bold text-white shadow-[0_4px_12px_rgba(239,68,68,0.4)]">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </button>
                            <div className="app-status-pill hidden md:flex">
                                <ShieldUser className="w-3.5 h-3.5 text-emerald-600" />
                                En ligne
                            </div>
                        </div>
                    </div>

                    <div className="app-breadcrumb mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <button onClick={() => navigateTo("home")} className="app-breadcrumb-chip">
                            Accueil
                        </button>
                        {activeSection && (
                            <>
                                <span className="text-slate-300">/</span>
                                <span className="app-breadcrumb-chip">{activeSection.label}</span>
                            </>
                        )}
                        {activeItem && activeRouteId !== "home" && (
                            <>
                                <span className="text-slate-300">/</span>
                                <span className="app-breadcrumb-current">{activeItem.label}</span>
                            </>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-auto gradient-bg app-main">
                    <div className="p-2 sm:p-6">
                        <div className="app-content-shell">{children}</div>
                    </div>
                </main>
            </div>

            <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(100vw-2rem,24rem)] flex-col gap-3">
                {notifications.map((n, i) => (
                    <div key={`main-${n.id}-${i}`} className="pointer-events-auto">
                        <Notification
                            title={n.title}
                            message={n.message}
                            type={n.type}
                            onClose={() => removeNotification(n.id)}
                        />
                    </div>
                ))}
            </div>

            {showUserPasswordChange && (
                <ChangePassword onClose={() => setShowUserPasswordChange(false)} />
            )}
        </div>
    );
}

export default function AppLayout({ children }: { children: ReactNode }) {
    const { notifications, showNotification, removeNotification } = useNotification();
    return (
        <ErrorBoundary>
            <NotificationProvider showNotification={showNotification}>
                <AppShell>{children}</AppShell>
            </NotificationProvider>
        </ErrorBoundary>
    );
}
