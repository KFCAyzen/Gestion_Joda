"use client";

import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import EmployeeDetail from "@/app/components/rh/EmployeeDetail";
import { useAuth } from "@/app/context/AuthContext";
import { useNotificationContext } from "@/app/context/NotificationContext";
import { getFriendlyErrorMessage } from "@/app/lib/feedback";

export default function EmployeeDetailPage() {
    const params = useParams();
    const rawId = params?.id;
    const employeeId = Array.isArray(rawId) ? rawId[0] : (rawId ?? "");
    const router = useRouter();
    const { user } = useAuth();
    const { showNotification } = useNotificationContext();

    return (
        <ProtectedRoute requiredRole="supervisor">
            <EmployeeDetail
                employeeId={employeeId}
                onBack={() => router.push("/rh")}
                creatorId={user?.id ?? ""}
                onError={(e) => showNotification(getFriendlyErrorMessage(e), "error")}
                onSuccess={(msg) => showNotification(msg, "success")}
            />
        </ProtectedRoute>
    );
}
