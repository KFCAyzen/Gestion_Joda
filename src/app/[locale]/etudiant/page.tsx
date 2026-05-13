"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import StudentPortal from "../../components/StudentPortal";
import { useNotification } from "../../hooks/useNotification";
import Notification from "../../components/Notification";
import { NotificationProvider } from "../../context/NotificationContext";

function StudentPortalPage() {
    const router = useRouter();
    const { user, logout, loading } = useAuth();
    const { notifications, showNotification, removeNotification } = useNotification();

    useEffect(() => {
        if (!loading && user && user.role !== "student") {
            router.replace("/tableau-de-bord");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="student-shell fixed inset-0 flex items-center justify-center">
                <div className="text-[var(--student-fg-muted)] text-base">Chargement...</div>
            </div>
        );
    }

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    return (
        <NotificationProvider showNotification={showNotification}>
            <StudentPortal user={user} onLogout={handleLogout} />
            <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(100vw-2rem,24rem)] flex-col gap-3">
                {notifications.map((n, i) => (
                    <div key={`student-${n.id}-${i}`} className="pointer-events-auto">
                        <Notification
                            title={n.title}
                            message={n.message}
                            type={n.type}
                            onClose={() => removeNotification(n.id)}
                        />
                    </div>
                ))}
            </div>
        </NotificationProvider>
    );
}

export default StudentPortalPage;
