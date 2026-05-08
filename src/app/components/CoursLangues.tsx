"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import ProtectedRoute from "./ProtectedRoute";
import { calculatePenalty } from "../utils/penaltyCalculator";
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

const COURSE_PRICES: Record<string, number> = {
    mandarin: 121000,
    anglais: 91000,
};

const COURSE_LABELS: Record<string, string> = {
    mandarin: "Mandarin",
    anglais: "Anglais",
};


interface CoursePayment {
    id: string;
    student_id: string;
    type: string;
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
    const { showNotification } = useNotificationContext();

    const [payments, setPayments] = useState<CoursePayment[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        studentId: "",
        type: "mandarin",
        dateLimit: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
        return s ? `${s.prenom} ${s.nom}` : "Inconnu";
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
                showNotification("Erreur inscription : " + coursError.message, "error");
                return;
            }

            // Création du paiement associé
            const { error: payError } = await supabase.from("payments").insert({
                student_id: formData.studentId,
                type: formData.type,
                montant: COURSE_PRICES[formData.type],
                status: "attente",
                date_limite: formData.dateLimit,
                penalites: 0,
            });

            if (payError) {
                // Rollback : supprimer l'inscription créée pour rester cohérent
                await supabase.from("cours_langues").delete().eq("id", coursRow.id);
                showNotification("Erreur création paiement : " + payError.message, "error");
                return;
            }

            showNotification(`Inscription au cours de ${COURSE_LABELS[formData.type]} enregistrée`, "success");
            setShowForm(false);
            setFormData({
                studentId: "",
                type: "mandarin",
                dateLimit: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
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
            showNotification("Erreur validation", "error");
            return;
        }
        showNotification("Paiement validé", "success");
        await loadData();
    };

    const stats = {
        total: payments.length,
        paid: payments.filter(p => p.status === "paye").length,
        pending: payments.filter(p => p.status === "attente").length,
        late: payments.filter(p => p.status === "retard").length,
        mandarin: payments.filter(p => p.type === "mandarin").length,
        anglais: payments.filter(p => p.type === "anglais").length,
    };

    const getStatusVariant = (status: string) => {
        if (status === "paye") return "bg-green-100 text-green-700";
        if (status === "retard") return "bg-red-100 text-red-700";
        return "bg-yellow-100 text-yellow-700";
    };

    const getStatusLabel = (status: string) => {
        if (status === "paye") return "Payé";
        if (status === "retard") return "En retard";
        return "En attente";
    };

    return (
        <ProtectedRoute requiredRole="agent">
            <div className="space-y-6 p-4 sm:p-6">
                <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            Formation linguistique
                        </p>
                        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Cours de langues</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Mandarin (121 000 FCFA) · Anglais (91 000 FCFA) · Pénalité 1 000 FCFA/j après 30 j
                        </p>
                    </div>
                    <Button onClick={() => setShowForm(!showForm)}>
                        {showForm ? "Annuler" : "+ Inscrire un étudiant"}
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: "Total inscrits", value: stats.total },
                        { label: "Mandarin", value: stats.mandarin },
                        { label: "Anglais", value: stats.anglais },
                        { label: "En retard", value: stats.late, red: true },
                    ].map(({ label, value, red }) => (
                        <Card key={label} className="joda-surface border-0 shadow-none">
                            <CardContent className="pt-6">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                                <p className={`mt-2 text-3xl font-semibold ${red ? "text-red-600" : "text-slate-900"}`}>{value}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Form */}
                {showForm && (
                    <Card className="joda-surface border-0 shadow-none">
                        <CardHeader>
                            <CardTitle className="text-base">Inscrire un étudiant</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleEnroll} className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Étudiant</Label>
                                    <Select
                                        value={formData.studentId}
                                        onValueChange={v => setFormData({ ...formData, studentId: v ?? "" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sélectionner un étudiant" />
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
                                    <Label>Cours</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={v => setFormData({ ...formData, type: v ?? "mandarin" })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mandarin">Mandarin — 121 000 FCFA</SelectItem>
                                            <SelectItem value="anglais">Anglais — 91 000 FCFA</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date limite de paiement</Label>
                                    <Input
                                        type="date"
                                        value={formData.dateLimit}
                                        onChange={e => setFormData({ ...formData, dateLimit: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-3">
                                    <p className="mb-3 text-sm text-slate-500">
                                        Montant : <strong>{formatPrice(COURSE_PRICES[formData.type])}</strong>
                                    </p>
                                    <Button type="submit" disabled={submitting || !formData.studentId}>
                                        {submitting ? "Enregistrement..." : "Enregistrer l'inscription"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Table */}
                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader>
                        <CardTitle className="text-base">Inscriptions ({payments.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="py-8 text-center text-slate-400">Chargement...</div>
                        ) : payments.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">Aucune inscription enregistrée</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Étudiant</TableHead>
                                        <TableHead>Cours</TableHead>
                                        <TableHead>Montant</TableHead>
                                        <TableHead>Pénalité</TableHead>
                                        <TableHead>Date limite</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Actions</TableHead>
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
                                                <TableCell>{COURSE_LABELS[payment.type] ?? payment.type}</TableCell>
                                                <TableCell>
                                                    <div>{formatPrice(payment.montant)}</div>
                                                    {penalty > 0 && (
                                                        <div className="text-xs text-red-600">
                                                            + {formatPrice(penalty)} pénalité
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className={penalty > 0 ? "text-red-600 font-medium" : "text-slate-400"}>
                                                    {penalty > 0 ? formatPrice(penalty) : "—"}
                                                </TableCell>
                                                <TableCell>
                                                    {payment.date_limite
                                                        ? new Date(payment.date_limite).toLocaleDateString("fr-FR")
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
                                                            Marquer payé
                                                        </Button>
                                                    )}
                                                    {payment.date_paiement && (
                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {new Date(payment.date_paiement).toLocaleDateString("fr-FR")}
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
