"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Upload, X, ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNotificationContext } from "../context/NotificationContext";
import StudentNotifications from "./StudentNotifications";
import { StudentMessaging } from "./student/StudentMessaging";
import DocumentUpload from "./DocumentUpload";
import PaymentOverview from "./PaymentOverview";
import { downloadReceipt, type ReceiptStudent } from "../utils/downloadReceipt";
import { isInternational } from "../types/payment-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ChangePasswordModal from "./ChangePasswordModal";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { StudentShell } from "./student/StudentShell";
import { StudentChatFull } from "./student/StudentChatFull";
import type { StudentView } from "./student/types";
import { SectionHeader } from "./student/SectionHeader";
import { EmptyState } from "./student/EmptyState";
import { Skeleton } from "./student/Skeleton";
import { ActivityRings } from "./student/ActivityRings";
import { DossierRoadmap } from "./student/DossierRoadmap";
import { StudentReceivedDocuments } from "./student/StudentReceivedDocuments";

// ── Zustand store (état UI)
import { useStudentPortalStore } from "../lib/stores/student-portal.store";

// ── TanStack Query hooks (état serveur)
import {
    useStudentProfile,
    useStudentPayments,
    useStudentDossier,
    useStudentUniversity,
    useStudentLastMessage,
    useDeclarePayment,
    useCancelPaymentDeclaration,
    STUDENT_DOSSIER_KEY,
} from "../lib/hooks/use-student-portal";
import { useDocuments } from "../lib/hooks/use-documents";
import { useUnreadCount } from "../lib/hooks/use-notifications";
import type { Payment } from "../lib/schemas/payment.schema";

// ── Props ─────────────────────────────────────────────────────────────────────

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

// ── Constantes UI ─────────────────────────────────────────────────────────────

function formatMontant(n: number, isIntl = false) {
    // Aligné sur PaymentOverview / FeeConfigManagement :
    //   intl  → "$1 499" (fr-FR thin-space, $ collé devant)
    //   local → "100 000 FCFA"
    return isIntl
        ? `$${n.toLocaleString("fr-FR")}`
        : `${n.toLocaleString("fr-FR")} FCFA`;
}

function mapDossierStatusToI18nKey(status: string) {
    const map: Record<string, string> = {
        document_recu: "document_received",
        en_attente: "pending",
        en_cours: "in_progress",
        document_manquant: "missing_documents",
        admission_validee: "admission_approved",
        admission_rejetee: "admission_rejected",
        en_attente_universite: "waiting_university",
        visa_en_cours: "visa_processing",
        termine: "completed",
    };
    return map[status] ?? status;
}

const STATUS_COLORS: Record<string, string> = {
    paye: "border-[rgba(255,255,255,0.35)] bg-[rgba(255,255,255,0.15)] text-[var(--student-ring-move)]",
    attente: "border-[rgba(255,255,255,0.20)] bg-[rgba(255,255,255,0.08)] text-[var(--student-fg-muted)]",
    retard: "border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.10)] text-[var(--student-ring-move)]",
    valide: "border-[rgba(34,197,94,0.40)] bg-[rgba(34,197,94,0.15)] text-green-400",
    en_attente: "border-[rgba(255,255,255,0.20)] bg-[rgba(255,255,255,0.08)] text-[var(--student-fg-muted)]",
    non_conforme: "border-[rgba(249,115,22,0.40)] bg-[rgba(249,115,22,0.15)] text-orange-400",
    document_recu: "border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.10)] text-[var(--student-ring-exercise)]",
    en_cours: "border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.10)] text-[var(--student-ring-exercise)]",
    admission_validee: "border-[rgba(34,197,94,0.40)] bg-[rgba(34,197,94,0.15)] text-green-400",
    admission_rejetee: "border-[rgba(249,115,22,0.40)] bg-[rgba(249,115,22,0.15)] text-orange-400",
    visa_en_cours: "border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.10)] text-[var(--student-ring-exercise)]",
    termine: "border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)] text-[var(--student-fg-muted)]",
};

const PAYMENTS_TAB_BADGE: Record<string, string> = {
    paye: "border-[rgba(255,255,255,0.38)] bg-[rgba(255,255,255,0.18)] text-[var(--student-ring-move)]",
    attente: "border-[rgba(255,255,255,0.20)] bg-[rgba(255,255,255,0.08)] text-[var(--student-fg-muted)]",
    retard: "border-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.12)] text-[var(--student-ring-move)]",
    valide: "border-[rgba(34,197,94,0.40)] bg-[rgba(34,197,94,0.15)] text-green-400",
    en_attente: "border-[rgba(255,255,255,0.20)] bg-[rgba(255,255,255,0.08)] text-[var(--student-fg-muted)]",
    non_conforme: "border-[rgba(249,115,22,0.40)] bg-[rgba(249,115,22,0.15)] text-orange-400",
    en_validation: "border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.10)] text-[var(--student-ring-exercise)]",
    document_recu: "border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.10)] text-[var(--student-ring-exercise)]",
    en_cours: "border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.10)] text-[var(--student-ring-exercise)]",
    admission_validee: "border-[rgba(34,197,94,0.40)] bg-[rgba(34,197,94,0.15)] text-green-400",
    admission_rejetee: "border-[rgba(249,115,22,0.40)] bg-[rgba(249,115,22,0.15)] text-orange-400",
    visa_en_cours: "border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.10)] text-[var(--student-ring-exercise)]",
    termine: "border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)] text-[var(--student-fg-muted)]",
};

