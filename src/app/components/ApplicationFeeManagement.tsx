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

    if (isLoading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
                    <p className="text-slate-600">Chargement des frais...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Suivi paiements
                    </p>
                    <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Gestion des Frais de Candidature</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Enregistre et consulte les paiements liés aux procédures de bourse.
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} style={{ backgroundColor: "#dc2626" }}>
                    Nouveau Paiement
                </Button>
            </div>

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
                        <CardTitle>Liste des Paiements ({fees.length})</CardTitle>
                        <Button variant="outline" onClick={loadData}>Actualiser</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {fees.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-slate-500">Aucun paiement pour le moment</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {fees.map((fee) => {
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
                                            <Badge className={getStatusColor(fee.status)}>
                                                {getStatusLabel(fee.status)}
                                            </Badge>
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
