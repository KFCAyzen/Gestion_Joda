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

interface Student {
    id: string;
    nom: string;
    prenom: string;
}

interface University {
    id: string;
    nom: string;
    code: string;
    active: boolean;
}

interface ScholarshipApplication {
    id: string;
    student_id: string;
    student_name: string;
    university_id: string;
    university_name: string;
    desired_program: string;
    study_level: string;
    language_level: string;
    scholarship_type: string;
    application_fee: number;
    application_date: string;
    status: string;
    created_by: string;
    created_at: string;
}

export default function ApplicationManagement() {
    const { user } = useAuth();
    const [showForm, setShowForm] = useState(false);
    const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [formData, setFormData] = useState({
        studentId: '',
        universityId: '',
        desiredProgram: '',
        studyLevel: 'Licence',
        languageLevel: 'HSK 3',
        scholarshipType: 'Complète',
        applicationFee: ''
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [applicationsRes, studentsRes, universitiesRes] = await Promise.all([
                supabase.from('dossier_bourses').select('*').order('created_at', { ascending: false }),
                supabase.from('students').select('id, nom, prenom'),
                supabase.from('universities').select('id, nom, code, active').eq('active', true)
            ]);

            setApplications(applicationsRes.data || []);
            setStudents(studentsRes.data || []);
            setUniversities(universitiesRes.data || []);
        } catch (error) {
            console.warn('Erreur chargement données:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const generateApplicationId = () => {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `APP${timestamp}${random}`;
    };

    const handleSaveApplication = async () => {
        if (!formData.studentId || !formData.universityId || !formData.desiredProgram) {
            alert("Veuillez remplir tous les champs obligatoires");
            return;
        }

        try {
            const selectedStudent = students.find(s => s.id === formData.studentId);
            const selectedUniversity = universities.find(u => u.id === formData.universityId);

            if (!selectedStudent || !selectedUniversity) {
                alert("Étudiant ou université introuvable");
                return;
            }

            const { error } = await supabase.from('dossier_bourses').insert({
                id: generateApplicationId(),
                student_id: formData.studentId,
                status: 'document_recu',
                notes_internes: `Programme: ${formData.desiredProgram}, Niveau: ${formData.studyLevel}, Langue: ${formData.languageLevel}, Bourse: ${formData.scholarshipType}`,
                university_id: formData.universityId,
                assigned_to: user?.id
            });

            if (!error) {
                alert("Candidature enregistrée avec succès!");
                setShowForm(false);
                setFormData({
                    studentId: '',
                    universityId: '',
                    desiredProgram: '',
                    studyLevel: 'Licence',
                    languageLevel: 'HSK 3',
                    scholarshipType: 'Complète',
                    applicationFee: ''
                });
                await loadData();
            }
        } catch (error) {
            alert("Erreur lors de l'enregistrement");
        }
    };

    const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
        await supabase.from('dossier_bourses').update({ status: newStatus }).eq('id', applicationId);
        loadData();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'admission_validee': return 'bg-green-100 text-green-800';
            case 'en_cours': return 'bg-blue-100 text-blue-800';
            case 'admission_rejetee': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'document_recu': return 'Document reçu';
            case 'en_attente': return 'En attente';
            case 'en_cours': return 'En cours';
            case 'document_manquant': return 'Document manquant';
            case 'admission_validee': return 'Acceptée';
            case 'admission_rejetee': return 'Refusée';
            case 'en_attente_universite': return 'En attente université';
            case 'visa_en_cours': return 'Visa en cours';
            case 'termine': return 'Terminé';
            default: return status;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Chargement des candidatures...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6" style={{color: '#dc2626'}}>
                Gestion des Candidatures de Bourses
            </h1>
            
            <div className="mb-4">
                <Button onClick={() => setShowForm(true)} style={{backgroundColor: '#dc2626'}}>
                    Nouvelle Candidature
                </Button>
            </div>
            
            {showForm && (
                <Card className="mb-4">
                    <CardHeader>
                        <CardTitle style={{color: '#dc2626'}}>Nouvelle Candidature de Bourse</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Étudiant *</Label>
                                <select
                                    value={formData.studentId}
                                    onChange={(e) => setFormData({...formData, studentId: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                >
                                    <option value="">Sélectionner un étudiant</option>
                                    {students.map(student => (
                                        <option key={student.id} value={student.id}>
                                            {student.prenom} {student.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Université *</Label>
                                <select
                                    value={formData.universityId}
                                    onChange={(e) => setFormData({...formData, universityId: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                >
                                    <option value="">Sélectionner une université</option>
                                    {universities.map(university => (
                                        <option key={university.id} value={university.id}>
                                            {university.nom} ({university.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Programme souhaité *</Label>
                                <Input 
                                    placeholder="Programme souhaité" 
                                    value={formData.desiredProgram}
                                    onChange={(e) => setFormData({...formData, desiredProgram: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Niveau d'études</Label>
                                <select
                                    value={formData.studyLevel}
                                    onChange={(e) => setFormData({...formData, studyLevel: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                >
                                    <option value="Licence">Licence</option>
                                    <option value="Master">Master</option>
                                    <option value="Doctorat">Doctorat</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Niveau chinois</Label>
                                <select
                                    value={formData.languageLevel}
                                    onChange={(e) => setFormData({...formData, languageLevel: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                >
                                    <option value="Débutant">Débutant</option>
                                    <option value="HSK 1">HSK 1</option>
                                    <option value="HSK 2">HSK 2</option>
                                    <option value="HSK 3">HSK 3</option>
                                    <option value="HSK 4">HSK 4</option>
                                    <option value="HSK 5">HSK 5</option>
                                    <option value="HSK 6">HSK 6</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{color: '#dc2626'}}>Type de bourse</Label>
                                <select
                                    value={formData.scholarshipType}
                                    onChange={(e) => setFormData({...formData, scholarshipType: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                >
                                    <option value="Complète">Bourse complète</option>
                                    <option value="Partielle">Bourse partielle</option>
                                    <option value="Aucune">Aucune bourse</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button onClick={handleSaveApplication} style={{backgroundColor: '#dc2626'}}>
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
                        <CardTitle>Liste des Candidatures ({applications.length})</CardTitle>
                        <Button variant="outline" onClick={loadData}>Actualiser</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {applications.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-slate-500">Aucune candidature pour le moment</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {applications.map((application) => {
                                const student = students.find(s => s.id === application.student_id);
                                const university = universities.find(u => u.id === application.university_id);
                                
                                return (
                                    <div key={application.id} className="border rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="font-semibold text-slate-800">
                                                    {student ? `${student.prenom} ${student.nom}` : 'Étudiant'}
                                                </h3>
                                                <p className="text-sm text-slate-600">
                                                    {university?.nom || 'Université'} ({university?.code})
                                                </p>
                                            </div>
                                            <Badge className={getStatusColor(application.status)}>
                                                {getStatusLabel(application.status)}
                                            </Badge>
                                        </div>
                                        
                                        <div className="space-y-2 mb-4 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Date:</span>
                                                <span className="font-medium">
                                                    {application.created_at ? new Date(application.created_at).toLocaleDateString('fr-FR') : '-'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <select
                                                value={application.status}
                                                onChange={(e) => updateApplicationStatus(application.id, e.target.value)}
                                                className="text-xs font-medium px-2 py-1 rounded border"
                                            >
                                                <option value="document_recu">Document reçu</option>
                                                <option value="en_attente">En attente</option>
                                                <option value="en_cours">En cours</option>
                                                <option value="document_manquant">Document manquant</option>
                                                <option value="admission_validee">Acceptée</option>
                                                <option value="admission_rejetee">Refusée</option>
                                                <option value="termine">Terminé</option>
                                            </select>
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
