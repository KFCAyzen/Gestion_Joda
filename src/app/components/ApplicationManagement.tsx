"use client";

import { useEffect, useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { logActivity } from "../utils/activityLogger";
import ConfirmDialog from "./ConfirmDialog";
import Pagination from "./Pagination";
import ProtectedRoute from "./ProtectedRoute";
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
import { Edit, Trash2 } from "lucide-react";
import DropdownMenu from "./shared/DropdownMenu";

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
    const t = useTranslations("applicationManagement");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const { showNotification } = useNotificationContext();
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean; title: string; description: string; onConfirm: () => void;
    }>({ open: false, title: '', description: '', onConfirm: () => {} });
    const closeConfirm = () => setConfirmDialog(s => ({ ...s, open: false }));
    const [showForm, setShowForm] = useState(false);
    const [editingApplication, setEditingApplication] = useState<ScholarshipApplication | null>(null);
    const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [universityFilter, setUniversityFilter] = useState("all");
    const pageSize = 10;

    const canDelete = user?.role === "admin" || user?.role === "super_admin";

    const defaultFormData = {
        studentId: "",
        universityId: "",
        desiredProgram: "",
        studyLevel: "Licence",
        languageLevel: "HSK 3",
        scholarshipType: "Complete",
        applicationFee: "",
    };

    const [formData, setFormData] = useState(defaultFormData);

    const resetForm = () => {
        setFormData(defaultFormData);
    };

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
            setCurrentPage(1); // Reset page on reload
        } catch (error) {
            console.warn("Erreur chargement données:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Pagination
    const filteredApplications = useMemo(() => {
        return applications.filter((app) => {
            const student = students.find(s => s.id === app.student_id);
            const university = universities.find(u => u.id === app.university_id);
            
            const matchesSearch = searchTerm === "" || 
                `${student?.prenom} ${student?.nom} ${university?.nom} ${app.desired_program} ${app.study_level}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === "all" || app.status === statusFilter;
            const matchesUniversity = universityFilter === "all" || app.university_id === universityFilter;
            
            return matchesSearch && matchesStatus && matchesUniversity;
        });
    }, [applications, students, universities, searchTerm, statusFilter, universityFilter]);

    const totalPages = Math.ceil(filteredApplications.length / pageSize);
    const paginatedApplications = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return filteredApplications.slice(start, end);
    }, [filteredApplications, currentPage, pageSize]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, universityFilter]);

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveApplication = async () => {
        if (!formData.studentId || !formData.universityId || !formData.desiredProgram) {
            showNotification(t("messages.requiredFields"), "error");
            return;
        }

        try {
            if (editingApplication) {
                // Mode modification
                const { error } = await supabase.from("dossier_bourses").update({
                    desired_program: formData.desiredProgram,
                    study_level: formData.studyLevel,
                    language_level: formData.languageLevel,
                    scholarship_type: formData.scholarshipType,
                    notes_internes: `Programme: ${formData.desiredProgram}, Niveau: ${formData.studyLevel}, Langue: ${formData.languageLevel}, Bourse: ${formData.scholarshipType}`,
                    university_id: formData.universityId,
                }).eq("id", editingApplication.id);

                if (error) {
                    showNotification(t("messages.updateError"), "error");
                    return;
                }

                if (user) {
                    const student = students.find(s => s.id === formData.studentId);
                    const university = universities.find(u => u.id === formData.universityId);
                    await logActivity(
                        user.id, user.name, user.role,
                        "application_update", "dossier_bourses", editingApplication.id,
                        `Candidature modifiée — ${student ? `${student.prenom} ${student.nom}` : t("fallback.student")} — ${university?.nom || t("fallback.university")} — ${formData.desiredProgram}`,
                        { student_id: formData.studentId, university_id: formData.universityId }
                    );
                }

                showNotification(t("messages.updateSuccess"), "success");
                setShowForm(false);
                setEditingApplication(null);
                resetForm();
                await loadData();
                return;
            }

            // Mode création
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
                if (user) {
                    const studentCreated = students.find(s => s.id === formData.studentId);
                    const universityCreated = universities.find(u => u.id === formData.universityId);
                    await logActivity(
                        user.id, user.name, user.role,
                        "application_create", "dossier_bourses", dossier.id,
                        `Candidature créée — ${studentCreated ? `${studentCreated.prenom} ${studentCreated.nom}` : t("fallback.student")} — ${universityCreated?.nom || t("fallback.university")} — ${formData.desiredProgram}`,
                        { student_id: formData.studentId, university_id: formData.universityId }
                    );
                }

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
                        titre: t("studentNotification.title"),
                        message: t("studentNotification.message", {
                            university: university?.nom || t("fallback.aUniversity"),
                            program: formData.desiredProgram,
                        }),
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

                showNotification(t("messages.createSuccess"), "success");
                setShowForm(false);
                setEditingApplication(null);
                resetForm();
                await loadData();
            } else if (error) {
                showNotification(t("messages.saveError"), "error");
            }
        } catch (error) {
            showNotification(t("messages.saveError"), "error");
        }
    };

    const openEditForm = (application: ScholarshipApplication) => {
        setEditingApplication(application);
        setFormData({
            studentId: application.student_id,
            universityId: application.university_id,
            desiredProgram: application.desired_program,
            studyLevel: application.study_level,
            languageLevel: application.language_level,
            scholarshipType: application.scholarship_type,
            applicationFee: "",
        });
        setShowForm(true);
    };

    const deleteApplication = (applicationId: string) => {
        setConfirmDialog({
            open: true,
            title: t("delete.title"),
            description: t("delete.description"),
            onConfirm: async () => {
                closeConfirm();
                try {
                    const { error } = await supabase.from("dossier_bourses").delete().eq("id", applicationId);
                    if (error) throw error;
                    if (user) {
                        await logActivity(
                            user.id, user.name, user.role,
                            "application_delete", "dossier_bourses", applicationId,
                            `Candidature supprimée — ID: ${applicationId}`,
                            { application_id: applicationId }
                        );
                    }
                    showNotification(t("messages.deleteSuccess"), "success");
                    await loadData();
                } catch (error) {
                    console.error("Erreur suppression:", error);
                    showNotification(t("messages.deleteError"), "error");
                }
            },
        });
    };

    const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
        await supabase.from("dossier_bourses").update({ status: newStatus }).eq("id", applicationId);
        if (user) {
            await logActivity(
                user.id, user.name, user.role,
                "dossier_status_change", "dossier_bourses", applicationId,
                `Statut dossier mis à jour → ${newStatus}`,
                { application_id: applicationId, new_status: newStatus }
            );
        }
        loadData();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "admission_validee":
                return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
            case "en_cours":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
            case "admission_rejetee":
                return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
            default:
                return "bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "document_recu":
                return t("status.documentReceived");
            case "en_attente":
                return t("status.pending");
            case "en_cours":
                return t("status.inProgress");
            case "document_manquant":
                return t("status.missingDocuments");
            case "admission_validee":
                return t("status.accepted");
            case "admission_rejetee":
                return t("status.rejected");
            case "en_attente_universite":
                return t("status.waitingUniversity");
            case "visa_en_cours":
                return t("status.visaProcessing");
            case "termine":
                return t("status.completed");
            default:
                return status;
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
                    <p className="text-slate-600 dark:text-slate-400">{t("loading")}</p>
                </div>
            </div>
        );
    }

    return (
        <ProtectedRoute requiredRole="agent">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        {t("header.tag")}
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
                        {t("header.title")}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("header.subtitle")}
                    </p>
                </div>
                <Button onClick={() => {
                    setEditingApplication(null);
                    resetForm();
                    setShowForm(true);
                }} style={{ backgroundColor: "#dc2626" }}>
                    {t("actions.new")}
                </Button>
            </div>

            {showForm && (
                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader>
                        <CardTitle style={{ color: "#dc2626" }}>
                            {editingApplication ? t("form.titleEdit") : t("form.titleNew")}
                        </CardTitle>
                        <CardDescription>
                            {editingApplication 
                                ? t("form.descriptionEdit")
                                : t("form.descriptionNew")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>{t("form.student")}</Label>
                                <Select 
                                    value={formData.studentId || ""} 
                                    onValueChange={(v) => setFormData({ ...formData, studentId: v || "" })}
                                    disabled={!!editingApplication}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("form.studentPlaceholder")}>
                                            {formData.studentId
                                                ? (() => { const s = students.find(s => s.id === formData.studentId); return s ? `${s.prenom} ${s.nom}` : t("form.studentPlaceholder"); })()
                                                : t("form.studentPlaceholder")}
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
                                <Label style={{ color: "#dc2626" }}>{t("form.university")}</Label>
                                <Select value={formData.universityId || ""} onValueChange={(v) => setFormData({ ...formData, universityId: v || "" })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("form.universityPlaceholder")}>
                                            {formData.universityId
                                                ? (() => { const u = universities.find(u => u.id === formData.universityId); return u ? u.nom : t("form.universityPlaceholder"); })()
                                                : t("form.universityPlaceholder")}
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
                                <Label style={{ color: "#dc2626" }}>{t("form.program")}</Label>
                                <Input
                                    placeholder={t("form.programPlaceholder")}
                                    value={formData.desiredProgram}
                                    onChange={(e) => setFormData({ ...formData, desiredProgram: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>{t("form.studyLevel")}</Label>
                                <Select value={formData.studyLevel || "Licence"} onValueChange={(v) => setFormData({ ...formData, studyLevel: v || "Licence" })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Licence">{t("studyLevels.licence")}</SelectItem>
                                        <SelectItem value="Master">{t("studyLevels.master")}</SelectItem>
                                        <SelectItem value="Doctorat">{t("studyLevels.doctorate")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>{t("form.languageLevel")}</Label>
                                <Select value={formData.languageLevel || "HSK 3"} onValueChange={(v) => setFormData({ ...formData, languageLevel: v || "HSK 3" })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Debutant">{t("languageLevels.beginner")}</SelectItem>
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
                                <Label style={{ color: "#dc2626" }}>{t("form.scholarshipType")}</Label>
                                <Select value={formData.scholarshipType || "Complete"} onValueChange={(v) => setFormData({ ...formData, scholarshipType: v || "Complete" })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Complete">{t("scholarshipTypes.complete")}</SelectItem>
                                        <SelectItem value="Partielle">{t("scholarshipTypes.partial")}</SelectItem>
                                        <SelectItem value="Aucune">{t("scholarshipTypes.none")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button onClick={handleSaveApplication} style={{ backgroundColor: "#dc2626" }}>
                                {editingApplication ? t("actions.edit") : t("actions.save")}
                            </Button>
                            <Button variant="outline" onClick={() => {
                                setShowForm(false);
                                setEditingApplication(null);
                                resetForm();
                            }}>
                                {t("actions.cancel")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="joda-surface border-0 shadow-none">
                <CardHeader>
                    <div className="flex items-center justify-between mb-4">
                        <CardTitle>{t("list.title", { count: filteredApplications.length })}</CardTitle>
                        <Button variant="outline" onClick={loadData}>{t("actions.refresh")}</Button>
                    </div>
                    
                    {/* Barre de recherche et filtres */}
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_200px]">
                        <Input
                            placeholder={t("filters.searchPlaceholder")}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("filters.statusPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                                <SelectItem value="document_manquant">{t("status.documentMissing")}</SelectItem>
                                <SelectItem value="document_recu">{t("status.documentReceived")}</SelectItem>
                                <SelectItem value="en_attente">{t("status.pending")}</SelectItem>
                                <SelectItem value="en_cours">{t("status.inProgress")}</SelectItem>
                                <SelectItem value="admission_validee">{t("status.accepted")}</SelectItem>
                                <SelectItem value="admission_rejetee">{t("status.rejected")}</SelectItem>
                                <SelectItem value="en_attente_universite">{t("status.waitingUniversity")}</SelectItem>
                                <SelectItem value="visa_en_cours">{t("status.visaProcessing")}</SelectItem>
                                <SelectItem value="termine">{t("status.completed")}</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Select value={universityFilter} onValueChange={(v) => setUniversityFilter(v || "all")}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("filters.universityPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("filters.allUniversities")}</SelectItem>
                                {universities.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>{u.nom}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredApplications.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-slate-500 dark:text-slate-400">
                                {applications.length === 0 
                                    ? t("empty.noApplications")
                                    : t("empty.noResults")}
                            </p>
                            {(searchTerm || statusFilter !== "all" || universityFilter !== "all") && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-4"
                                    onClick={() => {
                                        setSearchTerm("");
                                        setStatusFilter("all");
                                        setUniversityFilter("all");
                                    }}
                                >
                                    {t("actions.resetFilters")}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                {paginatedApplications.map((application) => {
                                const student = students.find((s) => s.id === application.student_id);
                                const university = universities.find((u) => u.id === application.university_id);

                                return (
                                    <div key={application.id} className="joda-surface-muted p-4">
                                        <div className="mb-4 flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {student ? `${student.prenom} ${student.nom}` : t("fallback.student")}
                                                </h3>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                    {university?.nom || t("fallback.university")}
                                                </p>
                                            </div>
                                            <Badge className={getStatusColor(application.status)}>
                                                {getStatusLabel(application.status)}
                                            </Badge>
                                        </div>

                                        <div className="mb-4 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-600 dark:text-slate-400">{t("card.date")}:</span>
                                                <span className="font-medium">
                                                    {application.created_at ? new Date(application.created_at).toLocaleDateString(dateLocale) : "-"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Select value={application.status} onValueChange={(v) => updateApplicationStatus(application.id, v || application.status)}>
                                                <SelectTrigger className="w-[180px] text-xs font-medium"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="document_recu">{t("status.documentReceived")}</SelectItem>
                                                    <SelectItem value="en_attente">{t("status.pending")}</SelectItem>
                                                    <SelectItem value="en_cours">{t("status.inProgress")}</SelectItem>
                                                    <SelectItem value="document_manquant">{t("status.documentMissing")}</SelectItem>
                                                    <SelectItem value="admission_validee">{t("status.accepted")}</SelectItem>
                                                    <SelectItem value="admission_rejetee">{t("status.rejected")}</SelectItem>
                                                    <SelectItem value="termine">{t("status.completed")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <DropdownMenu
                                                actions={[
                                                    {
                                                        label: t("actions.edit"),
                                                        icon: <Edit className="h-4 w-4" />,
                                                        onClick: () => openEditForm(application),
                                                    },
                                                    ...(canDelete
                                                        ? [
                                                              {
                                                                  label: t("actions.delete"),
                                                                  icon: <Trash2 className="h-4 w-4" />,
                                                                  onClick: () => deleteApplication(application.id),
                                                                  variant: "danger" as const,
                                                              },
                                                          ]
                                                        : []),
                                                ]}
                                            />
                                        </div>
                                    </div>
                                );
                                })}
                            </div>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                hasNextPage={currentPage < totalPages}
                                hasPrevPage={currentPage > 1}
                                totalCount={filteredApplications.length}
                                pageSize={pageSize}
                            />
                        </>
                    )}
                </CardContent>
            </Card>
        <ConfirmDialog
            isOpen={confirmDialog.open}
            onClose={closeConfirm}
            onConfirm={confirmDialog.onConfirm}
            title={confirmDialog.title}
            description={confirmDialog.description}
            confirmLabel={t("actions.delete")}
        />
        </div>
        </ProtectedRoute>
    );
}
