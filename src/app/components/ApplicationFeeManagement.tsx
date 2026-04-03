"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../utils/formatPrice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ApplicationFee {
    id: string;
    student_id: string;
    montant: number;
    motif: string;
    date: string;
    type: string;
    tranche: number;
    status: string;
    created_by: string;
    created_at: string;
}

interface Student {
    id: string;
    nom: string;
    prenom: string;
}

const MOTIFS = ['Inscription', 'Frais de dossier', 'Cours de langue', 'Autre'];

export default function ApplicationFeeManagement() {
    const { user } = useAuth();
    const [fees, setFees] = useState<ApplicationFee[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const [formData, setFormData] = useState({
        studentId: '',
        amount: '',
        motif: 'Inscription',
        date: new Date().toISOString().split('T')[0]
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [feesRes, studentsRes] = await Promise.all([
                supabase.from('payments').select('*').order('created_at', { ascending: false }),
                supabase.from('students').select('id, nom, prenom')
            ]);

            setFees(feesRes.data || []);
            setStudents(studentsRes.data || []);
        } catch (error) {
            console.warn('Erreur chargement données:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const generateFeeId = () => {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.random().toString(36).substring(2, 3).toUpperCase();
        return `FEE${timestamp}${random}`;
    };

    const handleSaveFee = async () => {
        if (!formData.studentId || !formData.amount) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }

        try {
            const { error } = await supabase.from('payments').insert({
                id: generateFeeId(),
                student_id: formData.studentId,
                montant: parseInt(formData.amount),
                type: 'bourse',
                tranche: 1,
                status: 'paye',
                date_limite: formData.date,
                date_paiement: formData.date,
                validated_by: user?.id,
                validated_at: new Date().toISOString()
            });

            if (!error) {
                alert("Frais enregistrés avec succès!");
                setShowForm(false);
                setFormData({
                    studentId: '',
                    amount: '',
                    motif: 'Inscription',
                    date: new Date().toISOString().split('T')[0]
                });
                await loadData();
            }
        } catch (error) {
            alert("Erreur lors de l'enregistrement");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paye': return 'bg-green-100 text-green-800';
            case 'attente': return 'bg-yellow-100 text-yellow-800';
            case 'retard': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paye': return 'Payé';
            case 'attente': return 'En attente';
            case 'retard': return 'En retard';
            default: return status;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement des frais...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                Gestion des Frais de Candidature
            </h1>
            
            <div className="mb-4">
                <Button onClick={() => setShowForm(true)} style={{backgroundColor: '#dc2626'}}>
                    Nouveau Paiement
                </Button>
            </div>
            
            {showForm && (
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle style={{color: '#dc2626'}}>Nouveau Paiement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Étudiant *</Label>
                                <Select value={formData.studentId || ''} onValueChange={(value) => setFormData({...formData, studentId: value || ''})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un étudiant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map(student => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.prenom} {student.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Montant (FCFA) *</Label>
                                <Input 
                                    type="number"
                                    placeholder="Montant" 
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Motif</Label>
                                <Select value={formData.motif || MOTIFS[0]} onValueChange={(value) => setFormData({...formData, motif: value || MOTIFS[0]})}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MOTIFS.map(motif => (
                                            <SelectItem key={motif} value={motif}>{motif}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Date</Label>
                                <Input 
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button onClick={handleSaveFee} style={{backgroundColor: '#dc2626'}}>
                                Enregistrer
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>
                                Annuler
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Liste des Paiements ({fees.length})</CardTitle>
                        <Button variant="outline" onClick={loadData}>Actualiser</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {fees.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">Aucun paiement pour le moment</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {fees.map((fee) => {
                                const student = students.find(s => s.id === fee.student_id);
                                
                                return (
                                    <div key={fee.id} className="border rounded-lg p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800">
                                                {student ? `${student.prenom} ${student.nom}` : 'Étudiant'}
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                {fee.date ? new Date(fee.date).toLocaleDateString('fr-FR') : '-'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold" style={{color: '#dc2626'}}>
                                                {formatPrice(fee.montant?.toString() || '0')}
                                            </p>
                                            <Badge className={getStatusColor(fee.status)}>
                                                {getStatusLabel(fee.status)}
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
