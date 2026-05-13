"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { logActivity } from "../utils/activityLogger";
import ProtectedRoute from "./ProtectedRoute";
import { calculatePenalty } from "../utils/penaltyCalculator";
import { usePaymentConfig } from "../context/PaymentConfigContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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



interface CoursePayment {
    id: string;
    student_id: string;
    type: string;
    tranche: number | null;
    montant: number;
    status: string;
    date_limite: string;
    date_paiement: string | null;
    penalites: number;
    validated_by: string | null;
    validated_at: string | null;
    created_at: string;
}

interface Student {
    id: string;
    nom: string;
    prenom: string;
    email: string;
}

function formatPrice(n: number): string {
    return n.toLocaleString("fr-FR") + " FCFA";
}

export default function CoursLangues() {
    const { user } = useAuth();
    const t = useTranslations("languageCourses");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const { showNotification } = useNotificationContext();
    const { getConfig } = usePaymentConfig();

    const [payments, setPayments] = useState<CoursePayment[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        studentId: "",
        type: "mandarin",
        dateLimit: new Date(Date.now() + (getConfig("mandarin").deadline_offset_days) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [paymentsRes, studentsRes] = await Promise.all([
                supabase
                    .from("payments")
                    .select("*")
                    .in("type", ["mandarin", "anglais"])
                    .order("created_at", { ascending: false }),
                supabase.from("students").select("id, nom, prenom, email"),
            ]);
            setPayments(paymentsRes.data || []);
            setStudents(studentsRes.data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const getStudentName = (id: string) => {
        const s = students.find(s => s.id === id);
        return s ? `${s.prenom} ${s.nom}` : t("fallback.unknown");
    };

    const getCourseLabel = (type: string) => {
        if (type === "mandarin") return t("courses.mandarin");
        if (type === "anglais") return t("courses.english");
        return type;
    };

    const getTrancheLabel = (label: string) => {
        if (label === "Inscription") return t("installments.registration");
        if (label === "Livre") return t("installments.book");
        if (label === "1re tranche") return t("installments.first");
        if (label === "2e tranche") return t("installments.second");
        return label;
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.studentId) return;
        setSubmitting(true);
        try {
            // Enregistrement de l'inscription dans cours_langues
            const { data: coursRow, error: coursError } = await supabase
                .from("cours_langues")
                .insert({
                    student_id: formData.studentId,
                    langue: formData.type,
                    statut: "actif",
                    inscrit_le: new Date().toISOString().split("T")[0],
                })
                .select("id")
                .single();

            if (coursError) {
                showNotification(t("messages.enrollError", { error: coursError.message }), "error");
                return;
            }

            // Vérifier si des paiements existent déjà (créés à l'inscription)
            const { data: existingPays } = await supabase
                .from("payments")
                .select("id")
                .eq("student_id", formData.studentId)
                .eq("type", formData.type)
                .limit(1);

            // Création des tranches de paiement depuis la config (seulement si pas déjà présentes)
            const coursCfg = getConfig(formData.type as "mandarin" | "anglais");
            if (!existingPays || existingPays.length === 0) {
                const { error: payError } = await supabase.from("payments").insert(
                    coursCfg.tranches.map(tr => ({
                        student_id: formData.studentId,
                        type: formData.type,
                        tranche: tr.tranche,
                        montant: tr.montant,
                        status: "attente",
                        date_limite: formData.dateLimit,
                        penalites: 0,
                    }))
                );

                if (payError) {
                    // Rollback : supprimer l'inscription créée pour rester cohérent
                    await supabase.from("cours_langues").delete().eq("id", coursRow.id);
                    showNotification(t("messages.paymentCreateError", { error: payError.message }), "error");
                    return;
                }
            }

            showNotification(t("messages.enrollSuccess", { course: getCourseLabel(formData.type) }), "success");
            if (user) {
                const s = students.find(st => st.id === formData.studentId);
                const sName = s ? `${s.nom} ${s.prenom}` : formData.studentId;
                await logActivity(
                    user.id, (user as any).name || user.id, (user as any).role || "agent",
                    "payment_create", "cours_langues", coursRow.id,
                    `Inscription ${getCourseLabel(formData.type)} — ${sName}`
                );
            }
            setShowForm(false);
            setFormData({
                studentId: "",
                type: "mandarin",
                dateLimit: new Date(Date.now() + (getConfig("mandarin").deadline_offset_days) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            });
            await loadData();
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkPaid = async (paymentId: string) => {
        if (!user || (user.role !== "admin" && user.role !== "super_admin" && user.role !== "agent")) return;
        const { error } = await supabase.from("payments").update({
            status: "paye",
            date_paiement: new Date().toISOString(),
            validated_by: user.id,
            validated_at: new Date().toISOString(),
        }).eq("id", paymentId);
        if (error) {
            showNotification(t("messages.validationError"), "error");
            return;
        }
        showNotification(t("messages.paymentValidated"), "success");
        await loadData();
    };

    // Count enrollments (distinct student+type pairs) not individual tranches
    const enrollments = [...new Set(payments.map(p => `${p.student_id}__${p.type}`))];
    const stats = {
        total: enrollments.length,
        paid: payments.filter(p => p.status === "paye").length,
        pending: payments.filter(p => p.status === "attente").length,
        late: payments.filter(p => p.status === "retard").length,
        mandarin: [...new Set(payments.filter(p => p.type === "mandarin").map(p => p.student_id))].length,
        anglais: [...new Set(payments.filter(p => p.type === "anglais").map(p => p.student_id))].length,
    };

    const getStatusVariant = (status: string) => {
        if (status === "paye") return "bg-green-100 text-green-700";
        if (status === "retard") return "bg-red-100 text-red-700 dark:text-red-300";
        return "bg-yellow-100 text-yellow-700 dark:text-yellow-300";
    };

    const getStatusLabel = (status: string) => {
        if (status === "paye") return t("status.paid");
        if (status === "retard") return t("status.late");
        return t("status.pending");
    };

    return (
        <ProtectedRoute requiredRole="agent">
            <div className="space-y-6 p-4 sm:p-6">
                <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            {t("header.tag")}
                        </p>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t("header.title")}</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {t("header.subtitle")}
                        </p>
                    </div>
                    <Button onClick={() => setShowForm(!showForm)}>
                        {showForm ? t("actions.cancel") : t("actions.enrollStudent")}
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: t("stats.total"), value: stats.total },
                        { label: t("courses.mandarin"), value: stats.mandarin },
                        { label: t("courses.english"), value: stats.anglais },
                        { label: t("stats.late"), value: stats.late, red: true },
                    ].map(({ label, value, red }) => (
                        <Card key={label} className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                                <p className={`mt-2 text-3xl font-semibold ${red ? "text-red-600" : "text-slate-900 dark:text-slate-100"}`}>{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Form */}
                {showForm && (
                    <Card className="joda-surface border-0 shadow-none">
                        <CardHeader>
                            <CardTitle className="text-base">{t("form.title")}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleEnroll} className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>{t("form.student")}</Label>
                                    <Select
                                        value={formData.studentId}
                                        onValueChange={v => setFormData({ ...formData, studentId: v ?? "" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={t("form.studentPlaceholder")}>
                                                {formData.studentId
                                                    ? (() => { const s = students.find(s => s.id === formData.studentId); return s ? `${s.prenom} ${s.nom}` : t("form.studentPlaceholder"); })()
                                                    : t("form.studentPlaceholder")}
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {students.map(s => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.prenom} {s.nom}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("form.course")}</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={v => setFormData({ ...formData, type: v ?? "mandarin" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mandarin">{t("form.mandarinOption")}</SelectItem>
                                            <SelectItem value="anglais">{t("form.englishOption")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("form.dueDate")}</Label>
                                    <Input
                                        type="date"
                                        value={formData.dateLimit}
                                        onChange={e => setFormData({ ...formData, dateLimit: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                                        {t("form.amount")} : <strong>{formatPrice(getConfig(formData.type as "mandarin" | "anglais").tranches.reduce((s, tr) => s + tr.montant, 0))}</strong>
                                    </p>
                                    <Button type="submit" disabled={submitting || !formData.studentId}>
                                        {submitting ? t("actions.saving") : t("actions.saveEnrollment")}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Table */}
                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base">{t("list.title", { count: payments.length })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="py-8 text-center text-slate-400">{t("list.loading")}</div>
                        ) : payments.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">{t("list.empty")}</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("table.student")}</TableHead>
                                        <TableHead>{t("table.course")}</TableHead>
                                        <TableHead>{t("table.installment")}</TableHead>
                                        <TableHead>{t("table.amount")}</TableHead>
                                        <TableHead>{t("table.penalty")}</TableHead>
                                        <TableHead>{t("table.dueDate")}</TableHead>
                                        <TableHead>{t("table.status")}</TableHead>
                                        <TableHead>{t("table.actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map(payment => {
                                        const penalty = calculatePenalty(payment);
                                        return (
                                            <TableRow key={payment.id}>
                                                <TableCell className="font-medium">
                                                    {getStudentName(payment.student_id)}
                                                </TableCell>
                                                <TableCell>{getCourseLabel(payment.type)}</TableCell>
                                                <TableCell className="text-slate-500 dark:text-slate-400">
                                                    {payment.tranche
                                                        ? `T${payment.tranche} — ${getTrancheLabel(getConfig(payment.type as "mandarin" | "anglais").tranches.find(t => t.tranche === payment.tranche)?.label ?? "")}`
                                                        : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <div>{formatPrice(payment.montant)}</div>
                                                    {penalty > 0 && (
                                                        <div className="text-xs text-red-600">
                                                            + {formatPrice(penalty)} {t("table.penalty").toLowerCase()}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className={penalty > 0 ? "text-red-600 font-medium" : "text-slate-400"}>
                                                    {penalty > 0 ? formatPrice(penalty) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {payment.date_limite
                                                        ? new Date(payment.date_limite).toLocaleDateString(dateLocale)
                                                        : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={getStatusVariant(payment.status)}>
                                                        {getStatusLabel(payment.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {payment.status !== "paye" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleMarkPaid(payment.id)}
                                                        >
                                                            {t("actions.markPaid")}
                                                        </Button>
                                                    )}
                                                    {payment.date_paiement && (
                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {new Date(payment.date_paiement).toLocaleDateString(dateLocale)}
                                                        </p>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
