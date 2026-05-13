"use client";

import { useCallback, useEffect, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    Plus,
    Printer,
    X,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { logActivity } from "../utils/activityLogger";
import { printAccountingHtmlReport } from "../utils/accountingReportPrinter";
import ConfirmDialog from "./ConfirmDialog";
import ProtectedRoute from "./ProtectedRoute";

interface EntreeComptable {
    id: string;
    montant: number;
    date: string;
    type: string;
    description: string;
    student_id: string | null;
    payment_id: string | null;
    created_by: string | null;
    created_at: string;
}

interface SortieComptable {
    id: string;
    montant: number;
    date: string;
    categorie: string;
    description: string;
    justificatif_url: string | null;
    validated_by: string | null;
    validated_at: string | null;
    created_by: string | null;
    created_at: string;
}

interface LedgerRow {
    id: string;
    kind: "entree" | "sortie";
    time: string;
    description: string;
    student_id: string | null;
    categorie: string;
    montant: number;
    validatedBy: string | null;
    validatedAt: string | null;
    needsValidation: boolean;
    raw: EntreeComptable | SortieComptable;
}

interface AppUser {
    id: string;
    name: string;
}

interface Student {
    id: string;
    nom: string;
    prenom: string;
}

const CATEGORIES_SORTIES = [
    "loyer", "salaires", "fonctionnement", "materiels",
    "fournitures", "transports", "communication", "partenaires", "divers",
];

const TYPES_ENTREES = ["paiement_procedure", "paiement_cours", "revenus_divers"];

function catLabel(cat: string): string {
    const map: Record<string, string> = {
        loyer: "Loyer",
        salaires: "Salaires",
        fonctionnement: "Fonctionnement",
        materiels: "Matériels",
        fournitures: "Fournitures",
        transports: "Transports",
        communication: "Communication",
        partenaires: "Partenaires",
        divers: "Divers",
        paiement_procedure: "Procédure",
        paiement_cours: "Cours",
        revenus_divers: "Divers",
        frais: "Frais",
    };
    return map[cat] || cat;
}

function fmt(n: number, signed = false): string {
    const formatted = new Intl.NumberFormat("fr-FR").format(Math.abs(n));
    if (!signed) return `${formatted}`;
    return n >= 0 ? `+${formatted}` : `−${formatted}`;
}

function fmtCompact(n: number): string {
    if (Math.abs(n) >= 1_000_000)
        return `${(n / 1_000_000).toFixed(2).replace(".", ",")}M`;
    if (Math.abs(n) >= 1_000)
        return `${Math.round(n / 1_000)}K`;
    return String(n);
}

function fmtTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtFullDate(date: Date): string {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function fmtShortDate(date: Date): string {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function dayKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}

const PAGE_SIZE = 10;

export default function LivreComptable() {
    const supabase = createClient();
    const { user } = useAuth();
    const { showNotification } = useNotificationContext();

    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [entrees, setEntrees] = useState<EntreeComptable[]>([]);
    const [sorties, setSorties] = useState<SortieComptable[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [catFilter, setCatFilter] = useState<string>("tout");
    const [page, setPage] = useState(1);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newKind, setNewKind] = useState<"entree" | "sortie">("entree");
    const [newForm, setNewForm] = useState({
        montant: "",
        description: "",
        type: "revenus_divers",
        categorie: "divers",
    });
    const [saving, setSaving] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; description: string; onConfirm: () => void;
    }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });
    const closeConfirm = () => setConfirmDialog((s) => ({ ...s, isOpen: false }));

    const isAdminLike = user?.role === "admin" || user?.role === "super_admin";

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [eRes, sRes, uRes, stRes] = await Promise.all([
                supabase.from("entrees_comptables").select("*").order("date", { ascending: false }),
                supabase.from("sorties_comptables").select("*").order("date", { ascending: false }),
                supabase.from("users").select("id, name"),
                supabase.from("students").select("id, nom, prenom"),
            ]);
            setEntrees(eRes.data || []);
            setSorties(sRes.data || []);
            setUsers(uRes.data || []);
            setStudents(stRes.data || []);
        } catch (err) {
            console.error("Erreur chargement livre:", err);
        } finally {
            setLoading(false);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { loadData(); }, [loadData]);

    const getUserName = useCallback(
        (id: string | null): string => {
            if (!id) return "Auto";
            const u = users.find((u) => u.id === id);
            return u ? u.name.split(" ")[0] : "Auto";
        },
        [users]
    );

    const getStudentName = useCallback(
        (id: string | null): string | null => {
            if (!id) return null;
            const s = students.find((s) => s.id === id);
            return s ? `${s.nom.charAt(0)}. ${s.prenom}` : null;
        },
        [students]
    );

    // Build unified ledger for the current day
    const dayStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000);

    const dayEntrees = entrees.filter((e) => {
        const d = new Date(e.date);
        return d >= dayStart && d < dayEnd;
    });
    const daySorties = sorties.filter((s) => {
        const d = new Date(s.date);
        return d >= dayStart && d < dayEnd;
    });

    const rows: LedgerRow[] = [
        ...dayEntrees.map((e): LedgerRow => ({
            id: e.id,
            kind: "entree",
            time: e.date,
            description: e.description,
            student_id: e.student_id,
            categorie: e.type,
            montant: e.montant,
            validatedBy: e.created_by,
            validatedAt: null,
            needsValidation: false,
            raw: e,
        })),
        ...daySorties.map((s): LedgerRow => ({
            id: s.id,
            kind: "sortie",
            time: s.date,
            description: s.description,
            student_id: null,
            categorie: s.categorie,
            montant: s.montant,
            validatedBy: s.validated_by,
            validatedAt: s.validated_at,
            needsValidation: !s.validated_by,
            raw: s,
        })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const filtered =
        catFilter === "tout"
            ? rows
            : rows.filter((r) => r.categorie === catFilter || r.kind === catFilter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalEntrees = dayEntrees.reduce((s, e) => s + e.montant, 0);
    const totalSorties = daySorties.reduce((s, e) => s + e.montant, 0);
    const solde = totalEntrees - totalSorties;

    // Who validated the balance (last validated sortie or the last entry creator)
    const lastValidated = daySorties
        .filter((s) => s.validated_by)
        .sort((a, b) => new Date(b.validated_at || "").getTime() - new Date(a.validated_at || "").getTime())[0];
    const soldeBy = lastValidated ? getUserName(lastValidated.validated_by) : null;
    const soldeAt = lastValidated?.validated_at ? fmtTime(lastValidated.validated_at) : null;

    const prevDay = () => {
        const d = new Date(viewDate);
        d.setDate(d.getDate() - 1);
        setViewDate(d);
        setPage(1);
    };
    const nextDay = () => {
        const d = new Date(viewDate);
        d.setDate(d.getDate() + 1);
        setViewDate(d);
        setPage(1);
    };
    const isToday = dayKey(viewDate) === dayKey(new Date());

    const handleValidateSortie = async (id: string) => {
        if (!user || !isAdminLike) return;
        await supabase
            .from("sorties_comptables")
            .update({ validated_by: user.id, validated_at: new Date().toISOString() })
            .eq("id", id);
        await logActivity(
            user.id, user.name, user.role,
            "accounting_expense", "sorties_comptables", id,
            "Sortie comptable validée",
            {}
        );
        showNotification("Sortie validée", "success");
        loadData();
    };

    const handleAdd = async () => {
        if (!user || !newForm.montant || !newForm.description) return;
        setSaving(true);
        try {
            if (newKind === "entree") {
                const { data } = await supabase.from("entrees_comptables").insert({
                    montant: Number(newForm.montant),
                    description: newForm.description,
                    type: newForm.type,
                    date: new Date().toISOString(),
                    created_by: user.id,
                }).select();
                if (data?.[0]) {
                    await logActivity(user.id, user.name, user.role,
                        "accounting_entry", "entrees_comptables", data[0].id,
                        `Entrée comptable — ${newForm.description}`,
                        { montant: Number(newForm.montant) }
                    );
                }
            } else {
                const { data } = await supabase.from("sorties_comptables").insert({
                    montant: Number(newForm.montant),
                    description: newForm.description,
                    categorie: newForm.categorie,
                    date: new Date().toISOString(),
                    created_by: user.id,
                }).select();
                if (data?.[0]) {
                    await logActivity(user.id, user.name, user.role,
                        "accounting_expense", "sorties_comptables", data[0].id,
                        `Sortie comptable — ${newForm.description}`,
                        { montant: Number(newForm.montant) }
                    );
                }
            }
            showNotification("Opération enregistrée", "success");
            setShowNewModal(false);
            setNewForm({ montant: "", description: "", type: "revenus_divers", categorie: "divers" });
            loadData();
        } catch (err) {
            showNotification("Erreur lors de l'enregistrement", "error");
        } finally {
            setSaving(false);
        }
    };

    const printReport = async () => {
        const ops = rows.map((r) => ({
            date: r.time,
            description: r.description,
            category: catLabel(r.categorie),
            amount: r.montant,
            type: r.kind,
        }));
        await printAccountingHtmlReport({
            title: `Rapport comptable — ${fmtFullDate(viewDate)}`,
            period: { start: dayStart.toISOString(), end: dayEnd.toISOString() },
            entries: ops,
            summary: { totalEntrees, totalSorties, balance: solde },
            scope: "all",
            locale: "fr-FR",
        });
    };

    const exportCSV = () => {
        const headers = ["Heure", "Type", "Désignation", "Catégorie", "Montant", "Validé par"];
        const lines = filtered.map((r) => [
            fmtTime(r.time),
            r.kind === "entree" ? "Entrée" : "Sortie",
            r.description,
            catLabel(r.categorie),
            (r.kind === "entree" ? "+" : "-") + fmt(r.montant),
            r.needsValidation ? "À valider" : getUserName(r.validatedBy),
        ]);
        const csv = [headers, ...lines].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `livre-comptable-${dayKey(viewDate)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const allCats = Array.from(new Set(rows.map((r) => r.categorie)));

    return (
        <ProtectedRoute requiredRole="agent">
            <div className="-m-4 sm:-m-5 flex flex-col bg-white dark:bg-slate-900" style={{ minHeight: "calc(100vh - 130px)" }}>
                {/* Header */}
                <div className="border-b border-gray-100 px-6 py-4">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Finance &rsaquo; Livre comptable
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Livre</h1>
                            <span className="text-xl text-gray-400">·</span>
                            <span className="text-xl font-medium text-gray-700 dark:text-gray-300">{fmtFullDate(viewDate)}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={prevDay}
                                    className="rounded-full border border-gray-200 dark:border-gray-700 p-1 hover:bg-gray-50 dark:bg-gray-800/50"
                                >
                                    <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </button>
                                <button
                                    onClick={nextDay}
                                    disabled={isToday}
                                    className="rounded-full border border-gray-200 dark:border-gray-700 p-1 hover:bg-gray-50 dark:bg-gray-800/50 disabled:opacity-30"
                                >
                                    <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={catFilter}
                                onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
                                className="rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 outline-none hover:bg-gray-50 dark:bg-gray-800/50"
                            >
                                <option value="tout">Catégorie</option>
                                <option value="entree">Entrées uniquement</option>
                                <option value="sortie">Sorties uniquement</option>
                                {allCats.map((c) => (
                                    <option key={c} value={c}>{catLabel(c)}</option>
                                ))}
                            </select>
                            <button
                                onClick={printReport}
                                className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Imprimer rapport
                            </button>
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Exporter CSV
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-3 gap-4 px-6 py-4">
                    {/* Entrées */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            Entrées jour
                        </p>
                        <p className="mt-2 text-2xl font-bold text-green-600">
                            +{fmt(totalEntrees)} F
                        </p>
                    </div>
                    {/* Sorties */}
                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            Sorties jour
                        </p>
                        <p className="mt-2 text-2xl font-bold text-red-500">
                            −{fmt(totalSorties)} F
                        </p>
                    </div>
                    {/* Solde */}
                    <div className="rounded-xl bg-gray-900 p-4">
                        <div className="flex items-start justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Solde jour
                            </p>
                            {soldeBy && soldeAt && (
                                <span className="text-[10px] text-gray-400">
                                    Soldé par {soldeBy} {soldeAt}
                                </span>
                            )}
                        </div>
                        <p
                            className={`mt-2 text-2xl font-bold ${
                                solde >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                        >
                            {solde >= 0 ? "+" : ""}
                            {fmt(solde)} F
                        </p>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto px-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                            Chargement...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-sm text-gray-400">
                            <CheckCircle2 className="mb-3 h-8 w-8 text-gray-200" />
                            Aucune opération ce jour
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {["Heure", "Type", "Désignation", "Étudiant", "Catégorie", "", "Montant", "Validé par"].map(
                                        (h) => (
                                            <th
                                                key={h}
                                                className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 first:pl-0 last:pr-0"
                                            >
                                                {h}
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b border-gray-50 text-sm ${
                                            row.needsValidation
                                                ? "bg-amber-50 dark:bg-amber-900/20/70"
                                                : row.kind === "sortie"
                                                  ? "hover:bg-gray-50 dark:bg-gray-800/50/50"
                                                  : "hover:bg-gray-50 dark:bg-gray-800/50/50"
                                        }`}
                                    >
                                        <td className="py-3 pl-0 pr-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                                            {fmtTime(row.time)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                                    row.kind === "entree"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-orange-100 text-orange-700"
                                                }`}
                                            >
                                                {row.kind === "entree" ? "Entrée" : "Sortie"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">
                                            {row.description}
                                        </td>
                                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                                            {getStudentName(row.student_id) || "—"}
                                        </td>
                                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                                            {catLabel(row.categorie)}
                                        </td>
                                        <td className="px-3 py-3">
                                            {row.needsValidation && isAdminLike && (
                                                <button
                                                    onClick={() =>
                                                        setConfirmDialog({
                                                            isOpen: true,
                                                            title: "Valider cette sortie ?",
                                                            description: `Confirmer la sortie de ${fmt(row.montant)} F — ${row.description}`,
                                                            onConfirm: async () => {
                                                                closeConfirm();
                                                                await handleValidateSortie(row.id);
                                                            },
                                                        })
                                                    }
                                                    className="rounded-full border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                                                >
                                                    Valider
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold">
                                            <span className={row.kind === "entree" ? "text-green-600" : "text-red-500"}>
                                                {row.kind === "entree" ? "+" : "−"}
                                                {fmt(row.montant)}
                                            </span>
                                        </td>
                                        <td className="py-3 pl-3 pr-0 text-right text-gray-500 dark:text-gray-400">
                                            {row.needsValidation ? (
                                                <span className="rounded-full border border-amber-300 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                                                    À valider
                                                </span>
                                            ) : (
                                                getUserName(row.validatedBy)
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                {filtered.length > 0 && (
                    <div className="border-t border-gray-100 px-6 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-6 text-sm">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                    Sous-totaux du jour
                                </p>
                                <span className="font-medium text-green-600">
                                    Entrées {fmt(totalEntrees)}
                                </span>
                                <span className="font-medium text-red-500">
                                    Sorties {fmt(totalSorties)}
                                </span>
                                <span className={`font-bold ${solde >= 0 ? "text-green-700" : "text-red-700 dark:text-red-300"}`}>
                                    Net {solde >= 0 ? "+" : ""}
                                    {fmt(solde)}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-400">
                                    Page {page} / {totalPages}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs disabled:opacity-30 hover:bg-gray-50 dark:bg-gray-800/50"
                                    >
                                        ←
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs disabled:opacity-30 hover:bg-gray-50 dark:bg-gray-800/50"
                                    >
                                        →
                                    </button>
                                </div>
                                <button
                                    onClick={prevDay}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                                >
                                    Voir hier ·{" "}
                                    {(() => {
                                        const d = new Date(viewDate);
                                        d.setDate(d.getDate() - 1);
                                        return fmtShortDate(d);
                                    })()}{" "}
                                    →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FAB — mobile + desktop */}
                {isAdminLike && (
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-700 xl:hidden"
                    >
                        <Plus className="h-4 w-4" />
                        Nouveau
                    </button>
                )}
                {isAdminLike && (
                    <div className="hidden items-center border-t border-gray-100 px-6 py-3 xl:flex">
                        <button
                            onClick={() => setShowNewModal(true)}
                            className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                            <Plus className="h-4 w-4" />
                            Nouvelle opération
                        </button>
                    </div>
                )}
            </div>

            {/* New operation modal */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nouvelle opération</h2>
                            <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Kind toggle */}
                        <div className="mb-4 flex rounded-xl border border-gray-200 dark:border-gray-700 p-1">
                            {(["entree", "sortie"] as const).map((k) => (
                                <button
                                    key={k}
                                    onClick={() => setNewKind(k)}
                                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                                        newKind === k
                                            ? k === "entree"
                                                ? "bg-green-600 text-white"
                                                : "bg-orange-500 text-white"
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                                    }`}
                                >
                                    {k === "entree" ? "Entrée" : "Sortie"}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Montant (FCFA)
                                </label>
                                <input
                                    type="number"
                                    placeholder="ex: 150000"
                                    value={newForm.montant}
                                    onChange={(e) => setNewForm((f) => ({ ...f, montant: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Désignation
                                </label>
                                <input
                                    type="text"
                                    placeholder="ex: Loyer novembre"
                                    value={newForm.description}
                                    onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400"
                                />
                            </div>

                            {newKind === "entree" ? (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Type
                                    </label>
                                    <select
                                        value={newForm.type}
                                        onChange={(e) => setNewForm((f) => ({ ...f, type: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400"
                                    >
                                        {TYPES_ENTREES.map((t) => (
                                            <option key={t} value={t}>{catLabel(t)}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Catégorie
                                    </label>
                                    <select
                                        value={newForm.categorie}
                                        onChange={(e) => setNewForm((f) => ({ ...f, categorie: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400"
                                    >
                                        {CATEGORIES_SORTIES.map((c) => (
                                            <option key={c} value={c}>{catLabel(c)}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800/50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={saving || !newForm.montant || !newForm.description}
                                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                                    newKind === "entree" ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"
                                }`}
                            >
                                {saving ? "Enregistrement…" : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                description={confirmDialog.description}
                onConfirm={confirmDialog.onConfirm}
                onClose={closeConfirm}
            />
        </ProtectedRoute>
    );
}
