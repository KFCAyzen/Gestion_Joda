"use client";

import { useState } from 'react';
import { useActivityLog } from '../context/ActivityLogContext';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import LoadingSpinner from './LoadingSpinner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ActivityHistory() {
    const { logs, getUserLogs, getModuleLogs } = useActivityLog();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('all');
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedModule, setSelectedModule] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('fr-FR');
    };

    const getActionIcon = (module: string) => {
        switch (module) {
            case 'clients':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                );
            case 'reservations':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                );
            case 'bills':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            case 'rooms':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                );
            case 'users':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    const getFilteredLogs = () => {
        let filteredLogs = logs;

        if (activeTab === 'user' && selectedUser) {
            filteredLogs = getUserLogs(selectedUser);
        } else if (activeTab === 'module' && selectedModule) {
            filteredLogs = getModuleLogs(selectedModule as any);
        }

        return filteredLogs.slice(0, 100);
    };

    const tabs = [
        { id: 'all', label: 'Toutes les activités' },
        { id: 'user', label: 'Par utilisateur' },
        { id: 'module', label: 'Par module' }
    ];

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                    Historique des Activités
                </h1>

                <Card>
                    <CardHeader className="border-b">
                        <nav className="flex flex-col sm:flex-row">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setIsLoading(true);
                                        setTimeout(() => setIsLoading(false), 500);
                                    }}
                                    className={`px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base ${
                                        activeTab === tab.id
                                            ? 'border-b-2 text-blue-600'
                                            : 'text-slate-600 hover:text-slate-800'
                                    }`}
                                    style={{borderColor: activeTab === tab.id ? '#dc2626' : 'transparent'}}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3">
                            {activeTab === 'user' && (
                                <Select value={selectedUser} onValueChange={(value) => setSelectedUser(value || '')}>
                                    <SelectTrigger className="w-full sm:w-[250px]">
                                        <SelectValue placeholder="Sélectionner un utilisateur" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="user">User</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                            
                            {activeTab === 'module' && (
                                <Select value={selectedModule} onValueChange={(value) => setSelectedModule(value || '')}>
                                    <SelectTrigger className="w-full sm:w-[250px]">
                                        <SelectValue placeholder="Sélectionner un module" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="clients">Clients</SelectItem>
                                        <SelectItem value="reservations">Réservations</SelectItem>
                                        <SelectItem value="bills">Factures</SelectItem>
                                        <SelectItem value="rooms">Chambres</SelectItem>
                                        <SelectItem value="users">Utilisateurs</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {isLoading ? (
                            <LoadingSpinner size="md" text="Chargement des activités..." />
                        ) : (
                            <div className="space-y-3">
                                {getFilteredLogs().map((log, index) => (
                                    <div key={`log-${log.id}-${index}`} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                        <div className="mt-1 text-slate-600">
                                            {getActionIcon(log.module)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-800">{log.action}</p>
                                            <p className="text-xs text-slate-500">
                                                {log.username} • {log.module} • {formatTimestamp(log.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {getFilteredLogs().length === 0 && (
                                    <p className="text-center text-slate-500 py-8">Aucune activité trouvée</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
