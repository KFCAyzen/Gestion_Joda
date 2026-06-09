"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
    MessageSquareText,
    Newspaper,
    Settings2,
    ShieldUser,
    TrendingUp,
    UserCog,
    Users,
    WalletCards,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import type { Permission } from "../../types/permissions";
import { ThemeToggle } from "../../components/ThemeToggle";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import SyncStatusIndicator from "../../components/SyncStatusIndicator";
import { useNotification } from "../../hooks/useNotification";
import Notification from "../../components/Notification";
import { NotificationProvider } from "../../context/NotificationContext";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import ChangePassword from "../../components/ChangePassword";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { createClient } from "../../lib/supabase/client";
import type { UserRole } from "../../types/joda";

type RouteId =
    | "home"
    | "reservations"
    | "chambres"
    | "clients"
    | "facturation"
    | "dossiers"
    | "cours_langues"
    | "com"
    | "newsletter"
    | "users"
    | "performance"
    | "notifications"
    | "comptabilite"
    | "storage"
    | "activity_logs"
    | "fee_config"
    | "hr";

const ROUTES: Record<RouteId, string> = {
    home: "/tableau-de-bord",
    reservations: "/candidatures",
    chambres: "/universites",
    clients: "/etudiants",
    facturation: "/frais",
    dossiers: "/dossiers",
    cours_langues: "/cours-langues",
    com: "/communication",
    newsletter: "/newsletter",
    users: "/utilisateurs",
    performance: "/performances",
    notifications: "/notifications",
    comptabilite: "/comptabilite",
    storage: "/stockage",
    activity_logs: "/logs-activites",
    fee_config: "/configuration-frais",
    hr: "/rh",
};

const PAGE_DESCRIPTIONS: Record<RouteId, string> = {
    home: "Vue d'ensemble de la gestion des bourses",
    reservations: "Suivi des candidatures et demandes en cours",
    chambres: "Gestion des universités partenaires",
    clients: "Pilotage des étudiants et de leurs profils",
    facturation: "Gestion des frais et paiements associés",
    dossiers: "Suivi des dossiers de bourse",
    cours_langues: "Cours de Mandarin et d'Anglais pour étudiants",
    com: "Messagerie vers les étudiants",
    newsletter: "Campagnes email et relances automatiques",
    users: "Administration des comptes utilisateurs",
    performance: "Indicateurs et performances de l'équipe",
    notifications: "Centre de notifications et alertes",
    comptabilite: "Suivi comptable et financier",
    storage: "Monitoring du stockage et de la base de données",
    activity_logs: "Logs des activités sensibles des agents",
    fee_config: "Configuration des tranches, pénalités et délais",
    hr: "Gestion des ressources humaines",
};

type MenuItem = { id: RouteId; label: string; icon: ReactNode };
type MenuSection = { id: string; label: string; roles?: UserRole[]; items: MenuItem[] };

// Entrées de menu dont l'accès est régi par une permission granulaire. Si l'entrée
// y figure, sa visibilité dépend de la permission (et non plus du seul rôle de la
// section) — ce qui permet, p. ex., qu'un « comptable » explicitement autorisé voie
// la Comptabilité, ou que les Candidatures restent réservées aux comptes autorisés.
const ITEM_PERMISSIONS: Partial<Record<RouteId, Permission>> = {
    reservations: "applications.view",
    clients: "students.view",
    dossiers: "dossiers.view",
    chambres: "universities.view",
    facturation: "payments.view",
    comptabilite: "accounting.view",
    users: "users.view",
    activity_logs: "logs.view",
    storage: "storage.view",
};

const iconCls = "w-4 h-4 flex-shrink-0";

// Pastilles compteur sur les entrées de menu (nouveau / activité / attention).
type BadgeTone = "urgent" | "attention";
const BADGE_TONES: Record<BadgeTone, string> = {
    urgent: "bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.4)]",
    attention: "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_4px_12px_rgba(245,158,11,0.4)]",
};
// Dossiers (dossier_bourses) regroupés par phase pour distinguer les deux vues.
const CANDIDATURE_TODO_STATUSES = ["en_attente", "document_recu", "document_manquant"];
const DOSSIER_PENDING_STATUSES = ["en_cours", "en_attente_universite", "visa_en_cours"];


