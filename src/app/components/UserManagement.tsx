"use client";

import { useState } from 'react';

import ProtectedRoute from './ProtectedRoute';
import { useActivityLog } from '../context/ActivityLogContext';

export default function UserManagement() {
    
    const { addLog } = useActivityLog();
    const [activeTab, setActiveTab] = useState('permissions');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        role: 'user' as 'admin' | 'user'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    const rolePermissions = {
        'super_admin': [
            'Accès complet au système',
            'Gestion des utilisateurs',
            'Configuration système',
            'Sauvegarde et restauration',
            'Tous les modules (Dashboard, Réservations, Chambres, Clients, Facturation)'
        ],
        'admin': [
            'Gestion des réservations',
            'Gestion des chambres',
            'Gestion des clients',
            'Génération de rapports',
            'Accès aux modules principaux'
        ],
        'user': [
            'Consultation du dashboard',
            'Création de réservations',
            'Consultation des clients',
            'Impression des reçus'
        ]
    };

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                    Gestion des Utilisateurs
                </h1>

                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200">
                    <div className="border-b border-slate-200">
                        <nav className="flex flex-col sm:flex-row">
                            <button
                                onClick={() => setActiveTab('permissions')}
                                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base ${
                                    activeTab === 'permissions'
                                        ? 'border-b-2 text-blue-600'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                                style={{borderColor: activeTab === 'permissions' ? '#dc2626' : 'transparent'}}
                            >
                                Permissions
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base ${
                                    activeTab === 'users'
                                        ? 'border-b-2 text-blue-600'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                                style={{borderColor: activeTab === 'users' ? '#dc2626' : 'transparent'}}
                            >
                                Utilisateurs
                            </button>
                            <button
                                onClick={() => setActiveTab('create')}
                                className={`px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base ${
                                    activeTab === 'create'
                                        ? 'border-b-2 text-blue-600'
                                        : 'text-slate-600 hover:text-slate-800'
                                }`}
                                style={{borderColor: activeTab === 'create' ? '#dc2626' : 'transparent'}}
                            >
                                Créer Utilisateur
                            </button>
                        </nav>
                    </div>

                    <div className="p-4 sm:p-6">
                        {!canCreateRole('user') && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                                <p className="text-gray-800 text-sm sm:text-base">Vous n'avez pas les permissions pour créer des utilisateurs.</p>
                            </div>
                        )}
                        {activeTab === 'permissions' && (
                            <div className="space-y-2 sm:space-y-3 md:space-y-4 sm:space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6">
                                <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                                    Niveaux de Permissions
                                </h2>
                                
                                <div className="grid gap-4 sm:gap-6">
                                    {Object.entries(rolePermissions).map(([role, permissions]) => (
                                        <div key={role} className="border rounded-lg p-3 sm:p-3 sm:p-4">
                                            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3" style={{color: '#dc2626'}}>
                                                {role === 'super_admin' ? 'Super Administrateur' :
                                                 role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                                            </h3>
                                            <ul className="space-y-1 sm:space-y-2">
                                                {permissions.map((permission, index) => (
                                                    <li key={index} className="flex items-start gap-2">
                                                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        <span className="text-slate-700 text-sm sm:text-base">{permission}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-2 sm:space-y-3 md:space-y-4 sm:space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6">
                                <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                                    Comptes Utilisateurs ({users.length})
                                </h2>
                                
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-3 sm:p-4">
                                    <h3 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Comptes par Défaut</h3>
                                    <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                                        <div><strong>Admin:</strong> admin / admin123</div>
                                        <div><strong>Utilisateur:</strong> user / user123</div>
                                    </div>
                                </div>

                                <div className="space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4">
                                    {users.map((u, index) => (
                                        <div key={`user-${u.id}-${index}-${u.username}`} className="border rounded-lg p-3 sm:p-3 sm:p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                        <div>
                                                            <h4 className="font-semibold text-sm sm:text-base">{u.name}</h4>
                                                            <p className="text-xs sm:text-sm text-slate-600">@{u.username}</p>
                                                        </div>
                                                        {u.mustChangePassword && (
                                                            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs self-start">
                                                                Mot de passe à changer
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${
                                                        u.role === 'super_admin' ? 'bg-red-100 text-red-800 sm:text-red-800 text-red-800' :
                                                        u.role === 'admin' ? 'bg-red-100 text-red-800 sm:text-red-800 text-red-800' :
                                                        'bg-green-100 text-green-800 sm:text-green-800 text-red-800'
                                                    }`}>
                                                        {u.role === 'super_admin' ? 'Super Admin' :
                                                         u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                                                    </span>
                                                    {canResetPassword(u) && (
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm(`Réinitialiser le mot de passe de ${u.name} ? Le nouveau mot de passe sera : temp123`)) {
                                                                    const success = await resetUserPassword(u.id);
                                                                    if (success) {
                                                                        addLog('Réinitialisation mot de passe', 'users', `Mot de passe réinitialisé pour: ${u.name} (@${u.username})`);
                                                                        setSuccess(`Mot de passe réinitialisé pour ${u.name}. Nouveau mot de passe : temp123`);
                                                                        setError('');
                                                                    } else {
                                                                        setError('Erreur lors de la réinitialisation du mot de passe');
                                                                        setSuccess('');
                                                                    }
                                                                }
                                                            }}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Réinitialiser le mot de passe"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {canDeleteUser(u) && (
                                                        <button
                                                            onClick={() => setUserToDelete(u.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Supprimer l'utilisateur"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'create' && (
                            <div className="space-y-2 sm:space-y-3 md:space-y-4 sm:space-y-3 sm:space-y-2 sm:space-y-3 md:space-y-4 md:space-y-6">
                                <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
                                    Créer un Nouvel Utilisateur
                                </h2>
                                
                                {(error || success) && (
                                    <div className={`border rounded-lg p-3 sm:p-4 text-sm sm:text-base ${
                                        error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
                                    }`}>
                                        {error || success}
                                    </div>
                                )}
                                
                                <div className="bg-white border rounded-lg p-4 sm:p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 sm:p-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{color: '#dc2626'}}>
                                                Nom d'utilisateur *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.username}
                                                onChange={(e) => setFormData({...formData, username: e.target.value})}
                                                className="w-full p-3 border rounded-lg"
                                                style={{borderColor: '#dc2626'}}
                                                placeholder="nom_utilisateur"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{color: '#dc2626'}}>
                                                Nom complet *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full p-3 border rounded-lg"
                                                style={{borderColor: '#dc2626'}}
                                                placeholder="Nom Prénom"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium mb-2" style={{color: '#dc2626'}}>
                                                Rôle *
                                            </label>
                                            <select
                                                value={formData.role}
                                                onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'user'})}
                                                className="w-full p-3 border rounded-lg"
                                                style={{borderColor: '#dc2626'}}
                                            >
                                                <option value="user">Utilisateur</option>
                                                {user?.role === 'super_admin' && (
                                                    <option value="admin">Administrateur</option>
                                                )}
                                            </select>
                                        </div>
                                        
                                        <div className="sm:col-span-2">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-3 sm:p-4">
                                                <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Mot de passe par défaut</h4>
                                                <p className="text-xs sm:text-sm text-blue-700">
                                                    L'utilisateur recevra le mot de passe temporaire : <strong>temp123</strong>
                                                </p>
                                                <p className="text-xs text-blue-600 mt-1">
                                                    Il devra le changer lors de sa première connexion.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 sm:gap-3 sm:p-4">
                                        <button
                                            onClick={async () => {
                                                setError('');
                                                setSuccess('');
                                                
                                                if (!formData.username || !formData.name) {
                                                    setError('Le nom d\'utilisateur et le nom complet sont obligatoires');
                                                    return;
                                                }
                                                
                                                const success = await createUser({
                                                    username: formData.username,
                                                    name: formData.name,
                                                    role: formData.role
                                                });
                                                
                                                if (success) {
                                                    addLog('Création utilisateur', 'users', `Utilisateur créé: ${formData.name} (@${formData.username}) - Rôle: ${formData.role}`);
                                                    setSuccess('Utilisateur créé avec succès! Mot de passe temporaire : temp123');
                                                    setFormData({
                                                        username: '',
                                                        name: '',
                                                        role: 'user'
                                                    });
                                                } else {
                                                    setError('Erreur: nom d\'utilisateur déjà existant ou permissions insuffisantes');
                                                }
                                            }}
                                            className="px-4 sm:px-6 py-3 text-white rounded-lg hover:opacity-90 text-sm sm:text-base font-medium"
                                            style={{backgroundColor: '#dc2626'}}
                                        >
                                            Créer l'utilisateur
                                        </button>
                                        
                                        <button
                                            onClick={() => {
                                                setFormData({
                                                    username: '',
                                                    name: '',
                                                    role: 'user'
                                                });
                                                setError('');
                                                setSuccess('');
                                            }}
                                            className="px-4 sm:px-6 py-3 border rounded-lg hover:bg-gray-50 text-sm sm:text-base font-medium"
                                            style={{borderColor: '#dc2626', color: '#dc2626'}}
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal de confirmation de suppression */}
                {userToDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
                        <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-md">
                            <div className="text-center mb-4 sm:mb-6">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 sm:w-8 sm:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">
                                    Confirmer la suppression
                                </h3>
                                <p className="text-slate-600 text-sm sm:text-base">
                                    Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{users.find(u => u.id === userToDelete)?.name}</strong> ?
                                </p>
                                <p className="text-xs sm:text-sm text-red-600 mt-2">
                                    Cette action est irréversible.
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setUserToDelete(null)}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
                                    style={{borderColor: '#dc2626', color: '#dc2626'}}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={async () => {
                                        const userToDeleteData = users.find(u => u.id === userToDelete);
                                        const success = await deleteUser(userToDelete);
                                        if (success && userToDeleteData) {
                                            addLog('Suppression utilisateur', 'users', `Utilisateur supprimé: ${userToDeleteData.name} (@${userToDeleteData.username})`);
                                            setSuccess('Utilisateur supprimé avec succès');
                                            setError('');
                                        } else {
                                            setError('Erreur lors de la suppression');
                                            setSuccess('');
                                        }
                                        setUserToDelete(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}