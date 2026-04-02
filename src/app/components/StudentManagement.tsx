"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Student {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    age: number;
    sexe: string;
    niveau: string;
    filiere: string;
    langue: string;
    diplome_acquis: string;
    choix: string;
    created_by: string;
    created_at: string;
}

export default function StudentManagement() {
    const { user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        age: '',
        sexe: 'M',
        niveau: '',
        filiere: '',
        langue: '',
        diplome_acquis: '',
        choix: 'procedure_seule'
    });

    const loadStudents = async () => {
        setLoading(true);
        try {
            let query = supabase.from('students').select('*').order('created_at', { ascending: false });
            
            // Les étudiants ne voient que leurs propres données
            if (user?.role === 'student') {
                query = query.eq('created_by', user.id);
            }
            
            const { data, error } = await query;
            if (data) setStudents(data);
        } catch (err) {
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStudents(); }, [user?.role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const studentData = {
            ...formData,
            age: parseInt(formData.age) || 0,
            created_by: user?.id
        };

        try {
            if (editingStudent) {
                const { error } = await supabase
                    .from('students')
                    .update(studentData)
                    .eq('id', editingStudent.id);
                
                if (!error) {
                    setEditingStudent(null);
                    loadStudents();
                }
            } else {
                const { error } = await supabase.from('students').insert(studentData);
                if (!error) loadStudents();
            }
            resetForm();
        } catch (err) {
            console.error('Erreur:', err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (!error) loadStudents();
        } catch (err) {
            console.error('Erreur:', err);
        }
    };

    const resetForm = () => {
        setFormData({
            nom: '', prenom: '', email: '', telephone: '', age: '', sexe: 'M',
            niveau: '', filiere: '', langue: '', diplome_acquis: '', choix: 'procedure_seole'
        });
        setEditingStudent(null);
        setActiveTab('list');
    };

    const canEdit = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'agent';

    return (
        <ProtectedRoute requiredRole="agent">
            <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{color: '#dc2626'}}>
                        Gestion des Étudiants
                    </h1>
                    {canEdit && (
                        <Button onClick={() => setActiveTab('form')}>
                            + Ajouter
                        </Button>
                    )}
                </div>

                {activeTab === 'list' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Liste des Étudiants ({students.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-8">Chargement...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nom</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Téléphone</TableHead>
                                            <TableHead>Niveau</TableHead>
                                            <TableHead>Formation</TableHead>
                                            {canEdit && <TableHead>Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map(s => (
                                            <TableRow key={s.id}>
                                                <TableCell>
                                                    <div className="font-medium">{s.prenom} {s.nom}</div>
                                                    <div className="text-sm text-gray-500">{s.sexe === 'M' ? 'Homme' : 'Femme'}</div>
                                                </TableCell>
                                                <TableCell>{s.email}</TableCell>
                                                <TableCell>{s.telephone}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{s.niveau}</Badge>
                                                </TableCell>
                                                <TableCell>{s.filiere}</TableCell>
                                                {canEdit && (
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingStudent(s);
                                                                    setFormData({
                                                                        nom: s.nom,
                                                                        prenom: s.prenom,
                                                                        email: s.email,
                                                                        telephone: s.telephone,
                                                                        age: s.age.toString(),
                                                                        sexe: s.sexe,
                                                                        niveau: s.niveau,
                                                                        filiere: s.filiere,
                                                                        langue: s.langue,
                                                                        diplome_acquis: s.diplome_acquis,
                                                                        choix: s.choix
                                                                    });
                                                                    setActiveTab('form');
                                                                }}
                                                            >
                                                                Modifier
                                                            </Button>
                                                            <Button 
                                                                variant="destructive" 
                                                                size="sm"
                                                                onClick={() => handleDelete(s.id)}
                                                            >
                                                                Supprimer
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'form' && (
                    <Card className="max-w-2xl">
                        <CardHeader>
                            <CardTitle>{editingStudent ? 'Modifier' : 'Ajouter'} un Étudiant</CardTitle>
                            <CardDescription>
                                Les champs marqués * sont obligatoires
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="prenom">Prénom *</Label>
                                        <Input 
                                            id="prenom"
                                            value={formData.prenom} 
                                            onChange={e => setFormData({...formData, prenom: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="nom">Nom *</Label>
                                        <Input 
                                            id="nom"
                                            value={formData.nom} 
                                            onChange={e => setFormData({...formData, nom: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input 
                                            id="email"
                                            type="email"
                                            value={formData.email} 
                                            onChange={e => setFormData({...formData, email: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="telephone">Téléphone *</Label>
                                        <Input 
                                            id="telephone"
                                            value={formData.telephone} 
                                            onChange={e => setFormData({...formData, telephone: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="age">Âge *</Label>
                                        <Input 
                                            id="age"
                                            type="number"
                                            value={formData.age} 
                                            onChange={e => setFormData({...formData, age: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="sexe">Sexe *</Label>
                                        <select 
                                            id="sexe"
                                            value={formData.sexe} 
                                            onChange={e => setFormData({...formData, sexe: e.target.value})}
                                            className="w-full p-2 border rounded-md"
                                        >
                                            <option value="M">Homme</option>
                                            <option value="F">Femme</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="niveau">Niveau d'études *</Label>
                                        <Input 
                                            id="niveau"
                                            value={formData.niveau} 
                                            onChange={e => setFormData({...formData, niveau: e.target.value})} 
                                            placeholder="Bac+2, Master..."
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="filiere">Filière *</Label>
                                        <Input 
                                            id="filiere"
                                            value={formData.filiere} 
                                            onChange={e => setFormData({...formData, filiere: e.target.value})} 
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="diplome">Diplôme acquis</Label>
                                        <Input 
                                            id="diplome"
                                            value={formData.diplome_acquis} 
                                            onChange={e => setFormData({...formData, diplome_acquis: e.target.value})} 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="langue">Langue préférée</Label>
                                        <Input 
                                            id="langue"
                                            value={formData.langue} 
                                            onChange={e => setFormData({...formData, langue: e.target.value})} 
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="choix">Choix de procedure</Label>
                                        <select 
                                            id="choix"
                                            value={formData.choix} 
                                            onChange={e => setFormData({...formData, choix: e.target.value})}
                                            className="w-full p-2 border rounded-md"
                                        >
                                            <option value="procedure_seule">Procedure seule</option>
                                            <option value="procedure_cours">Procedure + Cours</option>
                                            <option value="cours_seuls">Cours seuls</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-4">
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        Annuler
                                    </Button>
                                    <Button type="submit">
                                        {editingStudent ? 'Enregistrer' : 'Ajouter'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </ProtectedRoute>
    );
}