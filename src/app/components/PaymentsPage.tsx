"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Filter, Plus, CheckCircle2, X, Printer } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useQueryClient } from '@tanstack/react-query';
import { usePayments, PAYMENTS_KEY } from '../lib/hooks/use-payments';
import { useStudents } from '../lib/hooks/use-students';
import { useEntreesComptables, useSortiesComptables } from '../lib/hooks/use-accounting';
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { calculatePenalty } from "../utils/penaltyCalculator";
import { logActivity } from "../utils/activityLogger";
import { downloadReceipt } from "../utils/downloadReceipt";
import ConfirmDialog from "./ConfirmDialog";
import ProtectedRoute from "./ProtectedRoute";
import { usePaymentConfig } from "../context/PaymentConfigContext";
import { getBourseServiceType } from "../types/payment-config";

interface Student {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    niveau?: string;
    nationalite?: string | null;
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
    validated_by: string | null;
    validated_at: string | null;
    created_at: string;
    initiated_by_student?: boolean;
}

interface AccountingEntry {
    id: string;
    montant: number;
    date: string;
    type: string;
    description: string;
}

type Tab = "a_valider" | "en_retard" | "valides" | "tous" | "encaisser";

const AVATAR_PALETTE = [
    "bg-blue-500",
    "bg-rose-500",
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-pink-500",
];

function avatarColor(name: string): string {
    const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
}

function initials(nom: string, prenom: string): string {
    return `${(nom[0] || "").toUpperCase()}${(prenom[0] || "").toUpperCase()}`;
}

function fmt(amount: number): string {
    return new Intl.NumberFormat("fr-FR").format(amount) + " F";
}

function fmtShort(amount: number): string {
    if (Math.abs(amount) >= 1_000_000)
        return (amount / 1_000_000).toFixed(1).replace(".", ",") + " M F";
    return new Intl.NumberFormat("fr-FR").format(amount) + " F";
}

function fmtDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function daysLate(dateStr: string): number {
    const due = new Date(dateStr);
    const today = new Date();
    return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
}

function typeLabel(type: string, tranche: number | null): string {
    const base =
        type === "bourse"
            ? "Bourse"
            : type === "mandarin"
              ? "Mandarin"
              : type === "anglais"
                ? "Anglais"
                : type;
    if (!tranche) return base;
    const labels: Record<number, string> = {
        1: "T1",
        2: "T2",
        3: "T3",
        4: "T4",
    };
    return `${base} — ${labels[tranche] ?? `T${tranche}`}`;
}

