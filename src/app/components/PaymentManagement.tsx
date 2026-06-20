"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { useQueryClient } from '@tanstack/react-query';
import { usePayments, PAYMENTS_KEY } from '../lib/hooks/use-payments';
import { useStudents } from '../lib/hooks/use-students';
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import ConfirmDialog from "./ConfirmDialog";
import { calculatePenalty } from "../utils/penaltyCalculator";
import { logActivity } from "../utils/activityLogger";
import { downloadReceipt } from "../utils/downloadReceipt";
import ProtectedRoute from "./ProtectedRoute";
import { usePaymentConfig } from "../context/PaymentConfigContext";
import { isInternational } from "../types/payment-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Edit, Eye, FileText, Loader2, Printer, Send, XCircle } from "lucide-react";
import DropdownMenu from "./shared/DropdownMenu";

interface Student {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    niveau?: string;
    nationalite?: string | null;
}

interface Payment {
    id: string;
    student_id: string;
    type: string;
    tranche: number | null;
    montant: number;
    montant_paye?: number;
    montant_declare?: number;
    status: string;
    date_limite: string;
    date_paiement: string | null;
    penalites: number;
    facture_url: string | null;
    recu_url: string | null;
    validated_by: string | null;
    validated_at: string | null;
    created_at: string;
    initiated_by_student?: boolean;
    rejection_reason?: string | null;
    rejected_at?: string | null;
}

function formatPrice(amount: number, nationalite?: string | null): string {
    return isInternational(nationalite)
        ? amount.toLocaleString("en-US") + " $"
        : amount.toLocaleString("fr-FR") + " FCFAs";
}

