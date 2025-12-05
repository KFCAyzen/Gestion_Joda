"use client";

import { useState, useEffect } from 'react';

interface Notification {
    id: string;
    type: 'admin' | 'dossier' | 'paiement';
    title: string;
    message: string;
    date: string;
    read: boolean;
    priority?: 'high' | 'medium' | 'low';
}

export default function StudentNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'admin' | 'dossier' | 'paiement'>('all');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const currentUser = localStorage.getItem('currentUser');
            if (currentUser) {
                setUser(JSON.parse(currentUser));
            }
            loadNotifications();
        }
    }, []);

    const loadNotifications = () => {
        if (typeof window === 'undefined') return;

        const allNotifications: Notification[] = [];
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

        // Notifications administratives
        const adminNotifs = JSON.parse(localStorage.getItem('adminNotifications') || '[]');
        adminNotifs.forEach((notif: any) => {
            allNotifications.push({
                id: `admin-${notif.id}`,
                type: 'admin',
                title: notif.title,
                message: notif.message,
                date: notif.date,
                read: false,
                priority: notif.priority || 'medium'
            });
        });

        // Notifications de dossier
        const files = JSON.parse(localStorage.getItem('scholarshipFiles') || '[]');
        const studentFile = files.find((f: any) => f.studentName === currentUser.name);
        if (studentFile) {
            allNotifications.push({
                id: `file-${studentFile.id}`,
                type: 'dossier',
                title: 'Statut de votre dossier',
                message: `Votre dossier est actuellement: ${studentFile.status}`,
                date: studentFile.submissionDate || new Date().toISOString().split('T')[0],
                read: false,
                priority: studentFile.status === 'approved' ? 'high' : 'medium'
            });
        }

        // Notifications de paiement
        const payments = JSON.parse(localStorage.getItem('studentPayments') || '[]');
        const studentPayments = payments.filter((p: any) => p.studentName === currentUser.name);
        studentPayments.forEach((payment: any) => {
            if (payment.status === 'En attente' || payment.status === 'En retard') {
                const dueDate = new Date(payment.dueDate);
                const today = new Date();
                const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                allNotifications.push({
                    id: `payment-${payment.id}`,
                    type: 'paiement',
                    title: `Échéance de paiement - Tranche ${payment.tranche}`,
                    message: `Montant: ${payment.amount} FCFA. ${daysLeft > 0 ? `${daysLeft} jours restants` : 'Paiement en retard'}`,
                    date: payment.dueDate,
                    read: false,
                    priority: daysLeft <= 3 ? 'high' : 'medium'
                });
            }
        });

        // Trier par date (plus récent en premier)
        allNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setNotifications(allNotifications);
    };

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({...n, read: true})));
    };

    const filteredNotifications = filter === 'all' 
        ? notifications 
        : notifications.filter(n => n.type === filter);

    const unreadCount = notifications.filter(n => !n.read).length;

    const getTypeIcon = (type: string) => {
        switch(type) {
            case 'admin':
                return (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                );
            case 'dossier':
                return (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                );
            case 'paiement':
                return (
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                );
        }
    };

    const getTypeColor = (type: string) => {
        switch(type) {
            case 'admin': return 'bg-blue-100 text-blue-600';
            case 'dossier': return 'bg-green-100 text-green-600';
            case 'paiement': return 'bg-purple-100 text-purple-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getPriorityBadge = (priority?: string) => {
        if (!priority) return null;
        const colors = {
            high: 'bg-red-100 text-red-700',
            medium: 'bg-yellow-100 text-yellow-700',
            low: 'bg-gray-100 text-gray-700'
        };
        return (
            <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full ${colors[priority as keyof typeof colors]}`}>
                {priority === 'high' ? 'Urgent' : priority === 'medium' ? 'Important' : 'Info'}
            </span>
        );
    };

    return (
        <div className="p-4 sm:p-6 space-y-2 sm:space-y-3 md:space-y-4 sm:space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-3 sm:p-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-xs sm:text-xs sm:text-sm text-gray-600">
                        {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Aucune nouvelle notification'}
                    </p>
                </div>
                <button
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Tout marquer comme lu
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {[
                    { key: 'all', label: 'Toutes', count: notifications.length },
                    { key: 'admin', label: 'Annonces', count: notifications.filter(n => n.type === 'admin').length },
                    { key: 'dossier', label: 'Dossiers', count: notifications.filter(n => n.type === 'dossier').length },
                    { key: 'paiement', label: 'Paiements', count: notifications.filter(n => n.type === 'paiement').length }
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key as any)}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                            filter === f.key
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {f.label} ({f.count})
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-12">
                        <svg className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 sm:w-20 sm:h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-sm sm:text-base text-gray-500">Aucune notification</p>
                    </div>
                ) : (
                    filteredNotifications.map(notif => (
                        <div
                            key={notif.id}
                            onClick={() => markAsRead(notif.id)}
                            className={`p-3 sm:p-4 rounded-lg border transition-all cursor-pointer ${
                                notif.read
                                    ? 'bg-white border-gray-200'
                                    : 'bg-red-50 border-red-200 shadow-sm'
                            }`}
                        >
                            <div className="flex gap-2 sm:gap-3 sm:gap-3 sm:p-4">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getTypeColor(notif.type)}`}>
                                    {getTypeIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-1 sm:mb-2">
                                        <h3 className={`text-sm sm:text-base font-semibold ${notif.read ? 'text-gray-700' : 'text-gray-900'} truncate`}>
                                            {notif.title}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {getPriorityBadge(notif.priority)}
                                            {!notif.read && (
                                                <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0"></span>
                                            )}
                                        </div>
                                    </div>
                                    <p className={`text-xs sm:text-sm mb-2 ${notif.read ? 'text-gray-500' : 'text-gray-700'}`}>
                                        {notif.message}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {new Date(notif.date).toLocaleDateString('fr-FR', { 
                                            day: 'numeric', 
                                            month: 'long', 
                                            year: 'numeric' 
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