export default function PaymentsPage() {
    const supabase = createClient();
    const { user } = useAuth();
    const { showNotification } = useNotificationContext();
    const { getConfig, getBourseConfig } = usePaymentConfig();

    const queryClient = useQueryClient();
    const { data: _paymentsData = [], isLoading: loading } = usePayments();
    const payments = _paymentsData as unknown as Payment[];
    const { data: _studentsData = [] } = useStudents();
    const students = _studentsData as unknown as Student[];
    const { data: _entreesData = [] } = useEntreesComptables();
    const { data: _sortiesData = [] } = useSortiesComptables();
    const syncedRef = useRef(false);

    const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const entrées = useMemo(() =>
        (_entreesData as unknown as AccountingEntry[]).filter(e => (e.date || '').slice(0, 10) === todayStr),
        [_entreesData, todayStr]);
    const sorties = useMemo(() =>
        (_sortiesData as unknown as AccountingEntry[]).filter(e => (e.date || '').slice(0, 10) === todayStr),
        [_sortiesData, todayStr]);
    const [tab, setTab] = useState<Tab>("a_valider");
    const [encaisserForm, setEncaisserForm] = useState({
        student_id: "",
        type: "bourse",
        tranche: "1",
        montant: "",
        date_paiement: new Date().toISOString().slice(0, 10),
    });
    const [encaisserSaving, setEncaisserSaving] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [penaltyModal, setPenaltyModal] = useState<Payment | null>(null);
    const [newPayment, setNewPayment] = useState({
        student_id: "",
        type: "bourse",
        tranche: "1",
        montant: "",
        date_limite: "",
    });
    const [saving, setSaving] = useState(false);

    const closeConfirm = () => setConfirmDialog((s) => ({ ...s, isOpen: false }));

    const getStudent = useCallback(
        (id: string) => students.find((s) => s.id === id),
        [students]
    );

    const resolvePenaltyConfig = useCallback(
        (payment: Payment, studentMap: Map<string, Student>) => {
            if (payment.type === "mandarin" || payment.type === "anglais") {
                const cfg = getConfig(payment.type);
                return { grace_days: cfg.grace_days, daily_penalty: cfg.daily_penalty };
            }
            const student = studentMap.get(payment.student_id);
            const cfg = getBourseConfig(student?.niveau, student?.nationalite);
            return { grace_days: cfg.grace_days, daily_penalty: cfg.daily_penalty };
        },
        [getConfig, getBourseConfig]
    );

    const syncPenalties = async (list: Payment[], studentList: Student[]) => {
        const studentMap = new Map(studentList.map((s) => [s.id, s]));
        const updates = list
            .filter((p) => p.status !== "paye" && p.date_limite)
            .map((p) => ({ p, penalty: calculatePenalty(p, resolvePenaltyConfig(p, studentMap)) }))
            .filter(({ p, penalty }) => penalty !== (p.penalites ?? 0) || (penalty > 0 && p.status === "attente"));
        if (updates.length === 0) return;
        await Promise.all(
            updates.map(({ p, penalty }) =>
                supabase
                    .from("payments")
                    .update({ penalites: penalty, status: penalty > 0 ? "retard" : p.status })
                    .eq("id", p.id)
            )
        );
    };

    useEffect(() => {
        if (payments.length > 0 && !syncedRef.current) {
            syncedRef.current = true;
            syncPenalties(payments, students).then(() => {
                queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
            });
        }
    }, [payments, students]); // eslint-disable-line react-hooks/exhaustive-deps

    const isAdminLike = user?.role === "admin" || user?.role === "super_admin";

    const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

    const handleValidate = async (paymentId: string) => {
        if (!user || !isAdminLike) return;
        const { data: payment } = await supabase
            .from("payments")
            .select("*, students(nom, prenom)")
            .eq("id", paymentId)
            .single();
        if (!payment) return;

        const nowIso = new Date().toISOString();
        await supabase
            .from("payments")
            .update({ status: "paye", validated_by: user.id, validated_at: nowIso, date_paiement: nowIso })
            .eq("id", paymentId);

        const typeEntree =
            payment.type === "mandarin" || payment.type === "anglais"
                ? "paiement_cours"
                : "paiement_procedure";
        const studentName = payment.students
            ? `${payment.students.nom} ${payment.students.prenom}`
            : "Étudiant";

        await supabase.from("entrees_comptables").insert({
            montant: payment.montant,
            date: new Date().toISOString(),
            type: typeEntree,
            description: `${typeLabel(payment.type, payment.tranche)} — ${studentName}`,
            student_id: payment.student_id,
            payment_id: payment.id,
            created_by: user.id,
        });

        await logActivity(
            user.id, user.name, user.role,
            "payment_validate", "payment", paymentId,
            `Paiement validé — ${typeLabel(payment.type, payment.tranche)} — ${studentName}`,
            { payment_id: paymentId, montant: payment.montant }
        );
        await logActivity(
            user.id, user.name, user.role,
            "accounting_entry", "entrees_comptables", paymentId,
            `Entrée comptable créée — ${typeLabel(payment.type, payment.tranche)} — ${studentName}`,
            { montant: payment.montant, type: typeEntree }
        );
        showNotification("Paiement validé avec succès", "success");
        queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    };

    const handleValidateAll = async () => {
        const toValidate = filtered;
        for (const p of toValidate) {
            await handleValidate(p.id);
        }
        showNotification(`${toValidate.length} paiements validés`, "success");
    };

    const handleRegisterPayment = async () => {
        if (!user || !newPayment.student_id || !newPayment.montant) return;
        setSaving(true);
        try {
            await supabase.from("payments").insert({
                student_id: newPayment.student_id,
                type: newPayment.type,
                tranche: newPayment.tranche ? parseInt(newPayment.tranche) : null,
                montant: parseInt(newPayment.montant),
                status: "attente",
                date_limite: newPayment.date_limite || null,
                penalites: 0,
                created_at: new Date().toISOString(),
            });
            const student = getStudent(newPayment.student_id);
            if (student) {
                await logActivity(
                    user.id, user.name, user.role,
                    "payment_create", "payment", null,
                    `Paiement enregistré — ${typeLabel(newPayment.type, parseInt(newPayment.tranche))} — ${student.nom} ${student.prenom}`,
                    { montant: newPayment.montant }
                );
            }
            showNotification("Paiement enregistré", "success");
            setShowRegisterModal(false);
            setNewPayment({ student_id: "", type: "bourse", tranche: "1", montant: "", date_limite: "" });
            queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
        } catch (err) {
            showNotification("Erreur lors de l'enregistrement", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleEncaisser = async () => {
        if (!user || !encaisserForm.student_id || !encaisserForm.montant) return;
        setEncaisserSaving(true);
        try {
            const nowIso = new Date().toISOString();
            const { data: payment } = await supabase.from("payments").insert({
                student_id: encaisserForm.student_id,
                type: encaisserForm.type,
                tranche: encaisserForm.tranche ? parseInt(encaisserForm.tranche) : null,
                montant: parseInt(encaisserForm.montant),
                status: "en_validation",
                date_paiement: encaisserForm.date_paiement,
                date_limite: encaisserForm.date_paiement,
                penalites: 0,
                created_at: nowIso,
            }).select().single();

            const student = getStudent(encaisserForm.student_id);
            if (student && payment) {
                await logActivity(
                    user.id, user.name, user.role,
                    "payment_create", "payment", payment.id,
                    `Encaissement enregistré — ${typeLabel(encaisserForm.type, parseInt(encaisserForm.tranche))} — ${student.nom} ${student.prenom}`,
                    { montant: encaisserForm.montant }
                );
                void downloadReceipt(
                    { id: payment.id, type: payment.type, tranche: payment.tranche, montant: payment.montant, status: payment.status, date_paiement: payment.date_paiement, validated_by: null, validated_at: null },
                    { nom: student.nom, prenom: student.prenom, email: student.email, telephone: student.telephone, niveau: student.niveau ?? "", filiere: "", nationalite: student.nationalite ?? null },
                    { includeDuplicata: true }
                );
            }
            showNotification("Encaissement enregistré — en attente de validation", "success");
            setEncaisserForm({ student_id: "", type: "bourse", tranche: "1", montant: "", date_paiement: new Date().toISOString().slice(0, 10) });
            queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
        } catch {
            showNotification("Erreur lors de l'enregistrement", "error");
        } finally {
            setEncaisserSaving(false);
        }
    };

    const handlePrint = (payment: Payment) => {
        const student = getStudent(payment.student_id);
        if (!student) return;
        void downloadReceipt(
            { id: payment.id, type: payment.type, tranche: payment.tranche, montant: payment.montant, status: payment.status, date_paiement: payment.date_paiement, validated_by: payment.validated_by, validated_at: payment.validated_at },
            { nom: student.nom, prenom: student.prenom, email: student.email, telephone: student.telephone, niveau: student.niveau ?? "", filiere: "", nationalite: student.nationalite ?? null },
            { includeDuplicata: true }
        );
    };

    const aValiderList = payments.filter((p) => p.status === "attente" || p.status === "en_validation");
    const enRetardList = payments.filter((p) => p.status === "retard");
    const validesList = payments.filter((p) => p.status === "paye");

    const filtered =
        tab === "a_valider"
            ? aValiderList
            : tab === "en_retard"
              ? enRetardList
              : tab === "valides"
                ? validesList
                : payments;

    const totalEntrees = entrées.reduce((s, e) => s + (e.montant || 0), 0);
    const totalSorties = sorties.reduce((s, e) => s + (e.montant || 0), 0);
    const solde = totalEntrees - totalSorties;

    const overdueWithPenalty = payments.filter(
        (p) => p.status === "retard" && p.penalites > 0
    );

    const TABS: { id: Tab; label: string; count?: number }[] = [
        { id: "a_valider", label: "À valider", count: aValiderList.length },
        { id: "en_retard", label: "En retard", count: enRetardList.length },
        { id: "valides", label: "Validés" },
        { id: "tous", label: "Tous" },
        { id: "encaisser", label: "Encaisser" },
    ];

    return (
        <ProtectedRoute requiredRole="agent">
            <div className="-m-4 sm:-m-5 flex flex-col bg-white dark:bg-slate-900" style={{ minHeight: "calc(100vh - 130px)" }}>
                {/* Header */}
                <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-4">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Finance &rsaquo; Paiements
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Paiements</h1>
                        <div className="flex items-center gap-2">
                            {aValiderList.length > 0 && (
                                <span className="flex items-center gap-1.5 rounded-full border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 px-3 py-1.5 text-sm font-medium text-orange-700">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {aValiderList.length} à valider
                                </span>
                            )}
                            <button className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <Filter className="h-3.5 w-3.5" />
                                Filtrer
                            </button>
                            {isAdminLike && (
                                <button
                                    onClick={() => setShowRegisterModal(true)}
                                    className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Enregistrer un paiement
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-4 flex gap-6 border-b border-gray-100 dark:border-slate-700">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id)}
                                className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                                    tab === t.id
                                        ? "border-red-600 text-red-600"
                                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                                }`}
                            >
                                {t.label}
                                {t.count !== undefined && t.count > 0 && (
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                                            tab === t.id
                                                ? "bg-red-100 dark:bg-red-900/30 dark:text-red-400 text-red-600"
                                                : "bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400"
                                        }`}
                                    >
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body — 2 column on desktop */}
                <div className="flex flex-1 gap-0 overflow-hidden">
                    {/* LEFT — Payment list */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                                Chargement...
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-sm text-gray-400">
                                <CheckCircle2 className="mb-3 h-8 w-8 text-gray-200" />
                                Aucun paiement dans cette catégorie
                            </div>
                        ) : tab === "encaisser" ? (
                            <div className="mx-auto max-w-md p-6">
                                <p className="mb-5 text-sm text-gray-500">Enregistre un paiement reçu. Une quittance sera imprimée automatiquement et le paiement sera soumis à validation.</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Étudiant</label>
                                        <select
                                            value={encaisserForm.student_id}
                                            onChange={(e) => setEncaisserForm((f) => ({ ...f, student_id: e.target.value }))}
                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400 cursor-pointer dark:[color-scheme:dark]"
                                        >
                                            <option value="">Choisir un étudiant…</option>
                                            {students.map((s) => (
                                                <option key={s.id} value={s.id}>{s.nom} {s.prenom}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Type</label>
                                            <select
                                                value={encaisserForm.type}
                                                onChange={(e) => setEncaisserForm((f) => ({ ...f, type: e.target.value }))}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400 cursor-pointer dark:[color-scheme:dark]"
                                            >
                                                <option value="bourse">Bourse</option>
                                                <option value="mandarin">Mandarin</option>
                                                <option value="anglais">Anglais</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Tranche</label>
                                            <select
                                                value={encaisserForm.tranche}
                                                onChange={(e) => setEncaisserForm((f) => ({ ...f, tranche: e.target.value }))}
                                                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400 cursor-pointer dark:[color-scheme:dark]"
                                            >
                                                <option value="1">T1</option>
                                                <option value="2">T2</option>
                                                <option value="3">T3</option>
                                                <option value="4">T4</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Montant (FCFA)</label>
                                        <input
                                            type="number"
                                            placeholder="ex: 100000"
                                            value={encaisserForm.montant}
                                            onChange={(e) => setEncaisserForm((f) => ({ ...f, montant: e.target.value }))}
                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400 dark:placeholder-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">Date du paiement</label>
                                        <input
                                            type="date"
                                            value={encaisserForm.date_paiement}
                                            onChange={(e) => setEncaisserForm((f) => ({ ...f, date_paiement: e.target.value }))}
                                            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400 dark:text-white dark:[color-scheme:dark]"
                                        />
                                    </div>
                                    <button
                                        onClick={handleEncaisser}
                                        disabled={encaisserSaving || !encaisserForm.student_id || !encaisserForm.montant}
                                        className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {encaisserSaving ? "Enregistrement…" : "Encaisser et imprimer la quittance"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 dark:border-slate-700">
                                        <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                            Étudiant
                                        </th>
                                        <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                            Type
                                        </th>
                                        <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                            Montant
                                        </th>
                                        <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                            Échéance
                                        </th>
                                        <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                            Statut
                                        </th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((payment) => {
                                        const student = getStudent(payment.student_id);
                                        const name = student
                                            ? `${student.nom} ${student.prenom}`
                                            : "—";
                                        const ini = student
                                            ? initials(student.nom, student.prenom)
                                            : "?";
                                        const color = avatarColor(name);
                                        const isOverdue = payment.status === "retard";
                                        const penalty = calculatePenalty(payment, resolvePenaltyConfig(payment, studentMap));
                                        const days = payment.date_limite
                                            ? daysLate(payment.date_limite)
                                            : 0;

                                        return (
                                            <tr
                                                key={payment.id}
                                                className={`border-b border-gray-100 dark:border-slate-700/60 transition-colors ${
                                                    isOverdue
                                                        ? "bg-red-50 dark:bg-red-900/20"
                                                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                }`}
                                            >
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${color}`}
                                                        >
                                                            {ini}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                            {name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                        {typeLabel(payment.type, payment.tranche)}
                                                    </span>
                                                    {isOverdue && (
                                                        <AlertTriangle className="ml-1.5 inline h-3.5 w-3.5 text-red-500" />
                                                    )}
                                                </td>
                                                <td className="px-3 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {fmt(payment.montant)}
                                                </td>
                                                <td className="px-3 py-3.5 text-sm text-gray-500 dark:text-gray-400">
                                                    {fmtDate(payment.date_limite)}
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    {isOverdue ? (
                                                        <span className="rounded-full bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                                                            +{days}j retard
                                                        </span>
                                                    ) : payment.status === "paye" ? (
                                                        <span className="rounded-full bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                                                            Validé
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                                                            En attente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {payment.status === "paye" ? (
                                                            <button
                                                                onClick={() => handlePrint(payment)}
                                                                className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                            >
                                                                <Printer className="h-3 w-3" />
                                                                Reçu
                                                            </button>
                                                        ) : isOverdue ? (
                                                            <button
                                                                onClick={() => setPenaltyModal(payment)}
                                                                className="rounded-full border border-red-300 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:bg-red-900/20"
                                                            >
                                                                Pénalité
                                                            </button>
                                                        ) : isAdminLike ? (
                                                            <button
                                                                onClick={() =>
                                                                    setConfirmDialog({
                                                                        isOpen: true,
                                                                        title: "Valider ce paiement ?",
                                                                        description: `Confirmer la validation du paiement de ${name}.`,
                                                                        onConfirm: async () => {
                                                                            closeConfirm();
                                                                            await handleValidate(payment.id);
                                                                        },
                                                                    })
                                                                }
                                                                className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                                                            >
                                                                Valider
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* RIGHT — Compte du jour */}
                    <div className="hidden w-72 shrink-0 flex-col border-l border-gray-100 dark:border-slate-700 xl:flex">
                        <div className="border-b border-gray-100 dark:border-slate-700 px-5 py-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                    Compte du jour
                                </p>
                                <span className="text-xs text-gray-400">
                                    {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                                </span>
                            </div>

                            <div className="mt-4 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Entrées</span>
                                    <span className="font-semibold text-green-600">
                                        +{fmtShort(totalEntrees)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Sorties</span>
                                    <span className="font-semibold text-red-500">
                                        −{fmtShort(totalSorties)}
                                    </span>
                                </div>
                                <div className="my-3 border-t border-gray-100 dark:border-slate-700" />
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                        Solde du jour
                                    </p>
                                    <p
                                        className={`mt-1 text-3xl font-bold ${
                                            solde >= 0 ? "text-green-600" : "text-red-600"
                                        }`}
                                    >
                                        {solde >= 0 ? "+" : ""}
                                        {fmtShort(solde)}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => window.location.href = "../comptabilite"}
                                className="mt-4 w-full rounded-lg border border-gray-200 dark:border-gray-700 py-2 text-center text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                                Voir le détail compta →
                            </button>
                        </div>

                        {/* Alerts */}
                        {overdueWithPenalty.length > 0 && (
                            <div className="px-5 py-4">
                                {overdueWithPenalty.slice(0, 3).map((p) => {
                                    const student = getStudent(p.student_id);
                                    const name = student ? `${student.nom} ${student.prenom}` : "Étudiant";
                                    const days = p.date_limite ? daysLate(p.date_limite) : 0;
                                    const rate =
                                        p.type === "mandarin" || p.type === "anglais" ? 1000 : 10000;
                                    return (
                                        <div
                                            key={p.id}
                                            className="mb-3 rounded-xl border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-3"
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                                                <p className="text-[12px] leading-snug text-orange-800">
                                                    <span className="font-semibold">Pénalité auto</span> sur{" "}
                                                    {name} : +{fmt(p.penalites)} ({fmt(rate)} × {days}j).
                                                    Relance SMS envoyée.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Validate all */}
                        {tab === "a_valider" && filtered.length > 0 && isAdminLike && (
                            <div className="mt-auto border-t border-gray-100 dark:border-slate-700 p-4">
                                <button
                                    onClick={() =>
                                        setConfirmDialog({
                                            isOpen: true,
                                            title: `Valider les ${filtered.length} paiements ?`,
                                            description: "Cette action validera tous les paiements en attente.",
                                            onConfirm: async () => {
                                                closeConfirm();
                                                await handleValidateAll();
                                            },
                                        })
                                    }
                                    className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                                >
                                    Valider tous ({filtered.length})
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile bottom action */}
                {tab === "a_valider" && filtered.length > 0 && isAdminLike && (
                    <div className="border-t border-gray-100 dark:border-slate-700 p-4 xl:hidden">
                        <button
                            onClick={() =>
                                setConfirmDialog({
                                    isOpen: true,
                                    title: `Valider les ${filtered.length} paiements ?`,
                                    description: "Cette action validera tous les paiements en attente.",
                                    onConfirm: async () => {
                                        closeConfirm();
                                        await handleValidateAll();
                                    },
                                })
                            }
                            className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700"
                        >
                            Valider tous ({filtered.length})
                        </button>
                    </div>
                )}
            </div>

            {/* Confirm dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                description={confirmDialog.description}
                onConfirm={confirmDialog.onConfirm}
                onClose={closeConfirm}
            />

            {/* Register payment modal */}
            {showRegisterModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Enregistrer un paiement</h2>
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Étudiant
                                </label>
                                <select
                                    value={newPayment.student_id}
                                    onChange={(e) =>
                                        setNewPayment((p) => ({ ...p, student_id: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400 cursor-pointer dark:[color-scheme:dark]"
                                >
                                    <option value="">Choisir un étudiant…</option>
                                    {students.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.nom} {s.prenom}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Type
                                    </label>
                                    <select
                                        value={newPayment.type}
                                        onChange={(e) =>
                                            setNewPayment((p) => ({ ...p, type: e.target.value }))
                                        }
                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400 cursor-pointer dark:[color-scheme:dark]"
                                    >
                                        <option value="bourse">Bourse</option>
                                        <option value="mandarin">Mandarin</option>
                                        <option value="anglais">Anglais</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Tranche
                                    </label>
                                    <select
                                        value={newPayment.tranche}
                                        onChange={(e) =>
                                            setNewPayment((p) => ({ ...p, tranche: e.target.value }))
                                        }
                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400 cursor-pointer dark:[color-scheme:dark]"
                                    >
                                        <option value="1">T1</option>
                                        <option value="2">T2</option>
                                        <option value="3">T3</option>
                                        <option value="4">T4</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Montant (FCFA)
                                </label>
                                <input
                                    type="number"
                                    placeholder="ex: 100000"
                                    value={newPayment.montant}
                                    onChange={(e) =>
                                        setNewPayment((p) => ({ ...p, montant: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400 cursor-pointer dark:[color-scheme:dark]"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Date limite
                                </label>
                                <input
                                    type="date"
                                    value={newPayment.date_limite}
                                    onChange={(e) =>
                                        setNewPayment((p) => ({ ...p, date_limite: e.target.value }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400 cursor-pointer dark:[color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowRegisterModal(false)}
                                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleRegisterPayment}
                                disabled={saving || !newPayment.student_id || !newPayment.montant}
                                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {saving ? "Enregistrement…" : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Penalty detail modal */}
            {penaltyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Détail pénalité</h2>
                            <button
                                onClick={() => setPenaltyModal(null)}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {(() => {
                            const student = getStudent(penaltyModal.student_id);
                            const name = student ? `${student.nom} ${student.prenom}` : "Étudiant";
                            const days = penaltyModal.date_limite ? daysLate(penaltyModal.date_limite) : 0;
                            const rate =
                                penaltyModal.type === "mandarin" || penaltyModal.type === "anglais"
                                    ? 1_000
                                    : 10_000;
                            return (
                                <div className="space-y-3 text-sm">
                                    <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4">
                                        <p className="font-semibold text-red-700 dark:text-red-300">{name}</p>
                                        <p className="mt-1 text-red-600">
                                            {typeLabel(penaltyModal.type, penaltyModal.tranche)} — échéance{" "}
                                            {fmtDate(penaltyModal.date_limite)}
                                        </p>
                                    </div>
                                    <div className="space-y-2 text-gray-700 dark:text-gray-300">
                                        <div className="flex justify-between">
                                            <span>Jours de retard</span>
                                            <strong>{days} j</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Taux journalier</span>
                                            <strong>{fmt(rate)}</strong>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Montant principal</span>
                                            <strong>{fmt(penaltyModal.montant)}</strong>
                                        </div>
                                        <div className="border-t border-gray-100 dark:border-slate-700 pt-2">
                                            <div className="flex justify-between text-base font-bold text-red-600">
                                                <span>Total dû</span>
                                                <span>{fmt(penaltyModal.montant + (penaltyModal.penalites || 0))}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isAdminLike && (
                                        <button
                                            onClick={() => {
                                                setPenaltyModal(null);
                                                setConfirmDialog({
                                                    isOpen: true,
                                                    title: "Valider malgré le retard ?",
                                                    description: `Validation du paiement de ${name} avec pénalité de ${fmt(penaltyModal.penalites || 0)}.`,
                                                    onConfirm: async () => {
                                                        closeConfirm();
                                                        await handleValidate(penaltyModal.id);
                                                    },
                                                });
                                            }}
                                            className="mt-2 w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                                        >
                                            Valider avec pénalité
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </ProtectedRoute>
    );
}
