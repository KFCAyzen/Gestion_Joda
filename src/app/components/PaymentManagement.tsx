"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
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

interface Student {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
}

interface Payment {
    id: string;
    student_id: string;
    type: string;
    tranche: number | null;
    montant: number;
    status: string;
    date_limite: string;
    date_paiement: string | null;
    penalites: number;
    facture_url: string | null;
    recu_url: string | null;
    validated_by: string | null;
    validated_at: string | null;
    created_at: string;
}

function formatPrice(amount: number): string {
    return amount.toLocaleString("fr-FR") + " FCFAs";
}

export default function PaymentManagement() {
    const { user } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<string | "">("");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const loadData = async () => {
        setLoading(true);
        try {
            const [paymentsRes, studentsRes] = await Promise.all([
                supabase.from('payments').select('*').order('created_at', { ascending: false }),
                supabase.from('students').select('id, nom, prenom, email, telephone')
            ]);

            if (paymentsRes.data) setPayments(paymentsRes.data);
            if (studentsRes.data) setStudents(studentsRes.data);
        } catch (err) {
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.nom} ${student.prenom}` : "Étudiant inconnu";
    };

    const calculatePenalty = (payment: Payment): number => {
        if (payment.status === 'paye' || !payment.date_limite) return 0;
        
        const today = new Date();
        const deadline = new Date(payment.date_limite);
        const gracePeriod = payment.type.includes('mandarin') || payment.type.includes('anglais') ? 30 : 3;
        
        const graceDate = new Date(deadline);
        graceDate.setDate(graceDate.getDate() + gracePeriod);
        
        if (today <= graceDate) return 0;
        
        const daysLate = Math.floor((today.getTime() - graceDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (payment.type === 'mandarin' || payment.type === 'anglais') {
            return daysLate * 1000;
        }
        return daysLate * 10000;
    };

    const handleValidatePayment = async (paymentId: string, isValid: boolean) => {
        if (!user || (user.role !== "admin" && user.role !== "super_admin")) return;
        
        try {
            await supabase.from('payments').update({
                status: isValid ? 'paye' : 'retard',
                validated_by: user.id,
                validated_at: new Date().toISOString()
            }).eq('id', paymentId);
            
            loadData();
        } catch (error) {
            console.error("Erreur validation:", error);
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
            default: return "secondary";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "paye": return "Payé";
            case "attente": return "En attente";
            case "retard": return "En retard";
            default: return status;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "bourse": return "Bourse";
            case "mandarin": return "Cours Mandarin";
            case "anglais": return "Cours Anglais";
            default: return type;
        }
    };

    const canValidate = user?.role === "admin" || user?.role === "super_admin";

    return (
        <ProtectedRoute requiredRole="agent">
            <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold" style={{color: '#dc2626'}}>
                        Gestion des Paiements
                    </h1>
                </div>

                <Card className="mb-6">
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Filtrer par étudiant</Label>
                                <Select value={selectedStudent} onValueChange={(v) => setSelectedStudent(v || "")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les étudiants" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Tous les étudiants</SelectItem>
                                        {students.map(student => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.nom} {student.prenom}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Filtrer par statut</Label>
                                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v || "all")}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tous les statuts" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les statuts</SelectItem>
                                        <SelectItem value="attente">En attente</SelectItem>
                                        <SelectItem value="paye">Payé</SelectItem>
                                        <SelectItem value="retard">En retard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Liste des Paiements ({filteredPayments.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">Chargement...</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Étudiant</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Montant</TableHead>
                                        <TableHead>Pénalité</TableHead>
                                        <TableHead>Date limite</TableHead>
                                        <TableHead>Statut</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredPayments.map(payment => {
                                        const penalty = calculatePenalty(payment);
                                        const totalAmount = payment.montant + penalty;
                                        
                                        return (
                                            <TableRow key={payment.id}>
                                                <TableCell>
                                                    <div className="font-medium">{getStudentName(payment.student_id)}</div>
                                                </TableCell>
                                                <TableCell>{getTypeLabel(payment.type)}</TableCell>
                                                <TableCell>
                                                    <div>{formatPrice(payment.montant)}</div>
                                                    {penalty > 0 && (
                                                        <div className="text-xs text-red-600">
                                                            + {formatPrice(penalty)} (pénalité)
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-red-600">
                                                    {penalty > 0 ? formatPrice(penalty) : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {payment.date_limite 
                                                        ? new Date(payment.date_limite).toLocaleDateString('fr-FR')
                                                        : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusColor(payment.status) as any}>
                                                        {getStatusLabel(payment.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {canValidate && payment.status === "attente" && (
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => handleValidatePayment(payment.id, true)}
                                                            >
                                                                Valider
                                                            </Button>
                                                            <Button 
                                                                variant="destructive" 
                                                                size="sm"
                                                                onClick={() => handleValidatePayment(payment.id, false)}
                                                            >
                                                                Rejeter
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {payment.facture_url && (
                                                        <a
                                                            href={payment.facture_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-green-600 hover:text-green-900 text-sm"
                                                        >
                                                            Voir facture
                                                        </a>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                        {filteredPayments.length === 0 && !loading && (
                            <div className="text-center py-8 text-gray-500">
                                Aucun paiement trouvé avec les filtres sélectionnés.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
    );
}
