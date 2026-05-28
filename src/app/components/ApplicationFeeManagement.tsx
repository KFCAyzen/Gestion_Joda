"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { useQueryClient } from '@tanstack/react-query';
import { usePayments, PAYMENTS_KEY } from '../lib/hooks/use-payments';
import { useStudents } from '../lib/hooks/use-students';
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../utils/formatPrice";
import { useNotificationContext } from "../context/NotificationContext";
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
import { SearchBar, FilterSelect, PageHeader, LoadingState, ErrorMessage, StatusBadge, DropdownMenu } from "./shared";
import { Eye, Edit, Printer, Download } from "lucide-react";
import { downloadReceipt } from "../utils/downloadReceipt";
import { logActivity } from "../utils/activityLogger";

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
    email: string;
    telephone: string;
    niveau: string;
    filiere: string;
    nationalite?: string | null;
}

const MOTIFS = ["Inscription", "Frais de dossier", "Cours de langue", "Autre"];

export default function ApplicationFeeManagement() {
    const { user } = useAuth();
    const t = useTranslations("applicationFees");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const supabase = createClient();
    const { showNotification } = useNotificationContext();
    const queryClient = useQueryClient();
    const { data: _feesData = [], isLoading } = usePayments();
    const fees = _feesData as unknown as ApplicationFee[];
    const { data: _studentsData = [] } = useStudents();
    const students = _studentsData as unknown as Student[];
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [detailFee, setDetailFee] = useState<ApplicationFee | null>(null);
    const [editingFee, setEditingFee] = useState<ApplicationFee | null>(null);
    const [editFeeForm, setEditFeeForm] = useState({ montant: "", date: "" });
    const [savingFee, setSavingFee] = useState(false);

    const [formData, setFormData] = useState({
        studentId: "",
        amount: "",
        motif: "Inscription",
        date: new Date().toISOString().split("T")[0],
    });


    const handleSaveFee = async () => {
        if (!formData.studentId || !formData.amount) {
            showNotification(t("messages.requiredFields"), "error");
            return;
        }

        try {
            const montant = parseInt(formData.amount, 10);
            const now = new Date().toISOString();

            const { data: payment, error } = await supabase
                .from("payments")
                .insert({
                    student_id: formData.studentId,
                    montant,
                    type: "bourse",
                    tranche: 1,
                    status: "paye",
                    date_limite: formData.date,
                    date_paiement: formData.date,
                    validated_by: user?.id,
                    validated_at: now,
                })
                .select()
                .single();

            if (error) {
                showNotification(t("messages.saveError"), "error");
                return;
            }

            // Automatic accounting entry.
            const student = students.find((s) => s.id === formData.studentId);
            const studentName = student ? `${student.prenom} ${student.nom}` : t("fallback.student");
            const typeEntree = formData.motif === "Cours de langue" ? "paiement_cours" : "paiement_procedure";

            await supabase.from("entrees_comptables").insert({
                montant,
                date: now,
                type: typeEntree,
                description: `${formData.motif} — ${studentName}`,
                student_id: formData.studentId,
                payment_id: payment?.id ?? null,
                created_by: user?.id,
            });

            if (user) {
                await logActivity(
                    user.id, user.name, user.role,
                    "payment_create", "payment", payment?.id ?? null,
                    t("activity.paymentCreated", {
                        motif: t(`motifs.${formData.motif}`),
                        student: studentName,
                        amount: montant.toLocaleString(dateLocale),
                    }),
                    { montant, motif: formData.motif, student_id: formData.studentId }
                );
                await logActivity(
                    user.id, user.name, user.role,
                    "accounting_entry", "entrees_comptables", payment?.id ?? null,
                    t("activity.accountingEntryCreated", {
                        motif: t(`motifs.${formData.motif}`),
                        student: studentName,
                        amount: montant.toLocaleString(dateLocale),
                    }),
                    { montant, type: typeEntree }
                );
            }

            showNotification(t("messages.saveSuccess"), "success");
            setShowForm(false);
            setFormData({
                studentId: "",
                amount: "",
                motif: "Inscription",
                date: new Date().toISOString().split("T")[0],
            });
            queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
        } catch {
            showNotification(t("messages.saveError"), "error");
        }
    };

    const openEditFee = (fee: ApplicationFee) => {
        setEditingFee(fee);
        setEditFeeForm({ montant: fee.montant.toString(), date: fee.date?.slice(0, 10) || "" });
    };

    const handleUpdateFee = async () => {
        if (!editingFee) return;
        setSavingFee(true);
        try {
            const supabase = createClient();
            await supabase.from("payments").update({
                montant: parseInt(editFeeForm.montant, 10),
                date_limite: editFeeForm.date || null,
            }).eq("id", editingFee.id);
            if (user) {
                await logActivity(user.id, user.name, user.role, "payment_update", "payment", editingFee.id,
                    t("activity.paymentUpdated"), { payment_id: editingFee.id });
            }
            showNotification(t("messages.updateSuccess"), "success");
            setEditingFee(null);
            queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
        } catch { showNotification(t("messages.error"), "error"); }
        setSavingFee(false);
    };

    const handlePrintFeeThermal = (fee: ApplicationFee, student: Student | undefined) => {
        if (!student) return;
        void downloadReceipt(
            { id: fee.id, type: fee.type, tranche: fee.tranche ?? null, montant: fee.montant, status: fee.status, date_paiement: fee.date ?? null },
            { nom: student.nom, prenom: student.prenom, email: student.email, telephone: student.telephone, niveau: student.niveau, filiere: student.filiere, nationalite: student.nationalite ?? null }
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paye":
                return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
            case "attente":
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
            case "retard":
                return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
            default:
                return "bg-gray-100 dark:bg-gray-700/50 text-gray-800 dark:text-gray-200";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "paye":
                return t("status.paid");
            case "attente":
                return t("status.pending");
            case "retard":
                return t("status.late");
            default:
                return status;
        }
    };

    const filteredFees = fees.filter((fee) => {
        const student = students.find((s) => s.id === fee.student_id);
        const studentName = student ? `${student.prenom} ${student.nom}`.toLowerCase() : "";
        const matchesSearch = studentName.includes(searchTerm.toLowerCase()) || fee.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || fee.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (isLoading) {
        return <LoadingState message={t("loading")} />;
    }

    return (
        <>
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageHeader
                eyebrow={t("header.eyebrow")}
                title={t("header.title")}
                description={t("header.description")}
                action={{
                    label: t("actions.newPayment"),
                    onClick: () => setShowForm(true)
                }}
            />

            {showForm && (
                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader>
                        <CardTitle style={{ color: "#dc2626" }}>{t("form.title")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>{t("form.student")}</Label>
                                <select
                                    value={formData.studentId || ""}
                                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                    className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer dark:[color-scheme:dark]"
                                >
                                    <option value="" disabled>{t("form.studentPlaceholder")}</option>
                                    {students.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.prenom} {student.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>{t("form.amount")}</Label>
                                <Input
                                    type="number"
                                    placeholder={t("form.amountPlaceholder")}
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>{t("form.reason")}</Label>
                                <Select value={formData.motif || MOTIFS[0]} onValueChange={(value) => setFormData({ ...formData, motif: value || MOTIFS[0] })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("form.reasonPlaceholder")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MOTIFS.map((motif) => (
                                            <SelectItem key={motif} value={motif}>{t(`motifs.${motif}`)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>{t("form.date")}</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button onClick={handleSaveFee} style={{ backgroundColor: "#dc2626" }}>
                                {t("actions.save")}
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>
                                {t("actions.cancel")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="joda-surface border-0 shadow-none">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>{t("list.title", { count: filteredFees.length })}</CardTitle>
                        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY })}>{t("actions.refresh")}</Button>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <SearchBar
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder={t("filters.searchPlaceholder")}
                        />
                        <FilterSelect
                            label={t("filters.status")}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: "paye", label: t("status.paid") },
                                { value: "attente", label: t("status.pending") },
                                { value: "retard", label: t("status.late") },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredFees.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-slate-500 dark:text-slate-400">{t("list.empty")}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredFees.map((fee) => {
                                const student = students.find((s) => s.id === fee.student_id);

                                return (
                                    <div key={fee.id} className="joda-surface-muted p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {student ? `${student.prenom} ${student.nom}` : t("fallback.student")}
                                                </p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                                    {fee.date ? new Date(fee.date).toLocaleDateString(dateLocale) : "-"}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold" style={{ color: "#dc2626" }}>
                                                    {formatPrice(fee.montant?.toString() || "0")}
                                                </p>
                                                <StatusBadge status={fee.status} />
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-end">
                                            <DropdownMenu actions={[
                                                { label: t("actions.details"), icon: <Eye className="h-4 w-4" />, onClick: () => setDetailFee(fee) },
                                                ...((user?.role === "admin" || user?.role === "super_admin") ? [{ label: t("actions.edit"), icon: <Edit className="h-4 w-4" />, onClick: () => openEditFee(fee) }] : []),
                                                ...(fee.status === "paye" && student ? [
                                                    { label: t("actions.downloadReceipt"), icon: <Download className="h-4 w-4" />, onClick: () => downloadReceipt(
                                                        { id: fee.id, type: fee.type, tranche: fee.tranche ?? null, montant: fee.montant, status: fee.status, date_paiement: fee.date ?? null },
                                                        { nom: student.nom, prenom: student.prenom, email: student.email, telephone: student.telephone, niveau: student.niveau, filiere: student.filiere, nationalite: student.nationalite ?? null }
                                                    )},
                                                ] : []),
                                            ]} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Modal détails frais */}
        {detailFee && (() => {
            const student = students.find(s => s.id === detailFee.student_id);
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">{t("detail.title")}</h3>
                            <button onClick={() => setDetailFee(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 text-xl">&times;</button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("detail.student")}</span><span className="font-medium">{student ? `${student.prenom} ${student.nom}` : "—"}</span></div>
                            <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("detail.amount")}</span><span className="font-bold text-red-600">{detailFee.montant?.toLocaleString(dateLocale)} FCFA</span></div>
                            <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("detail.date")}</span><span className="font-medium">{detailFee.date ? new Date(detailFee.date).toLocaleDateString(dateLocale) : "—"}</span></div>
                            <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("detail.type")}</span><span className="font-medium">{detailFee.type}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t("detail.status")}</span><span className={`font-medium ${detailFee.status === "paye" ? "text-emerald-600" : "text-amber-600 dark:text-amber-400"}`}>{getStatusLabel(detailFee.status)}</span></div>
                        </div>
                        <div className="mt-5 flex gap-2">
                            {detailFee.status === "paye" && (
                                <button onClick={() => handlePrintFeeThermal(detailFee, student)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                                    {t("actions.printReceipt")}
                                </button>
                            )}
                            <button onClick={() => setDetailFee(null)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">{t("actions.close")}</button>
                        </div>
                    </div>
                </div>
            );
        })()}

        {/* Modal modification frais */}
        {editingFee && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{t("edit.title")}</h3>
                        <button onClick={() => setEditingFee(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 text-xl">&times;</button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label style={{ color: "#dc2626" }}>{t("edit.amount")}</Label>
                            <Input type="number" value={editFeeForm.montant} onChange={e => setEditFeeForm(f => ({ ...f, montant: e.target.value }))} />
                        </div>
                        <div>
                            <Label style={{ color: "#dc2626" }}>{t("edit.date")}</Label>
                            <Input type="date" value={editFeeForm.date} onChange={e => setEditFeeForm(f => ({ ...f, date: e.target.value }))} />
                        </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                        <Button onClick={handleUpdateFee} disabled={savingFee} style={{ backgroundColor: "#dc2626" }}>
                            {savingFee ? t("actions.saving") : t("actions.save")}
                        </Button>
                        <Button variant="outline" onClick={() => setEditingFee(null)}>{t("actions.cancel")}</Button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
