"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CreditCard, Upload, X } from "lucide-react";
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
    const [declareModal, setDeclareModal] = useState<{ payment: Payment } | null>(null);
    const [declaring, setDeclaring] = useState(false);
    const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
    const proofInputRef = useRef<HTMLInputElement>(null);

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

    // Abonnement temps réel : met à jour le dossier quand le staff change son statut
    useEffect(() => {
        if (!studentId) return;
        const channel = supabase
            .channel(`dossier-rt-${studentId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'dossier_bourses',
                filter: `student_id=eq.${studentId}`,
            }, async () => {
                const { data } = await supabase
                    .from("dossier_bourses").select("*")
                    .eq("student_id", studentId)
                    .order("created_at", { ascending: false }).limit(1);
                const d = data?.[0] ?? null;
                setDossier(d);
                if (d?.university_id) {
                    const { data: uniData } = await supabase
                        .from("universities").select("nom")
                        .eq("id", d.university_id).single();
                    setUniversityName(uniData?.nom ?? null);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [studentId]);

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

    const openDeclareModal = (payment: Payment) => {
        setProofDataUrl(null);
        setDeclareModal({ payment });
    };

    const handleProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setProofDataUrl(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleDeclarePayment = async () => {
        if (!declareModal) return;
        setDeclaring(true);
        try {
            const res = await fetch("/api/declare-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payment_id: declareModal.payment.id,
                    proof_url: proofDataUrl ?? undefined,
                }),
            });
            if (res.ok) {
                showNotification("Paiement déclaré — en attente de validation", "success");
                setDeclareModal(null);
                void load();
            } else {
                const data = await res.json();
                showNotification(data.error ?? "Erreur lors de la déclaration", "error");
            }
        } catch {
            showNotification("Erreur réseau", "error");
        } finally {
            setDeclaring(false);
        }
    };

    const getPaymentTypeLabel = (type: string) => {
        switch (type) {
            case "bourse": return "Bourse";
            case "mandarin": return "Cours Mandarin";
            case "anglais": return "Cours Anglais";
            default: return type;
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
                                    onDeclarePayment={(p) => openDeclareModal(p as Payment)}
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
                                            <div
                                                key={payment.id}
                                                className="joda-surface-muted flex w-full flex-col gap-3 rounded-xl p-3"
                                            >
                                                <button
                                                    className="flex w-full items-center justify-between gap-3 text-left"
                                                    onClick={() => setDetailPayment(payment)}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium">{getPaymentTypeLabel(payment.type)}</p>
                                                        {payment.tranche && (
                                                            <p className="text-xs text-slate-500">Tranche {payment.tranche}</p>
                                                        )}
                                                        <p className="text-xs text-slate-400">
                                                            {payment.date_limite ? new Date(payment.date_limite).toLocaleDateString("fr-FR") : "-"}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="text-sm font-bold text-red-600">{formatMontant(payment.montant)}</p>
                                                        <Badge className={STATUS_COLORS[payment.status]}>{getPaymentStatusLabel(payment.status)}</Badge>
                                                    </div>
                                                </button>
                                                {(payment.status === "attente" || payment.status === "retard") && (
                                                    <button
                                                        onClick={() => openDeclareModal(payment)}
                                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                                                    >
                                                        <CreditCard className="h-3.5 w-3.5" />
                                                        Déclarer ce paiement
                                                    </button>
                                                )}
                                                {payment.status === "en_validation" && (
                                                    <span className="rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-center text-xs font-semibold text-blue-700">
                                                        En attente de validation
                                                    </span>
                                                )}
                                            </div>
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
                                        {(() => {
                                            const STATUS_STEP_MAP: Record<string, number> = {
                                                document_manquant: 0,
                                                en_attente: 0,
                                                document_recu: 1,
                                                en_cours: 2,
                                                en_attente_universite: 2,
                                                admission_validee: 3,
                                                admission_rejetee: 3,
                                                visa_en_cours: 4,
                                                termine: 5,
                                            };
                                            const isRejected = dossier.status === "admission_rejetee";
                                            const currentIdx = STATUS_STEP_MAP[dossier.status] ?? 0;
                                            const steps = [
                                                { key: "en_attente", label: "En attente" },
                                                { key: "document_recu", label: "Documents reçus" },
                                                { key: "en_cours", label: "En cours de traitement" },
                                                { key: "admission_validee", label: isRejected ? "Admission rejetée" : "Admission validée" },
                                                { key: "visa_en_cours", label: "Visa en cours" },
                                                { key: "termine", label: "Terminé" },
                                            ];
                                            return (
                                                <ol className="space-y-3">
                                                    {steps.map((step, stepIdx) => {
                                                        const done = stepIdx < currentIdx;
                                                        const active = stepIdx === currentIdx;
                                                        const isRejectStep = isRejected && stepIdx === 3;
                                                        return (
                                                            <li key={step.key} className="flex items-center gap-3">
                                                                <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                                    done ? "bg-green-100 text-green-600" :
                                                                    isRejectStep ? "bg-red-100 text-red-600" :
                                                                    active ? "bg-red-100 text-red-600" :
                                                                    "bg-slate-100 text-slate-400"
                                                                }`}>
                                                                    {done ? "✓" : isRejectStep ? "✗" : stepIdx + 1}
                                                                </span>
                                                                <span className={`text-sm ${
                                                                    isRejectStep ? "font-semibold text-red-600" :
                                                                    active ? "font-semibold text-slate-900" :
                                                                    done ? "text-slate-500" :
                                                                    "text-slate-400"
                                                                }`}>
                                                                    {step.label}
                                                                </span>
                                                            </li>
                                                        );
                                                    })}
                                                </ol>
                                            );
                                        })()}
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

        {/* Modal déclaration de paiement */}
        {declareModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="mb-5 flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Déclarer un paiement</h3>
                            <p className="mt-0.5 text-sm text-slate-500">
                                {getPaymentTypeLabel(declareModal.payment.type)}
                                {declareModal.payment.tranche ? ` — Tranche ${declareModal.payment.tranche}` : ""}
                            </p>
                        </div>
                        <button onClick={() => setDeclareModal(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mb-5 space-y-3 text-sm">
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                            <span className="text-slate-500">Montant</span>
                            <span className="font-bold text-red-600">{formatMontant(declareModal.payment.montant)}</span>
                        </div>
                        {declareModal.payment.date_limite && (
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                                <span className="text-slate-500">Date limite</span>
                                <span className="font-medium">{new Date(declareModal.payment.date_limite).toLocaleDateString("fr-FR")}</span>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-slate-600">Preuve de paiement (optionnel)</p>
                            <input
                                ref={proofInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleProofFile}
                                className="hidden"
                            />
                            {proofDataUrl ? (
                                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                                    <Upload className="h-4 w-4 text-green-600" />
                                    <span className="flex-1 text-xs text-green-700">Fichier joint</span>
                                    <button
                                        onClick={() => { setProofDataUrl(null); if (proofInputRef.current) proofInputRef.current.value = ""; }}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => proofInputRef.current?.click()}
                                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-500 transition-colors hover:border-red-300 hover:text-red-600"
                                >
                                    <Upload className="h-4 w-4" />
                                    Joindre un reçu ou screenshot
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="mb-5 text-xs text-slate-400">
                        En confirmant, vous déclarez avoir effectué ce paiement. L&apos;équipe Joda vérifiera et validera dans les plus brefs délais.
                    </p>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setDeclareModal(null)} disabled={declaring}>
                            Annuler
                        </Button>
                        <Button
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDeclarePayment}
                            disabled={declaring}
                        >
                            {declaring ? "Envoi..." : "Confirmer"}
                        </Button>
                    </div>
                </div>
            </div>
        )}

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
