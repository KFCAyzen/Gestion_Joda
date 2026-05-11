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
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";

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
    const t = useTranslations("student");
    const locale = useLocale();
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
    const [declareModal, setDeclareModal] = useState<{
        paymentId: string | null;
        type: string;
        trancheNum: number;
        montantTranche: number;
        label: string;
        dateLimite: string | null;
    } | null>(null);
    const [paymentMode, setPaymentMode] = useState<"complet" | "avance">("complet");
    const [montantAvance, setMontantAvance] = useState<string>("");
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

            const [paysRes, docs, dossiers, unreadRes] = await Promise.all([
                fetch("/api/student-payments").then(r => r.ok ? r.json() : []).catch(() => []),
                supabase.from("documents").select("*").eq("student_id", sid).order("created_at", { ascending: false }),
                supabase.from("dossier_bourses").select("*").eq("student_id", sid).order("created_at", { ascending: false }).limit(1),
                supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
            ]);
            setPayments(Array.isArray(paysRes) ? paysRes : []);
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
        return t(`paymentStatus.${status}`, { fallback: status });
    };

    const getDocumentStatusLabel = (status: string) => {
        return t(`documentStatus.${status}`, { fallback: status });
    };

    const openDeclareModal = (payment: { id?: string; date_limite?: string | null } | null, info: { type: string; tranche: number; montant: number }) => {
        setProofDataUrl(null);
        setPaymentMode("complet");
        setMontantAvance(info.montant.toString());
        setDeclareModal({
            paymentId: payment?.id ?? null,
            type: info.type,
            trancheNum: info.tranche,
            montantTranche: info.montant,
            label: info.tranche ? t("payments.installment", { installment: info.tranche }) : getPaymentTypeLabel(info.type),
            dateLimite: payment?.date_limite ?? null,
        });
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
        const montantDeclare = paymentMode === "complet"
            ? declareModal.montantTranche
            : Math.max(1, parseInt(montantAvance) || 0);
        setDeclaring(true);
        try {
            const res = await fetch("/api/declare-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payment_id: declareModal.paymentId,
                    type: declareModal.type,
                    tranche_num: declareModal.trancheNum,
                    montant_declare: montantDeclare,
                    montant_tranche: declareModal.montantTranche,
                    proof_url: proofDataUrl ?? undefined,
                    is_avance: paymentMode === "avance",
                }),
            });
            if (res.ok) {
                showNotification(t("messages.paymentDeclared"), "success");
                setDeclareModal(null);
                void load();
            } else {
                const data = await res.json();
                showNotification(data.error ?? t("messages.paymentError"), "error");
            }
        } catch {
            showNotification(t("messages.networkError"), "error");
        } finally {
            setDeclaring(false);
        }
    };

    const getPaymentTypeLabel = (type: string) => {
        return t(`paymentTypes.${type}`, { fallback: type });
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
                            {t("portal.title")}
                        </p>
                        <h1 className="text-2xl font-bold text-slate-900">Gestion Joda</h1>
                        <p className="text-sm text-slate-500">{t("portal.welcome")}, {user.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setView("notifications")}
                            className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                            aria-label={t("portal.nav.notifications")}
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>
                        <span className="hidden text-sm text-slate-500 sm:inline-block">{user.name}</span>
                        <Button variant="outline" size="sm" onClick={onLogout}>{t("portal.logout")}</Button>
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
                                    ? t("portal.nav.dashboard")
                                    : v === "payments"
                                      ? t("portal.nav.payments")
                                      : v === "documents"
                                        ? t("portal.nav.documents")
                                        : t("portal.nav.dossier")}
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
                                {t("dashboard.overview")}
                            </p>
                            <h2 className="text-2xl font-bold text-slate-900">{t("dashboard.mySpace")}</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {t("dashboard.followPayments")}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <Card className="joda-surface border-0 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-sm">{t("payments.title")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{payments.length}</p>
                                    <p className="text-xs text-slate-500">{t("dashboard.totalPayments")}</p>
                                </CardContent>
                            </Card>
                            <Card className="joda-surface border-0 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-sm">{t("documents.title")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{documents.length}</p>
                                    <p className="text-xs text-slate-500">{t("dashboard.uploadedDocuments")}</p>
                                </CardContent>
                            </Card>
                            <button
                                className="joda-surface w-full rounded-xl text-left transition-shadow hover:shadow-md"
                                onClick={() => setView("dossier")}
                            >
                                <div className="p-6">
                                    <p className="mb-2 text-sm font-medium text-slate-700">{t("dossier.fileStatus")}</p>
                                    <Badge className={STATUS_COLORS[dossier?.status || "en_attente"]}>
                                        {t(`status.${dossier?.status || "pending"}`)}
                                    </Badge>
                                    <p className="mt-3 text-xs text-slate-400">{t("dashboard.seeDetails")}</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {view === "payments" && (
                    <div className="space-y-6">
                        <Card className="joda-surface border-0 shadow-none">
                            <CardHeader>
                                <CardTitle>{t("payments.title")}</CardTitle>
                                <p className="text-sm text-slate-500">
                                    {t("payments.description")}
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
                                    onDeclarePayment={(p, info) => openDeclareModal(p, info)}
                                />
                            </CardContent>
                        </Card>

                        {payments.length > 0 && (
                            <Card className="joda-surface border-0 shadow-none">
                                <CardHeader>
                                    <CardTitle className="text-base">{t("payments.paymentHistory")}</CardTitle>
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
                                                            <p className="text-xs text-slate-500">{t("payments.installment", { installment: payment.tranche })}</p>
                                                        )}
                                                        <p className="text-xs text-slate-400">
                                                            {payment.date_limite ? new Date(payment.date_limite).toLocaleDateString(locale) : "-"}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="text-sm font-bold text-red-600">{formatMontant(payment.montant)}</p>
                                                        <Badge className={STATUS_COLORS[payment.status]}>{getPaymentStatusLabel(payment.status)}</Badge>
                                                    </div>
                                                </button>
                                                {payment.status !== "paye" && payment.status !== "en_validation" && (
                                                    <button
                                                        onClick={() => openDeclareModal(payment, {
                                                            type: payment.type,
                                                            tranche: payment.tranche ?? 1,
                                                            montant: payment.montant,
                                                        })}
                                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                                                    >
                                                        <CreditCard className="h-3.5 w-3.5" />
                                                        {t("payments.makePayment")}
                                                    </button>
                                                )}
                                                {payment.status === "en_validation" && (
                                                    <span className="rounded-lg border border-blue-200 bg-blue-50 py-1.5 text-center text-xs font-semibold text-blue-700">
                                                        {t("payments.waitingValidation")}
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
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t("dossier.title")}</p>
                            <h2 className="text-2xl font-bold text-slate-900">{t("dossier.subtitle")}</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {t("dossier.description")}
                            </p>
                        </div>
                        {dossier ? (
                            <>
                                <Card className="joda-surface border-0 shadow-none">
                                    <CardHeader>
                                        <CardTitle className="text-base">{t("dossier.infoTab")}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-3">
                                            <span className="text-sm text-slate-500">{t("dossier.currentStep")}</span>
                                            <Badge className={STATUS_COLORS[dossier.status]}>{t(`status.${dossier.status}`)}</Badge>
                                        </div>
                                        {universityName && (
                                            <div className="flex items-center justify-between border-b pb-3">
                                                <span className="text-sm text-slate-500">{t("dossier.university")}</span>
                                                <span className="text-sm font-medium text-slate-900">{universityName}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-slate-500">{t("dossier.applicationDate")}</span>
                                            <span className="text-sm font-medium text-slate-900">
                                                {new Date(dossier.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {dossier.notes_internes && (
                                    <Card className="joda-surface border-0 shadow-none">
                                        <CardHeader>
                                            <CardTitle className="text-base">{t("dossier.teamMessage")}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-slate-700 leading-relaxed">{dossier.notes_internes}</p>
                                        </CardContent>
                                    </Card>
                                )}

                                <Card className="joda-surface border-0 shadow-none">
                                    <CardHeader>
                                        <CardTitle className="text-base">{t("dossier.steps")}</CardTitle>
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
                                                { key: "en_attente", label: t("status.pending") },
                                                { key: "document_recu", label: t("status.document_received") },
                                                { key: "en_cours", label: t("status.in_progress") },
                                                { key: "admission_validee", label: isRejected ? t("status.admission_rejected") : t("status.admission_approved") },
                                                { key: "visa_en_cours", label: t("status.visa_processing") },
                                                { key: "termine", label: t("status.completed") },
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
                                    <p className="py-8 text-center text-slate-400">{t("dossier.noFile")}</p>
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

        {/* Modal paiement étudiant */}
        {declareModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="mb-4 flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">{t("payments.makePayment")}</h3>
                            <p className="mt-0.5 text-sm text-slate-500">
                                {getPaymentTypeLabel(declareModal.type)} — {declareModal.label}
                            </p>
                        </div>
                        <button onClick={() => setDeclareModal(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="mb-4 space-y-3 text-sm">
                        {/* Montant attendu */}
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                            <span className="text-slate-500">{t("payments.expectedAmount")}</span>
                            <span className="font-bold text-slate-800">{formatMontant(declareModal.montantTranche)}</span>
                        </div>

                        {/* Mode de paiement */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setPaymentMode("complet")}
                                className={`rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                                    paymentMode === "complet"
                                        ? "border-red-500 bg-red-50 text-red-700"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                {t("payments.fullPayment")}
                            </button>
                            <button
                                onClick={() => setPaymentMode("avance")}
                                className={`rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                                    paymentMode === "avance"
                                        ? "border-red-500 bg-red-50 text-red-700"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                            >
                                {t("payments.deposit")}
                            </button>
                        </div>

                        {/* Montant acompte */}
                        {paymentMode === "avance" && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-slate-600">{t("payments.amountPaid")}</p>
                                <input
                                    type="number"
                                    min={1}
                                    max={declareModal.montantTranche}
                                    value={montantAvance}
                                    onChange={e => setMontantAvance(e.target.value)}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                                    placeholder={t("payments.amountPaid")}
                                />
                            </div>
                        )}

                        {/* Preuve */}
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-slate-600">{t("payments.proofUpload")}</p>
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
                                    <span className="flex-1 text-xs text-green-700">{t("payments.fileAttached")}</span>
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
                                    {t("payments.uploadReceipt")}
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="mb-4 text-xs text-slate-400">
                        {t("payments.confirmMessage")}
                    </p>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={() => setDeclareModal(null)} disabled={declaring}>
                            {t("payments.cancel")}
                        </Button>
                        <Button
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDeclarePayment}
                            disabled={declaring}
                        >
                            {declaring ? t("payments.sending") : t("payments.confirm")}
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
                        <h3 className="text-lg font-semibold">{t("payments.detailsTitle")}</h3>
                        <button onClick={() => setDetailPayment(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500">{t("payments.type")}</span><span className="font-medium capitalize">{getPaymentTypeLabel(detailPayment.type)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500">{t("payments.amount")}</span><span className="font-bold text-red-600">{formatMontant(detailPayment.montant)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500">{t("payments.status")}</span>
                            <Badge className={STATUS_COLORS[detailPayment.status]}>{getPaymentStatusLabel(detailPayment.status)}</Badge>
                        </div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500">{t("payments.dueDate")}</span><span className="font-medium">{detailPayment.date_limite ? new Date(detailPayment.date_limite).toLocaleDateString(locale) : "—"}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">{t("payments.paymentDate")}</span><span className="font-medium">{detailPayment.date_paiement ? new Date(detailPayment.date_paiement).toLocaleDateString(locale) : "—"}</span></div>
                    </div>
                    <div className="mt-5 flex gap-2">
                        {detailPayment.status === "paye" && studentInfo && (
                            <button
                                onClick={() => downloadReceipt(detailPayment as any, studentInfo)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                                {t("payments.downloadReceipt")}
                            </button>
                        )}
                        <button onClick={() => setDetailPayment(null)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600">{t("common.close")}</button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