function AppShell({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, logout, loading } = useAuth();
    const { hasPermission } = usePermissions();
    const supabase = createClient();
    const t = useTranslations('layout');
    const tNav = useTranslations('nav');
    const { notifications, showNotification, removeNotification } = useNotification();
    const menuSections: MenuSection[] = useMemo(() => [
        {
            id: "pilotage",
            label: t('sections.pilotage'),
            items: [
                { id: "home", label: tNav('dashboard'), icon: <LayoutDashboard className={iconCls} /> },
                { id: "performance", label: tNav('performance'), icon: <TrendingUp className={iconCls} /> },
            ],
        },
        {
            id: "operations",
            label: t('sections.operations'),
            items: [
                { id: "reservations", label: tNav('applications'), icon: <FileClock className={iconCls} /> },
                { id: "clients", label: tNav('students'), icon: <GraduationCap className={iconCls} /> },
                { id: "dossiers", label: tNav('scholarshipFiles'), icon: <FileArchive className={iconCls} /> },
            ],
        },
        {
            id: "communication",
            label: t('sections.communication'),
            roles: ["agent", "supervisor", "admin", "super_admin"] as UserRole[],
            items: [
                { id: "com", label: tNav('com'), icon: <MessageSquareText className={iconCls} /> },
                { id: "newsletter", label: tNav('newsletter'), icon: <Newspaper className={iconCls} /> },
            ],
        },
        {
            id: "ressources",
            label: t('sections.ressources'),
            items: [
                { id: "chambres", label: tNav('universities'), icon: <Building2 className={iconCls} /> },
                { id: "facturation", label: tNav('fees'), icon: <WalletCards className={iconCls} /> },
                { id: "cours_langues", label: tNav('languageCourses'), icon: <BookOpen className={iconCls} /> },
            ],
        },
        {
            id: "finance",
            label: t('sections.finance'),
            roles: ["agent", "admin", "super_admin"] as UserRole[],
            items: [
                { id: "comptabilite", label: tNav('accounting'), icon: <HandCoins className={iconCls} /> },
            ],
        },
        {
            id: "rh",
            label: t('sections.hr'),
            roles: ["supervisor", "admin", "super_admin"] as UserRole[],
            items: [
                { id: "hr", label: tNav('hr'), icon: <UserCog className={iconCls} /> },
            ],
        },
        {
            id: "administration",
            label: t('sections.administration'),
            roles: ["admin", "super_admin"] as UserRole[],
            items: [
                { id: "users", label: tNav('users'), icon: <Users className={iconCls} /> },
                { id: "activity_logs", label: tNav('activityLogs'), icon: <FileClock className={iconCls} /> },
                { id: "fee_config", label: tNav('feeConfig'), icon: <Settings2 className={iconCls} /> },
            ],
        },
        {
            id: "systeme",
            label: t('sections.systeme'),
            roles: ["super_admin"] as UserRole[],
            items: [
                { id: "storage", label: tNav('storage'), icon: <Database className={iconCls} /> },
            ],
        },
    ], [t, tNav]);

    const PAGE_DESCRIPTIONS: Record<RouteId, string> = useMemo(() => ({
        home: t('descriptions.home'),
        reservations: t('descriptions.applications'),
        chambres: t('descriptions.universities'),
        clients: t('descriptions.students'),
        facturation: t('descriptions.fees'),
        dossiers: t('descriptions.scholarshipFiles'),
        cours_langues: t('descriptions.languageCourses'),
        com: t('descriptions.com'),
        newsletter: t('descriptions.newsletter'),
        users: t('descriptions.users'),
        performance: t('descriptions.performance'),
        notifications: t('descriptions.notifications'),
        comptabilite: t('descriptions.accounting'),
        storage: t('descriptions.storage'),
        activity_logs: t('descriptions.activityLogs'),
        fee_config: t('descriptions.feeConfig'),
        hr: t('descriptions.hr'),
    }), [t]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showUserPasswordChange, setShowUserPasswordChange] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [passwordJustChanged, setPasswordJustChanged] = useState(false);
    const [menuBadges, setMenuBadges] = useState<Partial<Record<RouteId, { count: number; tone: BadgeTone }>>>({});

    useEffect(() => {
        if (user?.role === "student") {
            router.replace("/etudiant");
        }
    }, [user, router]);

    useEffect(() => {
        if (!user) return;
        if (user.mustChangePassword && user.role !== "student" && !passwordJustChanged) {
            setShowPasswordChange(true);
        } else if (!user.mustChangePassword) {
            // Ferme le modal dès que le flag est effacé (ex : TOKEN_REFRESHED après clear-password-flag)
            setShowPasswordChange(false);
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

    // Compteurs « à traiter / en attente / en retard » pour les badges de menu.
    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            const [candidatures, dossiers, fraisRetard] = await Promise.all([
                supabase.from("dossier_bourses").select("id", { count: "exact", head: true }).in("status", CANDIDATURE_TODO_STATUSES),
                supabase.from("dossier_bourses").select("id", { count: "exact", head: true }).in("status", DOSSIER_PENDING_STATUSES),
                supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "retard"),
            ]);
            if (cancelled) return;
            const lateCount = fraisRetard.count ?? 0;
            setMenuBadges({
                reservations: { count: candidatures.count ?? 0, tone: "attention" },
                dossiers: { count: dossiers.count ?? 0, tone: "attention" },
                facturation: { count: lateCount, tone: "urgent" },
                comptabilite: { count: lateCount, tone: "urgent" },
            });
        })();
        return () => { cancelled = true; };
    }, [user, pathname]);

    const activeRouteId = useMemo<RouteId>(() => {
        const entry = Object.entries(ROUTES).find(
            ([, path]) => pathname.endsWith(path) || pathname.includes(`${path}/`)
        );
        return (entry?.[0] as RouteId) ?? "home";
    }, [pathname]);

    const availableSections = useMemo(() => {
        const roleOk = (section: MenuSection) =>
            !section.roles || (!!user?.role && section.roles.includes(user.role as UserRole));
        return menuSections
            .map((section) => ({
                ...section,
                items: section.items.filter((item) => {
                    const perm = ITEM_PERMISSIONS[item.id];
                    // Entrée régie par une permission : visible ssi l'utilisateur l'a
                    // (indépendamment du rôle de la section).
                    if (perm) return hasPermission(perm);
                    // Sinon : visibilité par le rôle de la section, comme avant.
                    return roleOk(section);
                }),
            }))
            .filter((section) => section.items.length > 0);
    }, [user?.role, menuSections, hasPermission]);

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

    // Au premier chargement des compteurs, déplie les sections qui contiennent un
    // badge pour que le signal reste visible (sans plier la main de l'utilisateur ensuite).
    const badgesExpandedRef = useRef(false);
    useEffect(() => {
        if (badgesExpandedRef.current) return;
        const flagged = (Object.entries(menuBadges) as [RouteId, { count: number; tone: BadgeTone }][])
            .filter(([, b]) => b.count > 0)
            .map(([id]) => id);
        if (flagged.length === 0) return;
        badgesExpandedRef.current = true;
        setOpenSections((prev) => {
            const next = { ...prev };
            menuSections.forEach((section) => {
                if (section.items.some((item) => flagged.includes(item.id))) next[section.id] = true;
            });
            return next;
        });
    }, [menuBadges, menuSections]);

    const navigateTo = (id: RouteId) => {
        router.push(ROUTES[id]);
        setIsMobileMenuOpen(false);
    };

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    // Les étudiants n'ont aucun accès à l'espace d'administration (app). On bloque
    // le rendu des pages internes (et donc tout écran « Accès refusé » transitoire)
    // tant que la redirection vers /etudiant n'a pas eu lieu.
    if (loading || !user || user.role === "student") {
        return (
            <div className="gradient-bg app-shell fixed inset-0 flex items-center justify-center">
                <div className="text-[var(--foreground)] text-base">{t('loading')}</div>
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

                <div className="relative flex items-start gap-3 px-5 py-5 border-b border-white/15">
                    <div className="sidebar-brand-mark">
                        <img src="/Logo.png" alt="Joda Company Logo" className="h-9 w-auto object-contain" />
                    </div>
                    <div className="min-w-0">
                        <p className="sidebar-eyebrow">{t('workspace')}</p>
                        <h1 className="text-lg font-semibold text-white tracking-tight truncate">{t('companyName')}</h1>
                        <p className="text-xs text-white/65 truncate">{t('companyDescription')}</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-5 overflow-y-auto">
                    <div className="space-y-1">
                        {availableSections.map((section, index) => {
                            const isOpen = openSections[section.id] ?? false;
                            const hasActive = section.items.some((item) => item.id === activeRouteId);
                            return (
                                <div key={section.id}>
                                {index > 0 && (
                                    <div className="flex items-center gap-2 py-1.5 px-1">
                                        <div className="h-px flex-1 bg-white/15" />
                                    </div>
                                )}
                                <div className="sidebar-section-card">
                                    <button
                                        onClick={() =>
                                            setOpenSections((prev) => ({
                                                ...prev,
                                                [section.id]: !prev[section.id],
                                            }))
                                        }
                                        data-testid={`sidebar-section-${section.id}`}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-widest transition-colors duration-200 ${
                                            hasActive
                                                ? "text-white rounded-r-lg border-l-[3px] border-white/80 bg-black/12"
                                                : "text-white/50 rounded-lg hover:text-white/80"
                                        }`}
                                    >
                                        <span>{section.label}</span>
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
                                                    data-testid={`nav-${item.id}`}
                                                    className={`sidebar-item-button ${
                                                        item.id === activeRouteId
                                                            ? "sidebar-item-active"
                                                            : "sidebar-item-idle"
                                                    }`}
                                                >
                                                    <span className="sidebar-item-icon">{item.icon}</span>
                                                    <span className="truncate text-left">{item.label}</span>
                                                    {(() => {
                                                        const badge = menuBadges[item.id];
                                                        if (!badge || badge.count <= 0) return null;
                                                        return (
                                                            <span
                                                                className={`ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${BADGE_TONES[badge.tone]}`}
                                                                data-testid={`nav-badge-${item.id}`}
                                                                aria-label={`${badge.count}`}
                                                            >
                                                                {badge.count > 99 ? "99+" : badge.count}
                                                            </span>
                                                        );
                                                    })()}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                </div>
                            );
                        })}
                    </div>
                </nav>

                <div className="border-t border-white/15 p-4">
                    <div className="sidebar-user-card">
                        <div className="flex items-center mb-4">
                            <div className="sidebar-user-avatar">
                                <span className="text-sm font-semibold text-white">{user.name?.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                                <p
                                    className={`mt-1 text-xs px-2 py-1 rounded-full inline-block ${
                                        user.role === "super_admin"
                                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                            : user.role === "admin"
                                              ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                    }`}
                                >
                                    {user.role === "super_admin"
                                        ? t('roles.super_admin')
                                        : user.role === "admin"
                                          ? t('roles.admin')
                                          : t('roles.user')}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <button
                                onClick={() => {
                                    setShowUserPasswordChange(true);
                                    setIsMobileMenuOpen(false);
                                }}
                                className="sidebar-user-action"
                            >
                                <KeyRound className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                                {t('changePassword')}
                            </button>
                            <button
                                onClick={() => void handleLogout()}
                                className="sidebar-user-action !text-rose-200 hover:!text-white"
                                data-testid="btn-logout"
                            >
                                <LogOut className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                                {t('logout')}
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
                                className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mr-4"
                                data-testid="mobile-menu-toggle"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h1
                                    className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight sm:text-2xl"
                                    data-testid="page-title"
                                >
                                    {activeItem?.label ?? "Dashboard"}
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                                    {PAGE_DESCRIPTIONS[activeRouteId]}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <SyncStatusIndicator />
                            <ThemeToggle />
                            <LanguageSwitcher />
                            <button
                                onClick={() => navigateTo("notifications")}
                                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                data-testid="btn-notifications"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span
                                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 text-[10px] font-bold text-white shadow-[0_4px_12px_rgba(239,68,68,0.4)]"
                                        data-testid="notif-badge"
                                    >
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </button>
                            <div className="app-status-pill hidden md:flex">
                                <ShieldUser className="w-3.5 h-3.5 text-emerald-600" />
                                {t('online')}
                            </div>
                        </div>
                    </div>

                    <div className="app-breadcrumb mt-3 flex flex-wrap items-center gap-2 text-sm">
                        <button onClick={() => navigateTo("home")} className="app-breadcrumb-chip">
                            {t('home')}
                        </button>
                        {activeSection && (
                            <>
                                <span className="text-slate-300 dark:text-slate-600">/</span>
                                <span className="app-breadcrumb-chip">{activeSection.label}</span>
                            </>
                        )}
                        {activeItem && activeRouteId !== "home" && (
                            <>
                                <span className="text-slate-300 dark:text-slate-600">/</span>
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
