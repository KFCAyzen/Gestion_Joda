"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useNotificationContext } from "../context/NotificationContext";
import StudentNotifications from "./StudentNotifications";
import DocumentUpload from "./DocumentUpload";
import PaymentOverview from "./PaymentOverview";
import { downloadReceipt, type ReceiptStudent } from "../utils/downloadReceipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface User {
    id: string;
    name: string;
    role: string;
}

interface StudentPortalProps {
    user: User;
    onLogout: () => void;
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
    created_at: string;
}

interface Document {
    id: string;
    student_id: string;
    type: string;
    status: string;
    url: string;
    uploaded_at: string;
}

interface DossierBourse {
    id: string;
    student_id: string;
    status: string;
    notes_internes: string;
    university_id: string;
    created_at: string;
}

function formatMontant(n: number) {
    return `${n.toLocaleString("fr-FR")} FCFA`;
}

const STATUS_COLORS: Record<string, string> = {
    paye: "bg-green-100 text-green-700",
    attente: "bg-yellow-100 text-yellow-700",
    retard: "bg-red-100 text-red-700",
    valide: "bg-green-100 text-green-700",
    en_attente: "bg-yellow-100 text-yellow-700",
    non_conforme: "bg-red-100 text-red-700",
    document_recu: "bg-blue-100 text-blue-700",
    en_cours: "bg-purple-100 text-purple-700",
    admission_validee: "bg-green-100 text-green-700",
    admission_rejetee: "bg-red-100 text-red-700",
    visa_en_cours: "bg-teal-100 text-teal-700",
    termine: "bg-gray-100 text-gray-700",
};

const DOSSIER_LABELS: Record<string, string> = {
    document_recu: "Documents reçus",
    en_attente: "En attente",
    en_cours: "En cours",
    document_manquant: "En attente de documents",
    admission_validee: "Admission validée",
    admission_rejetee: "Admission rejetée",
    en_attente_universite: "En attente université",
    visa_en_cours: "Visa en cours",
    termine: "Terminé",
};

type View = "dashboard" | "payments" | "documents" | "dossier" | "notifications";

