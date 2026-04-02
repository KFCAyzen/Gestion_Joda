"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import { supabase } from '../supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface DbUser {
    id: string;
    username: string;
    email: string;
    role: string;
    name: string;
    must_change_password: boolean;
    created_at: string;
}

export default function UserManagement() {
    const { user: currentUser, canCreateRole, canDeleteUser } = useAuth();
    const [activeTab, setActiveTab] = useState('users');
    const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        password: 'Temp123!',
        role: 'student'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (data) setDbUsers(data);
        } catch (err) {
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: { data: { username: formData.username, name: formData.name, role: formData.role } }
            });

            if (authError) { setError(authError.message); return; }

            if (data.user) {
                const { error: dbError } = await supabase.from('users').insert({
                    id: data.user.id,
                    email: formData.email,
                    username: formData.username,
                    name: formData.name,
                    role: formData.role,
                    password_hash: 'managed_by_supabase_auth',
                    must_change_password: false
                });

                if (dbError) { setError(dbError.message); return; }
                setSuccess('Utilisateur créé!');
                setFormData({ username: '', name: '', email: '', password: 'Temp123!', role: 'student' });
                loadUsers();
            }
        } catch (err: any) { setError(err.message); }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            const { error } = await supabase.from('users').delete().eq('id', userId);
            if (error) setError(error.message);
            else { setSuccess('Utilisateur supprimé'); loadUsers(); }
        } catch (err: any) { setError(err.message); }
        setUserToDelete(null);
    };

    const rolePermissions: Record<string, string[]> = {
        'super_admin': ['Accès complet', 'Gestion utilisateurs', 'Configuration'],
        'admin': [' Gestion modules', 'Rapports'],
        'agent': ['Gestion dossiers', 'Paiements', 'Suivi étudiants'],
        'student': ['Consultation', 'Paiements', 'Documents']
    };

    const getRoleLabel = (role: string) => ({
        'super_admin': 'Super Admin', 'admin': 'Admin', 'agent': 'Agent', 'student': 'Étudiant'
    }[role] || role);

    return (
        <ProtectedRoute requiredRole="admin">
            <div className="p-4 sm:p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                    Gestion des Utilisateurs
                </h1>

                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border">
                    <div className="border-b">
                        <nav className="flex flex-col sm:flex-row">
                            {['users', 'permissions', 'create'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 sm:px-6 py-3 font-medium text-sm ${
                                        activeTab === tab ? 'border-b-2' : 'text-gray-600'
                                    }`}
                                    style={{borderColor: activeTab === tab ? '#dc2626' : 'transparent'}}
                                >
                                    {tab === 'users' ? `Utilisateurs (${dbUsers.length})` : tab === 'permissions' ? 'Permissions' : 'Créer'}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-4 sm:p-6">
                        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
                        {success && <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>}

                        {activeTab === 'users' && (
                            loading ? <div className="text-center py-8">Chargement...</div> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Rôle</TableHead><TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {dbUsers.map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell><div className="font-medium">{u.name}</div><div className="text-sm text-gray-500">@{u.username}</div></TableCell>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell><Badge variant={u.role === 'super_admin' || u.role === 'admin' ? 'destructive' : 'default'}>{getRoleLabel(u.role)}</Badge></TableCell>
                                                <TableCell>
                                                    {currentUser?.role === 'super_admin' && u.id !== currentUser.id && (
                                                        <Button variant="destructive" size="sm" onClick={() => setUserToDelete(u.id)}>Supprimer</Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )
                        )}

                        {activeTab === 'permissions' && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {Object.entries(rolePermissions).map(([role, perms]) => (
                                    <Card key={role}>
                                        <CardHeader><CardTitle>{getRoleLabel(role)}</CardTitle></CardHeader>
                                        <CardContent>
                                            <ul className="space-y-2">
                                                {perms.map((p, i) => <li key={i} className="flex items-center gap-2"><span className="text-green-500">✓</span>{p}</li>)}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {activeTab === 'create' && (
                            <form onSubmit={handleCreateUser} className="max-w-md space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nom d'utilisateur *</label>
                                    <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="nom_utilisateur" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Nom complet *</label>
                                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nom Prénom" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email *</label>
                                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@exemple.com" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rôle *</label>
                                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 border rounded-lg">
                                        <option value="student">Étudiant</option>
                                        <option value="agent">Agent</option>
                                        {currentUser?.role === 'super_admin' && <option value="admin">Admin</option>}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Mot de passe *</label>
                                    <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
                                </div>
                                <Button type="submit" className="w-full">Créer l'utilisateur</Button>
                            </form>
                        )}
                    </div>
                </div>

                {userToDelete && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg max-w-sm">
                            <h3 className="text-lg font-semibold mb-4">Confirmer la suppression</h3>
                            <p className="mb-4">Voulez-vous supprimer cet utilisateur?</p>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setUserToDelete(null)}>Annuler</Button>
                                <Button variant="destructive" onClick={() => handleDeleteUser(userToDelete)}>Supprimer</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}