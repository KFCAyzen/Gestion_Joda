"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface ActivityLog {
    id: string;
    userId: string;
    username: string;
    action: string;
    module: 'clients' | 'reservations' | 'bills' | 'rooms' | 'users' | 'applicationFees' | 'applications' | 'students' | 'universities';
    details: string;
    timestamp: string;
    data?: any;
}

interface ActivityLogContextType {
    logs: ActivityLog[];
    addLog: (action: string, module: ActivityLog['module'], details: string, data?: any) => void;
    getUserLogs: (userId: string) => ActivityLog[];
    getModuleLogs: (module: ActivityLog['module']) => ActivityLog[];
}

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

export function ActivityLogProvider({ children }: { children: ReactNode }) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        const savedLogs = localStorage.getItem('activityLogs');
        if (savedLogs) {
            setLogs(JSON.parse(savedLogs));
        }
    }, []);

    const addLog = (action: string, module: ActivityLog['module'], details: string, data?: any) => {
        if (!user) return;

        const newLog: ActivityLog = {
            id: Date.now().toString(),
            userId: user.id,
            username: user.username,
            action,
            module,
            details,
            timestamp: new Date().toISOString(),
            data
        };

        const updatedLogs = [newLog, ...logs].slice(0, 1000); // Garder seulement les 1000 derniers logs
        setLogs(updatedLogs);
        localStorage.setItem('activityLogs', JSON.stringify(updatedLogs));
    };

    const getUserLogs = (userId: string) => {
        return logs.filter(log => log.userId === userId);
    };

    const getModuleLogs = (module: ActivityLog['module']) => {
        return logs.filter(log => log.module === module);
    };

    return (
        <ActivityLogContext.Provider value={{ logs, addLog, getUserLogs, getModuleLogs }}>
            {children}
        </ActivityLogContext.Provider>
    );
}

export function useActivityLog() {
    const context = useContext(ActivityLogContext);
    if (context === undefined) {
        throw new Error('useActivityLog must be used within an ActivityLogProvider');
    }
    return context;
}