"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import StudentPortal from "../components/StudentPortal";
import { useNotification } from "../hooks/useNotification";
import Notification from "../components/Notification";
import { NotificationProvider } from "../context/NotificationContext";

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
            <div className="fixed inset-0 bg-white flex items-center justify-center">
                <div className="text-slate-500 text-base">Chargement...</div>
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
            {notifications.map((n, i) => (
                <Notification
                    key={`student-${n.id}-${i}`}
                    message={n.message}
                    type={n.type}
                    onClose={() => removeNotification(n.id)}
                />
            ))}
        </NotificationProvider>
    );
}

export default StudentPortalPage;
