"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useEntreesComptables, useSortiesComptables, ENTREES_KEY, SORTIES_KEY } from "../lib/hooks/use-accounting";
import { useUsers } from "../lib/hooks/use-users";
import { useStudents } from "../lib/hooks/use-students";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useNotificationContext } from "../context/NotificationContext";
import { logActivity } from "../utils/activityLogger";
import { printAccountingHtmlReport } from "../utils/accountingReportPrinter";
import ConfirmDialog from "./ConfirmDialog";
import ProtectedRoute from "./ProtectedRoute";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

type ViewMode = "jour" | "semaine" | "mois" | "trimestre" | "semestre" | "annee";

const PAGE_SIZE = 10;

export default function LivreComptable() {
    const supabase = createClient();
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const { showNotification } = useNotificationContext();
    const queryClient = useQueryClient();

    const { data: _entreesData = [], isLoading: loading } = useEntreesComptables();
    const entrees = _entreesData as unknown as EntreeComptable[];
    const { data: _sortiesData = [] } = useSortiesComptables();
    const sorties = _sortiesData as unknown as SortieComptable[];
    const { data: _usersData = [] } = useUsers();
    const users = _usersData as unknown as AppUser[];
    const { data: _studentsData = [] } = useStudents();
    const students = _studentsData as unknown as Student[];

    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("jour");
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

    const canCreateEntry = hasPermission("accounting.create");
    const canValidateEntry = hasPermission("accounting.validate");

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

    // Build unified ledger for the current period
    const getPeriodBounds = () => {
        const d = viewDate;
        const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
        switch (viewMode) {
            case "semaine": {
                const dow = d.getDay();
                const start = new Date(y, m, day - dow);
                return { start, end: new Date(start.getTime() + 7 * 86400000) };
            }
            case "mois":
                return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
            case "trimestre": {
                const q = Math.floor(m / 3);
                return { start: new Date(y, q * 3, 1), end: new Date(y, q * 3 + 3, 1) };
            }
            case "semestre": {
                const s = m < 6 ? 0 : 1;
                return { start: new Date(y, s * 6, 1), end: new Date(y, s * 6 + 6, 1) };
            }
            case "annee":
                return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
            default:
                return { start: new Date(y, m, day), end: new Date(y, m, day + 1) };
        }
    };
    const { start: dayStart, end: dayEnd } = getPeriodBounds();

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

    const periodLabel = () => {
        const d = viewDate;
        const opts: Intl.DateTimeFormatOptions =
            viewMode === "jour" ? { day: "numeric", month: "long", year: "numeric" }
            : viewMode === "semaine" ? { day: "numeric", month: "short" }
            : viewMode === "mois" ? { month: "long", year: "numeric" }
            : viewMode === "trimestre" ? { month: "short", year: "numeric" }
            : viewMode === "semestre" ? { month: "short", year: "numeric" }
            : { year: "numeric" };
        if (viewMode === "semaine") {
            const { start, end } = getPeriodBounds();
            return `${fmtShortDate(start)} – ${fmtShortDate(new Date(end.getTime() - 86400000))}`;
        }
        if (viewMode === "trimestre") {
            const q = Math.floor(d.getMonth() / 3) + 1;
            return `T${q} ${d.getFullYear()}`;
        }
        if (viewMode === "semestre") {
            const s = d.getMonth() < 6 ? 1 : 2;
            return `S${s} ${d.getFullYear()}`;
        }
        return d.toLocaleDateString("fr-FR", opts);
    };

    const navigate = (dir: 1 | -1) => {
        const d = new Date(viewDate);
        const delta: Record<ViewMode, number> = { jour: 1, semaine: 7, mois: 0, trimestre: 0, semestre: 0, annee: 0 };
        if (viewMode === "mois") d.setMonth(d.getMonth() + dir);
        else if (viewMode === "trimestre") d.setMonth(d.getMonth() + dir * 3);
        else if (viewMode === "semestre") d.setMonth(d.getMonth() + dir * 6);
        else if (viewMode === "annee") d.setFullYear(d.getFullYear() + dir);
        else d.setDate(d.getDate() + dir * delta[viewMode]);
        setViewDate(d);
        setPage(1);
    };

    const isCurrentPeriod = () => {
        const now = new Date();
        const { start, end } = getPeriodBounds();
        return now >= start && now < end;
    };

    const handleValidateSortie = async (id: string) => {
        if (!user || !canValidateEntry) return;
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
        queryClient.invalidateQueries({ queryKey: SORTIES_KEY });
    };

    const handleAdd = async () => {
        if (!user || !newForm.montant || !newForm.description) return;
        // Création d'écritures comptables manuelles soumise à la permission dédiée
        if (!canCreateEntry) {
            showNotification("Action réservée aux administrateurs", "error");
            return;
        }
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
            queryClient.invalidateQueries({ queryKey: newKind === "entree" ? ENTREES_KEY : SORTIES_KEY });
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
            title: `Rapport comptable — ${periodLabel()}`,
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
        a.download = `livre-comptable-${viewMode}-${dayKey(viewDate)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const allCats = Array.from(new Set(rows.map((r) => r.categorie)));

    return (
        <ProtectedRoute requiredRole="agent" requiredPermission="accounting.view">
            <div className="-m-4 sm:-m-5 flex flex-col bg-white dark:bg-slate-900" style={{ minHeight: "calc(100vh - 130px)" }}>
                {/* Header */}
                <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-4">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Finance &rsaquo; Livre comptable
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Livre</h1>
                            <span className="text-xl text-gray-400">·</span>
                            <span className="text-xl font-medium text-gray-700 dark:text-gray-300">{periodLabel()}</span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="rounded-full border border-gray-200 dark:border-gray-700 p-1 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                >
                                    <ChevronLeft className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </button>
                                <button
                                    onClick={() => navigate(1)}
                                    disabled={isCurrentPeriod()}
                                    className="rounded-full border border-gray-200 dark:border-gray-700 p-1 hover:bg-gray-50 dark:bg-gray-800/50 disabled:opacity-30"
                                >
                                    <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                </button>
                            </div>
                            <Select value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setPage(1); }}>
                                <SelectTrigger className="h-auto rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="jour">Jour</SelectItem>
                                    <SelectItem value="semaine">Semaine</SelectItem>
                                    <SelectItem value="mois">Mois</SelectItem>
                                    <SelectItem value="trimestre">Trimestre</SelectItem>
                                    <SelectItem value="semestre">Semestre</SelectItem>
                                    <SelectItem value="annee">Année</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={catFilter} onValueChange={(v) => { setCatFilter(v ?? "tout"); setPage(1); }}>
                                <SelectTrigger className="h-auto rounded-full border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <SelectValue placeholder="Catégorie" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tout">Catégorie</SelectItem>
                                    <SelectItem value="entree">Entrées uniquement</SelectItem>
                                    <SelectItem value="sortie">Sorties uniquement</SelectItem>
                                    {allCats.map((c) => (
                                        <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <button
                                onClick={printReport}
                                className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Imprimer rapport
                            </button>
                            <button
                                onClick={printReport}
                                className="flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Télécharger rapport
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
                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            Entrées {viewMode === "jour" ? "jour" : "période"}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-green-600">
                            +{fmt(totalEntrees)} F
                        </p>
                    </div>
                    {/* Sorties */}
                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            Sorties {viewMode === "jour" ? "jour" : "période"}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-red-500">
                            −{fmt(totalSorties)} F
                        </p>
                    </div>
                    {/* Solde */}
                    <div className="rounded-xl bg-gray-900 p-4">
                        <div className="flex items-start justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Solde {viewMode === "jour" ? "jour" : "période"}
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
                                <tr className="border-b border-gray-100 dark:border-slate-700">
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
                                        className={`border-b border-gray-100 dark:border-slate-700/60 text-sm ${
                                            row.needsValidation
                                                ? "bg-amber-50 dark:bg-amber-900/20"
                                                : row.kind === "sortie"
                                                  ? "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                        }`}
                                    >
                                        <td className="py-3 pl-0 pr-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                                            {fmtTime(row.time)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                                    row.kind === "entree"
                                                        ? "bg-green-100 dark:bg-green-900/30 dark:text-green-400 text-green-700"
                                                        : "bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 text-orange-700"
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
                                            {row.needsValidation && canValidateEntry && (
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
                    <div className="border-t border-gray-100 dark:border-slate-700 px-6 py-3">
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
                                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    >
                                        ←
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                    >
                                        →
                                    </button>
                                </div>
                                <button
                                    onClick={() => navigate(-1)}
                                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
                                >
                                    Période précédente →
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* FAB — mobile + desktop */}
                {canCreateEntry && (
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-red-700 xl:hidden"
                    >
                        <Plus className="h-4 w-4" />
                        Nouveau
                    </button>
                )}
                {canCreateEntry && (
                    <div className="hidden items-center border-t border-gray-100 dark:border-slate-700 px-6 py-3 xl:flex">
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
                                    <Select value={newForm.type} onValueChange={(v) => setNewForm((f) => ({ ...f, type: v ?? f.type }))}>
                                        <SelectTrigger className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TYPES_ENTREES.map((t) => (
                                                <SelectItem key={t} value={t}>{catLabel(t)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Catégorie
                                    </label>
                                    <Select value={newForm.categorie} onValueChange={(v) => setNewForm((f) => ({ ...f, categorie: v ?? f.categorie }))}>
                                        <SelectTrigger className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES_SORTIES.map((c) => (
                                                <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
