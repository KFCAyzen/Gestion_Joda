"use client";

import { useEffect, useState } from "react";
import { supabase } from "../supabase";
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
import { SearchBar, FilterSelect, PageHeader, LoadingState, ErrorMessage, StatusBadge } from "./shared";

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
}

const MOTIFS = ["Inscription", "Frais de dossier", "Cours de langue", "Autre"];

export default function ApplicationFeeManagement() {
    const { user } = useAuth();
    const { showNotification } = useNotificationContext();
    const [fees, setFees] = useState<ApplicationFee[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

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
                supabase.from("students").select("id, nom, prenom"),
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

    const generateFeeId = () => {
        const timestamp = Date.now().toString().slice(-4);
        const random = Math.random().toString(36).substring(2, 3).toUpperCase();
        return `FEE${timestamp}${random}`;
    };

    const handleSaveFee = async () => {
        if (!formData.studentId || !formData.amount) {
            showNotification("Veuillez remplir tous les champs obligatoires", "error");
            return;
        }

        try {
            const { error } = await supabase.from("payments").insert({
                id: generateFeeId(),
                student_id: formData.studentId,
                montant: parseInt(formData.amount, 10),
                type: "bourse",
                tranche: 1,
                status: "paye",
                date_limite: formData.date,
                date_paiement: formData.date,
                validated_by: user?.id,
                validated_at: new Date().toISOString(),
            });

            if (!error) {
                showNotification("Frais enregistrés avec succès !", "success");
                setShowForm(false);
                setFormData({
                    studentId: "",
                    amount: "",
                    motif: "Inscription",
                    date: new Date().toISOString().split("T")[0],
                });
                await loadData();
            }
        } catch {
            showNotification("Erreur lors de l'enregistrement", "error");
        }
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
                                <Select value={formData.studentId || ""} onValueChange={(value) => setFormData({ ...formData, studentId: value || "" })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un étudiant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((student) => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.prenom} {student.nom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                                    <div key={fee.id} className="joda-surface-muted flex items-center justify-between p-4">
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
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