export default function StudentPortal({ user, onLogout }: StudentPortalProps) {
    const supabase = createClient();
    const { showNotification } = useNotificationContext();
    const [view, setView] = useState<View>("dashboard");
    const [payments, setPayments] = useState<Payment[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [dossier, setDossier] = useState<DossierBourse | null>(null);
    const [loading, setLoading] = useState(true);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [studentChoix, setStudentChoix] = useState<string>("");
    const [studentLangue, setStudentLangue] = useState<string>("");
    const [studentInfo, setStudentInfo] = useState<ReceiptStudent | null>(null);
    const [detailPayment, setDetailPayment] = useState<Payment | null>(null);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Récupérer l'ID étudiant depuis la table students via created_by
            const { data: studentData } = await supabase
                .from("students")
                .select("id, choix, langue, nom, prenom, email, telephone, niveau, filiere")
                .eq("created_by", user.id)
                .single();

            const sid = studentData?.id;
            if (!sid) { setLoading(false); return; }
            setStudentId(sid);
            setStudentChoix(studentData?.choix ?? "");
            setStudentLangue(studentData?.langue ?? "");
            setStudentInfo({
                nom: studentData?.nom ?? "",
                prenom: studentData?.prenom ?? "",
                email: studentData?.email ?? "",
                telephone: studentData?.telephone ?? "",
                niveau: studentData?.niveau ?? "",
                filiere: studentData?.filiere ?? "",
            });

            const [pays, docs, dossiers] = await Promise.all([
                supabase.from("payments").select("*").eq("student_id", sid).order("created_at", { ascending: false }),
                supabase.from("documents").select("*").eq("student_id", sid).order("created_at", { ascending: false }),
                supabase.from("dossier_bourses").select("*").eq("student_id", sid).order("created_at", { ascending: false }).limit(1),
            ]);
            setPayments(pays.data || []);
            setDocuments(docs.data || []);
            if (dossiers.data && dossiers.data.length > 0) {
                setDossier(dossiers.data[0]);
            }
        } finally {
            setLoading(false);
        }
    }, [user.id]);

    useEffect(() => {
        load();
    }, [load]);

    const getPaymentStatusLabel = (status: string) => {
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

    const getDocumentStatusLabel = (status: string) => {
        switch (status) {
            case "valide":
                return "Valide";
            case "en_attente":
                return "En attente";
            case "non_conforme":
                return "Non conforme";
            default:
                return status;
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
            </div>
        );
    }

    return (
        <>
        <div className="min-h-screen app-shell">
            <header className="glass-header border-b border-white/70">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
                    <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            Portail étudiant
                        </p>
                        <h1 className="text-2xl font-bold text-slate-900">Gestion Joda</h1>
                        <p className="text-sm text-slate-500">Bienvenue, {user.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hidden text-sm text-slate-500 sm:inline-block">{user.name}</span>
                        <Button variant="outline" size="sm" onClick={onLogout}>Déconnexion</Button>
                    </div>
                </div>
            </header>

            <nav className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap gap-2 py-3">
                        {(["dashboard", "payments", "documents", "dossier", "notifications"] as View[]).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                    view === v
                                        ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_rgba(239,68,68,0.28)]"
                                        : "bg-white/70 text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                {v === "dashboard"
                                    ? "Tableau de bord"
                                    : v === "payments"
                                      ? "Paiements"
                                      : v === "documents"
                                        ? "Documents"
                                        : v === "dossier"
                                          ? "Mon dossier"
                                          : "Notifications"}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {view === "dashboard" && (
                    <div className="space-y-6">
                        <div className="joda-surface">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                                Vue d'ensemble
                            </p>
                            <h2 className="text-2xl font-bold text-slate-900">Mon espace étudiant</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Suis tes paiements, tes documents et l'avancement global de ton dossier.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <Card className="joda-surface border-0 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-sm">Paiements</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{payments.length}</p>
                                    <p className="text-xs text-slate-500">Total paiements</p>
                                </CardContent>
                            </Card>
                            <Card className="joda-surface border-0 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-sm">Documents</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{documents.length}</p>
                                    <p className="text-xs text-slate-500">Documents uploadés</p>
                                </CardContent>
                            </Card>
                            <Card className="joda-surface border-0 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-sm">Statut dossier</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Badge className={STATUS_COLORS[dossier?.status || "en_attente"]}>
                                        {DOSSIER_LABELS[dossier?.status || "en_attente"]}
                                    </Badge>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {view === "payments" && (
                    <div className="space-y-6">
                        <Card className="joda-surface border-0 shadow-none">
                            <CardHeader>
                                <CardTitle>Mes Paiements</CardTitle>
                                <p className="text-sm text-slate-500">
                                    Suivi de tes échéances selon le service souscrit.
                                </p>
                            </CardHeader>
                            <CardContent>
                                <PaymentOverview
                                    choix={studentChoix}
                                    langue={studentLangue}
                                    payments={payments}
                                    onDownloadReceipt={studentInfo
                                        ? (p) => downloadReceipt(p, studentInfo)
                                        : undefined}
                                />
                            </CardContent>
                        </Card>

                        {payments.length > 0 && (
                            <Card className="joda-surface border-0 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-base">Historique des paiements</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {payments.map((payment) => (
                                            <button
                                                key={payment.id}
                                                className="joda-surface-muted flex w-full items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                                                onClick={() => setDetailPayment(payment)}
                                            >
                                                <div>
                                                    <p className="font-medium capitalize">{payment.type}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {payment.date_limite ? new Date(payment.date_limite).toLocaleDateString("fr-FR") : "-"}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-red-600">{formatMontant(payment.montant)}</p>
                                                    <Badge className={STATUS_COLORS[payment.status]}>{getPaymentStatusLabel(payment.status)}</Badge>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {view === "documents" && (
                    <DocumentUpload studentId={studentId} onDocumentUploaded={load} />
                )}

                {view === "dossier" && (
                    <Card className="joda-surface border-0 shadow-none">
                        <CardHeader>
                            <CardTitle>Mon dossier de bourse</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {dossier ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-600">Statut :</span>
                                        <Badge className={STATUS_COLORS[dossier.status]}>{DOSSIER_LABELS[dossier.status]}</Badge>
                                    </div>
                                    {dossier.notes_internes && (
                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-sm text-gray-700">{dossier.notes_internes}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="py-8 text-center text-gray-500">Aucun dossier</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {view === "notifications" && <StudentNotifications user={user} />}
            </main>
        </div>

        {/* Modal détails paiement étudiant */}
        {detailPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Détails du paiement</h3>
                        <button onClick={() => setDetailPayment(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Service</span><span className="font-medium capitalize">{detailPayment.type}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Montant</span><span className="font-bold text-red-600">{formatMontant(detailPayment.montant)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Statut</span>
                            <Badge className={STATUS_COLORS[detailPayment.status]}>{getPaymentStatusLabel(detailPayment.status)}</Badge>
                        </div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Date limite</span><span className="font-medium">{detailPayment.date_limite ? new Date(detailPayment.date_limite).toLocaleDateString("fr-FR") : "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Date paiement</span><span className="font-medium">{detailPayment.date_paiement ? new Date(detailPayment.date_paiement).toLocaleDateString("fr-FR") : "—"}</span></div>
                    </div>
                    <div className="mt-5 flex gap-2">
                        {detailPayment.status === "paye" && studentInfo && (
                            <button
                                onClick={() => downloadReceipt(detailPayment as any, studentInfo)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                                Télécharger reçu
                            </button>
                        )}
                        <button onClick={() => setDetailPayment(null)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600">Fermer</button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
