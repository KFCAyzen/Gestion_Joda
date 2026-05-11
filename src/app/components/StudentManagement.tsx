"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import ProtectedRoute from "./ProtectedRoute";
import Pagination from "./Pagination";
import { getFriendlyErrorMessage } from "../lib/feedback";
import { logActivity } from "../utils/activityLogger";
import {
    buildStudentAuthEmail,
    buildStudentUsername,
    generateTemporaryPassword,
} from "../lib/student-auth";
import { MONTANTS_BOURSE, MONTANTS_MANDARIN, MONTANTS_ANGLAIS } from "../types/joda";
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
import SearchBar from "./SearchBar";
import FilterSelect from "./FilterSelect";
import PaymentOverview from "./PaymentOverview";
import DocumentManagement from "./DocumentManagement";
import { downloadReceipt } from "../utils/downloadReceipt";
import { DropdownMenu } from "./shared";
import PhoneInput from "./shared/PhoneInput";
import { Eye, Edit, Trash2 } from "lucide-react";
import { DEFAULT_PHONE_COUNTRY_CODE, normalizePhoneNumber, splitPhoneNumber } from "../lib/phone";

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
    phoneCountryCode: DEFAULT_PHONE_COUNTRY_CODE,
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
    const { showNotification } = useNotificationContext();
    const t = useTranslations("students");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const [localUser, setLocalUser] = useState<{ id: string; role: string } | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"list" | "form">("list");
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [createdAccount, setCreatedAccount] = useState<{ username: string; password: string } | null>(null);
    const [selectedStudentPayments, setSelectedStudentPayments] = useState<any[]>([]);
    const [submitError, setSubmitError] = useState("");
    const [operationMessage, setOperationMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [genderFilter, setGenderFilter] = useState("all");
    const [formData, setFormData] = useState(emptyFormData);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    const setFeedback = (nextError = "", nextSuccess = "") => {
        setSubmitError(nextError);
        setOperationMessage(nextSuccess);
    };

    const getGenderLabel = (gender: string) => (gender === "M" ? t("list.male") : t("list.female"));

    const getChoiceLabel = (choice: string) => {
        if (choice === "procedure_seule") return t("detail.choices.procedure_seule");
        if (choice === "procedure_cours") return t("detail.choices.procedure_cours");
        if (choice === "cours_seuls") return t("detail.choices.cours_seuls");
        return choice;
    };

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

            const { data, error } = await query;
            if (error) {
                throw error;
            }
            if (data) {
                setStudents(data);
            }
        } catch (err) {
            console.error("Erreur:", err);
            const message = getFriendlyErrorMessage(err, {
                fallback: t("messages.loadError"),
            });
            setFeedback(message, "");
            showNotification({ title: t("messages.loadTitle"), message, type: "error" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStudents();
    }, [currentUser?.role]);

    useEffect(() => {
        if (!selectedStudent) {
            setSelectedStudentPayments([]);
            return;
        }
        supabase
            .from("payments")
            .select("*")
            .eq("student_id", selectedStudent.id)
            .then(({ data }) => setSelectedStudentPayments(data || []));
    }, [selectedStudent?.id]);

    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            const matchesSearch = `${student.prenom} ${student.nom} ${student.email} ${student.telephone} ${student.filiere} ${student.niveau}`
                .toLowerCase()
                .includes(searchTerm.trim().toLowerCase());

            const matchesGender = genderFilter === "all" || student.sexe === genderFilter;

            return matchesSearch && matchesGender;
        });
    }, [genderFilter, searchTerm, students]);

    // Pagination
    const totalPages = Math.ceil(filteredStudents.length / pageSize);
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return filteredStudents.slice(start, end);
    }, [filteredStudents, currentPage, pageSize]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, genderFilter]);

    const stats = useMemo(() => {
        return {
            total: students.length,
            women: students.filter((student) => student.sexe === "F").length,
            men: students.filter((student) => student.sexe === "M").length,
            withLanguages: students.filter((student) => student.langue.trim().length > 0).length,
        };
    }, [students]);

    const openCreateForm = () => {
        setFeedback("", "");
        setEditingStudent(null);
        setFormData(emptyFormData);
        setActiveTab("form");
    };

    const openEditForm = (student: Student) => {
        setSelectedStudent(student);
        setFeedback("", "");
        setEditingStudent(student);
        const phone = splitPhoneNumber(student.telephone);
        setFormData({
            nom: student.nom,
            prenom: student.prenom,
            email: student.email,
            phoneCountryCode: phone.countryCode,
            telephone: phone.localNumber,
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

    // Crée les tranches manquantes selon le service souscrit — sans toucher aux paiements existants
    const syncPaymentsForStudent = async (studentId: string, choix: string, langue: string) => {
        const { data: existing } = await supabase
            .from("payments")
            .select("type")
            .eq("student_id", studentId);

        const existingTypes = new Set((existing ?? []).map((p: { type: string }) => p.type));

        const toInsert: {
            student_id: string; type: string; tranche: number;
            montant: number; status: string; penalites: number;
        }[] = [];

        if ((choix === "procedure_seule" || choix === "procedure_cours") && !existingTypes.has("bourse")) {
            [
                { tranche: 1, montant: MONTANTS_BOURSE.TRANCHE_1 },
                { tranche: 2, montant: MONTANTS_BOURSE.TRANCHE_2 },
                { tranche: 3, montant: MONTANTS_BOURSE.TRANCHE_3 },
                { tranche: 4, montant: MONTANTS_BOURSE.TRANCHE_4 },
            ].forEach(t => toInsert.push({ student_id: studentId, type: "bourse", ...t, status: "attente", penalites: 0 }));
        }

        const langueKey = langue?.toLowerCase().includes("mandarin") ? "mandarin"
            : langue?.toLowerCase().includes("anglais") ? "anglais"
            : null;

        if ((choix === "cours_seuls" || choix === "procedure_cours") && langueKey && !existingTypes.has(langueKey)) {
            const coursTransches = langueKey === "mandarin"
                ? [
                    { tranche: 1, montant: MONTANTS_MANDARIN.INSCRIPTION },
                    { tranche: 2, montant: MONTANTS_MANDARIN.LIVRE },
                    { tranche: 3, montant: MONTANTS_MANDARIN.TRANCHE_1 },
                    { tranche: 4, montant: MONTANTS_MANDARIN.TRANCHE_2 },
                ]
                : [
                    { tranche: 1, montant: MONTANTS_ANGLAIS.INSCRIPTION },
                    { tranche: 2, montant: MONTANTS_ANGLAIS.LIVRE },
                    { tranche: 3, montant: MONTANTS_ANGLAIS.TRANCHE_1 },
                    { tranche: 4, montant: MONTANTS_ANGLAIS.TRANCHE_2 },
                ];
            coursTransches.forEach(t => toInsert.push({ student_id: studentId, type: langueKey, ...t, status: "attente", penalites: 0 }));
        }

        if (toInsert.length > 0) {
            await supabase.from("payments").insert(toInsert);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback("", "");

        const { phoneCountryCode, ...rawFormData } = formData;
        const studentData = {
            ...rawFormData,
            telephone: normalizePhoneNumber(phoneCountryCode, formData.telephone),
            age: parseInt(formData.age, 10) || 0,
        };

        if (studentData.age <= 0) {
            const message = t("messages.ageInvalid");
            setFeedback(message, "");
            showNotification({ title: t("messages.ageInvalidTitle"), message, type: "warning" });
            return;
        }

        try {
            if (editingStudent) {
                const { data, error } = await supabase
                    .from("students")
                    .update(studentData)
                    .eq("id", editingStudent.id)
                    .select()
                    .single();

                if (error) {
                    const message = getFriendlyErrorMessage(error, {
                        fallback: t("messages.updateError"),
                    });
                    setFeedback(message, "");
                    showNotification({ title: t("messages.updateTitle"), message, type: "error" });
                    return;
                }

                setSelectedStudent(data);
                setEditingStudent(null);
                setOperationMessage(t("messages.updateSuccess"));
                if (currentUser) {
                    await logActivity(
                        currentUser.id, (currentUser as any).name || currentUser.id, currentUser.role,
                        "student_update", "students", editingStudent.id,
                        `Étudiant modifié — ${formData.prenom} ${formData.nom}`,
                        { student_id: editingStudent.id }
                    );
                }
                // Si le nouveau choix nécessite une procédure, s'assurer qu'un dossier existe
                if (formData.choix !== "cours_seuls") {
                    const { data: existingDossier } = await supabase
                        .from("dossier_bourses")
                        .select("id")
                        .eq("student_id", editingStudent.id)
                        .maybeSingle();
                    if (!existingDossier) {
                        await supabase.from("dossier_bourses").insert({
                            student_id: editingStudent.id,
                            status: "document_manquant",
                            desired_program: formData.filiere || "",
                            study_level: formData.niveau || "",
                            notes_internes: "Dossier créé automatiquement lors de la mise à jour du service",
                        });
                    }
                }

                // Synchroniser les paiements manquants selon le nouveau choix/langue
                await syncPaymentsForStudent(editingStudent.id, formData.choix, formData.langue);

                await loadStudents();
                setActiveTab("list");
                return;
            }

            const duplicateCount = students.filter(
                (student) =>
                    student.prenom.trim().toLowerCase() === formData.prenom.trim().toLowerCase() &&
                    student.nom.trim().toLowerCase() === formData.nom.trim().toLowerCase()
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
                    telephone: studentData.telephone,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                setSubmitError(result.error || t("messages.createAccountError"));
                return;
            }

            const { data, error } = await supabase
                .from("students")
                .insert({
                    ...studentData,
                    created_by: result.userId,
                    user_id: result.userId,
                })
                .select()
                .single();

            if (error) {
                const message = getFriendlyErrorMessage(error, {
                    fallback: t("messages.saveProfileError"),
                });
                setFeedback(message, "");
                showNotification({ title: t("messages.saveTitle"), message, type: "error" });
                return;
            }

            // Auto-créer le dossier bourse si la procédure est demandée
            if (formData.choix !== "cours_seuls") {
                await supabase.from("dossier_bourses").insert({
                    student_id: data.id,
                    status: "document_manquant",
                    desired_program: formData.filiere || "",
                    study_level: formData.niveau || "",
                    notes_internes: "Dossier créé automatiquement à l'inscription",
                });
            }

            // Auto-créer les tranches de paiement selon les services souscrits
            await syncPaymentsForStudent(data.id, formData.choix, formData.langue);

            setCreatedAccount({ username, password: temporaryPassword });
            setSelectedStudent(data);
            setOperationMessage(t("messages.createSuccess"));
            if (currentUser) {
                await logActivity(
                    currentUser.id, (currentUser as any).name || currentUser.id, currentUser.role,
                    "student_create", "students", data.id,
                    `Étudiant créé — ${formData.prenom} ${formData.nom}`,
                    { student_id: data.id, choix: formData.choix }
                );
            }
            setFormData(emptyFormData);
            setActiveTab("list");
            await loadStudents();
        } catch (err) {
            console.error("Erreur:", err);
            setSubmitError(t("messages.submitError"));
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

            // Supprimer le compte auth + users si le lien user_id existe
            if ((studentToDelete as any).user_id) {
                await fetch("/api/delete-user", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId: (studentToDelete as any).user_id }),
                }).catch(() => {});
            }

            if (selectedStudent?.id === studentToDelete.id) {
                setSelectedStudent(null);
            }

            setStudentToDelete(null);
            setOperationMessage(t("messages.deleteSuccess"));
            if (currentUser) {
                await logActivity(
                    currentUser.id, (currentUser as any).name || currentUser.id, currentUser.role,
                    "student_delete", "students", studentToDelete.id,
                    `Étudiant supprimé — ${studentToDelete.prenom} ${studentToDelete.nom}`,
                    { student_id: studentToDelete.id }
                );
            }
            await loadStudents();
        } catch (err) {
            console.error("Erreur:", err);
            setSubmitError(t("messages.deleteError"));
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
    
    const canDelete =
        currentUser?.role === "admin" ||
        currentUser?.role === "super_admin";

    return (
        <>
            <ProtectedRoute requiredRole="agent">
                <div className="space-y-6 p-4 sm:p-6">
                    <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                                {t("tag")}
                            </p>
                            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                                {t("title")}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {t("subtitle")}
                            </p>
                        </div>
                        {canEdit && <Button onClick={openCreateForm}>{t("addButton")}</Button>}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("stats.total")}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
                                <p className="mt-1 text-sm text-slate-500">{t("stats.totalSub")}</p>
                            </CardContent>
                        </Card>
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("stats.women")}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.women}</p>
                                <p className="mt-1 text-sm text-slate-500">{t("stats.womenSub")}</p>
                            </CardContent>
                        </Card>
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("stats.men")}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.men}</p>
                                <p className="mt-1 text-sm text-slate-500">{t("stats.menSub")}</p>
                            </CardContent>
                        </Card>
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("stats.languages")}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.withLanguages}</p>
                                <p className="mt-1 text-sm text-slate-500">{t("stats.languagesSub")}</p>
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
                                        <CardTitle>{t("list.title")}</CardTitle>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px] md:items-end">
                                        <SearchBar
                                            value={searchTerm}
                                            onChange={setSearchTerm}
                                            placeholder={t("list.searchPlaceholder")}
                                        />
                                        <FilterSelect
                                            label={t("list.filterGender")}
                                            value={genderFilter}
                                            onChange={setGenderFilter}
                                            options={[
                                                { value: "M", label: t("list.filterMen") },
                                                { value: "F", label: t("list.filterWomen") },
                                            ]}
                                            placeholder={t("list.filterAll")}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <div className="py-8 text-center text-slate-500">{t("loading")}</div>
                                    ) : filteredStudents.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                                            <p className="text-lg font-medium text-slate-700">{t("list.empty")}</p>
                                            <p className="mt-2 text-sm text-slate-500">
                                                {t("list.emptyHint")}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t("list.colName")}</TableHead>
                                                        <TableHead>{t("list.colEmail")}</TableHead>
                                                        <TableHead>{t("list.colPhone")}</TableHead>
                                                        <TableHead>{t("list.colLevel")}</TableHead>
                                                        <TableHead>{t("list.colField")}</TableHead>
                                                        <TableHead>{t("list.colActions")}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {paginatedStudents.map((student) => (
                                                    <TableRow
                                                        key={student.id}
                                                        className="cursor-default"
                                                    >
                                                        <TableCell>
                                                            <div className="font-medium">
                                                                {student.prenom} {student.nom}
                                                            </div>
                                                            <div className="text-sm text-slate-500">
                                                                {getGenderLabel(student.sexe)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{student.email}</TableCell>
                                                        <TableCell>{student.telephone}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{student.niveau}</Badge>
                                                        </TableCell>
                                                        <TableCell>{student.filiere}</TableCell>
                                                        <TableCell>
                                                            <DropdownMenu
                                                                actions={[
                                                                    {
                                                                        label: t("actions.details"),
                                                                        icon: <Eye className="h-4 w-4" />,
                                                                        onClick: () => setSelectedStudent(student),
                                                                    },
                                                                    ...(canEdit ? [
                                                                        {
                                                                            label: t("actions.edit"),
                                                                            icon: <Edit className="h-4 w-4" />,
                                                                            onClick: () => openEditForm(student),
                                                                        },
                                                                    ] : []),
                                                                    ...(canDelete ? [
                                                                        {
                                                                            label: t("actions.delete"),
                                                                            icon: <Trash2 className="h-4 w-4" />,
                                                                            onClick: () => setStudentToDelete(student),
                                                                            variant: "danger" as const,
                                                                        },
                                                                    ] : []),
                                                                ]}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <Pagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                onPageChange={setCurrentPage}
                                                hasNextPage={currentPage < totalPages}
                                                hasPrevPage={currentPage > 1}
                                                totalCount={filteredStudents.length}
                                                pageSize={pageSize}
                                            />
                                        </>
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
                                className="flex w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
                                style={{ maxHeight: "90vh" }}
                                initial={{ scale: 0.94, y: 20, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.94, opacity: 0 }}
                            >
                                {/* En-tête fixe */}
                                <div className="flex items-start justify-between border-b border-slate-100 p-6 pb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-900">{selectedStudent.prenom} {selectedStudent.nom}</h3>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <Badge variant="outline">{selectedStudent.niveau}</Badge>
                                            <Badge variant="secondary">{selectedStudent.filiere}</Badge>
                                            <Badge variant="outline">{getGenderLabel(selectedStudent.sexe)}</Badge>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>✕</Button>
                                </div>

                                {/* Corps défilable */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                    {/* Infos de base */}
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-slate-200 p-3">
                                            <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.contact")}</p>
                                            <p className="mt-2 text-sm font-medium text-slate-900">{selectedStudent.email}</p>
                                            <p className="text-sm text-slate-600">{(selectedStudent.telephone || "").replace(/^undefined\s*/i, "") || t("detail.phoneNone")}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 p-3">
                                            <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.path")}</p>
                                            <p className="mt-2 text-sm font-medium text-slate-900">{selectedStudent.niveau}</p>
                                            <p className="text-sm text-slate-600">{selectedStudent.diplome_acquis || t("detail.diplomaNone")}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 p-3">
                                            <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.language")}</p>
                                            <p className="mt-2 text-sm text-slate-900">{selectedStudent.langue || t("detail.languageNone")}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 p-3">
                                            <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.service")}</p>
                                            <p className="mt-2 text-sm text-slate-900">
                                                {getChoiceLabel(selectedStudent.choix)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 p-3">
                                        <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.createdAt")}</p>
                                        <p className="mt-2 text-sm text-slate-900">{new Date(selectedStudent.created_at).toLocaleString(dateLocale)}</p>
                                    </div>

                                    {/* Échéancier paiements */}
                                    <div>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                            {t("detail.payments")}
                                        </p>
                                        <PaymentOverview
                                            choix={selectedStudent.choix}
                                            langue={selectedStudent.langue || ""}
                                            payments={selectedStudentPayments}
                                            onDownloadReceipt={(p) =>
                                                downloadReceipt(p, {
                                                    nom: selectedStudent.nom,
                                                    prenom: selectedStudent.prenom,
                                                    email: selectedStudent.email,
                                                    telephone: selectedStudent.telephone,
                                                    niveau: selectedStudent.niveau,
                                                    filiere: selectedStudent.filiere,
                                                })
                                            }
                                        />
                                    </div>

                                    {/* Documents */}
                                    <div>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                            {t("detail.documents")}
                                        </p>
                                        <DocumentManagement
                                            studentId={selectedStudent.id}
                                            studentName={`${selectedStudent.prenom} ${selectedStudent.nom}`}
                                        />
                                    </div>
                                </div>

                                {/* Pied fixe */}
                                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
                                    {canEdit && (
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                openEditForm(selectedStudent);
                                                setSelectedStudent(null);
                                            }}
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            {t("actions.edit")}
                                        </Button>
                                    )}
                                    <Button onClick={() => setSelectedStudent(null)}>{t("actions.close")}</Button>
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
                                        <CardTitle>{editingStudent ? t("form.titleEdit") : t("form.titleAdd")}</CardTitle>
                                        <CardDescription>{t("form.requiredHint")}</CardDescription>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                                        {t("actions.close")}
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
                                            <Label htmlFor="prenom">{t("form.firstName")}</Label>
                                            <Input
                                                id="prenom"
                                                value={formData.prenom}
                                                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="nom">{t("form.lastName")}</Label>
                                            <Input
                                                id="nom"
                                                value={formData.nom}
                                                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">{t("form.email")}</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="telephone">{t("form.phone")}</Label>
                                            <PhoneInput
                                                id="telephone"
                                                countryCode={formData.phoneCountryCode}
                                                value={formData.telephone}
                                                onCountryCodeChange={(value) => setFormData({ ...formData, phoneCountryCode: value })}
                                                onValueChange={(value) => setFormData({ ...formData, telephone: value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="age">{t("form.age")}</Label>
                                            <Input
                                                id="age"
                                                type="number"
                                                value={formData.age}
                                                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sexe">{t("form.gender")}</Label>
                                            <Select
                                                value={formData.sexe || "M"}
                                                onValueChange={(value) => setFormData({ ...formData, sexe: value || "M" })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("form.genderSelect")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="M">{t("form.male")}</SelectItem>
                                                    <SelectItem value="F">{t("form.female")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="niveau">{t("form.level")}</Label>
                                            <Input
                                                id="niveau"
                                                value={formData.niveau}
                                                onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                                                placeholder={t("form.levelPlaceholder")}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="filiere">{t("form.field")}</Label>
                                            <Input
                                                id="filiere"
                                                value={formData.filiere}
                                                onChange={(e) => setFormData({ ...formData, filiere: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="diplome">{t("form.diploma")}</Label>
                                            <Input
                                                id="diplome"
                                                value={formData.diplome_acquis}
                                                onChange={(e) => setFormData({ ...formData, diplome_acquis: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="langue">{t("form.language")}</Label>
                                            <Input
                                                id="langue"
                                                value={formData.langue}
                                                onChange={(e) => setFormData({ ...formData, langue: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="choix">{t("form.choice")}</Label>
                                            <Select
                                                value={formData.choix || "procedure_seule"}
                                                onValueChange={(value) => setFormData({ ...formData, choix: value || "procedure_seule" })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("form.choiceSelect")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="procedure_seule">{t("form.procedure_seule")}</SelectItem>
                                                    <SelectItem value="procedure_cours">{t("form.procedure_cours")}</SelectItem>
                                                    <SelectItem value="cours_seuls">{t("form.cours_seuls")}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" onClick={resetForm}>
                                            {t("actions.cancel")}
                                        </Button>
                                        <Button type="submit">
                                            {editingStudent ? t("actions.save") : t("actions.add")}
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
                            <h3 className="text-lg font-semibold text-slate-900">{t("delete.title")}</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                {t("delete.message", { name: `${studentToDelete.prenom} ${studentToDelete.nom}` })}
                            </p>
                            <div className="mt-6 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setStudentToDelete(null)}>
                                    {t("delete.cancel")}
                                </Button>
                                <Button variant="destructive" onClick={handleDelete}>
                                    {t("delete.confirm")}
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
                                <h3 className="text-lg font-bold text-gray-900">{t("createdAccount.title")}</h3>
                                <p className="mt-1 text-sm text-gray-500">{t("createdAccount.subtitle")}</p>
                            </div>
                            <div className="mb-5 space-y-3 rounded-xl bg-gray-50 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">{t("createdAccount.username")}</span>
                                    <span className="font-mono text-sm font-bold text-gray-900">{createdAccount.username}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500">{t("createdAccount.tempPassword")}</span>
                                    <span className="font-mono text-sm font-bold text-red-600">{createdAccount.password}</span>
                                </div>
                            </div>
                            <p className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                                {t("createdAccount.info")}
                            </p>
                            <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-600">
                                {t("createdAccount.warning")}
                            </p>
                            <button
                                onClick={() => setCreatedAccount(null)}
                                className="w-full rounded-xl bg-red-600 py-2.5 font-semibold text-white transition-colors hover:bg-red-700"
                            >
                                {t("actions.understood")}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
