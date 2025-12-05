"use client";

import { useState } from 'react';

import { useActivityLog } from '../context/ActivityLogContext';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import LoadingSpinner from './LoadingSpinner';

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

        // Filtrer selon les permissions (si nécessaire)
        // Note: users array should be loaded from context or props if needed

        return filteredLogs.slice(0, 100); // Limiter à 100 entrées
    };

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                    Historique des Activités
                </h1>

                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200">
                    <div className="border-b border-slate-200">
                        <nav className="flex flex-col sm:flex-row">
                            <button
                                onClick={() => {setActiveTab('all'); setIsLoading(true); setTimeout(() => setIsLoading(false), 500);}}
                                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base ${
                                    activeTab === 'all'
                                        ? 'border-b-2 text-blue-600'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                                style={{borderColor: activeTab === 'all' ? '#dc2626' : 'transparent'}}
                            >
                                Toutes les activités
                            </button>
                            <button
                                onClick={() => {setActiveTab('user'); setIsLoading(true); setTimeout(() => setIsLoading(false), 500);}}
                                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base ${
                                    activeTab === 'user'
                                        ? 'border-b-2 text-blue-600'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                                style={{borderColor: activeTab === 'user' ? '#dc2626' : 'transparent'}}
                            >
                                Par utilisateur
                            </button>
                            <button
                                onClick={() => {setActiveTab('module'); setIsLoading(true); setTimeout(() => setIsLoading(false), 500);}}
                                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base ${
                                    activeTab === 'module'
                                        ? 'border-b-2 text-blue-600'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                                style={{borderColor: activeTab === 'module' ? '#dc2626' : 'transparent'}}
                            >
                                Par module
                            </button>
                        </nav>
                    </div>

                    <div className="p-4 sm:p-6">
                        {/* Filtres */}
                        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:gap-3 sm:p-4">
                            {activeTab === 'user' && (
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base"
                                    style={{borderColor: '#dc2626'}}
                                >
                                    <option value="">Sélectionner un utilisateur</option>
                                    {/* Users list should be loaded from Firebase if needed */}
                                </select>
                            )}
                            
                            {activeTab === 'module' && (
                                <select
                                    value={selectedModule}
                                    onChange={(e) => setSelectedModule(e.target.value)}
                                    className="px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base"
                                    style={{borderColor: '#dc2626'}}
                                >
                                    <option value="">Sélectionner un module</option>
                                    <option value="clients">Clients</option>
                                    <option value="reservations">Réservations</option>
                                    <option value="bills">Factures</option>
                                    <option value="rooms">Chambres</option>
                                    <option value="users">Utilisateurs</option>
                                </select>
                            )}
                        </div>

                        {/* Liste des activités */}
                        {isLoading ? (
                            <LoadingSpinner size="md" text="Chargement des activités..." />
                        ) : (
                        <div className="space-y-2 sm:space-y-3">
                            {getFilteredLogs().length === 0 ? (
                                <div className="text-center py-8 sm:py-12">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-5 h-5 sm:w-6 sm:h-6 sm:w-8 sm:h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-slate-500 text-base sm:text-lg font-medium">Aucune activité trouvée</p>
                                </div>
                            ) : (
                                getFilteredLogs().map((log, index) => (
                                    <div key={`log-${log.id}-${index}-${log.timestamp}`} className="border rounded-lg p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-2 sm:gap-3">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                                                {getActionIcon(log.module)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                                    <span className="font-semibold text-slate-800 text-sm sm:text-base">{log.action}</span>
                                                    <span className="bg-slate-100 text-slate-600 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs self-start">
                                                        {log.module}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 text-xs sm:text-sm mb-2 break-words">{log.details}</p>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500">
                                                    <span className="truncate">Par: {log.username}</span>
                                                    <span className="text-xs">{formatTimestamp(log.timestamp)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        )}

                        {!isLoading && getFilteredLogs().length >= 100 && (
                            <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-slate-500">
                                Affichage des 100 activités les plus récentes
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}