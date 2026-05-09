"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
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
import { printThermalReceipt } from "../utils/thermalReceipt";

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
}

const MOTIFS = ["Inscription", "Frais de dossier", "Cours de langue", "Autre"];

export default function ApplicationFeeManagement() {
    const { user } = useAuth();
    const supabase = createClient();
    const { showNotification } = useNotificationContext();
    const [fees, setFees] = useState<ApplicationFee[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [feesRes, studentsRes] = await Promise.all([
                supabase.from("payments").select("*").order("created_at", { ascending: false }),
                supabase.from("students").select("id, nom, prenom, email, telephone, niveau, filiere"),
            ]);

            setFees(feesRes.data || []);
            setStudents(studentsRes.data || []);
        } catch (error) {
            console.warn("Erreur chargement donnees:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSaveFee = async () => {
        if (!formData.studentId || !formData.amount) {
            showNotification("Veuillez remplir tous les champs obligatoires", "error");
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
                showNotification("Erreur lors de l'enregistrement", "error");
                return;
            }

            // Entrée comptable automatique
            const student = students.find((s) => s.id === formData.studentId);
            const studentName = student ? `${student.prenom} ${student.nom}` : "Étudiant";
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
                    `Paiement enregistré : ${formData.motif} — ${studentName} — ${montant.toLocaleString("fr-FR")} FCFA`,
                    { montant, motif: formData.motif, student_id: formData.studentId }
                );
                await logActivity(
                    user.id, user.name, user.role,
                    "accounting_entry", "entrees_comptables", payment?.id ?? null,
                    `Entrée comptable créée : ${formData.motif} — ${studentName} — ${montant.toLocaleString("fr-FR")} FCFA`,
                    { montant, type: typeEntree }
                );
            }

            showNotification("Frais enregistrés et comptabilisés !", "success");
            setShowForm(false);
            setFormData({
                studentId: "",
                amount: "",
                motif: "Inscription",
                date: new Date().toISOString().split("T")[0],
            });
            await loadData();
        } catch {
            showNotification("Erreur lors de l'enregistrement", "error");
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
                    `Paiement modifié — frais`, { payment_id: editingFee.id });
            }
            showNotification("Paiement mis à jour", "success");
            setEditingFee(null);
            await loadData();
        } catch { showNotification("Erreur", "error"); }
        setSavingFee(false);
    };

    const handlePrintFeeThermal = (fee: ApplicationFee, student: Student | undefined) => {
        printThermalReceipt({
            refId: fee.id,
            date: fee.date ? new Date(fee.date).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR"),
            studentName: student ? `${student.prenom} ${student.nom}` : undefined,
            service: "Frais de candidature",
            montant: fee.montant,
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paye":
                return "bg-green-100 text-green-800";
            case "attente":
                return "bg-yellow-100 text-yellow-800";
            case "retard":
                return "bg-red-100 text-red-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "paye":
                return "Payé";
            case "attente":
                return "En attente";
            case "retard":
                return "En retard";
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
        return <LoadingState message="Chargement des frais..." />;
    }

    return (
        <>
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageHeader
                eyebrow="Suivi paiements"
                title="Gestion des Frais de Candidature"
                description="Enregistre et consulte les paiements liés aux procédures de bourse."
                action={{
                    label: "Nouveau Paiement",
                    onClick: () => setShowForm(true)
                }}
            />

            {showForm && (
                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader>
                        <CardTitle style={{ color: "#dc2626" }}>Nouveau Paiement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Étudiant *</Label>
                                <select
                                    value={formData.studentId || ""}
                                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                    className="flex h-8 w-full items-center rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer"
                                >
                                    <option value="" disabled>Sélectionner un étudiant</option>
                                    {students.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.prenom} {student.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Montant (FCFA) *</Label>
                                <Input
                                    type="number"
                                    placeholder="Montant"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Motif</Label>
                                <Select value={formData.motif || MOTIFS[0]} onValueChange={(value) => setFormData({ ...formData, motif: value || MOTIFS[0] })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MOTIFS.map((motif) => (
                                            <SelectItem key={motif} value={motif}>{motif}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label style={{ color: "#dc2626" }}>Date</Label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button onClick={handleSaveFee} style={{ backgroundColor: "#dc2626" }}>
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
                        <CardTitle>Liste des Paiements ({filteredFees.length})</CardTitle>
                        <Button variant="outline" onClick={loadData}>Actualiser</Button>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <SearchBar
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Rechercher par étudiant ou ID..."
                        />
                        <FilterSelect
                            label="Statut"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: "paye", label: "Payé" },
                                { value: "attente", label: "En attente" },
                                { value: "retard", label: "En retard" },
                            ]}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredFees.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-slate-500">Aucun paiement pour le moment</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredFees.map((fee) => {
                                const student = students.find((s) => s.id === fee.student_id);

                                return (
                                    <div key={fee.id} className="joda-surface-muted p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-800">
                                                    {student ? `${student.prenom} ${student.nom}` : "Étudiant"}
                                                </p>
                                                <p className="text-sm text-slate-600">
                                                    {fee.date ? new Date(fee.date).toLocaleDateString("fr-FR") : "-"}
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
                                                { label: "Voir détails", icon: <Eye className="h-4 w-4" />, onClick: () => setDetailFee(fee) },
                                                ...((user?.role === "admin" || user?.role === "super_admin") ? [{ label: "Modifier", icon: <Edit className="h-4 w-4" />, onClick: () => openEditFee(fee) }] : []),
                                                ...(fee.status === "paye" && student ? [
                                                    { label: "Reçu thermique", icon: <Printer className="h-4 w-4" />, onClick: () => handlePrintFeeThermal(fee, student) },
                                                    { label: "Télécharger reçu", icon: <Download className="h-4 w-4" />, onClick: () => downloadReceipt(
                                                        { id: fee.id, type: fee.type, tranche: fee.tranche ?? null, montant: fee.montant, status: fee.status, date_paiement: fee.date ?? null },
                                                        { nom: student.nom, prenom: student.prenom, email: student.email, telephone: student.telephone, niveau: student.niveau, filiere: student.filiere }
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
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Détails du paiement</h3>
                            <button onClick={() => setDetailFee(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Étudiant</span><span className="font-medium">{student ? `${student.prenom} ${student.nom}` : "—"}</span></div>
                            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Montant</span><span className="font-bold text-red-600">{detailFee.montant?.toLocaleString("fr-FR")} FCFA</span></div>
                            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Date</span><span className="font-medium">{detailFee.date ? new Date(detailFee.date).toLocaleDateString("fr-FR") : "—"}</span></div>
                            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Type</span><span className="font-medium">{detailFee.type}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Statut</span><span className={`font-medium ${detailFee.status === "paye" ? "text-emerald-600" : "text-amber-600"}`}>{getStatusLabel(detailFee.status)}</span></div>
                        </div>
                        <div className="mt-5 flex gap-2">
                            {detailFee.status === "paye" && (
                                <button onClick={() => handlePrintFeeThermal(detailFee, student)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                                    Imprimer reçu
                                </button>
                            )}
                            <button onClick={() => setDetailFee(null)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600">Fermer</button>
                        </div>
                    </div>
                </div>
            );
        })()}

        {/* Modal modification frais */}
        {editingFee && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Modifier le paiement</h3>
                        <button onClick={() => setEditingFee(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label style={{ color: "#dc2626" }}>Montant (FCFA)</Label>
                            <Input type="number" value={editFeeForm.montant} onChange={e => setEditFeeForm(f => ({ ...f, montant: e.target.value }))} />
                        </div>
                        <div>
                            <Label style={{ color: "#dc2626" }}>Date</Label>
                            <Input type="date" value={editFeeForm.date} onChange={e => setEditFeeForm(f => ({ ...f, date: e.target.value }))} />
                        </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                        <Button onClick={handleUpdateFee} disabled={savingFee} style={{ backgroundColor: "#dc2626" }}>
                            {savingFee ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                        <Button variant="outline" onClick={() => setEditingFee(null)}>Annuler</Button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