const DOSSIER_ROADMAP_INDEX: Record<string, number> = {
    document_manquant: 0,
    en_attente: 1,
    document_recu: 2,
    en_cours: 3,
    en_attente_universite: 4,
    admission_validee: 5,
    admission_rejetee: 5,
    visa_en_cours: 6,
    termine: 7,
};

const DOSSIER_ROADMAP_LAST_IDX = 7;

type View = StudentView;

// ── Composant ─────────────────────────────────────────────────────────────────

export default function StudentPortal({ user, onLogout }: StudentPortalProps) {
    const t = useTranslations("student");
    const tPaymentOverview = useTranslations("paymentOverview");
    const locale = useLocale();
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { showNotification } = useNotificationContext();

    // ── Zustand : état UI ──────────────────────────────────────────────────────
    const {
        view, setView, initView,
        declareModal, openDeclareModal, closeDeclareModal,
        paymentMode, setPaymentMode,
        montantAvance, setMontantAvance,
        proofFile, setProofFile,
        detailPayment, setDetailPayment,
        unreadMessages, setUnreadMessages,
    } = useStudentPortalStore();

    // Synchroniser la vue depuis sessionStorage au premier rendu
    useEffect(() => { initView(); }, [initView]);

    // ── TanStack Query : données serveur ───────────────────────────────────────
    const { data: studentProfile, isLoading: profileLoading } = useStudentProfile(user.id);
    const studentId = studentProfile?.id ?? null;

    const { data: payments = [] } = useStudentPayments();
    const { data: rawDocuments = [] } = useDocuments(studentId ?? undefined);
    const { data: dossier = null } = useStudentDossier(studentId);
    const { data: universityName = null } = useStudentUniversity(dossier?.university_id);
    const { data: lastMessageData } = useStudentLastMessage(user.id);
    const { data: unreadCount = 0 } = useUnreadCount(user.id);

    const agentName = lastMessageData?.agentName ?? "Votre agent";
    const lastMessagePreview = lastMessageData?.preview ?? "";

    // ── Mutations ──────────────────────────────────────────────────────────────
    const declarePaymentMutation = useDeclarePayment();
    const cancelDeclarationMutation = useCancelPaymentDeclaration();

    // ── État UI local (éphémère, non partagé) ─────────────────────────────────
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [cancelPaymentId, setCancelPaymentId] = useState<string | null>(null);
    const proofInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user.mustChangePassword) setShowPasswordChange(true);
    }, [user.mustChangePassword]);

    // ── Temps réel : invalidation du cache dossier ─────────────────────────────
    useEffect(() => {
        if (!studentId) return;
        const channel = supabase
            .channel(`dossier-rt-${studentId}`)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "dossier_bourses",
                filter: `student_id=eq.${studentId}`,
            }, () => {
                queryClient.invalidateQueries({ queryKey: [...STUDENT_DOSSIER_KEY, studentId] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [studentId, queryClient, supabase]);

    // ── Données dérivées ──────────────────────────────────────────────────────

    const isIntl = isInternational(studentProfile?.nationalite ?? null);

    const studentInfo: ReceiptStudent | null = studentProfile
        ? {
              nom: studentProfile.nom,
              prenom: studentProfile.prenom,
              email: studentProfile.email,
              telephone: studentProfile.telephone ?? "",
              niveau: studentProfile.niveau,
              filiere: studentProfile.filiere,
              langue: studentProfile.langue,
              nationalite: studentProfile.nationalite ?? null,
          }
        : null;

    // Documents : le hook retourne les documents du schéma (sans uploaded_at)
    const documents = rawDocuments;

    const getPaymentTypeLabel = (type: string) =>
        t(`paymentTypes.${type}`, { fallback: type });

    const getPaymentStatusLabel = (status: string) =>
        t(`paymentStatus.${status}`, { fallback: status });

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleOpenDeclareModal = (
        payment: { id?: string; date_limite?: string | null } | null,
        info: { type: string; tranche: number; montant: number; label?: string }
    ) => {
        openDeclareModal({
            paymentId: payment?.id ?? null,
            type: info.type,
            trancheNum: info.tranche,
            montantTranche: info.montant,
            label: info.label ?? (info.tranche ? t("payments.installment", { installment: info.tranche }) : getPaymentTypeLabel(info.type)),
            dateLimite: payment?.date_limite ?? null,
        });
    };

    const handleProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProofFile(e.target.files?.[0] ?? null);
    };

    const handleDeclarePayment = async () => {
        if (!declareModal) return;
        const montantDeclare =
            paymentMode === "complet"
                ? declareModal.montantTranche
                : Math.max(1, parseInt(montantAvance) || 0);

        try {
            await declarePaymentMutation.mutateAsync({
                studentId,
                proofFile,
                payment_id: declareModal.paymentId,
                type: declareModal.type,
                tranche_num: declareModal.trancheNum,
                montant_declare: montantDeclare,
                montant_tranche: declareModal.montantTranche,
                is_avance: paymentMode === "avance",
            });
            showNotification(t("messages.paymentDeclared"), "success");
            closeDeclareModal();
            if (proofInputRef.current) proofInputRef.current.value = "";
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t("messages.paymentError");
            showNotification(msg, "error");
        }
    };

    const handleConfirmCancelDeclaration = async () => {
        if (!cancelPaymentId) return;
        try {
            await cancelDeclarationMutation.mutateAsync(cancelPaymentId);
            showNotification(t("messages.declarationCancelled"), "success");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : t("messages.declarationCancelError");
            showNotification(msg, "error");
        } finally {
            setCancelPaymentId(null);
        }
    };

    // ── Calculs dashboard ──────────────────────────────────────────────────────

    if (profileLoading) {
        return (
            <div className="student-shell min-h-screen">
                <div className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
                    <div className="grid gap-4 sm:gap-6">
                        <Skeleton className="h-28 w-full rounded-[2.25rem]" />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Skeleton className="h-36 w-full rounded-[2rem]" />
                            <Skeleton className="h-36 w-full rounded-[2rem]" />
                            <Skeleton className="h-36 w-full rounded-[2rem] sm:col-span-2" />
                        </div>
                        <Skeleton className="h-52 w-full rounded-[2rem]" />
                    </div>
                </div>
            </div>
        );
    }

    const dossierStatusLabel = dossier?.status
        ? t(`status.${mapDossierStatusToI18nKey(dossier.status)}`, { fallback: dossier.status })
        : null;

    const fileStatusLabel = t("dashboard.fileStatus", { fallback: "Statut dossier" });
    const statusPill = dossierStatusLabel ? `${fileStatusLabel}: ${dossierStatusLabel}` : null;

    const now = new Date();
    const unpaid = payments.filter((p) => p.status !== "paye");
    const overdue = unpaid.filter((p) => {
        if (!p.date_limite) return p.status === "retard";
        return new Date(p.date_limite).getTime() < now.getTime();
    });
    const nextDue = unpaid
        .filter((p) => p.date_limite)
        .map((p) => ({ payment: p, due: new Date(p.date_limite!) }))
        .sort((a, b) => a.due.getTime() - b.due.getTime())[0]?.payment ?? null;

    const pendingDocs = documents.filter((d) =>
        ["en_attente", "non_conforme"].includes(d.status)
    );
    const docsOk = documents.filter((d) => d.status === "valide").length;
    const docsProgressPct =
        documents.length > 0
            ? Math.min(200, Math.round((docsOk / documents.length) * 100))
            : 0;

    const paidCount = payments.filter((p) => p.status === "paye").length;
    const paymentsProgressPct =
        payments.length > 0
            ? Math.min(200, Math.round((paidCount / payments.length) * 100))
            : 0;

    const dossierStepIdx = dossier ? (DOSSIER_ROADMAP_INDEX[dossier.status] ?? 0) : 0;
    const dossierIsRejected = dossier?.status === "admission_rejetee";

    const dossierStepPct = dossier?.status
        ? Math.round(((DOSSIER_ROADMAP_INDEX[dossier.status] ?? 0) / DOSSIER_ROADMAP_LAST_IDX) * 100)
        : 0;

    const deadlineUrgencyPct = (() => {
        if (!nextDue?.date_limite) return overdue.length > 0 ? 0 : 100;
        const daysLeft = Math.ceil(
            (new Date(nextDue.date_limite).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 0) return 0;
        return Math.min(100, Math.round((daysLeft / 30) * 100));
    })();

    const daysUntilNextDue = nextDue?.date_limite
        ? Math.ceil((new Date(nextDue.date_limite).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const nextAction =
        overdue.length > 0
            ? { tone: "danger" as const, title: t("dashboard.followPayments"), detail: `${overdue.length} paiement(s) en retard`, cta: { label: t("portal.nav.payments"), view: "payments" as View } }
            : unreadMessages > 0
              ? { tone: "warn" as const, title: "Nouveau message", detail: lastMessagePreview || "Vous avez un message non lu", cta: { label: "Voir la messagerie", view: "messaging" as View } }
              : daysUntilNextDue !== null && daysUntilNextDue <= 7
                ? { tone: "danger" as const, title: "Échéance imminente", detail: `${getPaymentTypeLabel(nextDue!.type)} — dans ${daysUntilNextDue} jour(s)`, cta: { label: t("payments.makePayment"), view: "payments" as View } }
                : nextDue
                  ? { tone: "warn" as const, title: "Prochaine échéance", detail: `${getPaymentTypeLabel(nextDue.type)} — ${nextDue.date_limite ? new Date(nextDue.date_limite).toLocaleDateString(locale) : ""}`, cta: { label: t("payments.makePayment"), view: "payments" as View } }
                  : pendingDocs.length > 0
                    ? { tone: "warn" as const, title: "Documents à compléter", detail: `${pendingDocs.length} document(s) à vérifier / renvoyer`, cta: { label: t("portal.nav.documents"), view: "documents" as View } }
                    : { tone: "ok" as const, title: "Tout est à jour", detail: "Aucune action urgente pour le moment.", cta: { label: "Voir mon dossier", view: "dossier" as View } };

    const toneStyles =
        nextAction.tone === "danger"
            ? { icon: <AlertTriangle className="h-5 w-5 text-[#f97316]" />, bg: "border-[rgba(255,255,255,0.25)] bg-[rgba(0,0,0,0.20)] text-[#f97316]", ring: "ring-[rgba(255,165,0,0.35)]" }
            : nextAction.tone === "warn"
              ? { icon: <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />, bg: "border-[rgba(255,255,255,0.20)] bg-[rgba(0,0,0,0.18)] text-[#f59e0b]", ring: "ring-[rgba(255,200,0,0.25)]" }
              : { icon: <CheckCircle2 className="h-5 w-5 text-[#4ade80]" />, bg: "border-[rgba(255,255,255,0.20)] bg-[rgba(0,0,0,0.18)] text-[#4ade80]", ring: "ring-[rgba(74,222,128,0.30)]" };

    const dossierRoadmapSteps = dossier
        ? [
              { key: "document_manquant", label: t("status.missing_documents") },
              { key: "en_attente", label: t("status.pending") },
              { key: "document_recu", label: t("status.document_received") },
              { key: "en_cours", label: t("status.in_progress") },
              { key: "en_attente_universite", label: t("status.waiting_university") },
              { key: "admission", label: t("dossier.roadmapAdmission") },
              { key: "visa_en_cours", label: t("status.visa_processing") },
              { key: "termine", label: t("status.completed") },
          ]
        : [];

    // ── Rendu ─────────────────────────────────────────────────────────────────

    return (
        <>
        {showPasswordChange && (
            <ChangePasswordModal onPasswordChanged={() => setShowPasswordChange(false)} />
        )}
        <StudentShell
            userName={user.name}
            universityName={universityName}
            studentLevel={studentInfo?.niveau ?? ""}
            view={view}
            onChangeView={setView}
            unreadCount={unreadCount}
            onLogout={onLogout}
            statusPill={statusPill}
            conversations={[
                {
                    id: "agent",
                    agentName,
                    preview: lastMessagePreview || "Cliquez pour discuter",
                    time: "",
                    unread: unreadMessages,
                },
            ]}
        >
            {/* ── Dashboard ── */}
            {view === "dashboard" && (
                <div className="space-y-6">
                    <div className="student-surface grid gap-5 p-5 sm:p-6 md:grid-cols-[220px,1fr] md:items-center">
                        <div className="flex items-center justify-center md:justify-start">
                            <ActivityRings
                                movePct={paymentsProgressPct}
                                exercisePct={dossierStepPct}
                                standPct={deadlineUrgencyPct}
                                labelBottom={`${Math.round((paymentsProgressPct + dossierStepPct + deadlineUrgencyPct) / 3)}%`}
                            />
                        </div>

                        <div className="min-w-0 space-y-4">
                            <div className={`student-surface-soft p-4 ring-1 ${toneStyles.ring}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${toneStyles.bg} shadow-[0_14px_34px_rgba(0,0,0,0.35)]`}>
                                        {toneStyles.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--student-fg-muted)]">Prochaine action</p>
                                        <p className="mt-1 text-base font-semibold tracking-tight text-[var(--student-fg)]">
                                            {nextAction.title}
                                        </p>
                                        <p className="mt-1 text-sm text-[var(--student-fg-muted)]">{nextAction.detail}</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => setView(nextAction.cta.view)}
                                    className="mt-4 w-full rounded-2xl border border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.12)] text-white shadow-none hover:bg-[rgba(255,255,255,0.20)] dark:bg-[linear-gradient(135deg,rgba(220,38,38,0.35),rgba(185,28,28,0.25))] dark:text-white dark:hover:bg-[linear-gradient(135deg,rgba(220,38,38,0.45),rgba(185,28,28,0.32))] sm:w-auto sm:self-start"
                                >
                                    {nextAction.cta.label}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    className="student-surface-soft student-focus-ring rounded-3xl p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                                    onClick={() => setView("payments")}
                                >
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--student-fg-muted)]">{t("payments.title")}</p>
                                    <div className="mt-3 flex items-baseline justify-between gap-3">
                                        <p className="text-2xl font-semibold tracking-tight text-[var(--student-fg)]">{unpaid.length}</p>
                                        <p className="text-xs font-semibold text-[var(--student-fg-muted)]">{paymentsProgressPct}%</p>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/25 dark:bg-white/10">
                                        <div className="h-1.5 rounded-full bg-[#f59e0b]" style={{ width: `${Math.min(100, paymentsProgressPct)}%` }} />
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className="student-surface-soft student-focus-ring rounded-3xl p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                                    onClick={() => setView("documents")}
                                >
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--student-fg-muted)]">{t("documents.title")}</p>
                                    <div className="mt-3 flex items-baseline justify-between gap-3">
                                        <p className="text-2xl font-semibold tracking-tight text-[var(--student-fg)]">{pendingDocs.length}</p>
                                        <p className="text-xs font-semibold text-[var(--student-fg-muted)]">{docsProgressPct}%</p>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/25 dark:bg-white/10">
                                        <div className="h-1.5 rounded-full bg-[#4ade80]" style={{ width: `${Math.min(100, docsProgressPct)}%` }} />
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className="student-surface-soft student-focus-ring rounded-3xl p-4 text-left transition-transform duration-200 hover:-translate-y-0.5 sm:col-span-2"
                                    onClick={() => setView("dossier")}
                                >
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--student-fg-muted)]">{t("dossier.title")}</p>
                                    <div className="mt-3 flex items-baseline justify-between gap-3">
                                        <p className="truncate text-base font-semibold tracking-tight text-[var(--student-fg)]">{dossierStatusLabel ? dossierStatusLabel : t("dossier.noFile")}</p>
                                        <p className="text-xs font-semibold text-[var(--student-fg-muted)]">{dossierStepPct}%</p>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/25 dark:bg-white/10">
                                        <div className="h-1.5 rounded-full bg-[#f59e0b]" style={{ width: `${Math.min(100, dossierStepPct)}%` }} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Paiements ── */}
            {view === "payments" && (
                <div className="student-payments-scope space-y-6">
                    <SectionHeader
                        className="student-pay-surface"
                        accentEyebrow
                        eyebrow="Finance"
                        title={t("payments.title")}
                        subtitle={t("payments.description")}
                    />
                    <Card className="student-pay-surface rounded-[2rem] border-0 shadow-none bg-transparent ring-0">
                        <CardContent className="p-0 pt-6">
                            <PaymentOverview
                                choix={studentProfile?.choix ?? ""}
                                langue={studentProfile?.langue ?? ""}
                                niveau={studentProfile?.niveau ?? ""}
                                nationalite={studentProfile?.nationalite ?? null}
                                payments={payments.map(p => ({ ...p, tranche: p.tranche ?? null, date_limite: p.date_limite ?? null, date_paiement: p.date_paiement ?? null }))}
                                onDownloadReceipt={studentInfo
                                    ? (p) => downloadReceipt(p, studentInfo)
                                    : undefined}
                                onDeclarePayment={(p, info) =>
                                    handleOpenDeclareModal(p, { ...info, label: info.label })
                                }
                                onCancelDeclaration={(p) => setCancelPaymentId(p.id)}
                            />
                        </CardContent>
                    </Card>

                    {payments.length > 0 && (
                        <Card className="student-pay-surface rounded-[2rem] border-0 shadow-none bg-transparent ring-0">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold tracking-tight text-[var(--student-fg)]">{t("payments.paymentHistory")}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="student-pay-surface-soft flex w-full flex-col gap-3 rounded-3xl p-3"
                                        >
                                            <button
                                                className="flex w-full items-center justify-between gap-3 text-left"
                                                onClick={() => setDetailPayment(payment)}
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-[var(--student-fg)]">{getPaymentTypeLabel(payment.type)}</p>
                                                    {payment.tranche && (
                                                        <p className="text-xs text-[var(--student-fg-muted)]">{t("payments.installment", { installment: payment.tranche })}</p>
                                                    )}
                                                    <p className="text-xs text-[var(--student-fg-muted)]">
                                                        {payment.date_limite ? new Date(payment.date_limite).toLocaleDateString(locale) : "-"}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-semibold text-[var(--student-fg)]">{formatMontant(payment.montant, isIntl)}</p>
                                                    <Badge className={`rounded-full border ${PAYMENTS_TAB_BADGE[payment.status] ?? STATUS_COLORS[payment.status]}`}>
                                                        {getPaymentStatusLabel(payment.status)}
                                                    </Badge>
                                                </div>
                                            </button>
                                            {payment.status !== "paye" && payment.status !== "en_validation" && (
                                                <button
                                                    onClick={() => handleOpenDeclareModal(payment, {
                                                        type: payment.type,
                                                        tranche: payment.tranche ?? 1,
                                                        montant: payment.montant,
                                                    })}
                                                    className="student-focus-ring flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(220,38,38,0.35)] bg-[var(--student-neon-lime)] py-2.5 text-xs font-semibold text-[var(--student-neon-ink)] shadow-[var(--student-pay-glow)] transition-[transform,filter] hover:brightness-110 active:scale-[0.99]"
                                                >
                                                    <CreditCard className="h-3.5 w-3.5" />
                                                    {t("payments.makePayment")}
                                                </button>
                                            )}
                                            {payment.status === "en_validation" && (
                                                <span className="rounded-2xl border border-[rgba(220,38,38,0.15)] bg-[rgba(220,38,38,0.05)] py-2 text-center text-xs font-semibold text-[var(--student-ring-stand)]">
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

            {/* ── Documents ── */}
            {view === "documents" && (
                <div className="student-payments-scope space-y-6">
                    <SectionHeader
                        className="student-pay-surface"
                        accentEyebrow
                        eyebrow={t("dossier.title")}
                        title={t("documents.title")}
                        subtitle="Ajoute des fichiers propres et lisibles: PDF ou image. Nous te notifierons dès validation."
                    />
                    <DocumentUpload studentId={studentId} onDocumentUploaded={() => {
                        queryClient.invalidateQueries({ queryKey: ['documents', studentId ?? 'all'] });
                    }} />
                </div>
            )}

            {/* ── Dossier ── */}
            {view === "dossier" && (
                <div className="space-y-6">
                    <SectionHeader
                        eyebrow={t("dossier.title")}
                        title={t("dossier.subtitle")}
                        subtitle={t("dossier.description")}
                    />
                    {dossier ? (
                        <>
                            <StudentReceivedDocuments studentId={studentId} />

                            <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
                                <div className="space-y-6">
                                    <Card className="student-surface rounded-[2rem] border-0 shadow-none bg-transparent ring-0">
                                        <CardHeader>
                                            <CardTitle className="text-base">{t("dossier.infoTab")}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-[var(--student-border)] pb-3">
                                                <span className="text-sm text-[var(--student-fg-muted)]">{t("dossier.currentStep")}</span>
                                                <Badge className={`rounded-full border ${STATUS_COLORS[dossier.status]}`}>
                                                    {t(`status.${mapDossierStatusToI18nKey(dossier.status)}`, { fallback: dossier.status })}
                                                </Badge>
                                            </div>
                                            {universityName && (
                                                <div className="flex items-center justify-between border-b border-[var(--student-border)] pb-3">
                                                    <span className="text-sm text-[var(--student-fg-muted)]">{t("dossier.university")}</span>
                                                    <span className="text-sm font-medium text-[var(--student-fg)]">{universityName}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-[var(--student-fg-muted)]">{t("dossier.applicationDate")}</span>
                                                <span className="text-sm font-medium text-[var(--student-fg)]">
                                                    {new Date(dossier.created_at).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {dossier.notes_internes ? (
                                        <Card className="student-surface rounded-[2rem] border-0 shadow-none bg-transparent ring-0">
                                            <CardHeader>
                                                <CardTitle className="text-base">{t("dossier.teamMessage")}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm leading-relaxed text-[var(--student-fg-muted)]">{dossier.notes_internes}</p>
                                            </CardContent>
                                        </Card>
                                    ) : null}
                                </div>

                                <Card className="student-surface flex h-full min-h-[32rem] w-full min-w-0 flex-col gap-0 rounded-[2rem] border-0 p-0 shadow-none bg-transparent ring-0">
                                    <CardContent className="flex min-h-0 min-w-0 w-full flex-1 flex-col p-0">
                                        <DossierRoadmap
                                            className="min-h-0"
                                            title={t("dossier.steps")}
                                            steps={dossierRoadmapSteps}
                                            currentIdx={dossierStepIdx}
                                            isRejected={dossierIsRejected}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    ) : (
                        <EmptyState
                            title={t("dossier.noFile")}
                            description="Dès qu'un agent crée ton dossier, tu verras ici les étapes, les retours et la prochaine action."
                        />
                    )}
                </div>
            )}

            {/* ── Notifications ── */}
            {view === "notifications" && (
                <StudentNotifications
                    user={user}
                    onBack={() => {
                        setView("dashboard");
                        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread', user.id] });
                    }}
                    onUnreadChange={(count) =>
                        queryClient.setQueryData(['notifications', 'unread', user.id], count)
                    }
                />
            )}

            {/* ── Messagerie ── */}
            {view === "messaging" && (
                <StudentChatFull
                    userId={user.id}
                    agentName={agentName}
                    onBack={() => setView("dashboard")}
                    dossier={dossier ? {
                        status: dossier.status,
                        university: universityName,
                        program: studentInfo ? `${studentInfo.niveau} — ${studentInfo.filiere}` : null,
                        docsOk: documents.filter((d) => d.status === "valide").length,
                        docsTotal: documents.length,
                        nextStep: dossierStatusLabel,
                        nextStepAt: dossier.created_at
                            ? `Dossier soumis il y a ${Math.max(0, Math.floor((Date.now() - new Date(dossier.created_at).getTime()) / 60000))} min`
                            : null,
                    } : null}
                    nextPayment={nextDue ? {
                        label: `${nextDue.type === "bourse" ? "Bourse" : nextDue.type === "mandarin" ? "Cours mandarin" : "Cours anglais"} T${nextDue.tranche ?? ""}`,
                        montant: nextDue.montant,
                        dateLimite: nextDue.date_limite ?? null,
                        daysLeft: nextDue.date_limite
                            ? Math.max(0, Math.ceil((new Date(nextDue.date_limite).getTime() - Date.now()) / 86400000))
                            : null,
                    } : null}
                    onUnreadChange={setUnreadMessages}
                />
            )}
        </StudentShell>

        {/* ── Modal déclaration paiement ── */}
        {declareModal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
                <div className="student-pay-modal-panel w-full max-w-sm rounded-t-3xl p-6 sm:rounded-3xl">
                    <div className="mb-4 flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--student-fg)]">{t("payments.makePayment")}</h3>
                            <p className="mt-0.5 text-sm text-[var(--student-fg-muted)]">
                                {getPaymentTypeLabel(declareModal.type)} — {declareModal.label}
                            </p>
                        </div>
                        <button
                            onClick={() => { closeDeclareModal(); if (proofInputRef.current) proofInputRef.current.value = ""; }}
                            className="student-focus-ring text-[var(--student-fg-muted)] hover:text-[var(--student-fg)]"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Input file hors du div scrollable — évite le blocage iOS Safari */}
                    <input
                        ref={proofInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleProofFile}
                        className="hidden"
                    />

                    <div className="mb-4 max-h-[60vh] space-y-3 overflow-auto text-sm sm:max-h-none">
                        {/* Montant attendu */}
                        <div className="flex items-center justify-between rounded-2xl border border-[rgba(220,38,38,0.14)] bg-[rgba(220,38,38,0.04)] px-4 py-3">
                            <span className="text-[var(--student-fg-muted)]">{t("payments.expectedAmount")}</span>
                            <span className="font-semibold text-[var(--student-fg)]">{formatMontant(declareModal.montantTranche)}</span>
                        </div>

                        {/* Mode paiement */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setPaymentMode("complet")}
                                className={`student-focus-ring rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                                    paymentMode === "complet"
                                        ? "border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.12)] text-[var(--student-neon-lime)]"
                                        : "border-[rgba(220,38,38,0.14)] bg-[rgba(220,38,38,0.04)] text-[var(--student-fg-muted)] hover:bg-[rgba(220,38,38,0.08)]"
                                }`}
                            >
                                {t("payments.fullPayment")}
                            </button>
                            <button
                                onClick={() => setPaymentMode("avance")}
                                className={`student-focus-ring rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                                    paymentMode === "avance"
                                        ? "border-[rgba(220,38,38,0.35)] bg-[rgba(220,38,38,0.12)] text-[var(--student-neon-lime)]"
                                        : "border-[rgba(220,38,38,0.14)] bg-[rgba(220,38,38,0.04)] text-[var(--student-fg-muted)] hover:bg-[rgba(220,38,38,0.08)]"
                                }`}
                            >
                                {t("payments.deposit")}
                            </button>
                        </div>

                        {/* Montant acompte */}
                        {paymentMode === "avance" && (
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-[var(--student-fg-muted)]">{t("payments.amountPaid")}</p>
                                <input
                                    type="number"
                                    min={1}
                                    max={declareModal.montantTranche}
                                    value={montantAvance}
                                    onChange={e => setMontantAvance(e.target.value)}
                                    className="student-focus-ring w-full rounded-2xl border border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.04)] px-3 py-2 text-sm text-[var(--student-fg)] placeholder:text-[var(--student-fg-muted)]"
                                    placeholder={t("payments.amountPaid")}
                                />
                            </div>
                        )}

                        {/* Preuve de paiement */}
                        <div className="space-y-1.5">
                            <p className="text-xs font-medium text-[var(--student-fg-muted)]">{t("payments.proofUpload")}</p>
                            {proofFile ? (
                                <div className="flex items-center gap-2 rounded-2xl border border-[rgba(220,38,38,0.14)] bg-[rgba(220,38,38,0.04)] px-3 py-2">
                                    <Upload className="h-4 w-4 shrink-0 text-[var(--student-neon-lime)]" />
                                    <span className="flex-1 truncate text-xs text-[var(--student-fg)]">{proofFile.name}</span>
                                    <button
                                        onClick={() => { setProofFile(null); if (proofInputRef.current) proofInputRef.current.value = ""; }}
                                        className="student-focus-ring shrink-0 text-[var(--student-fg-muted)] hover:text-[var(--student-fg)]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => proofInputRef.current?.click()}
                                    className="student-focus-ring flex w-full items-center gap-2 rounded-2xl border border-dashed border-[rgba(220,38,38,0.22)] px-3 py-2.5 text-xs text-[var(--student-fg-muted)] transition-colors hover:border-[rgba(220,38,38,0.38)] hover:text-[var(--student-ring-move)]"
                                >
                                    <Upload className="h-4 w-4" />
                                    {t("payments.uploadReceipt")}
                                </button>
                            )}
                        </div>
                    </div>

                    <p className="mb-4 text-xs text-[var(--student-fg-muted)]">
                        {t("payments.confirmMessage")}
                    </p>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="student-chip flex-1 rounded-2xl border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.05)] text-[var(--student-fg)] hover:bg-[rgba(220,38,38,0.10)]"
                            onClick={() => { closeDeclareModal(); if (proofInputRef.current) proofInputRef.current.value = ""; }}
                            disabled={declarePaymentMutation.isPending}
                        >
                            {t("payments.cancel")}
                        </Button>
                        <Button
                            className="flex-1 rounded-2xl border border-[rgba(220,38,38,0.40)] bg-[var(--student-neon-lime)] font-semibold text-[var(--student-neon-ink)] shadow-[var(--student-pay-glow)] hover:brightness-110 disabled:opacity-60"
                            onClick={handleDeclarePayment}
                            disabled={declarePaymentMutation.isPending}
                        >
                            {declarePaymentMutation.isPending
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("payments.sending")}</>
                                : t("payments.confirm")}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* ── Modal confirmation annulation de déclaration ── */}
        {cancelPaymentId && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
                <div className="student-pay-modal-panel w-full max-w-sm rounded-t-3xl p-6 sm:rounded-3xl">
                    <h3 className="mb-2 text-lg font-semibold text-[var(--student-fg)]">{tPaymentOverview("cancelDeclaration")}</h3>
                    <p className="mb-5 text-sm text-[var(--student-fg-muted)]">
                        {tPaymentOverview("cancelDeclarationConfirm")}
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="student-chip flex-1 rounded-2xl border-[rgba(220,38,38,0.18)] bg-[rgba(220,38,38,0.05)] text-[var(--student-fg)] hover:bg-[rgba(220,38,38,0.10)]"
                            onClick={() => setCancelPaymentId(null)}
                            disabled={cancelDeclarationMutation.isPending}
                        >
                            {t("payments.cancel")}
                        </Button>
                        <Button
                            className="flex-1 rounded-2xl bg-[var(--student-ring-move)] font-semibold text-white hover:brightness-110 disabled:opacity-60"
                            onClick={handleConfirmCancelDeclaration}
                            disabled={cancelDeclarationMutation.isPending}
                        >
                            {cancelDeclarationMutation.isPending
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("payments.sending")}</>
                                : tPaymentOverview("cancelDeclaration")}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* ── Modal détail paiement ── */}
        {detailPayment && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
                <div className="student-pay-modal-panel w-full max-w-sm rounded-t-3xl p-6 sm:rounded-3xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-[var(--student-fg)]">{t("payments.detailsTitle")}</h3>
                        <button onClick={() => setDetailPayment(null)} className="student-focus-ring text-[var(--student-fg-muted)] hover:text-[var(--student-fg)] text-xl">&times;</button>
                    </div>
                    <div className="max-h-[60vh] space-y-3 overflow-auto text-sm sm:max-h-none">
                        <div className="flex justify-between border-b border-[rgba(220,38,38,0.10)] dark:border-white/10 pb-2">
                            <span className="text-[var(--student-fg-muted)]">{t("payments.type")}</span>
                            <span className="font-medium text-[var(--student-fg)] capitalize">{getPaymentTypeLabel(detailPayment.type)}</span>
                        </div>
                        <div className="flex justify-between border-b border-[rgba(220,38,38,0.10)] dark:border-white/10 pb-2">
                            <span className="text-[var(--student-fg-muted)]">{t("payments.amount")}</span>
                            <span className="font-semibold text-[var(--student-fg)]">{formatMontant(detailPayment.montant)}</span>
                        </div>
                        <div className="flex justify-between border-b border-[rgba(220,38,38,0.10)] dark:border-white/10 pb-2">
                            <span className="text-[var(--student-fg-muted)]">{t("payments.status")}</span>
                            <Badge className={`rounded-full border ${PAYMENTS_TAB_BADGE[detailPayment.status] ?? STATUS_COLORS[detailPayment.status]}`}>
                                {getPaymentStatusLabel(detailPayment.status)}
                            </Badge>
                        </div>
                        <div className="flex justify-between border-b border-[rgba(220,38,38,0.10)] dark:border-white/10 pb-2">
                            <span className="text-[var(--student-fg-muted)]">{t("payments.dueDate")}</span>
                            <span className="font-medium text-[var(--student-fg)]">{detailPayment.date_limite ? new Date(detailPayment.date_limite).toLocaleDateString(locale) : "—"}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[var(--student-fg-muted)]">{t("payments.paymentDate")}</span>
                            <span className="font-medium text-[var(--student-fg)]">{detailPayment.date_paiement ? new Date(detailPayment.date_paiement).toLocaleDateString(locale) : "—"}</span>
                        </div>
                    </div>
                    <div className="mt-5 flex gap-2">
                        {detailPayment.status === "paye" && studentInfo && (
                            <button
                                onClick={() => downloadReceipt(detailPayment as any, studentInfo)}
                                className="student-focus-ring rounded-2xl border border-[rgba(220,38,38,0.28)] bg-[rgba(220,38,38,0.06)] px-3 py-2 text-xs font-semibold text-[var(--student-neon-lime)] hover:bg-[rgba(220,38,38,0.12)]"
                            >
                                {t("payments.downloadReceipt")}
                            </button>
                        )}
                        <button
                            onClick={() => setDetailPayment(null)}
                            className="student-focus-ring rounded-2xl border border-[rgba(220,38,38,0.15)] bg-[rgba(220,38,38,0.05)] px-3 py-2 text-xs font-semibold text-[var(--student-fg)] hover:bg-[rgba(220,38,38,0.10)]"
                        >
                            {t("common.close")}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
