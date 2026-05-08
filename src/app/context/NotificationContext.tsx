"use client";

import { createContext, useContext, ReactNode } from 'react';
import { NotificationPayload, NotificationType } from "../lib/feedback";

interface NotificationContextType {
    showNotification: (input: string | NotificationPayload, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationContext must be used within NotificationProvider');
    }
    return context;
};

interface NotificationProviderProps {
    children: ReactNode;
    showNotification: (input: string | NotificationPayload, type?: NotificationType) => void;
}

export const NotificationProvider = ({ children, showNotification }: NotificationProviderProps) => {
    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
        </NotificationContext.Provider>
    );
};
