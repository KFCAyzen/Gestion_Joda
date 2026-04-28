"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Student {
    id: string;
    nom: string;
    prenom: string;
    email?: string;
}

interface University {
    id: string;
    nom: string;
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
    const { showNotification } = useNotificationContext();
    const [showForm, setShowForm] = useState(false);
    const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [formData, setFormData] = useState({
        studentId: "",
        universityId: "",
        desiredProgram: "",
        studyLevel: "Licence",
        languageLevel: "HSK 3",
        scholarshipType: "Complete",
        applicationFee: "",
    });

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [applicationsRes, studentsRes, universitiesRes] = await Promise.all([
                supabase.from("dossier_bourses").select("*").order("created_at", { ascending: false }),
                supabase.from("students").select("id, nom, prenom, email"),
                supabase.from("universities").select("id, nom, active").eq("active", true),
            ]);

            setApplications(applicationsRes.data || []);
            setStudents(studentsRes.data || []);
            setUniversities(universitiesRes.data || []);
        } catch (error) {
            console.warn("Erreur chargement données:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveApplication = async () => {
        if (!formData.studentId || !formData.universityId || !formData.desiredProgram) {
            showNotification("Veuillez remplir tous les champs obligatoires", "error");
            return;
        }

        try {
            const { data: dossier, error } = await supabase.from("dossier_bourses").insert({
                student_id: formData.studentId,
                status: "document_manquant",
                desired_program: formData.desiredProgram,
                study_level: formData.studyLevel,
                language_level: formData.languageLevel,
                scholarship_type: formData.scholarshipType,
                notes_internes: `Programme: ${formData.desiredProgram}, Niveau: ${formData.studyLevel}, Langue: ${formData.languageLevel}, Bourse: ${formData.scholarshipType}`,
                university_id: formData.universityId,
                assigned_to: user?.id,
            }).select().single();

            if (!error && dossier) {
                // Récupérer l'user_id de l'étudiant pour la notif
                const { data: studentUser } = await supabase
                    .from("students")
                    .select("created_by")
                    .eq("id", formData.studentId)
                    .single();

                const university = universities.find(u => u.id === formData.universityId);
                const student = students.find(s => s.id === formData.studentId);

                if (studentUser?.created_by) {
                    await supabase.from("notifications").insert({
                        user_id: studentUser.created_by,
                        type: "mise_a_jour_dossier",
                        titre: "Nouvelle candidature créée",
                        message: `Votre dossier de candidature pour ${university?.nom || "une université"} (${formData.desiredProgram}) a été ouvert. Veuillez uploader vos documents pour faire avancer votre dossier.`,
                        read: false,
                    });
                }

                if (student?.email) {
                    fetch("/api/send-application", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            studentName: `${student.prenom} ${student.nom}`,
                            studentEmail: student.email,
                            universityName: university?.nom,
                            desiredProgram: formData.desiredProgram,
                            studyLevel: formData.studyLevel,
                            scholarshipType: formData.scholarshipType,
                        }),
                    }).catch(err => console.warn("Email candidature:", err));
                }

                showNotification("Candidature enregistrée avec succès !", "success");
                setShowForm(false);
                setFormData({
                    studentId: "",
                    universityId: "",
                    desiredProgram: "",
                    studyLevel: "Licence",
                    languageLevel: "HSK 3",
                    scholarshipType: "Complete",
                    applicationFee: "",
                });
                await loadData();
            } else if (error) {
                showNotification("Erreur lors de l'enregistrement", "error");
            }
        } catch (error) {
            showNotification("Erreur lors de l'enregistrement", "error");
        }
    };

    const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
        await supabase.from("dossier_bourses").update({ status: newStatus }).eq("id", applicationId);
        loadData();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "admission_validee":
                return "bg-green-100 text-green-800";
            case "en_cours":
                return "bg-blue-100 text-blue-800";
            case "admission_rejetee":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "document_recu":
                return "Document reçu";
            case "en_attente":
                return "En attente";
            case "en_cours":
                return "En cours";
            case "document_manquant":
                return "En attente de documents";
            case "admission_validee":
                return "Acceptée";
            case "admission_rejetee":
                return "Refusée";
            case "en_attente_universite":
                return "En attente université";
            case "visa_en_cours":
                return "Visa en cours";
            case "termine":
                return "Terminé";
            default:
                return status;
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
                    <p className="text-slate-600">Chargement des candidatures...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Pipeline admissions
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                        Gestion des Candidatures de Bourses
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Crée, visualise et fais progresser les dossiers de candidature.
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} style={{ backgroundColor: "#dc2626" }}>
                    Nouvelle Candidature
                </Button>
            </div>

            {showForm && (
                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader>
                        <CardTitle style={{ color: "#dc2626" }}>Nouvelle Candidature de Bourse</CardTitle>
                        <CardDescription>
                            Renseigne les informations essentielles pour ouvrir un nouveau dossier.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Étudiant *</Label>
                                <Select value={formData.studentId || ""} onValueChange={(v) => setFormData({ ...formData, studentId: v || "" })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un étudiant">
                                            {formData.studentId
                                                ? (() => { const s = students.find(s => s.id === formData.studentId); return s ? `${s.prenom} ${s.nom}` : "Sélectionner un étudiant"; })()
                                                : "Sélectionner un étudiant"}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.prenom} {s.nom}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Université *</Label>
                                <Select value={formData.universityId || ""} onValueChange={(v) => setFormData({ ...formData, universityId: v || "" })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner une université">
                                            {formData.universityId
                                                ? (() => { const u = universities.find(u => u.id === formData.universityId); return u ? u.nom : "Sélectionner une université"; })()
                                                : "Sélectionner une université"}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {universities.map((u) => (
                                            <SelectItem key={u.id} value={u.id}>{u.nom}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Programme souhaité *</Label>
                                <Input
                                    placeholder="Programme souhaité"
                                    value={formData.desiredProgram}
                                    onChange={(e) => setFormData({ ...formData, desiredProgram: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Niveau d'études</Label>
                                <Select value={formData.studyLevel || "Licence"} onValueChange={(v) => setFormData({ ...formData, studyLevel: v || "Licence" })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Licence">Licence</SelectItem>
                                        <SelectItem value="Master">Master</SelectItem>
                                        <SelectItem value="Doctorat">Doctorat</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Niveau chinois</Label>
                                <Select value={formData.languageLevel || "HSK 3"} onValueChange={(v) => setFormData({ ...formData, languageLevel: v || "HSK 3" })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Debutant">Débutant</SelectItem>
                                        <SelectItem value="HSK 1">HSK 1</SelectItem>
                                        <SelectItem value="HSK 2">HSK 2</SelectItem>
                                        <SelectItem value="HSK 3">HSK 3</SelectItem>
                                        <SelectItem value="HSK 4">HSK 4</SelectItem>
                                        <SelectItem value="HSK 5">HSK 5</SelectItem>
                                        <SelectItem value="HSK 6">HSK 6</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Type de bourse</Label>
                                <Select value={formData.scholarshipType || "Complete"} onValueChange={(v) => setFormData({ ...formData, scholarshipType: v || "Complete" })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Complete">Bourse complète</SelectItem>
                                        <SelectItem value="Partielle">Bourse partielle</SelectItem>
                                        <SelectItem value="Aucune">Aucune bourse</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button onClick={handleSaveApplication} style={{ backgroundColor: "#dc2626" }}>
                                Enregistrer
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>
                                Annuler
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="joda-surface border-0 shadow-none">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Liste des Candidatures ({applications.length})</CardTitle>
                        <Button variant="outline" onClick={loadData}>Actualiser</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {applications.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-slate-500">Aucune candidature pour le moment</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {applications.map((application) => {
                                const student = students.find((s) => s.id === application.student_id);
                                const university = universities.find((u) => u.id === application.university_id);

                                return (
                                    <div key={application.id} className="joda-surface-muted p-4">
                                        <div className="mb-4 flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-slate-800">
                                                    {student ? `${student.prenom} ${student.nom}` : "Étudiant"}
                                                </h3>
                                                <p className="text-sm text-slate-600">
                                                    {university?.nom || "Université"}
                                                </p>
                                            </div>
                                            <Badge className={getStatusColor(application.status)}>
                                                {getStatusLabel(application.status)}
                                            </Badge>
                                        </div>

                                        <div className="mb-4 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600">Date:</span>
                                                <span className="font-medium">
                                                    {application.created_at ? new Date(application.created_at).toLocaleDateString("fr-FR") : "-"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Select value={application.status} onValueChange={(v) => updateApplicationStatus(application.id, v || application.status)}>
                                                <SelectTrigger className="w-[180px] text-xs font-medium"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="document_recu">Document reçu</SelectItem>
                                                    <SelectItem value="en_attente">En attente</SelectItem>
                                                    <SelectItem value="en_cours">En cours</SelectItem>
                                                    <SelectItem value="document_manquant">Document manquant</SelectItem>
                                                    <SelectItem value="admission_validee">Acceptée</SelectItem>
                                                    <SelectItem value="admission_rejetee">Refusée</SelectItem>
                                                    <SelectItem value="termine">Terminé</SelectItem>
                                                </SelectContent>
                                            </Select>
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
