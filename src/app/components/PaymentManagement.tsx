"use client";

import { useState, useEffect } from "react";
import { useJodaData } from "../hooks/useJodaData";
import { useAuth } from "../context/AuthContext";
import { Payment, Student, PaymentStatus, PaymentType } from "../types/joda";
import { formatPrice } from "../utils/formatPrice";
import { sanitizeForHtml } from "../utils/security";
import LoadingSpinner from "./LoadingSpinner";

export default function PaymentManagement() {
    const { user } = useAuth();
    const { payments, students, updatePayment, loading } = useJodaData();
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<PaymentStatus | "all">("all");
    const [uploadingPayment, setUploadingPayment] = useState<string | null>(null);

    const filteredPayments = payments.filter(payment => {
        const studentMatch = !selectedStudent || payment.studentId === selectedStudent;
        const statusMatch = filterStatus === "all" || payment.status === filterStatus;
        return studentMatch && statusMatch;
    });

    const getStudentName = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        return student ? `${student.nom} ${student.prenom}` : "Étudiant inconnu";
    };

    const calculatePenalty = (payment: Payment): number => {
        if (payment.status === "paye" || !payment.dateLimite) return 0;
        
        const today = new Date();
        const deadline = new Date(payment.dateLimite);
        const gracePeriod = payment.type.includes("cours") ? 
            (payment.type.includes("inscription") ? 14 : payment.type.includes("tranche1") ? 30 : 60) : 3;
        
        const graceDate = new Date(deadline);
        graceDate.setDate(graceDate.getDate() + gracePeriod);
        
        if (today <= graceDate) return 0;
        
        const daysLate = Math.floor((today.getTime() - graceDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (payment.type.includes("cours")) {
            return payment.type.includes("inscription") ? daysLate * 500 : daysLate * 1000;
        }
        return daysLate * 10000;
    };

    const handleFileUpload = async (paymentId: string, file: File) => {
        if (!file) return;
        
        setUploadingPayment(paymentId);
        
        try {
            // Simuler l'upload (à remplacer par Firebase Storage)
            const fileUrl = URL.createObjectURL(file);
            
            await updatePayment(paymentId, {
                justificatif: fileUrl,
                status: "attente" as PaymentStatus,
                dateUpload: new Date().toISOString()
            });
            
            alert("Justificatif uploadé avec succès !");
        } catch (error) {
            console.error("Erreur upload:", error);
            alert("Erreur lors de l'upload");
        } finally {
            setUploadingPayment(null);
        }
    };

    const handleValidatePayment = async (paymentId: string, isValid: boolean) => {
        if (!user || (user.role !== "admin" && user.role !== "super_admin")) return;
        
        try {
            await updatePayment(paymentId, {
                status: isValid ? "paye" : "retard",
                dateValidation: new Date().toISOString(),
                validePar: user.username
            });
            
            alert(isValid ? "Paiement validé !" : "Paiement marqué en retard");
        } catch (error) {
            console.error("Erreur validation:", error);
            alert("Erreur lors de la validation");
        }
    };

    const getStatusColor = (status: PaymentStatus) => {
        switch (status) {
            case "paye": return "text-green-600 bg-green-100";
            case "attente": return "text-yellow-600 bg-yellow-100";
            case "retard": return "text-red-600 bg-red-100";
            default: return "text-gray-600 bg-gray-100";
        }
    };

    const getTypeLabel = (type: PaymentType) => {
        const labels: Record<PaymentType, string> = {
            "bourse_tranche1": "Bourse - Tranche 1 (100k)",
            "bourse_tranche2": "Bourse - Tranche 2 (500k)",
            "bourse_tranche3": "Bourse - Tranche 3 (1M)",
            "bourse_tranche4": "Bourse - Tranche 4 (1.39M)",
            "cours_mandarin_inscription": "Mandarin - Inscription",
            "cours_mandarin_livre": "Mandarin - Livre",
            "cours_mandarin_tranche1": "Mandarin - Tranche 1",
            "cours_mandarin_tranche2": "Mandarin - Tranche 2",
            "cours_anglais_inscription": "Anglais - Inscription",
            "cours_anglais_livre": "Anglais - Livre",
            "cours_anglais_tranche1": "Anglais - Tranche 1",
            "cours_anglais_tranche2": "Anglais - Tranche 2"
        };
        return labels[type] || type;
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Gestion des Paiements</h1>
            </div>

            {/* Filtres */}
            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrer par étudiant
                        </label>
                        <select
                            value={selectedStudent}
                            onChange={(e) => setSelectedStudent(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        >
                            <option value="">Tous les étudiants</option>
                            {students.map(student => (
                                <option key={student.id} value={student.id}>
                                    {sanitizeForHtml(`${student.nom} ${student.prenom}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrer par statut
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as PaymentStatus | "all")}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="attente">En attente</option>
                            <option value="paye">Payé</option>
                            <option value="retard">En retard</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Liste des paiements */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Étudiant
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type de paiement
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Montant
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pénalité
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date limite
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Statut
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPayments.map((payment) => {
                                const penalty = calculatePenalty(payment);
                                const totalAmount = payment.montant + penalty;
                                
                                return (
                                    <tr key={payment.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {sanitizeForHtml(getStudentName(payment.studentId))}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {getTypeLabel(payment.type)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatPrice(payment.montant.toString())}
                                            {penalty > 0 && (
                                                <div className="text-red-600 text-xs">
                                                    + {formatPrice(penalty.toString())} (pénalité)
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                            {penalty > 0 ? formatPrice(penalty.toString()) : "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.dateLimite ? 
                                                new Date(payment.dateLimite).toLocaleDateString('fr-FR') : 
                                                "-"
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                                                {payment.status === "paye" ? "Payé" : 
                                                 payment.status === "attente" ? "En attente" : "En retard"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            {payment.status !== "paye" && (
                                                <>
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileUpload(payment.id, file);
                                                        }}
                                                        className="hidden"
                                                        id={`file-${payment.id}`}
                                                        disabled={uploadingPayment === payment.id}
                                                    />
                                                    <label
                                                        htmlFor={`file-${payment.id}`}
                                                        className="text-blue-600 hover:text-blue-900 cursor-pointer"
                                                    >
                                                        {uploadingPayment === payment.id ? "Upload..." : "Upload"}
                                                    </label>
                                                </>
                                            )}
                                            
                                            {payment.justificatif && (
                                                <a
                                                    href={payment.justificatif}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    Voir
                                                </a>
                                            )}
                                            
                                            {(user?.role === "admin" || user?.role === "super_admin") && 
                                             payment.status === "attente" && (
                                                <div className="space-x-1">
                                                    <button
                                                        onClick={() => handleValidatePayment(payment.id, true)}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Valider
                                                    </button>
                                                    <button
                                                        onClick={() => handleValidatePayment(payment.id, false)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Rejeter
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredPayments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    Aucun paiement trouvé avec les filtres sélectionnés.
                </div>
            )}
        </div>
    );
}