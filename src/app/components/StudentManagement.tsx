"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "../lib/supabase/client";
import { useStudentsPaginated, useStudentsStats, STUDENTS_KEY } from "../lib/hooks/use-students";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useNotificationContext } from "../context/NotificationContext";
import ProtectedRoute from "./ProtectedRoute";
import Pagination from "./Pagination";
import { getFriendlyErrorMessage } from "../lib/feedback";
import { logActivity } from "../utils/activityLogger";
import { fetchLogoBase64 } from "../utils/logoLoader";
import {
    buildStudentAuthEmail,
    buildStudentUsername,
    generateTemporaryPassword,
} from "../lib/student-auth";
import { usePaymentConfig } from "../context/PaymentConfigContext";
import { getBourseServiceType, isInternational } from "../types/payment-config";
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
import { Eye, Edit, Printer, Trash2, Loader2 } from "lucide-react";
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
    nationalite?: string | null;
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
    nationalite: "",
    profil: "local" as "local" | "international",
};

export default function StudentManagement() {
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const { showNotification } = useNotificationContext();
    const t = useTranslations("students");
    const { getConfig, getBourseConfig } = usePaymentConfig();
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const queryClient = useQueryClient();
    const [localUser, setLocalUser] = useState<{ id: string; role: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [activeTab, setActiveTab] = useState<"list" | "form">("list");
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [createdAccount, setCreatedAccount] = useState<{ username: string; password: string } | null>(null);
    const [selectedStudentPayments, setSelectedStudentPayments] = useState<any[]>([]);
    const [programForm, setProgramForm] = useState<{ type: "language_program_intl" | "partial_scholarship_intl" | "full_scholarship_intl"; date_limite: string }>({ type: "language_program_intl", date_limite: "" });
    const [isAssigningProgram, setIsAssigningProgram] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [operationMessage, setOperationMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [genderFilter, setGenderFilter] = useState("all");
    const [profileFilter, setProfileFilter] = useState("all");
    const [formData, setFormData] = useState(emptyFormData);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    // Recherche debouncée : évite une requête serveur à chaque frappe.
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 350);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Statistiques globales (non filtrées) via compteurs serveur.
    const { data: statsData } = useStudentsStats();
    const stats = {
        total: statsData?.total ?? 0,
        women: statsData?.women ?? 0,
        men: statsData?.men ?? 0,
        withLanguages: statsData?.withLanguages ?? 0,
    };

    // Liste paginée + filtrée côté serveur (page du hook = 0-based).
    const { data: pageData, isLoading: loading } = useStudentsPaginated(
        currentPage - 1,
        pageSize,
        { search: debouncedSearch, gender: genderFilter, profile: profileFilter }
    );
    const students = (pageData?.students ?? []) as unknown as Student[];
    const totalCount = pageData?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

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

    const printStudentCard = async (s: Student) => {
        setIsPrinting(true);
        try {
        const createdAt = new Date(s.created_at).toLocaleDateString(dateLocale);
        const logoSrc = await fetchLogoBase64();
        const logoTag = logoSrc
            ? `<img src="${logoSrc}" alt="Joda Company" style="width:46px;height:46px;object-fit:contain;display:block;background:#fff;border-radius:10px;padding:4px;">`
            : `<div class="brand-mark"><svg viewBox="0 0 24 24"><path d="M12 3L2 9l10 6 10-6-10-6zM2 15l10 6 10-6M2 12l10 6 10-6"/></svg></div>`;
        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fiche Étudiant — ${s.prenom} ${s.nom}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  @page{size:A4;margin:0;}
  body{font-family:'Inter',sans-serif;font-size:13px;color:#0f172a;background:#fff;width:210mm;min-height:297mm;padding:0;}
  /* ── Header identique au rapport comptable ── */
  .header{background:#0f172a;padding:32px 40px 28px;display:grid;grid-template-columns:1fr auto;align-items:center;gap:24px;}
  .header-brand{display:flex;align-items:center;gap:16px;}
  .brand-mark{width:46px;height:46px;background:#1e40af;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .brand-mark svg{width:26px;height:26px;fill:#fff;}
  .brand-name{font-size:20px;font-weight:700;color:#fff;letter-spacing:-.02em;line-height:1.2;}
  .brand-sub{font-size:11px;color:#94a3b8;letter-spacing:.04em;margin-top:2px;}
  .header-doc{text-align:right;}
  .doc-type{font-size:10px;font-family:'JetBrains Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;}
  .doc-title{font-size:16px;font-weight:600;color:#fff;line-height:1.2;}
  .doc-meta{font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748b;margin-top:6px;line-height:1.8;}
  /* ── Bande étudiant (identique à la bande période) ── */
  .id-band{background:#eff6ff;border-bottom:1px solid #bfdbfe;padding:14px 40px;display:flex;align-items:center;justify-content:space-between;}
  .id-name{font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-.01em;}
  .id-meta{font-family:'JetBrains Mono',monospace;font-size:11px;color:#1e40af;text-align:right;line-height:1.8;}
  /* ── Corps ── */
  .body{padding:32px 40px 40px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;}
  .cell{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;}
  .cell-label{font-size:9px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;font-weight:500;margin-bottom:5px;}
  .cell-value{font-size:13px;font-weight:600;color:#0f172a;}
  .cell-sub{font-size:11px;color:#64748b;margin-top:2px;}
  .section-title{font-size:10px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8;font-weight:500;margin-bottom:12px;}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;}
  .footer-text{font-family:'JetBrains Mono',monospace;font-size:9px;color:#94a3b8;letter-spacing:.06em;text-transform:uppercase;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.header,.id-band{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style>
</head>
<body>
  <div class="header">
    <div class="header-brand">
      ${logoTag}
      <div>
        <div class="brand-name">JODA COMPANY</div>
        <div class="brand-sub">Gestion de Bourses &amp; Cours de Langue — Douala, Cameroun</div>
        <div class="brand-sub">NIU : M022517611037A</div>
      </div>
    </div>
    <div class="header-doc">
      <div class="doc-type">Fiche Dossier</div>
      <div class="doc-title">Profil Étudiant</div>
      <div class="doc-meta">Émis le : ${new Date().toLocaleDateString(dateLocale)}<br>Ref : ${s.id.slice(-8).toUpperCase()}</div>
    </div>
  </div>
  <div class="id-band">
    <div class="id-name">${s.prenom} ${s.nom}</div>
    <div class="id-meta">Créé le ${createdAt}<br>${s.niveau || ""} · ${s.filiere || ""}</div>
  </div>
  <div class="body">
    <div class="grid">
      <div class="cell">
        <div class="cell-label">Contact</div>
        <div class="cell-value">${s.email || "—"}</div>
        <div class="cell-sub">${(s.telephone || "").replace(/^undefined\s*/i, "") || "Pas de téléphone"}</div>
      </div>
      <div class="cell">
        <div class="cell-label">Parcours</div>
        <div class="cell-value">${s.niveau || "—"}</div>
        <div class="cell-sub">${s.diplome_acquis || "Diplôme non renseigné"}</div>
      </div>
      <div class="cell">
        <div class="cell-label">Filière</div>
        <div class="cell-value">${s.filiere || "—"}</div>
        <div class="cell-sub">${getGenderLabel(s.sexe)} · ${s.age ? s.age + " ans" : ""}</div>
      </div>
      <div class="cell">
        <div class="cell-label">Service souscrit</div>
        <div class="cell-value">${getChoiceLabel(s.choix || "")}</div>
        <div class="cell-sub">Langue : ${s.langue || "Non renseignée"}</div>
      </div>
    </div>
    <p class="section-title">Informations complémentaires</p>
    <div class="cell" style="margin-bottom:16px;">
      <div class="cell-label">Dossier créé le</div>
      <div class="cell-value">${createdAt}</div>
    </div>
    <div class="footer">
      <div class="footer-text">JODA COMPANY — Douala, Cameroun</div>
      <div class="footer-text">Confidentiel — Usage interne · ${new Date().toLocaleDateString(dateLocale)}</div>
    </div>
  </div>
</body>
</html>`;
        const win = window.open("", "_blank", "width=800,height=900");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 400);
        } finally {
            setIsPrinting(false);
        }
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

    // Revient à la première page quand un filtre appliqué change (sinon on
    // pourrait interroger une page hors limites d'un jeu de résultats plus petit).
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, genderFilter, profileFilter]);

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
            nationalite: student.nationalite ?? "",
            profil: isInternational(student.nationalite) ? "international" : "local",
        });
        setActiveTab("form");
    };

    // Synchronise les paiements selon le service souscrit :
    // - supprime les paiements en attente/retard pour les types devenus hors-service
    // - crée les paiements manquants pour les types nouvellement requis
    // - ne touche jamais aux paiements payés, en_validation ou archivés
    const syncPaymentsForStudent = async (studentId: string, choix: string, langue: string, niveau: string, nationalite?: string | null) => {
        // 1. Types attendus selon le nouveau service
        const expectedTypes = new Set<string>();
        if (choix === "procedure_seule" || choix === "procedure_cours") {
            expectedTypes.add("bourse");
        }
        const langueKey = langue?.toLowerCase().includes("mandarin") ? "mandarin"
            : langue?.toLowerCase().includes("anglais") ? "anglais"
            : null;
        if (!isInternational(nationalite) && langueKey && (choix === "cours_seuls" || choix === "procedure_cours")) {
            expectedTypes.add(langueKey);
        }

        // 2. Paiements existants avec leur statut
        const { data: existing } = await supabase
            .from("payments")
            .select("type, status")
            .eq("student_id", studentId);
        const existingPayments = existing ?? [];
        const allExistingTypes = new Set(existingPayments.map((p: { type: string }) => p.type));

        // 3. Supprimer les paiements en attente/retard pour les types hors-service
        // Les types de programme international ne sont jamais supprimés automatiquement
        const INTL_PROGRAM_TYPES = ["language_program_intl", "partial_scholarship_intl", "full_scholarship_intl"];
        const typesToRemove = [...allExistingTypes].filter(t => !expectedTypes.has(t) && !INTL_PROGRAM_TYPES.includes(t));
        if (typesToRemove.length > 0) {
            await supabase
                .from("payments")
                .delete()
                .eq("student_id", studentId)
                .in("type", typesToRemove)
                .in("status", ["attente", "retard"]);
        }

        // 4. Ajouter les paiements manquants pour les types nouvellement requis
        const toInsert: {
            student_id: string; type: string; tranche: number;
            montant: number; status: string; penalites: number; date_limite?: string;
        }[] = [];

        if (expectedTypes.has("bourse") && !allExistingTypes.has("bourse")) {
            const bourseCfg = getBourseConfig(niveau, nationalite);
            const dateLimite = new Date(Date.now() + bourseCfg.deadline_offset_days * 24 * 60 * 60 * 1000)
                .toISOString().split("T")[0];
            bourseCfg.tranches.forEach(tr =>
                toInsert.push({ student_id: studentId, type: "bourse", tranche: tr.tranche, montant: tr.montant, status: "attente", penalites: 0, date_limite: dateLimite })
            );
        }

        if (langueKey && expectedTypes.has(langueKey) && !allExistingTypes.has(langueKey)) {
            const coursCfg = getConfig(langueKey as "mandarin" | "anglais");
            const dateLimite = new Date(Date.now() + coursCfg.deadline_offset_days * 24 * 60 * 60 * 1000)
                .toISOString().split("T")[0];
            coursCfg.tranches.forEach(tr =>
                toInsert.push({ student_id: studentId, type: langueKey, tranche: tr.tranche, montant: tr.montant, status: "attente", penalites: 0, date_limite: dateLimite })
            );
        }

        if (toInsert.length > 0) {
            await supabase.from("payments").insert(toInsert);
        }
    };

    const INTL_PROGRAM_TYPES = ["language_program_intl", "partial_scholarship_intl", "full_scholarship_intl"] as const;

    const handleAssignProgram = async () => {
        if (!selectedStudent || !programForm.date_limite || isAssigningProgram) return;
        setIsAssigningProgram(true);
        try {
            // Supprimer le programme précédent non payé
            await supabase
                .from("payments")
                .delete()
                .eq("student_id", selectedStudent.id)
                .in("type", [...INTL_PROGRAM_TYPES])
                .in("status", ["attente", "retard"]);

            const cfg = getConfig(programForm.type);
            await supabase.from("payments").insert({
                student_id: selectedStudent.id,
                type: programForm.type,
                tranche: 1,
                montant: cfg.tranches[0].montant,
                status: "attente",
                penalites: 0,
                date_limite: programForm.date_limite,
            });

            // Rafraîchir les paiements affichés
            const { data } = await supabase
                .from("payments")
                .select("*")
                .eq("student_id", selectedStudent.id);
            setSelectedStudentPayments(data || []);
        } catch (err) {
            console.error("Erreur attribution programme:", err);
        } finally {
            setIsAssigningProgram(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Défense en profondeur : interdit la soumission sans la permission requise.
        if (!hasPermission(editingStudent ? "students.edit" : "students.create")) return;
        setFeedback("", "");
        setIsSubmitting(true);

        const { phoneCountryCode, profil, ...rawFormData } = formData;
        const studentData = {
            ...rawFormData,
            telephone: normalizePhoneNumber(phoneCountryCode, formData.telephone),
            age: parseInt(formData.age, 10) || 0,
            nationalite: profil === "local" ? "Camerounais" : (rawFormData.nationalite?.trim() || null),
        };

        if (studentData.age <= 0) {
            const message = t("messages.ageInvalid");
            setFeedback(message, "");
            showNotification({ title: t("messages.ageInvalidTitle"), message, type: "warning" });
            setIsSubmitting(false);
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
                await syncPaymentsForStudent(editingStudent.id, formData.choix, formData.langue, formData.niveau, formData.nationalite);

                queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
                setActiveTab("list");
                return;
            }

            // Compte les homonymes côté serveur (et non sur la liste chargée) pour
            // générer un identifiant unique même si la liste est paginée/filtrée.
            // ilike sans joker = égalité insensible à la casse (miroir de l'ancien
            // .toLowerCase() ===) ; les prénoms/noms ne contiennent pas de % ou _.
            const { count: duplicateCount } = await supabase
                .from("students")
                .select("id", { count: "exact", head: true })
                .ilike("prenom", formData.prenom.trim())
                .ilike("nom", formData.nom.trim());

            const username = buildStudentUsername(formData.prenom, formData.nom, duplicateCount ?? 0);
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
            await syncPaymentsForStudent(data.id, formData.choix, formData.langue, formData.niveau, formData.nationalite);

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
            queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
        } catch (err) {
            console.error("Erreur:", err);
            setSubmitError(t("messages.submitError"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!studentToDelete) {
            return;
        }
        if (!hasPermission("students.delete")) return;
        setIsDeleting(true);
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
            queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
        } catch (err) {
            console.error("Erreur:", err);
            setSubmitError(t("messages.deleteError"));
        } finally {
            setIsDeleting(false);
        }
    };

    const resetForm = () => {
        setSubmitError("");
        setEditingStudent(null);
        setFormData(emptyFormData);
        setActiveTab("list");
    };

    const canCreate = hasPermission("students.create");
    const canEdit = hasPermission("students.edit");
    const canDelete = hasPermission("students.delete");

    return (
        <>
            <ProtectedRoute requiredRole="agent" requiredPermission="students.view">
                <div className="space-y-6 p-4 sm:p-6">
                    <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                                {t("tag")}
                            </p>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
                                {t("title")}
                            </h1>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {t("subtitle")}
                            </p>
                        </div>
                        {canCreate && <Button onClick={openCreateForm} className="bg-red-600 hover:bg-red-700 text-white">{t("addButton")}</Button>}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("stats.total")}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.total}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("stats.totalSub")}</p>
                            </CardContent>
                        </Card>
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("stats.women")}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.women}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("stats.womenSub")}</p>
                            </CardContent>
                        </Card>
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("stats.men")}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.men}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("stats.menSub")}</p>
                            </CardContent>
                        </Card>
                        <Card className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("stats.languages")}</p>
                                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{stats.withLanguages}</p>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("stats.languagesSub")}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {operationMessage && (
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                            {operationMessage}
                        </div>
                    )}

                    {submitError && activeTab === "list" && (
                        <div className="rounded-xl border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
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
                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px] md:items-end">
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
                                        <FilterSelect
                                            label={t("list.filterProfile")}
                                            value={profileFilter}
                                            onChange={setProfileFilter}
                                            options={[
                                                { value: "local", label: t("list.filterLocal") },
                                                { value: "international", label: t("list.filterInternational") },
                                            ]}
                                            placeholder={t("list.filterProfileAll")}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <div className="py-8 text-center text-slate-500 dark:text-slate-400">{t("loading")}</div>
                                    ) : students.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-12 text-center">
                                            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">{t("list.empty")}</p>
                                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
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
                                                    {students.map((student) => (
                                                    <TableRow
                                                        key={student.id}
                                                        className="cursor-default"
                                                    >
                                                        <TableCell>
                                                            <div className="font-medium">
                                                                {student.prenom} {student.nom}
                                                            </div>
                                                            <div className="text-sm text-slate-500 dark:text-slate-400">
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
                                                totalCount={totalCount}
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
                                className="flex w-full max-w-2xl flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
                                style={{ maxHeight: "90vh" }}
                                initial={{ scale: 0.94, y: 20, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.94, opacity: 0 }}
                            >
                                {/* En-tête fixe */}
                                <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-700 p-6 pb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{selectedStudent.prenom} {selectedStudent.nom}</h3>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <Badge variant="outline">{selectedStudent.niveau}</Badge>
                                            <Badge variant="secondary">{selectedStudent.filiere}</Badge>
                                            <Badge variant="outline">{getGenderLabel(selectedStudent.sexe)}</Badge>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="border-0 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-white dark:hover:bg-slate-700" onClick={() => setSelectedStudent(null)}>✕</Button>
                                </div>

                                {/* Corps défilable */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                    {/* Infos de base */}
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                            <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.contact")}</p>
                                            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{selectedStudent.email}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{(selectedStudent.telephone || "").replace(/^undefined\s*/i, "") || t("detail.phoneNone")}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                            <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.path")}</p>
                                            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{selectedStudent.niveau}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{selectedStudent.diplome_acquis || t("detail.diplomaNone")}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                            <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.language")}</p>
                                            <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{selectedStudent.langue || t("detail.languageNone")}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                            <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.service")}</p>
                                            <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                                                {getChoiceLabel(selectedStudent.choix)}
                                            </p>
                                        </div>
                                        {selectedStudent.nationalite && (
                                            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                                <p className="text-xs uppercase tracking-wider text-slate-400">Nationalité</p>
                                                <p className="mt-2 text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                                    {selectedStudent.nationalite}
                                                    {isInternational(selectedStudent.nationalite) && (
                                                        <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">International</span>
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                                        <p className="text-xs uppercase tracking-wider text-slate-400">{t("detail.createdAt")}</p>
                                        <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">{new Date(selectedStudent.created_at).toLocaleString(dateLocale)}</p>
                                    </div>

                                    {/* Programme international */}
                                    {isInternational(selectedStudent.nationalite) && (selectedStudent.choix === "procedure_seule" || selectedStudent.choix === "procedure_cours") && (
                                        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
                                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                                                Programme International
                                            </p>
                                            {(() => {
                                                const currentProgram = selectedStudentPayments.find(p => (INTL_PROGRAM_TYPES as readonly string[]).includes(p.type));
                                                return currentProgram ? (
                                                    <div className="mb-3 rounded-lg bg-blue-100 dark:bg-blue-900/40 px-3 py-2 text-sm flex flex-wrap items-center gap-x-1">
                                                        <span className="text-slate-500 dark:text-slate-400">Programme actuel :</span>
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                                            {currentProgram.type === "language_program_intl" ? "Language Program" : currentProgram.type === "partial_scholarship_intl" ? "Partial Scholarship" : "Full Scholarship"}
                                                        </span>
                                                        <span className="text-slate-500 dark:text-slate-400">
                                                            — {currentProgram.montant.toLocaleString("en-US")} $ · Échéance {new Date(currentProgram.date_limite).toLocaleDateString()}
                                                        </span>
                                                        {currentProgram.status === "paye" && (
                                                            <span className="inline-flex rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-300">Payé</span>
                                                        )}
                                                    </div>
                                                ) : null;
                                            })()}
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                                <div className="flex-1">
                                                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Programme</label>
                                                    <Select
                                                        value={programForm.type}
                                                        onValueChange={(v) => setProgramForm(f => ({ ...f, type: v as typeof f.type }))}
                                                    >
                                                        <SelectTrigger className="h-9 w-full">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="language_program_intl">Language Program — $749</SelectItem>
                                                            <SelectItem value="partial_scholarship_intl">Partial Scholarship — $1 100</SelectItem>
                                                            <SelectItem value="full_scholarship_intl">Full Scholarship — $1 499</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Échéance</label>
                                                    <Input
                                                        type="date"
                                                        value={programForm.date_limite}
                                                        onChange={(e) => setProgramForm(f => ({ ...f, date_limite: e.target.value }))}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <Button
                                                    size="sm"
                                                    onClick={handleAssignProgram}
                                                    disabled={!programForm.date_limite || isAssigningProgram}
                                                    className="h-9"
                                                >
                                                    {isAssigningProgram && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Assigner
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Échéancier paiements */}
                                    <div>
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                            {t("detail.payments")}
                                        </p>
                                        <div className="admin-payment-wrapper">
                                            <PaymentOverview
                                                choix={selectedStudent.choix}
                                                langue={selectedStudent.langue || ""}
                                                niveau={selectedStudent.niveau || ""}
                                                nationalite={selectedStudent.nationalite}
                                                payments={selectedStudentPayments}
                                                onDownloadReceipt={(p) =>
                                                    downloadReceipt(p, {
                                                        nom: selectedStudent.nom,
                                                        prenom: selectedStudent.prenom,
                                                        email: selectedStudent.email,
                                                        telephone: selectedStudent.telephone,
                                                        niveau: selectedStudent.niveau,
                                                        filiere: selectedStudent.filiere,
                                                        nationalite: selectedStudent.nationalite ?? null,
                                                    }, { includeDuplicata: true })
                                                }
                                            />
                                        </div>
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
                                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 dark:border-slate-700 px-6 py-4">
                                    <Button
                                        variant="outline"
                                        className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                        disabled={isPrinting}
                                        onClick={() => void printStudentCard(selectedStudent)}
                                    >
                                        {isPrinting
                                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            : <Printer className="mr-2 h-4 w-4" />}
                                        {t("actions.printCard") || "Imprimer fiche"}
                                    </Button>
                                    {canEdit && (
                                        <Button
                                            variant="outline"
                                            className="dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                                            onClick={() => {
                                                openEditForm(selectedStudent);
                                                setSelectedStudent(null);
                                            }}
                                        >
                                            <Edit className="mr-2 h-4 w-4" />
                                            {t("actions.edit")}
                                        </Button>
                                    )}
                                    <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setSelectedStudent(null)}>{t("actions.close")}</Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {activeTab === "form" && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
                        <Card className="w-full max-w-3xl border-0 shadow-2xl">
                            <CardHeader className="border-b border-slate-100 dark:border-slate-700">
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
                                        <div className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
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
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label>Profil</Label>
                                            <Select
                                                value={formData.profil}
                                                onValueChange={(v) => {
                                                    const intl = v === "international";
                                                    setFormData({
                                                        ...formData,
                                                        profil: v as "local" | "international",
                                                        choix: intl ? "procedure_seule" : formData.choix,
                                                        langue: intl ? "" : formData.langue,
                                                        nationalite: intl ? formData.nationalite : "",
                                                    });
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="local">Local</SelectItem>
                                                    <SelectItem value="international">International</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {formData.profil === "international" && (
                                            <div className="space-y-2">
                                                <Label htmlFor="nationalite">Nationalité</Label>
                                                <Input
                                                    id="nationalite"
                                                    value={formData.nationalite}
                                                    onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                                                    placeholder="Ex : Sénégalais, Gabonais…"
                                                />
                                            </div>
                                        )}
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
                                        {formData.profil === "local" && (
                                            <div className="space-y-2">
                                                <Label htmlFor="langue">{t("form.language")}</Label>
                                                <Input
                                                    id="langue"
                                                    value={formData.langue}
                                                    onChange={(e) => setFormData({ ...formData, langue: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor="choix">{t("form.choice")}</Label>
                                            {formData.profil === "international" ? (
                                                <div className="flex h-9 items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 text-sm text-slate-500 dark:text-slate-400">
                                                    {t("form.procedure_seule")} — étudiant international
                                                </div>
                                            ) : (
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
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button type="button" variant="outline" disabled={isSubmitting} onClick={resetForm}>
                                            {t("actions.cancel")}
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl"
                            initial={{ scale: 0.94, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.94, opacity: 0 }}
                        >
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("delete.title")}</h3>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                {t("delete.message", { name: `${studentToDelete.prenom} ${studentToDelete.nom}` })}
                            </p>
                            <div className="mt-6 flex justify-end gap-2">
                                <Button variant="outline" disabled={isDeleting} onClick={() => setStudentToDelete(null)}>
                                    {t("delete.cancel")}
                                </Button>
                                <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl"
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
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t("createdAccount.title")}</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("createdAccount.subtitle")}</p>
                            </div>
                            <div className="mb-5 space-y-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("createdAccount.username")}</span>
                                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">{createdAccount.username}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("createdAccount.tempPassword")}</span>
                                    <span className="font-mono text-sm font-bold text-red-600">{createdAccount.password}</span>
                                </div>
                            </div>
                            <p className="mb-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-500 dark:text-slate-400">
                                {t("createdAccount.info")}
                            </p>
                            <p className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-600 dark:text-amber-400">
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