export default function PaymentManagement() {
    const { user } = useAuth();
    const t = useTranslations("paymentManagement");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const { showNotification } = useNotificationContext();
    const { getConfig, getBourseConfig } = usePaymentConfig();
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean; title: string; description: string;
    }>({ open: false, title: '', description: '' });
    const closeConfirm = () => setConfirmDialog(s => ({ ...s, open: false }));
    const [pendingValidateAction, setPendingValidateAction] = useState<(() => Promise<void>) | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const queryClient = useQueryClient();
    const { data: _paymentsData = [], isLoading: loading } = usePayments();
    const payments = _paymentsData as unknown as Payment[];
    const { data: _studentsData = [] } = useStudents();
    const students = _studentsData as unknown as Student[];
    const syncedRef = useRef(false);
    const [selectedStudent, setSelectedStudent] = useState<string | "">("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [editForm, setEditForm] = useState({ montant: "", date_limite: "", type: "", tranche: "" });
    const [saving, setSaving] = useState(false);
    const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [rejectModal, setRejectModal] = useState<{ open: boolean; paymentId: string; reason: string }>({ open: false, paymentId: '', reason: '' });

    const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

    const INTL_PROGRAM_TYPES = ["language_program_intl", "partial_scholarship_intl", "full_scholarship_intl"] as const;

    const resolvePenaltyConfig = useCallback(
        (payment: Payment, sMap: Map<string, Student>) => {
            const isKnownType = ["mandarin", "anglais", ...INTL_PROGRAM_TYPES].includes(payment.type as never);
            if (isKnownType) {
                const cfg = getConfig(payment.type as "mandarin" | "anglais" | "language_program_intl" | "partial_scholarship_intl" | "full_scholarship_intl");
                return { grace_days: cfg.grace_days, daily_penalty: cfg.daily_penalty };
            }
            const student = sMap.get(payment.student_id);
            const cfg = getBourseConfig(student?.niveau, student?.nationalite);
            return { grace_days: cfg.grace_days, daily_penalty: cfg.daily_penalty };
        },
        [getConfig, getBourseConfig]
    );

    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.nom} ${student.prenom}` : t("fallback.unknownStudent");
    };


    // Persist calculated penalties and overdue status to the database
    const syncPenalties = async (currentPayments: Payment[], studentList: Student[]) => {
        const sMap = new Map(studentList.map((s) => [s.id, s]));
        const updates = currentPayments
            .filter(p => p.status !== 'paye' && p.date_limite)
            .map(p => ({ payment: p, penalty: calculatePenalty(p, resolvePenaltyConfig(p, sMap)) }))
            .filter(({ payment, penalty }) =>
                penalty !== (payment.penalites ?? 0) ||
                (penalty > 0 && payment.status === 'attente')
            );

        if (updates.length === 0) return;

        // Recalcul des pénalités (best-effort, rejoué au prochain montage). Un insert
        // PostgREST ne throw pas : on logge les échecs au lieu de les avaler.
        const results = await Promise.all(updates.map(({ payment, penalty }) =>
            supabase.from('payments').update({
                penalites: penalty,
                status: penalty > 0 ? 'retard' : payment.status,
            }).eq('id', payment.id)
        ));
        const failed = results.filter((r) => r.error);
        if (failed.length > 0) {
            console.error(`Sync pénalités : ${failed.length} échec(s)`, failed[0].error);
        }
    };

    useEffect(() => {
        if (payments.length > 0 && !syncedRef.current) {
            syncedRef.current = true;
            syncPenalties(payments, students).then(() => {
                queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
            });
        }
    }, [payments, students]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleValidateConfirm = async () => {
        if (!pendingValidateAction) return;
        setIsValidating(true);
        try {
            await pendingValidateAction();
        } finally {
            setIsValidating(false);
            closeConfirm();
            setPendingValidateAction(null);
        }
    };

    // Agent: submit a payment for admin review
    const handleSubmitForValidation = async (paymentId: string) => {
        if (!user || isSubmittingId) return;
        setIsSubmittingId(paymentId);
        try {
            const { error: submitError } = await supabase.from('payments').update({
                status: 'en_validation',
            }).eq('id', paymentId);
            if (submitError) {
                console.error("Erreur soumission:", submitError);
                showNotification(t("messages.submitError"), "error");
                return;
            }
            await logActivity(
                user.id, user.name, user.role,
                "payment_update", "payment", paymentId,
                `Paiement soumis pour validation`,
                { payment_id: paymentId }
            );
            showNotification(t("messages.submitSuccess"), "success");
            queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
        } catch (error) {
            console.error("Erreur soumission:", error);
            showNotification(t("messages.submitError"), "error");
        } finally {
            setIsSubmittingId(null);
        }
    };

    // Staff: approve or reject a payment in validation (admin always, others for student-initiated)
    const handleValidatePayment = async (paymentId: string, isValid: boolean, rejectionReason?: string) => {
        if (!user) return;
        const localPayment = payments.find(p => p.id === paymentId);
        const isAdminLike = user.role === "admin" || user.role === "super_admin";
        const isStaff = user.role === "agent" || user.role === "supervisor";
        if (!isAdminLike && !(isStaff && localPayment?.initiated_by_student)) return;
        try {
            // 1. Récupérer les infos du paiement
            const { data: payment, error: fetchError } = await supabase
                .from('payments')
                .select('*, students(nom, prenom)')
                .eq('id', paymentId)
                .single();

            if (fetchError || !payment) {
                console.error("Erreur récupération paiement:", fetchError);
                return;
            }

            // 2. Calcul du règlement partiel.
            //    Montant validé = montant déclaré en attente, sinon (compat. soumission
            //    staff sans déclaration) le reste dû de la tranche.
            const montantPaye = Number(payment.montant_paye ?? 0);
            const montantDeclare = Number(payment.montant_declare ?? 0);
            const validatedAmount = montantDeclare > 0
                ? montantDeclare
                : Math.max(0, payment.montant - montantPaye);
            const newMontantPaye = montantPaye + validatedAmount;
            const fullySettled = newMontantPaye >= payment.montant;

            // 3. Mettre à jour le paiement. Validé mais incomplet => reste « attente »
            //    (la tranche reste due, le solde restant apparaît dans la barre).
            const nowIso = new Date().toISOString();
            const { error: updateError } = await supabase.from('payments').update({
                status: isValid ? (fullySettled ? 'paye' : 'attente') : 'retard',
                montant_paye: isValid ? newMontantPaye : montantPaye,
                montant_declare: 0,
                validated_by: user.id,
                validated_at: nowIso,
                date_paiement: isValid && fullySettled ? nowIso : (isValid ? payment.date_paiement : null),
                rejection_reason: isValid ? null : (rejectionReason ?? null),
                rejected_at: isValid ? null : nowIso,
            }).eq('id', paymentId);

            // Échec de la mise à jour du paiement : on s'arrête net, rien n'a changé
            // d'irréversible. Surtout, on n'affiche pas un faux « validé » à l'agent.
            if (updateError) {
                console.error("Erreur mise à jour paiement:", updateError);
                showNotification(t("messages.validateError"), "error");
                return;
            }

            // 4. Si validé, créer une entrée comptable du montant réellement réglé.
            const typeEntree = payment.type === 'mandarin' || payment.type === 'anglais'
                ? 'paiement_cours'
                : 'paiement_procedure';
            const studentName = payment.students
                ? `${payment.students.nom} ${payment.students.prenom}`
                : t("fallback.student");
            const description = `${t("detail.type")} ${getTypeLabel(payment.type)} - ${t("detail.installment")} ${payment.tranche || 'N/A'} - ${studentName}`;

            if (isValid) {
                const { error: accountingError } = await supabase.from('entrees_comptables').insert({
                    montant: validatedAmount,
                    date: new Date().toISOString(),
                    type: typeEntree,
                    description: description,
                    student_id: payment.student_id,
                    payment_id: payment.id,
                    created_by: user.id,
                });

                // Le paiement est déjà passé « payé » : si la compta échoue, on ne peut
                // pas le masquer. On alerte explicitement l'agent pour régularisation
                // (sinon de l'argent encaissé n'apparaît jamais en comptabilité).
                if (accountingError) {
                    console.error("Erreur écriture comptable:", accountingError);
                    showNotification(t("messages.accountingEntryError"), "error");
                    queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
                    return;
                }
            }

            await logActivity(
                user.id, user.name, user.role,
                "payment_validate", "payment", paymentId,
                isValid
                    ? `Paiement approuvé — ${description}`
                    : `Paiement rejeté — ${description}`,
                { payment_id: paymentId, validated: isValid, montant: validatedAmount }
            );
            if (isValid) {
                await logActivity(
                    user.id, user.name, user.role,
                    "accounting_entry", "entrees_comptables", paymentId,
                    `Entrée comptable créée — ${description}`,
                    { montant: validatedAmount, type: typeEntree }
                );
            }
            showNotification(isValid ? t("messages.approveSuccess") : t("messages.rejectSuccess"), isValid ? "success" : "error");
            queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });

            // Notifier l'étudiant par email + SMS + notif in-app + message direct (fire-and-forget)
            fetch('/api/notify-payment-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: payment.student_id,
                    isValid,
                    paymentType: payment.type,
                    tranche: payment.tranche,
                    amount: validatedAmount,
                    rejectionReason: rejectionReason ?? null,
                }),
            }).catch(console.error);
        } catch (error) {
            console.error("Erreur validation:", error);
            showNotification(t("messages.validateError"), "error");
        }
    };

    const openEdit = (payment: Payment) => {
        setEditingPayment(payment);
        setEditForm({
            montant: payment.montant.toString(),
            date_limite: payment.date_limite ? payment.date_limite.slice(0, 10) : "",
            type: payment.type,
            tranche: payment.tranche?.toString() || "",
        });
    };

    const handleUpdatePayment = async () => {
        if (!editingPayment || !user) return;
        setSaving(true);
        try {
            // type/tranche sont contraints en base (payments_type_check, _tranche_check) :
            // un insert PostgREST ne throw pas, on inspecte l'erreur pour ne pas afficher
            // un faux « mis à jour ».
            const { error: editError } = await supabase.from("payments").update({
                montant: parseInt(editForm.montant, 10),
                date_limite: editForm.date_limite || null,
                type: editForm.type,
                tranche: editForm.tranche ? parseInt(editForm.tranche, 10) : null,
            }).eq("id", editingPayment.id);
            if (editError) {
                console.error("Erreur modification paiement:", editError);
                showNotification(t("messages.updateError"), "error");
                return;
            }
            await logActivity(
                user.id, user.name, user.role,
                "payment_update", "payment", editingPayment.id,
                `Paiement modifié — ${getStudentName(editingPayment.student_id)}`,
                { payment_id: editingPayment.id }
            );
            showNotification(t("messages.updateSuccess"), "success");
            setEditingPayment(null);
            queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
        } catch (err) {
            showNotification(t("messages.updateError"), "error");
        } finally {
            setSaving(false);
        }
    };

    const handlePrintReceipt = async (payment: Payment) => {
        const student = students.find(s => s.id === payment.student_id);
        if (!student) return;
        setIsPrinting(true);
        try {
            await downloadReceipt(
                { id: payment.id, type: payment.type, tranche: payment.tranche, montant: payment.montant, status: payment.status, date_paiement: payment.date_paiement, validated_by: payment.validated_by, validated_at: payment.validated_at },
                { nom: student.nom, prenom: student.prenom, email: student.email, telephone: student.telephone, niveau: student.niveau ?? "", filiere: "", nationalite: student.nationalite ?? null },
                { includeDuplicata: true }
            );
        } finally {
            setIsPrinting(false);
        }
    };

    const confirmApprove = (paymentId: string) => {
        setPendingValidateAction(() => async () => { await handleValidatePayment(paymentId, true); });
        setConfirmDialog({ open: true, title: t("confirm.approveTitle"), description: t("confirm.approveDescription") });
    };

    const confirmReject = (paymentId: string) => {
        setRejectModal({ open: true, paymentId, reason: '' });
    };

    const handleRejectWithReason = async () => {
        if (!rejectModal.paymentId) return;
        setIsValidating(true);
        try {
            await handleValidatePayment(rejectModal.paymentId, false, rejectModal.reason.trim() || undefined);
        } finally {
            setIsValidating(false);
            setRejectModal({ open: false, paymentId: '', reason: '' });
        }
    };

    const filteredPayments = payments.filter(payment => {
        const studentMatch = !selectedStudent || payment.student_id === selectedStudent;
        const statusMatch = filterStatus === "all" || payment.status === filterStatus;
        return studentMatch && statusMatch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paye": return "default";
            case "attente": return "secondary";
            case "retard": return "destructive";
            case "en_validation": return "outline";
            default: return "secondary";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "paye": return t("status.paid");
            case "attente": return t("status.pending");
            case "retard": return t("status.late");
            case "en_validation": return t("status.validation");
            default: return status;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "bourse": return t("types.scholarship");
            case "mandarin": return t("types.mandarin");
            case "anglais": return t("types.english");
            case "language_program_intl": return "Language Program";
            case "partial_scholarship_intl": return "Partial Scholarship";
            case "full_scholarship_intl": return "Full Scholarship";
            default: return type;
        }
    };

    const getStudentNat = (studentId: string) => studentMap.get(studentId)?.nationalite;

    const isAdminLike = user?.role === "admin" || user?.role === "super_admin";
    const canValidate = isAdminLike;
    const canValidatePayment = (p: Payment) =>
        isAdminLike || ((user?.role === "agent" || user?.role === "supervisor") && !!p.initiated_by_student);

    return (
        <ProtectedRoute requiredRole="agent">
            <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{color: '#dc2626'}}>
                        {t("title")}
                    </h1>
                </div>

                <Card className="mb-6">
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("filters.student")}</Label>
                                <select
                                    value={selectedStudent}
                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                    className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer dark:[color-scheme:dark]"
                                >
                                    <option value="">{t("filters.allStudents")}</option>
                                    {students.map(student => (
                                        <option key={student.id} value={student.id}>
                                            {student.nom} {student.prenom}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("filters.status")}</Label>
                                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || "all")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("filters.allStatuses")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
                                        <SelectItem value="attente">{t("status.pending")}</SelectItem>
                                        <SelectItem value="en_validation">{t("status.validation")}</SelectItem>
                                        <SelectItem value="paye">{t("status.paid")}</SelectItem>
                                        <SelectItem value="retard">{t("status.late")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t("list.title", { count: filteredPayments.length })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">{t("list.loading")}</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("table.student")}</TableHead>
                                        <TableHead>{t("table.type")}</TableHead>
                                        <TableHead>{t("table.amount")}</TableHead>
                                        <TableHead>{t("table.penalty")}</TableHead>
                                        <TableHead>{t("table.dueDate")}</TableHead>
                                        <TableHead>{t("table.status")}</TableHead>
                                        <TableHead>{t("table.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPayments.map(payment => {
                                        const penalty = calculatePenalty(payment, resolvePenaltyConfig(payment, studentMap));
                                        const totalAmount = payment.montant + penalty;
                                        
                                        return (
                                            <TableRow key={payment.id} className={payment.initiated_by_student && payment.status === "en_validation" ? "bg-blue-50 dark:bg-blue-900/20/50" : ""}>
                                                <TableCell>
                                                    <div className="font-medium">{getStudentName(payment.student_id)}</div>
                                                    {payment.initiated_by_student && (
                                                        <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                                                            {t("badges.declaredByStudent")}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getTypeLabel(payment.type)}</TableCell>
                                                <TableCell>
                                                    <div>{formatPrice(payment.montant, getStudentNat(payment.student_id))}</div>
                                                    {penalty > 0 && (
                                                        <div className="text-xs text-red-600">
                                                            + {formatPrice(penalty, getStudentNat(payment.student_id))} ({t("table.penalty").toLowerCase()})
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-red-600">
                                                    {penalty > 0 ? formatPrice(penalty, getStudentNat(payment.student_id)) : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {payment.date_limite
                                                        ? new Date(payment.date_limite).toLocaleDateString(dateLocale)
                                                        : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusColor(payment.status) as any}>
                                                        {getStatusLabel(payment.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu
                                                        actions={[
                                                            {
                                                                label: t("actions.details"),
                                                                icon: <Eye className="h-4 w-4" />,
                                                                onClick: () => setDetailPayment(payment),
                                                            },
                                                            ...(canValidate
                                                                ? [
                                                                      {
                                                                          label: t("actions.edit"),
                                                                          icon: <Edit className="h-4 w-4" />,
                                                                          onClick: () => openEdit(payment),
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...(payment.status === "paye"
                                                                ? [
                                                                      {
                                                                          label: t("actions.printReceipt"),
                                                                          icon: isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />,
                                                                          onClick: () => handlePrintReceipt(payment),
                                                                          disabled: isPrinting,
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...(user?.role === "agent" && !payment.initiated_by_student && (payment.status === "attente" || payment.status === "retard")
                                                                ? [
                                                                      {
                                                                          label: t("actions.submit"),
                                                                          icon: isSubmittingId === payment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />,
                                                                          onClick: () => handleSubmitForValidation(payment.id),
                                                                          disabled: !!isSubmittingId,
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...(canValidatePayment(payment) && payment.status === "en_validation"
                                                                ? [
                                                                      {
                                                                          label: t("actions.approve"),
                                                                          icon: <CheckCircle2 className="h-4 w-4" />,
                                                                          onClick: () => confirmApprove(payment.id),
                                                                      },
                                                                      {
                                                                          label: t("actions.reject"),
                                                                          icon: <XCircle className="h-4 w-4" />,
                                                                          onClick: () => confirmReject(payment.id),
                                                                          variant: "danger" as const,
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...(canValidate && (payment.status === "attente" || payment.status === "retard")
                                                                ? [
                                                                      {
                                                                          label: t("actions.validate"),
                                                                          icon: <CheckCircle2 className="h-4 w-4" />,
                                                                          onClick: () => confirmApprove(payment.id),
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...(payment.facture_url
                                                                ? [
                                                                      {
                                                                          label: payment.initiated_by_student ? t("actions.viewProof") : t("actions.viewInvoice"),
                                                                          icon: <FileText className="h-4 w-4" />,
                                                                          onClick: () => window.open(payment.facture_url!, "_blank", "noopener,noreferrer"),
                                                                      },
                                                                  ]
                                                                : []),
                                                        ]}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                        {filteredPayments.length === 0 && !loading && (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                {t("list.empty")}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        <ConfirmDialog
            isOpen={confirmDialog.open}
            onClose={closeConfirm}
            onConfirm={handleValidateConfirm}
            title={confirmDialog.title}
            description={confirmDialog.description}
            confirmLabel={t("actions.confirm")}
            isLoading={isValidating}
        />

        {/* Modal détails paiement */}
        {detailPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{t("detail.title")}</h3>
                        <button onClick={() => setDetailPayment(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 text-xl">&times;</button>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 dark:text-slate-400">{t("detail.student")}</span>
                            <span className="font-medium">{getStudentName(detailPayment.student_id)}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 dark:text-slate-400">{t("detail.type")}</span>
                            <span className="font-medium">{getTypeLabel(detailPayment.type)}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 dark:text-slate-400">{t("detail.installment")}</span>
                            <span className="font-medium">{detailPayment.tranche ?? "-"}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 dark:text-slate-400">{t("detail.amount")}</span>
                            <span className="font-medium text-emerald-600">{formatPrice(detailPayment.montant, getStudentNat(detailPayment.student_id))}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 dark:text-slate-400">{t("detail.penalty")}</span>
                            <span className="font-medium text-red-600">{calculatePenalty(detailPayment, resolvePenaltyConfig(detailPayment, studentMap)) > 0 ? formatPrice(calculatePenalty(detailPayment, resolvePenaltyConfig(detailPayment, studentMap)), getStudentNat(detailPayment.student_id)) : "-"}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 dark:text-slate-400">{t("detail.dueDate")}</span>
                            <span className="font-medium">{detailPayment.date_limite ? new Date(detailPayment.date_limite).toLocaleDateString(dateLocale) : "-"}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 dark:text-slate-400">{t("detail.paymentDate")}</span>
                            <span className="font-medium">{detailPayment.date_paiement ? new Date(detailPayment.date_paiement).toLocaleDateString(dateLocale) : "-"}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 dark:text-slate-400">{t("detail.status")}</span>
                            <span className={`font-medium ${detailPayment.status === "paye" ? "text-emerald-600" : detailPayment.status === "retard" ? "text-red-600" : "text-amber-600 dark:text-amber-400"}`}>
                                {getStatusLabel(detailPayment.status)}
                            </span>
                        </div>
                        <div className="flex justify-between border-b pb-2">
                            <span className="text-slate-500 dark:text-slate-400">{t("detail.createdAt")}</span>
                            <span className="font-medium">{new Date(detailPayment.created_at).toLocaleDateString(dateLocale)}</span>
                        </div>
                        {detailPayment.rejection_reason && (
                            <div className="flex justify-between border-b pb-2">
                                <span className="text-slate-500 dark:text-slate-400">{t("detail.rejectionReason")}</span>
                                <span className="font-medium text-red-600 text-right max-w-[60%]">{detailPayment.rejection_reason}</span>
                            </div>
                        )}
                        {detailPayment.rejected_at && (
                            <div className="flex justify-between">
                                <span className="text-slate-500 dark:text-slate-400">{t("detail.rejectedAt")}</span>
                                <span className="font-medium">{new Date(detailPayment.rejected_at).toLocaleDateString(dateLocale)}</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-5 flex gap-2">
                        {detailPayment.status === "paye" && (
                            <Button size="sm" onClick={() => handlePrintReceipt(detailPayment)} disabled={isPrinting} className="bg-emerald-600 hover:bg-emerald-700">
                                {isPrinting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("actions.printReceiptShort")}
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setDetailPayment(null)}>{t("actions.close")}</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal rejet avec motif */}
        {rejectModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-red-600">{t("confirm.rejectTitle")}</h3>
                        <button onClick={() => setRejectModal({ open: false, paymentId: '', reason: '' })} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 text-xl">&times;</button>
                    </div>
                    <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{t("confirm.rejectDescription")}</p>
                    <div className="space-y-2">
                        <Label>{t("rejectModal.reasonLabel")}</Label>
                        <textarea
                            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
                            rows={4}
                            placeholder={t("rejectModal.reasonPlaceholder")}
                            value={rejectModal.reason}
                            onChange={e => setRejectModal(s => ({ ...s, reason: e.target.value }))}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t("rejectModal.reasonHint")}</p>
                    </div>
                    <div className="mt-5 flex gap-2">
                        <Button
                            onClick={handleRejectWithReason}
                            disabled={isValidating}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("actions.reject")}
                        </Button>
                        <Button variant="outline" onClick={() => setRejectModal({ open: false, paymentId: '', reason: '' })} disabled={isValidating}>
                            {t("actions.cancel")}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Modal modification paiement */}
        {editingPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{t("edit.title")}</h3>
                        <button onClick={() => setEditingPayment(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 text-xl">&times;</button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label>{t("edit.amount")}</Label>
                            <Input type="number" value={editForm.montant} onChange={e => setEditForm(f => ({ ...f, montant: e.target.value }))} />
                        </div>
                        <div>
                            <Label>{t("edit.type")}</Label>
                            <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v || f.type }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bourse">{t("types.scholarship")}</SelectItem>
                                    <SelectItem value="mandarin">{t("types.mandarin")}</SelectItem>
                                    <SelectItem value="anglais">{t("types.english")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>{t("edit.installment")}</Label>
                            <Input type="number" min="1" value={editForm.tranche} onChange={e => setEditForm(f => ({ ...f, tranche: e.target.value }))} />
                        </div>
                        <div>
                            <Label>{t("edit.dueDate")}</Label>
                            <Input type="date" value={editForm.date_limite} onChange={e => setEditForm(f => ({ ...f, date_limite: e.target.value }))} />
                        </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                        <Button onClick={handleUpdatePayment} disabled={saving} style={{ backgroundColor: "#dc2626" }}>
                            {saving ? t("actions.saving") : t("actions.save")}
                        </Button>
                        <Button variant="outline" onClick={() => setEditingPayment(null)}>{t("actions.cancel")}</Button>
                    </div>
                </div>
            </div>
        )}
        </ProtectedRoute>
    );
}
