"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import {
    buildStudentAuthEmail,
    buildStudentUsername,
    generateTemporaryPassword,
} from "../lib/student-auth";
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

const emptyFormData = {
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    age: "",
    sexe: "M",
    niveau: "",
    filiere: "",
    langue: "",
    diplome_acquis: "",
    choix: "procedure_seule",
};

export default function StudentManagement() {
    const { user } = useAuth();
    const [localUser, setLocalUser] = useState<{ id: string; role: string } | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"list" | "form">("list");
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [createdAccount, setCreatedAccount] = useState<{ username: string; password: string } | null>(null);
    const [submitError, setSubmitError] = useState("");
    const [operationMessage, setOperationMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [genderFilter, setGenderFilter] = useState("all");
    const [formData, setFormData] = useState(emptyFormData);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const savedUser = localStorage.getItem("currentUser");
        if (!savedUser) {
            setLocalUser(null);
            return;
        }

        try {
            setLocalUser(JSON.parse(savedUser));
        } catch {
            localStorage.removeItem("currentUser");
            setLocalUser(null);
        }
    }, []);

    const currentUser = user || localUser;

    const loadStudents = async () => {
        setLoading(true);
        try {
            let query = supabase.from("students").select("*").order("created_at", { ascending: false });

            if (currentUser?.role === "student" && currentUser?.id) {
                query = query.eq("created_by", currentUser.id);
            }

            const { data } = await query;
            if (data) {
                setStudents(data);
            }
        } catch (err) {
            console.error("Erreur:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStudents();
    }, [currentUser?.role]);

    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            const matchesSearch = `${student.prenom} ${student.nom} ${student.email} ${student.telephone} ${student.filiere} ${student.niveau}`
                .toLowerCase()
                .includes(searchTerm.trim().toLowerCase());

            const matchesGender = genderFilter === "all" || student.sexe === genderFilter;

            return matchesSearch && matchesGender;
        });
    }, [genderFilter, searchTerm, students]);

    const stats = useMemo(() => {
        return {
            total: students.length,
            women: students.filter((student) => student.sexe === "F").length,
            men: students.filter((student) => student.sexe === "M").length,
            withLanguages: students.filter((student) => student.langue.trim().length > 0).length,
        };
    }, [students]);

    const openCreateForm = () => {
        setSubmitError("");
        setOperationMessage("");
        setEditingStudent(null);
        setFormData(emptyFormData);
        setActiveTab("form");
    };

    const openEditForm = (student: Student) => {
        setSelectedStudent(student);
        setSubmitError("");
        setOperationMessage("");
        setEditingStudent(student);
        setFormData({
            nom: student.nom,
            prenom: student.prenom,
            email: student.email,
            telephone: student.telephone,
            age: student.age.toString(),
            sexe: student.sexe,
            niveau: student.niveau,
            filiere: student.filiere,
            langue: student.langue,
            diplome_acquis: student.diplome_acquis,
            choix: student.choix,
        });
        setActiveTab("form");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError("");
        setOperationMessage("");

        const studentData = {
            ...formData,
            age: parseInt(formData.age, 10) || 0,
        };

        try {
            if (editingStudent) {
                const { data, error } = await supabase
                    .from("students")
                    .update(studentData)
                    .eq("id", editingStudent.id)
                    .select()
                    .single();

                if (error) {
                    setSubmitError(error.message);
                    return;
                }

                setSelectedStudent(data);
                setEditingStudent(null);
                setOperationMessage("Étudiant mis à jour avec succès.");
                await loadStudents();
                setActiveTab("list");
                return;
            }

            const duplicateCount = students.filter(
                (student) =>
                    student.prenom.trim().toLowerCase() === formData.prenom.trim().toLowerCase() &&
                    student.nom.trim().toLowerCase() === formData.nom.trim().toLowerCase(),
            ).length;

            const username = buildStudentUsername(formData.prenom, formData.nom, duplicateCount);
            const temporaryPassword = generateTemporaryPassword();
            const fullName = `${formData.prenom} ${formData.nom}`.trim();

            // Créer le compte via API route (pas de rate limit, email envoyé automatiquement)
            const res = await fetch("/api/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fullName,
                    email: formData.email,
                    username,
                    password: temporaryPassword,
                    role: "student",
                    authEmail: buildStudentAuthEmail(username),
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                setSubmitError(result.error || "Impossible de créer le compte étudiant.");
                return;
            }

            const { data, error } = await supabase
                .from("students")
                .insert({
                    ...studentData,
                    created_by: result.userId,
                })
                .select()
                .single();

            if (error) {
                setSubmitError(error.message);
                return;
            }

            setCreatedAccount({ username, password: temporaryPassword });
            setSelectedStudent(data);
            setOperationMessage("Étudiant ajouté avec succès.");
            setFormData(emptyFormData);
            setActiveTab("list");
            await loadStudents();
        } catch (err) {
            console.error("Erreur:", err);
            setSubmitError("Une erreur est survenue pendant l'enregistrement de l'étudiant.");
        }
    };

    const handleDelete = async () => {
        if (!studentToDelete) {
            return;
        }

        try {
            const { error } = await supabase.from("students").delete().eq("id", studentToDelete.id);

            if (error) {
                setSubmitError(error.message);
                return;
            }

            if (selectedStudent?.id === studentToDelete.id) {
                setSelectedStudent(null);
            }

            setStudentToDelete(null);
            setOperationMessage("Étudiant supprimé avec succès.");
            await loadStudents();
        } catch (err) {
            console.error("Erreur:", err);
            setSubmitError("Impossible de supprimer cet étudiant.");
        }
    };

    const resetForm = () => {
        setSubmitError("");
        setEditingStudent(null);
        setFormData(emptyFormData);
        setActiveTab("list");
    };

    const canEdit =
        currentUser?.role === "admin" ||
        currentUser?.role === "super_admin" ||
        currentUser?.role === "agent";

    return (
        <>
            <ProtectedRoute requiredRole="agent">
                <div className="space-y-6 p-4 sm:p-6">
                    <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                                Gestion académique
                            </p>
                            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                                Gestion des Étudiants
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Suivi des profils, parcours et informations des candidats.
                            </p>
                        </div>
                        {canEdit && <Button onClick={openCreateForm}>+ Ajouter</Button>}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
                                <p className="mt-1 text-sm text-slate-500">Étudiants enregistrés</p>
                            </CardContent>
                        </Card>
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Femmes</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.women}</p>
                                <p className="mt-1 text-sm text-slate-500">Profils féminins</p>
                            </CardContent>
                        </Card>
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Hommes</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.men}</p>
                                <p className="mt-1 text-sm text-slate-500">Profils masculins</p>
                            </CardContent>
                        </Card>
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Langues</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.withLanguages}</p>
                                <p className="mt-1 text-sm text-slate-500">Profils avec langue renseignée</p>
                            </CardContent>
                        </Card>
                    </div>

                    {operationMessage && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                            {operationMessage}
                        </div>
                    )}

                    {submitError && activeTab === "list" && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {submitError}
                        </div>
                    )}

                    {activeTab === "list" && (
                        <div>
                            <Card className="joda-surface border-0 shadow-none">
                                <CardHeader className="gap-4">
                                    <div>
                                        <CardTitle>Liste des Étudiants</CardTitle>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                                        <Input
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Rechercher par nom, email, téléphone, filière..."
                                        />
                                        <Select value={genderFilter} onValueChange={(value) => setGenderFilter(value || "all")}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Filtrer par sexe" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Tous les profils</SelectItem>
                                                <SelectItem value="M">Hommes</SelectItem>
                                                <SelectItem value="F">Femmes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <div className="py-8 text-center text-slate-500">Chargement...</div>
                                    ) : filteredStudents.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                                            <p className="text-lg font-medium text-slate-700">Aucun étudiant trouvé</p>
                                            <p className="mt-2 text-sm text-slate-500">
                                                Ajustez les filtres ou ajoutez un nouveau profil.
                                            </p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nom</TableHead>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Téléphone</TableHead>
                                                    <TableHead>Niveau</TableHead>
                                                    <TableHead>Formation</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredStudents.map((student) => (
                                                    <TableRow
                                                        key={student.id}
                                                        className="cursor-default"
                                                    >
                                                        <TableCell>
                                                            <div className="font-medium">
                                                                {student.prenom} {student.nom}
                                                            </div>
                                                            <div className="text-sm text-slate-500">
                                                                {student.sexe === "M" ? "Homme" : "Femme"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{student.email}</TableCell>
                                                        <TableCell>{student.telephone}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{student.niveau}</Badge>
                                                        </TableCell>
                                                        <TableCell>{student.filiere}</TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedStudent(student);
                                                                    }}
                                                                >
                                                                    Détails
                                                                </Button>
                                                                {canEdit && (
                                                                    <>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openEditForm(student);
                                                                            }}
                                                                        >
                                                                            Modifier
                                                                        </Button>
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setStudentToDelete(student);
                                                                            }}
                                                                        >
                                                                            Supprimer
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {selectedStudent && activeTab === "list" && (
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
                                initial={{ scale: 0.94, y: 20, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.94, opacity: 0 }}
                            >
                                <div className="mb-4 flex items-start justify-between">
                                    <h3 className="text-xl font-semibold text-slate-900">{selectedStudent.prenom} {selectedStudent.nom}</h3>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>✕</Button>
                                </div>
                                <div className="mb-4 flex flex-wrap gap-2">
                                    <Badge variant="outline">{selectedStudent.niveau}</Badge>
                                    <Badge variant="secondary">{selectedStudent.filiere}</Badge>
                                    <Badge variant="outline">{selectedStudent.sexe === "M" ? "Homme" : "Femme"}</Badge>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 p-3">
                                        <p className="text-xs uppercase tracking-wider text-slate-400">Contact</p>
                                        <p className="mt-2 text-sm font-medium text-slate-900">{selectedStudent.email}</p>
                                        <p className="text-sm text-slate-600">{selectedStudent.telephone}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-3">
                                        <p className="text-xs uppercase tracking-wider text-slate-400">Parcours</p>
                                        <p className="mt-2 text-sm font-medium text-slate-900">{selectedStudent.niveau}</p>
                                        <p className="text-sm text-slate-600">{selectedStudent.diplome_acquis || "Diplôme non renseigné"}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-3">
                                        <p className="text-xs uppercase tracking-wider text-slate-400">Langue</p>
                                        <p className="mt-2 text-sm text-slate-900">{selectedStudent.langue || "Non renseignée"}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-3">
                                        <p className="text-xs uppercase tracking-wider text-slate-400">Procédure</p>
                                        <p className="mt-2 text-sm text-slate-900">{selectedStudent.choix}</p>
                                    </div>
                                </div>
                                <div className="mt-3 rounded-xl border border-slate-200 p-3">
                                    <p className="text-xs uppercase tracking-wider text-slate-400">Créé le</p>
                                    <p className="mt-2 text-sm text-slate-900">{new Date(selectedStudent.created_at).toLocaleString("fr-FR")}</p>
                                </div>
                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                    {canEdit && (
                                        <>
                                            <Button variant="outline" onClick={() => { openEditForm(selectedStudent); setSelectedStudent(null); }}>Modifier</Button>
                                            <Button variant="destructive" onClick={() => { setStudentToDelete(selectedStudent); setSelectedStudent(null); }}>Supprimer</Button>
                                        </>
                                    )}
                                    <Button onClick={() => setSelectedStudent(null)}>Fermer</Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {activeTab === "form" && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
                        <Card className="w-full max-w-3xl border-0 shadow-2xl">
                            <CardHeader className="border-b border-slate-100">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <CardTitle>{editingStudent ? "Modifier" : "Ajouter"} un Étudiant</CardTitle>
                                        <CardDescription>Les champs marqués par une étoile sont obligatoires.</CardDescription>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                                        Fermer
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="max-h-[80vh] overflow-y-auto p-6">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {submitError && (
                                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                            {submitError}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="prenom">Prénom *</Label>
                                            <Input
                                                id="prenom"
                                                value={formData.prenom}
                                                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nom">Nom *</Label>
                                            <Input
                                                id="nom"
                                                value={formData.nom}
                                                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="telephone">Téléphone *</Label>
                                            <Input
                                                id="telephone"
                                                value={formData.telephone}
                                                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="age">Âge *</Label>
                                            <Input
                                                id="age"
                                                type="number"
                                                value={formData.age}
                                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sexe">Sexe *</Label>
                                            <Select
                                                value={formData.sexe || "M"}
                                                onValueChange={(value) => setFormData({ ...formData, sexe: value || "M" })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="M">Homme</SelectItem>
                                                    <SelectItem value="F">Femme</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="niveau">Niveau d'études *</Label>
                                            <Input
                                                id="niveau"
                                                value={formData.niveau}
                                                onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                                                placeholder="Bac+2, Master..."
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="filiere">Filière *</Label>
                                            <Input
                                                id="filiere"
                                                value={formData.filiere}
                                                onChange={(e) => setFormData({ ...formData, filiere: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="diplome">Diplôme acquis</Label>
                                            <Input
                                                id="diplome"
                                                value={formData.diplome_acquis}
                                                onChange={(e) => setFormData({ ...formData, diplome_acquis: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="langue">Langue préférée</Label>
                                            <Input
                                                id="langue"
                                                value={formData.langue}
                                                onChange={(e) => setFormData({ ...formData, langue: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="choix">Choix de procédure</Label>
                                            <Select
                                                value={formData.choix || "procedure_seule"}
                                                onValueChange={(value) => setFormData({ ...formData, choix: value || "procedure_seule" })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="procedure_seule">Procédure seule</SelectItem>
                                                    <SelectItem value="procedure_cours">Procédure + Cours</SelectItem>
                                                    <SelectItem value="cours_seuls">Cours seuls</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" onClick={resetForm}>
                                            Annuler
                                        </Button>
                                        <Button type="submit">
                                            {editingStudent ? "Enregistrer" : "Ajouter"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                        </div>
                    )}
                </div>
            </ProtectedRoute>

            <AnimatePresence>
                {studentToDelete && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                            initial={{ scale: 0.94, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                        >
                            <h3 className="text-lg font-semibold text-slate-900">Confirmer la suppression</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Vous allez supprimer le profil de {studentToDelete.prenom} {studentToDelete.nom}. Cette action est irréversible.
                            </p>
                            <div className="mt-6 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setStudentToDelete(null)}>
                                    Annuler
                                </Button>
                                <Button variant="destructive" onClick={handleDelete}>
                                    Supprimer
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {createdAccount && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                            initial={{ scale: 0.8, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        >
                            <div className="mb-4 text-center">
                                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                                    <svg className="h-7 w-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Compte étudiant créé</h3>
                                <p className="mt-1 text-sm text-gray-500">Transmettez ces identifiants à l'étudiant</p>
                            </div>
                            <div className="mb-5 space-y-3 rounded-xl bg-gray-50 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">Nom d'utilisateur</span>
                                    <span className="font-mono text-sm font-bold text-gray-900">{createdAccount.username}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">Mot de passe temporaire</span>
                                    <span className="font-mono text-sm font-bold text-red-600">{createdAccount.password}</span>
                                </div>
                            </div>
                            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                Le compte étudiant est créé dans la base et reste lié à ce dossier.
                            </p>
                            <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-600">
                                Le mot de passe temporaire devra être changé à la première connexion.
                            </p>
                            <button
                                onClick={() => setCreatedAccount(null)}
                                className="w-full rounded-xl bg-red-600 py-2.5 font-semibold text-white transition-colors hover:bg-red-700"
                            >
                                Compris
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
