import { useState } from "react";
import { buildNotification, NotificationPayload, NotificationType } from "../lib/feedback";

interface NotificationState {
    id: number;
    title?: string;
    message: string;
    type: NotificationType;
}

export const useNotification = () => {
    const [notifications, setNotifications] = useState<NotificationState[]>([]);

    const showNotification = (input: string | NotificationPayload, type: NotificationType = "info") => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const notification = buildNotification(input, type);
        setNotifications((prev) => [...prev, { id, ...notification }]);
    };

    const removeNotification = (id: number) => {
        setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    };

    return {
        notifications,
        showNotification,
        removeNotification,
    };
};
