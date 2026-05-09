"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useNotificationContext } from "../context/NotificationContext";
import StudentNotifications from "./StudentNotifications";
import DocumentUpload from "./DocumentUpload";
import PaymentOverview from "./PaymentOverview";
import { downloadReceipt, type ReceiptStudent } from "../utils/downloadReceipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChangePasswordModal from "./ChangePasswordModal";

interface User {
    id: string;
    name: string;
    role: string;
    mustChangePassword?: boolean;
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
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [universityName, setUniversityName] = useState<string | null>(null);

    useEffect(() => {
        if (user.mustChangePassword) setShowPasswordChange(true);
    }, [user.mustChangePassword]);

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

            const [pays, docs, dossiers, unreadRes] = await Promise.all([
                supabase.from("payments").select("*").eq("student_id", sid).order("created_at", { ascending: false }),
                supabase.from("documents").select("*").eq("student_id", sid).order("created_at", { ascending: false }),
                supabase.from("dossier_bourses").select("*").eq("student_id", sid).order("created_at", { ascending: false }).limit(1),
                supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
            ]);
            setPayments(pays.data || []);
            setDocuments(docs.data || []);
            setUnreadCount(unreadRes.count ?? 0);
            const dossierData = dossiers.data?.[0] ?? null;
            setDossier(dossierData);
            if (dossierData?.university_id) {
                const { data: uniData } = await supabase.from("universities").select("nom").eq("id", dossierData.university_id).single();
                setUniversityName(uniData?.nom ?? null);
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
        {showPasswordChange && (
            <ChangePasswordModal onPasswordChanged={() => setShowPasswordChange(false)} />
        )}
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
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setView("notifications")}
                            className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                            aria-label="Notifications"
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>
                        <span className="hidden text-sm text-slate-500 sm:inline-block">{user.name}</span>
                        <Button variant="outline" size="sm" onClick={onLogout}>Déconnexion</Button>
                    </div>
                </div>
            </header>

            <nav className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap gap-2 py-3">
                        {(["dashboard", "payments", "documents", "dossier"] as View[]).map((v) => (
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
                                        : "Mon dossier"}
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
                            <button
                                className="joda-surface w-full rounded-xl text-left transition-shadow hover:shadow-md"
                                onClick={() => setView("dossier")}
                            >
                                <div className="p-6">
                                    <p className="mb-2 text-sm font-medium text-slate-700">Statut dossier</p>
                                    <Badge className={STATUS_COLORS[dossier?.status || "en_attente"]}>
                                        {DOSSIER_LABELS[dossier?.status || "en_attente"]}
                                    </Badge>
                                    <p className="mt-3 text-xs text-slate-400">Voir les détails →</p>
                                </div>
                            </button>
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
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {payments.map((payment) => (
                                            <button
                                                key={payment.id}
                                                className="joda-surface-muted flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-slate-50"
                                                onClick={() => setDetailPayment(payment)}
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium capitalize">{payment.type}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {payment.date_limite ? new Date(payment.date_limite).toLocaleDateString("fr-FR") : "-"}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-bold text-red-600">{formatMontant(payment.montant)}</p>
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
                    <div className="space-y-6">
                        <div className="joda-surface">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Mon dossier</p>
                            <h2 className="text-2xl font-bold text-slate-900">Dossier de bourse</h2>
                            <p className="mt-1 text-sm text-slate-500">Suivi de l'avancement de ta candidature.</p>
                        </div>
                        {dossier ? (
                            <>
                                <Card className="joda-surface border-0 shadow-none">
                                    <CardHeader>
                                        <CardTitle className="text-base">Informations</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-3">
                                            <span className="text-sm text-slate-500">Statut</span>
                                            <Badge className={STATUS_COLORS[dossier.status]}>{DOSSIER_LABELS[dossier.status]}</Badge>
                                        </div>
                                        {universityName && (
                                            <div className="flex items-center justify-between border-b pb-3">
                                                <span className="text-sm text-slate-500">Université</span>
                                                <span className="text-sm font-medium text-slate-900">{universityName}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">Date de création</span>
                                            <span className="text-sm font-medium text-slate-900">
                                                {new Date(dossier.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {dossier.notes_internes && (
                                    <Card className="joda-surface border-0 shadow-none">
                                        <CardHeader>
                                            <CardTitle className="text-base">Message de l'équipe</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-700 leading-relaxed">{dossier.notes_internes}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card className="joda-surface border-0 shadow-none">
                                    <CardHeader>
                                        <CardTitle className="text-base">Étapes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ol className="space-y-3">
                                            {(["en_attente", "document_recu", "en_cours", "admission_validee", "visa_en_cours", "termine"] as const).map((step) => {
                                                const steps = ["en_attente", "document_recu", "en_cours", "admission_validee", "visa_en_cours", "termine"];
                                                const currentIdx = steps.indexOf(dossier.status);
                                                const stepIdx = steps.indexOf(step);
                                                const done = stepIdx < currentIdx;
                                                const active = stepIdx === currentIdx;
                                                return (
                                                    <li key={step} className="flex items-center gap-3">
                                                        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                            done ? "bg-green-100 text-green-600" : active ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"
                                                        }`}>
                                                            {done ? "✓" : stepIdx + 1}
                                                        </span>
                                                        <span className={`text-sm ${active ? "font-semibold text-slate-900" : done ? "text-slate-500 line-through" : "text-slate-400"}`}>
                                                            {DOSSIER_LABELS[step] ?? step}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <Card className="joda-surface border-0 shadow-none">
                                <CardContent>
                                    <p className="py-8 text-center text-slate-400">Aucun dossier enregistré pour le moment.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {view === "notifications" && (
                    <StudentNotifications
                        user={user}
                        onBack={() => { setView("dashboard"); void load(); }}
                    />
                )}
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
