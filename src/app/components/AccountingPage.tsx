"use client";

import { useEffect, useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { logActivity } from "../utils/activityLogger";
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
import { Download, FileSpreadsheet, FileText, TrendingUp, TrendingDown, Calendar, Settings, Plus, X, Trash2, Search, Eye, Edit } from "lucide-react";
import { printThermalReceipt } from "../utils/thermalReceipt";
import { generateAccountingReport } from "../lib/pdfGenerator";
import { printAccountingHtmlReport } from "../utils/accountingReportPrinter";
import { useNotificationContext } from "../context/NotificationContext";
import ConfirmDialog from "./ConfirmDialog";
import DropdownMenu from "./shared/DropdownMenu";

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

type Tab = "entrees" | "sorties" | "rapport" | "budgets" | "categories";
type PeriodFilter = "jour" | "semaine" | "mois" | "annee" | "personnalise";
type ReportScope = "all" | "entrees" | "sorties";

interface Budget {
    id: string;
    categorie: string;
    montant_prevu: number;
    periode: string;
    created_at: string;
}

interface CustomCategory {
    id: string;
    nom: string;
    type: "entree" | "sortie";
    created_at: string;
}

const TYPES_ENTREES: EntreeComptable["type"][] = [
    "paiement_procedure",
    "paiement_cours",
    "revenus_divers",
];

const CATEGORY_LABEL_KEYS: Record<string, string> = {
    loyer: "rent",
    salaires: "salaries",
    fonctionnement: "operations",
    materiels: "equipment",
    fournitures: "supplies",
    transports: "transport",
    communication: "communication",
    partenaires: "partners",
    divers: "misc",
};

const ENTRY_TYPE_LABEL_KEYS: Record<string, string> = {
    paiement_procedure: "procedurePayment",
    paiement_cours: "coursePayment",
    revenus_divers: "miscRevenue",
};

function toDate(val: string | null): Date {
    if (!val) return new Date();
    return new Date(val);
}

export default function AccountingPage() {
    const t = useTranslations("accountingPage");
    const locale = useLocale();
    const dateLocale = locale === "en" ? "en-US" : "fr-FR";
    const { user } = useAuth();
    const supabase = createClient();
    const { showNotification } = useNotificationContext();
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean; title: string; description: string; onConfirm: () => void;
    }>({ open: false, title: '', description: '', onConfirm: () => {} });
    const closeConfirm = () => setConfirmDialog(s => ({ ...s, open: false }));
    const [entrees, setEntrees] = useState<EntreeComptable[]>([]);
    const [sorties, setSorties] = useState<SortieComptable[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<Tab>("rapport");
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("mois");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");
    const [reportScope, setReportScope] = useState<ReportScope>("all");

    const today = new Date();
    const [reportDate, setReportDate] = useState(today.toISOString().slice(0, 10));

    const [newEntree, setNewEntree] = useState({
        montant: "",
        description: "",
        type: "revenus_divers" as EntreeComptable["type"],
        date: today.toISOString().slice(0, 10),
    });

    const [newSortie, setNewSortie] = useState({
        montant: "",
        description: "",
        categorie: "divers" as SortieComptable["categorie"],
        date: today.toISOString().slice(0, 10),
    });

    const [submitting, setSubmitting] = useState(false);
    const [newBudget, setNewBudget] = useState({ categorie: "loyer", montant_prevu: "", periode: "mensuel" });
    const [newCategory, setNewCategory] = useState({ nom: "", type: "sortie" as "entree" | "sortie" });
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [detailEntree, setDetailEntree] = useState<EntreeComptable | null>(null);
    const [detailSortie, setDetailSortie] = useState<SortieComptable | null>(null);
    const [editingEntree, setEditingEntree] = useState<EntreeComptable | null>(null);
    const [editingSortie, setEditingSortie] = useState<SortieComptable | null>(null);
    const [editEntreeForm, setEditEntreeForm] = useState({ montant: "", description: "", type: "", date: "" });
    const [editSortieForm, setEditSortieForm] = useState({ montant: "", description: "", categorie: "", date: "" });
    const [savingEdit, setSavingEdit] = useState(false);

    const formatAmount = (n: number): string => `${n.toLocaleString(dateLocale)} FCFA`;
    const getCategoryLabel = (category: string) => CATEGORY_LABEL_KEYS[category] ? t(`categories.${CATEGORY_LABEL_KEYS[category]}`) : category;
    const getEntryTypeLabel = (type: string) => ENTRY_TYPE_LABEL_KEYS[type] ? t(`entryTypes.${ENTRY_TYPE_LABEL_KEYS[type]}`) : type;
    const getPeriodLabel = (period: string) => {
        switch (period) {
            case "jour": return t("periods.today");
            case "semaine": return t("periods.week");
            case "mois": return t("periods.month");
            case "annee": return t("periods.year");
            case "personnalise": return t("periods.custom");
            case "mensuel": return t("budgetPeriods.monthly");
            case "trimestriel": return t("budgetPeriods.quarterly");
            case "annuel": return t("budgetPeriods.yearly");
            default: return period;
        }
    };

    const CATEGORIES_SORTIES = useMemo(() => {
        const defaults = ["loyer", "salaires", "fonctionnement", "materiels", "fournitures", "transports", "communication", "partenaires", "divers"];
        const custom = customCategories.filter(c => c.type === "sortie").map(c => c.nom);
        return [...defaults, ...custom];
    }, [customCategories]);

    const TYPES_ENTREES_DYNAMIC = useMemo(() => {
        const defaults = ["paiement_procedure", "paiement_cours", "revenus_divers"];
        const custom = customCategories.filter(c => c.type === "entree").map(c => c.nom);
        return [...defaults, ...custom];
    }, [customCategories]);

    const load = async () => {
        setLoading(true);
        const [e, s, b, c] = await Promise.all([
            supabase.from("entrees_comptables").select("*").order("date", { ascending: false }),
            supabase.from("sorties_comptables").select("*").order("date", { ascending: false }),
            supabase.from("budgets").select("*").order("created_at", { ascending: false }),
            supabase.from("custom_categories").select("*").order("nom", { ascending: true }),
        ]);
        if (e.data) setEntrees(e.data);
        if (s.data) setSorties(s.data);
        if (b.data) setBudgets(b.data);
        if (c.data) setCustomCategories(c.data);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const handleAddEntree = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEntree.montant || !newEntree.description) return;
        setSubmitting(true);
        try {
            const { data } = await supabase.from("entrees_comptables").insert({

                montant: Number(newEntree.montant),
                description: newEntree.description,

                type: newEntree.type,
                date: newEntree.date,
                created_by: user?.id,

            }).select();

            // Activity log.
            if (user && data && data[0]) {
                await logActivity(
                    user.id,
                    user.name,
                    user.role,
                    "accounting_entry",
                    "entrees_comptables",
                    data[0].id,
                    t("activity.entryCreated", { description: newEntree.description, amount: Number(newEntree.montant).toLocaleString(dateLocale) }),
                    { type: newEntree.type, montant: Number(newEntree.montant) }
                );
            }
            setNewEntree({
                montant: "",
                description: "",
                type: "revenus_divers",
                date: today.toISOString().slice(0, 10),
            });
            await load();
            showNotification(t("messages.entryAdded"), "success");
        } catch (err) {
            console.error("Accounting entry error:", err);
            showNotification(t("messages.entryAddError"), "error");
        }
        setSubmitting(false);
    };

    const handleAddSortie = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSortie.montant || !newSortie.description) return;
        setSubmitting(true);
        try {
            const { data } = await supabase.from("sorties_comptables").insert({

                montant: Number(newSortie.montant),
                description: newSortie.description,

                categorie: newSortie.categorie,
                date: newSortie.date,
                created_by: user?.id,

            }).select();

            // Activity log.
            if (user && data && data[0]) {
                await logActivity(
                    user.id,
                    user.name,
                    user.role,
                    "accounting_expense",
                    "sorties_comptables",
                    data[0].id,
                    t("activity.expenseCreated", { description: newSortie.description, amount: Number(newSortie.montant).toLocaleString(dateLocale) }),
                    { categorie: newSortie.categorie, montant: Number(newSortie.montant) }
                );
            }
            setNewSortie({
                montant: "",
                description: "",
                categorie: "divers",
                date: today.toISOString().slice(0, 10),
            });
            await load();
            showNotification(t("messages.expenseAdded"), "success");
        } catch (err) {
            console.error("Accounting expense error:", err);
            showNotification(t("messages.expenseAddError"), "error");
        }
        setSubmitting(false);
    };

    const handleValidateSortie = async (id: string) => {
        if (!user || (user.role !== "admin" && user.role !== "super_admin")) return;
        try {
            await supabase.from("sorties_comptables").update({
                validated_by: user.id,
                validated_at: new Date().toISOString(),
            }).eq("id", id);
            await load();
            showNotification(t("messages.expenseValidated"), "success");
        } catch (err) {
            console.error("Expense validation error:", err);
            showNotification(t("messages.validationError"), "error");
        }
    };

    const getPeriodDates = () => {
        const now = new Date();
        let start: Date, end: Date;

        switch (periodFilter) {
            case "jour":
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            case "semaine":
                const dayOfWeek = now.getDay();
                start = new Date(now);
                start.setDate(now.getDate() - dayOfWeek);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59);
                break;
            case "mois":
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case "annee":
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
            case "personnalise":
                start = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
                end = customEndDate ? new Date(customEndDate) : new Date();
                end.setHours(23, 59, 59);
                break;
            default:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        }
        return { start, end };
    };

    const { start: startOfPeriod, end: endOfPeriod } = getPeriodDates();

    const reportDay = new Date(reportDate);
    const startOfDay = new Date(reportDay.getFullYear(), reportDay.getMonth(), reportDay.getDate());
    const endOfDay = new Date(reportDay.getFullYear(), reportDay.getMonth(), reportDay.getDate(), 23, 59, 59);

    const entreesJour = entrees.filter((e) => {
        const d = toDate(e.date);
        return d >= startOfDay && d <= endOfDay;
    });
    const sortiesJour = sorties.filter((s) => {
        const d = toDate(s.date);
        return d >= startOfDay && d <= endOfDay;
    });

    const entreesPeriod = entrees.filter((e) => {
        const d = toDate(e.date);
        return d >= startOfPeriod && d <= endOfPeriod;
    });
    const sortiesPeriod = sorties.filter((s) => {
        const d = toDate(s.date);
        return d >= startOfPeriod && d <= endOfPeriod;
    });

    const totalEntrees = entrees.reduce((sum, e) => sum + e.montant, 0);
    const totalSorties = sorties.reduce((sum, e) => sum + e.montant, 0);
    const soldeGlobal = totalEntrees - totalSorties;

    const totalEntreesJour = entreesJour.reduce((sum, e) => sum + e.montant, 0);
    const totalSortiesJour = sortiesJour.reduce((sum, e) => sum + e.montant, 0);
    const soldeJour = totalEntreesJour - totalSortiesJour;

    const totalEntreesPeriod = entreesPeriod.reduce((sum, e) => sum + e.montant, 0);
    const totalSortiesPeriod = sortiesPeriod.reduce((sum, e) => sum + e.montant, 0);
    const soldePeriod = totalEntreesPeriod - totalSortiesPeriod;

    // Filtrage par recherche
    const filteredEntrees = entrees.filter(e => 
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getEntryTypeLabel(e.type).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredSorties = sorties.filter(s => 
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryLabel(s.categorie).toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Statistiques par catégorie pour le rapport
    const statsByCategorie = sortiesPeriod.reduce((acc, s) => {
        const cat = s.categorie;
        if (!acc[cat]) {
            acc[cat] = { montant: 0, count: 0 };
        }
        acc[cat].montant += s.montant;
        acc[cat].count++;
        return acc;
    }, {} as Record<string, { montant: number; count: number }>);

    const handleAddBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBudget.montant_prevu) return;
        setSubmitting(true);
        try {
            await supabase.from("budgets").insert({
                categorie: newBudget.categorie,
                montant_prevu: Number(newBudget.montant_prevu),
                periode: newBudget.periode,
            });
            setNewBudget({ categorie: "loyer", montant_prevu: "", periode: "mensuel" });
            await load();
            showNotification(t("messages.budgetAdded"), "success");
        } catch (err) {
            console.error("Budget add error:", err);
            showNotification(t("messages.budgetAddError"), "error");
        }
        setSubmitting(false);
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.nom) return;
        setSubmitting(true);
        try {
            await supabase.from("custom_categories").insert({
                nom: newCategory.nom,
                type: newCategory.type,
            });
            setNewCategory({ nom: "", type: "sortie" });
            await load();
            showNotification(t("messages.categoryAdded"), "success");
        } catch (err) {
            console.error("Category add error:", err);
            showNotification(t("messages.categoryAddError"), "error");
        }
        setSubmitting(false);
    };

    const handleDeleteCategory = (id: string) => {
        setConfirmDialog({
            open: true,
            title: t("confirm.deleteCategoryTitle"),
            description: t("confirm.deleteCategoryDescription"),
            onConfirm: async () => {
                closeConfirm();
                try {
                    await supabase.from("custom_categories").delete().eq("id", id);
                    await load();
                    showNotification(t("messages.categoryDeleted"), "success");
                } catch (err) {
                    console.error("Category delete error:", err);
                    showNotification(t("messages.deleteError"), "error");
                }
            },
        });
    };

    const handleDeleteBudget = (id: string) => {
        setConfirmDialog({
            open: true,
            title: t("confirm.deleteBudgetTitle"),
            description: t("confirm.deleteBudgetDescription"),
            onConfirm: async () => {
                closeConfirm();
                try {
                    await supabase.from("budgets").delete().eq("id", id);
                    await load();
                    showNotification(t("messages.budgetDeleted"), "success");
                } catch (err) {
                    console.error("Budget delete error:", err);
                    showNotification(t("messages.deleteError"), "error");
                }
            },
        });
    };

    const handleDeleteEntree = (id: string) => {
        setConfirmDialog({
            open: true,
            title: t("confirm.deleteEntryTitle"),
            description: t("confirm.deleteEntryDescription"),
            onConfirm: async () => {
                closeConfirm();
                try {
                    await supabase.from("entrees_comptables").delete().eq("id", id);
                    await load();
                    showNotification(t("messages.entryDeleted"), "success");
                } catch (err) {
                    console.error("Entry delete error:", err);
                    showNotification(t("messages.deleteError"), "error");
                }
            },
        });
    };

    const handleDeleteSortie = (id: string) => {
        setConfirmDialog({
            open: true,
            title: t("confirm.deleteExpenseTitle"),
            description: t("confirm.deleteExpenseDescription"),
            onConfirm: async () => {
                closeConfirm();
                try {
                    await supabase.from("sorties_comptables").delete().eq("id", id);
                    await load();
                    showNotification(t("messages.expenseDeleted"), "success");
                } catch (err) {
                    console.error("Expense delete error:", err);
                    showNotification(t("messages.deleteError"), "error");
                }
            },
        });
    };

    const openEditEntree = (e: EntreeComptable) => {
        setEditingEntree(e);
        setEditEntreeForm({ montant: e.montant.toString(), description: e.description, type: e.type, date: e.date?.slice(0, 10) || "" });
    };

    const openEditSortie = (s: SortieComptable) => {
        setEditingSortie(s);
        setEditSortieForm({ montant: s.montant.toString(), description: s.description, categorie: s.categorie, date: s.date?.slice(0, 10) || "" });
    };

    const handleSaveEntree = async () => {
        if (!editingEntree) return;
        setSavingEdit(true);
        try {
            await supabase.from("entrees_comptables").update({
                montant: Number(editEntreeForm.montant),
                description: editEntreeForm.description,
                type: editEntreeForm.type,
                date: editEntreeForm.date,
            }).eq("id", editingEntree.id);
            if (user) {
                await logActivity(user.id, user.name, user.role, "accounting_entry", "entrees_comptables", editingEntree.id,
                    t("activity.entryUpdated", { description: editEntreeForm.description }), { montant: Number(editEntreeForm.montant) });
            }
            showNotification(t("messages.entryUpdated"), "success");
            setEditingEntree(null);
            await load();
        } catch { showNotification(t("messages.error"), "error"); }
        setSavingEdit(false);
    };

    const handleSaveSortie = async () => {
        if (!editingSortie) return;
        setSavingEdit(true);
        try {
            await supabase.from("sorties_comptables").update({
                montant: Number(editSortieForm.montant),
                description: editSortieForm.description,
                categorie: editSortieForm.categorie,
                date: editSortieForm.date,
            }).eq("id", editingSortie.id);
            if (user) {
                await logActivity(user.id, user.name, user.role, "accounting_expense", "sorties_comptables", editingSortie.id,
                    t("activity.expenseUpdated", { description: editSortieForm.description }), { montant: Number(editSortieForm.montant) });
            }
            showNotification(t("messages.expenseUpdated"), "success");
            setEditingSortie(null);
            await load();
        } catch { showNotification(t("messages.error"), "error"); }
        setSavingEdit(false);
    };

    const handlePrintEntree = (e: EntreeComptable) => {
        printThermalReceipt({
            refId: e.id,
            date: e.date ? new Date(e.date).toLocaleDateString(dateLocale) : new Date().toLocaleDateString(dateLocale),
            service: getEntryTypeLabel(e.type),
            description: e.description,
            montant: e.montant,
        });
    };

    const exportToExcel = () => {
        setExporting(true);
        const data = [
            [t("export.type"), t("export.date"), t("export.description"), t("export.categoryType"), t("export.amount")],
            ...entreesPeriod.map(e => [t("labels.entry"), toDate(e.date).toLocaleDateString(dateLocale), e.description, getEntryTypeLabel(e.type), e.montant]),
            ...sortiesPeriod.map(s => [t("labels.expense"), toDate(s.date).toLocaleDateString(dateLocale), s.description, getCategoryLabel(s.categorie), -s.montant]),
        ];
        const csv = data.map(row => row.join(";")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `comptabilite_${periodFilter}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        showNotification(t("messages.excelGenerated"), "success");
        setExporting(false);
    };

    const exportToPDF = async () => {
        setExporting(true);
        try {
            const entries = [
                ...entreesPeriod.map(e => ({
                    date: e.date,
                    description: e.description,
                    category: getEntryTypeLabel(e.type),
                    amount: e.montant,
                    type: 'entree' as const,
                })),
                ...sortiesPeriod.map(s => ({
                    date: s.date,
                    description: s.description,
                    category: getCategoryLabel(s.categorie),
                    amount: s.montant,
                    type: 'sortie' as const,
                })),
            ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            await generateAccountingReport({
                title: t("export.pdfTitle", { period: getPeriodLabel(periodFilter) }),
                period: {
                    start: startOfPeriod.toISOString(),
                    end: endOfPeriod.toISOString(),
                },
                entries,
                summary: {
                    totalEntrees: totalEntreesPeriod,
                    totalSorties: totalSortiesPeriod,
                    balance: soldePeriod,
                },
            }, {
                includeEntrees: reportScope !== "sorties",
                includeSorties: reportScope !== "entrees",
            });
        } catch (err) {
            console.error("PDF export error:", err);
            showNotification(t("messages.pdfExportError"), "error");
        }
        setExporting(false);
    };

    const printReport = async () => {
        setExporting(true);
        try {
            const ops = [
                ...entreesPeriod.map(e => ({
                    date: e.date,
                    description: e.description,
                    category: getEntryTypeLabel(e.type),
                    amount: e.montant,
                    type: "entree" as const,
                })),
                ...sortiesPeriod.map(s => ({
                    date: s.date,
                    description: s.description,
                    category: getCategoryLabel(s.categorie),
                    amount: s.montant,
                    type: "sortie" as const,
                })),
            ];

            await printAccountingHtmlReport({
                title: t("export.pdfTitle", { period: getPeriodLabel(periodFilter) }),
                period: { start: startOfPeriod.toISOString(), end: endOfPeriod.toISOString() },
                entries: ops,
                summary: {
                    totalEntrees: totalEntreesPeriod,
                    totalSorties: totalSortiesPeriod,
                    balance: soldePeriod,
                },
                scope: reportScope,
                locale: dateLocale,
            });
        } catch (err) {
            console.error("Print report error:", err);
            showNotification(t("messages.printError"), "error");
        }
        setExporting(false);
    };

    const isAdmin = user?.role === "admin" || user?.role === "super_admin";

    const tabs: { key: Tab; label: string }[] = [
        { key: "rapport", label: t("tabs.report") },
        { key: "entrees", label: t("tabs.entries") },
        { key: "sorties", label: t("tabs.expenses") },
        { key: "budgets", label: t("tabs.budgets") },
        { key: "categories", label: t("tabs.categories") },
    ];

    return (
        <>
        <ProtectedRoute requiredRole="agent">
            <div className="space-y-6 p-4 sm:p-6">
                <div className="joda-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                            {t("header.eyebrow")}
                        </p>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
                            {t("header.title")}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {t("header.description")}
                        </p>
                    </div>
                    <div className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                        {t("header.access")}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <Card className="joda-surface border-0 shadow-none">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("summary.totalEntries")}</p>
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">{formatAmount(totalEntrees)}</p>
                            <p className="text-xs text-slate-400 mt-1">{t("summary.operations", { count: entrees.length })}</p>
                        </CardContent>
                    </Card>
                    <Card className="joda-surface border-0 shadow-none">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("summary.totalExpenses")}</p>
                                <TrendingDown className="h-4 w-4 text-rose-500" />
                            </div>
                            <p className="text-2xl font-bold text-rose-600">{formatAmount(totalSorties)}</p>
                            <p className="text-xs text-slate-400 mt-1">{t("summary.operations", { count: sorties.length })}</p>
                        </CardContent>
                    </Card>
                    <Card className="joda-surface border-0 shadow-none">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("summary.globalBalance")}</p>
                                <Calendar className="h-4 w-4 text-sky-500" />
                            </div>
                            <p className={`text-2xl font-bold ${soldeGlobal >= 0 ? "text-sky-700" : "text-orange-700"}`}>
                                {formatAmount(soldeGlobal)}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{t("summary.sinceBeginning")}</p>
                        </CardContent>
                    </Card>
                    <Card className="joda-surface border-0 shadow-none">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t("summary.currentPeriod")}</p>
                                <Badge variant="outline">{getPeriodLabel(periodFilter)}</Badge>
                            </div>
                            <p className={`text-2xl font-bold ${soldePeriod >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {formatAmount(soldePeriod)}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{t("summary.operations", { count: entreesPeriod.length + sortiesPeriod.length })}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="joda-surface border-0 shadow-none">
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-2">
                                {tabs.map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setTab(t.key)}
                                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                                            tab === t.key
                                                ? "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_12px_28px_rgba(239,68,68,0.28)]"
                                                : "bg-white/70 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            {tab === "rapport" && (
                                <div className="flex gap-2">
                                    <Select value={reportScope} onValueChange={(v) => setReportScope(v as ReportScope)}>
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t("reportScopes.all")}</SelectItem>
                                            <SelectItem value="entrees">{t("reportScopes.entriesOnly")}</SelectItem>
                                            <SelectItem value="sorties">{t("reportScopes.expensesOnly")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" onClick={printReport} disabled={exporting}>
                                        <Download className="h-4 w-4 mr-2" />
                                        {t("actions.printReport")}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={exportToExcel} disabled={exporting}>
                                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                                        Excel
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={exportToPDF} disabled={exporting}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        PDF
                                    </Button>
                                </div>
                            )}
                        </div>
                        {tab === "rapport" && (
                            <div className="flex flex-wrap gap-3 mt-4">
                                <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="jour">{t("periods.today")}</SelectItem>
                                        <SelectItem value="semaine">{t("periods.week")}</SelectItem>
                                        <SelectItem value="mois">{t("periods.month")}</SelectItem>
                                        <SelectItem value="annee">{t("periods.year")}</SelectItem>
                                        <SelectItem value="personnalise">{t("periods.custom")}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {periodFilter === "personnalise" && (
                                    <>
                                        <Input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            className="w-[160px]"
                                        />
                                        <Input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            className="w-[160px]"
                                        />
                                    </>
                                )}
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="py-10 text-center text-slate-400">{t("loading")}</div>
                        ) : (
                            <>
                                {tab === "rapport" && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                            <Card className="border-2 border-emerald-100 bg-emerald-50 dark:bg-emerald-900/20/50">
                                                <CardContent className="pt-4 text-center">
                                                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                                                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">{t("report.periodEntries")}</p>
                                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{formatAmount(totalEntreesPeriod)}</p>
                                                    <p className="text-xs text-emerald-600 mt-1">{t("summary.operations", { count: entreesPeriod.length })}</p>
                                                </CardContent>
                                            </Card>
                                            <Card className="border-2 border-rose-100 bg-rose-50/50">
                                                <CardContent className="pt-4 text-center">
                                                    <TrendingDown className="h-8 w-8 mx-auto mb-2 text-rose-600" />
                                                    <p className="text-xs text-rose-700 font-medium">{t("report.periodExpenses")}</p>
                                                    <p className="text-2xl font-bold text-rose-700 mt-1">{formatAmount(totalSortiesPeriod)}</p>
                                                    <p className="text-xs text-rose-600 mt-1">{t("summary.operations", { count: sortiesPeriod.length })}</p>
                                                </CardContent>
                                            </Card>
                                            <Card className={`border-2 ${soldePeriod >= 0 ? "border-sky-100 bg-sky-50/50" : "border-orange-100 bg-orange-50/50"}`}>
                                                <CardContent className="pt-4 text-center">
                                                    <Calendar className="h-8 w-8 mx-auto mb-2 text-sky-600" />
                                                    <p className="text-xs text-sky-700 font-medium">{t("report.periodBalance")}</p>
                                                    <p className={`text-2xl font-bold mt-1 ${soldePeriod >= 0 ? "text-sky-700" : "text-orange-700"}`}>
                                                        {formatAmount(soldePeriod)}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {entreesPeriod.length > 0 && (
                                            <div>
                                                <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                                    {t("labels.entries")}
                                                </h4>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                                                <TableHead>{t("table.date")}</TableHead>
                                                                <TableHead>{t("table.description")}</TableHead>
                                                                <TableHead>{t("table.type")}</TableHead>
                                                                <TableHead className="text-right">{t("table.amount")}</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {entreesPeriod.map((e) => (
                                                                <TableRow key={e.id}>
                                                                    <TableCell className="text-xs text-slate-500 dark:text-slate-400">{toDate(e.date).toLocaleDateString(dateLocale)}</TableCell>
                                                                    <TableCell>{e.description}</TableCell>
                                                                    <TableCell><Badge variant="secondary">{getEntryTypeLabel(e.type)}</Badge></TableCell>
                                                                    <TableCell className="text-right font-medium text-emerald-600">{formatAmount(e.montant)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}

                                        {sortiesPeriod.length > 0 && (
                                            <div>
                                                <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    <TrendingDown className="h-4 w-4 text-rose-600" />
                                                    {t("labels.expenses")}
                                                </h4>
                                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                                                <TableHead>{t("table.date")}</TableHead>
                                                                <TableHead>{t("table.description")}</TableHead>
                                                                <TableHead>{t("table.category")}</TableHead>
                                                                <TableHead>{t("table.status")}</TableHead>
                                                                <TableHead className="text-right">{t("table.amount")}</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {sortiesPeriod.map((s) => (
                                                                <TableRow key={s.id}>
                                                                    <TableCell className="text-xs text-slate-500 dark:text-slate-400">{toDate(s.date).toLocaleDateString(dateLocale)}</TableCell>
                                                                    <TableCell>{s.description}</TableCell>
                                                                    <TableCell><Badge variant="outline">{getCategoryLabel(s.categorie)}</Badge></TableCell>
                                                                    <TableCell>
                                                                        {s.validated_by ? (
                                                                            <Badge className="bg-emerald-100 text-emerald-700 dark:text-emerald-300">{t("status.validated")}</Badge>
                                                                        ) : (
                                                                            <Badge className="bg-amber-100 text-amber-700">{t("status.pending")}</Badge>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-medium text-rose-600">{formatAmount(s.montant)}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}

                                        {entreesPeriod.length === 0 && sortiesPeriod.length === 0 && (
                                            <div className="py-12 text-center">
                                                <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                                <p className="text-slate-400">{t("empty.noPeriodOperations")}</p>
                                            </div>
                                        )}

                                        {Object.keys(statsByCategorie).length > 0 && (
                                            <div>
                                                <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    <Settings className="h-4 w-4 text-sky-600" />
                                                    {t("report.categoryStats")}
                                                </h4>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                                    {Object.entries(statsByCategorie).map(([cat, stats]) => (
                                                        <Card key={cat} className="border border-slate-200 dark:border-slate-700">
                                                            <CardContent className="pt-4">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <Badge variant="outline">{getCategoryLabel(cat)}</Badge>
                                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{t("summary.shortOperations", { count: stats.count })}</span>
                                                                </div>
                                                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">{formatAmount(stats.montant)}</p>
                                                                <div className="mt-2 h-1 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-rose-500" 
                                                                        style={{ width: `${totalSortiesPeriod > 0 ? (stats.montant / totalSortiesPeriod) * 100 : 0}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-xs text-slate-400 mt-1">
                                                                    {t("report.percentOfTotal", { percent: totalSortiesPeriod > 0 ? ((stats.montant / totalSortiesPeriod) * 100).toFixed(1) : 0 })}
                                                                </p>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {tab === "entrees" && (
                                    <div className="space-y-5">
                                        {isAdmin && (
                                            <Card className="joda-surface-muted">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold">{t("forms.newEntry")}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <form onSubmit={handleAddEntree} className="space-y-3">
                                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.amount")}</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    required
                                                                    value={newEntree.montant}
                                                                    onChange={(e) => setNewEntree((p) => ({ ...p, montant: e.target.value }))}
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.type")}</Label>
                                                                <Select
                                                                    value={newEntree.type}
                                                                    onValueChange={(value) => setNewEntree((p) => ({ ...p, type: value as EntreeComptable["type"] }))}
                                                                >
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {TYPES_ENTREES.map((t) => (
                                                                            <SelectItem key={t} value={t}>{getEntryTypeLabel(t)}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.date")}</Label>
                                                                <Input
                                                                    type="date"
                                                                    required
                                                                    value={newEntree.date}
                                                                    onChange={(e) => setNewEntree((p) => ({ ...p, date: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.description")}</Label>
                                                                <Input
                                                                    type="text"
                                                                    required
                                                                    value={newEntree.description}
                                                                    onChange={(e) => setNewEntree((p) => ({ ...p, description: e.target.value }))}
                                                                    placeholder={t("forms.descriptionPlaceholder")}
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting} className="bg-emerald-600">
                                                            {submitting ? t("actions.adding") : t("actions.add")}
                                                        </Button>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        )}

                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    type="text"
                                                    placeholder={t("filters.search")}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t("table.date")}</TableHead>
                                                    <TableHead>{t("table.description")}</TableHead>
                                                    <TableHead>{t("table.type")}</TableHead>
                                                    <TableHead className="text-right">{t("table.amount")}</TableHead>
                                                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredEntrees.map((e) => (
                                                    <TableRow key={e.id}>
                                                        <TableCell className="text-xs text-slate-500 dark:text-slate-400">{toDate(e.date).toLocaleDateString(dateLocale)}</TableCell>
                                                        <TableCell>{e.description}</TableCell>
                                                        <TableCell><Badge variant="secondary">{getEntryTypeLabel(e.type)}</Badge></TableCell>
                                                        <TableCell className="text-right font-semibold text-emerald-600">{formatAmount(e.montant)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end">
                                                                <DropdownMenu
                                                                    actions={[
                                                                        {
                                                                            label: t("actions.details"),
                                                                            icon: <Eye className="h-4 w-4" />,
                                                                            onClick: () => setDetailEntree(e),
                                                                        },
                                                                        {
                                                                            label: t("actions.printReceipt"),
                                                                            icon: <FileText className="h-4 w-4" />,
                                                                            onClick: () => handlePrintEntree(e),
                                                                        },
                                                                        ...(isAdmin
                                                                            ? [
                                                                                  {
                                                                                      label: t("actions.delete"),
                                                                                      icon: <Trash2 className="h-4 w-4" />,
                                                                                      onClick: () => handleDeleteEntree(e.id),
                                                                                      variant: "danger" as const,
                                                                                  },
                                                                              ]
                                                                            : []),
                                                                    ]}
                                                                />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {filteredEntrees.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                                                            {searchTerm ? t("empty.noResults") : t("empty.noEntries")}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {tab === "sorties" && (
                                    <div className="space-y-5">
                                        {isAdmin && (
                                            <Card className="joda-surface-muted">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold">{t("forms.newExpense")}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <form onSubmit={handleAddSortie} className="space-y-3">
                                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.amount")}</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    required
                                                                    value={newSortie.montant}
                                                                    onChange={(e) => setNewSortie((p) => ({ ...p, montant: e.target.value }))}
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.category")}</Label>
                                                                <Select
                                                                    value={newSortie.categorie}
                                                                    onValueChange={(value) => setNewSortie((p) => ({ ...p, categorie: value as SortieComptable["categorie"] }))}
                                                                >
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {CATEGORIES_SORTIES.map((c) => (
                                                                            <SelectItem key={c} value={c}>{getCategoryLabel(c)}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.date")}</Label>
                                                                <Input
                                                                    type="date"
                                                                    required
                                                                    value={newSortie.date}
                                                                    onChange={(e) => setNewSortie((p) => ({ ...p, date: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.description")}</Label>
                                                                <Input
                                                                    type="text"
                                                                    required
                                                                    value={newSortie.description}
                                                                    onChange={(e) => setNewSortie((p) => ({ ...p, description: e.target.value }))}
                                                                    placeholder={t("forms.descriptionPlaceholder")}
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting} className="bg-rose-600">
                                                            {submitting ? t("actions.adding") : t("actions.add")}
                                                        </Button>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        )}

                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    type="text"
                                                    placeholder={t("filters.search")}
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t("table.date")}</TableHead>
                                                    <TableHead>{t("table.description")}</TableHead>
                                                    <TableHead>{t("table.category")}</TableHead>
                                                    <TableHead>{t("table.status")}</TableHead>
                                                    <TableHead className="text-right">{t("table.amount")}</TableHead>
                                                    {isAdmin && <TableHead className="text-right">{t("table.actions")}</TableHead>}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredSorties.map((s) => (
                                                    <TableRow key={s.id}>
                                                        <TableCell className="text-xs text-slate-500 dark:text-slate-400">{toDate(s.date).toLocaleDateString(dateLocale)}</TableCell>
                                                        <TableCell>{s.description}</TableCell>
                                                        <TableCell><Badge variant="outline">{getCategoryLabel(s.categorie)}</Badge></TableCell>
                                                        <TableCell>
                                                            {s.validated_by ? (
                                                                <Badge className="bg-emerald-100 text-emerald-700 dark:text-emerald-300">{t("status.validated")}</Badge>
                                                            ) : isAdmin ? (
                                                                <Button variant="outline" size="sm" onClick={() => handleValidateSortie(s.id)}>
                                                                    {t("actions.validate")}
                                                                </Button>
                                                            ) : (
                                                                <Badge className="bg-amber-100 text-amber-700">{t("status.pending")}</Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-rose-600">{formatAmount(s.montant)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end">
                                                                <DropdownMenu
                                                                    actions={[
                                                                        {
                                                                            label: t("actions.details"),
                                                                            icon: <Eye className="h-4 w-4" />,
                                                                            onClick: () => setDetailSortie(s),
                                                                        },
                                                                        ...(isAdmin
                                                                            ? [
                                                                                  {
                                                                                      label: t("actions.delete"),
                                                                                      icon: <Trash2 className="h-4 w-4" />,
                                                                                      onClick: () => handleDeleteSortie(s.id),
                                                                                      variant: "danger" as const,
                                                                                  },
                                                                              ]
                                                                            : []),
                                                                    ]}
                                                                />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {filteredSorties.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                                                            {searchTerm ? t("empty.noResults") : t("empty.noExpenses")}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {tab === "budgets" && (
                                    <div className="space-y-5">
                                        {isAdmin && (
                                            <Card className="joda-surface-muted">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold">{t("forms.newBudget")}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <form onSubmit={handleAddBudget} className="space-y-3">
                                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.category")}</Label>
                                                                <Select
                                                                    value={newBudget.categorie}
                                                                    onValueChange={(value) => value && setNewBudget((p) => ({ ...p, categorie: value }))}
                                                                >
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {CATEGORIES_SORTIES.map((c) => (
                                                                            <SelectItem key={c} value={c}>{getCategoryLabel(c)}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.plannedAmount")}</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    required
                                                                    value={newBudget.montant_prevu}
                                                                    onChange={(e) => setNewBudget((p) => ({ ...p, montant_prevu: e.target.value }))}
                                                                    placeholder="0"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.period")}</Label>
                                                                <Select
                                                                    value={newBudget.periode}
                                                                    onValueChange={(value) => value && setNewBudget((p) => ({ ...p, periode: value }))}
                                                                >
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="mensuel">{t("budgetPeriods.monthly")}</SelectItem>
                                                                        <SelectItem value="trimestriel">{t("budgetPeriods.quarterly")}</SelectItem>
                                                                        <SelectItem value="annuel">{t("budgetPeriods.yearly")}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting} className="bg-sky-600">
                                                            {submitting ? t("actions.adding") : t("actions.add")}
                                                        </Button>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        )}

                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t("table.category")}</TableHead>
                                                    <TableHead>{t("table.plannedAmount")}</TableHead>
                                                    <TableHead>{t("table.period")}</TableHead>
                                                    <TableHead>{t("table.createdAt")}</TableHead>
                                                    {isAdmin && <TableHead className="text-right">{t("table.actions")}</TableHead>}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {budgets.map((b) => (
                                                    <TableRow key={b.id}>
                                                        <TableCell><Badge variant="outline">{getCategoryLabel(b.categorie)}</Badge></TableCell>
                                                        <TableCell className="font-semibold text-sky-600">{formatAmount(b.montant_prevu)}</TableCell>
                                                        <TableCell><Badge>{getPeriodLabel(b.periode)}</Badge></TableCell>
                                                        <TableCell className="text-xs text-slate-500 dark:text-slate-400">{toDate(b.created_at).toLocaleDateString(dateLocale)}</TableCell>
                                                        {isAdmin && (
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteBudget(b.id)}>
                                                                    <X className="h-4 w-4 text-rose-500" />
                                                                </Button>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                                {budgets.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={isAdmin ? 5 : 4} className="py-8 text-center text-slate-400">{t("empty.noBudgets")}</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}

                                {tab === "categories" && (
                                    <div className="space-y-5">
                                        {isAdmin && (
                                            <Card className="joda-surface-muted">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold">{t("forms.newCustomCategory")}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <form onSubmit={handleAddCategory} className="space-y-3">
                                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.categoryName")}</Label>
                                                                <Input
                                                                    type="text"
                                                                    required
                                                                    value={newCategory.nom}
                                                                    onChange={(e) => setNewCategory((p) => ({ ...p, nom: e.target.value }))}
                                                                    placeholder={t("forms.categoryNamePlaceholder")}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">{t("forms.type")}</Label>
                                                                <Select
                                                                    value={newCategory.type}
                                                                    onValueChange={(value) => setNewCategory((p) => ({ ...p, type: value as "entree" | "sortie" }))}
                                                                >
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="entree">{t("labels.entry")}</SelectItem>
                                                                        <SelectItem value="sortie">{t("labels.expense")}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <Button type="submit" disabled={submitting} className="bg-violet-600">
                                                            {submitting ? t("actions.adding") : t("actions.add")}
                                                        </Button>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        )}

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <Card className="border-2 border-emerald-100">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t("categories.entryCategories")}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        {customCategories.filter(c => c.type === "entree").map((c) => (
                                                            <div key={c.id} className="flex items-center justify-between p-2 rounded bg-emerald-50 dark:bg-emerald-900/20">
                                                                <span className="text-sm font-medium">{c.nom}</span>
                                                                {isAdmin && (
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(c.id)}>
                                                                        <X className="h-4 w-4 text-rose-500" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {customCategories.filter(c => c.type === "entree").length === 0 && (
                                                            <p className="text-sm text-slate-400 text-center py-4">{t("empty.noCustomCategories")}</p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="border-2 border-rose-100">
                                                <CardHeader>
                                                    <CardTitle className="text-sm font-semibold text-rose-700">{t("categories.expenseCategories")}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        {customCategories.filter(c => c.type === "sortie").map((c) => (
                                                            <div key={c.id} className="flex items-center justify-between p-2 rounded bg-rose-50">
                                                                <span className="text-sm font-medium">{c.nom}</span>
                                                                {isAdmin && (
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(c.id)}>
                                                                        <X className="h-4 w-4 text-rose-500" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {customCategories.filter(c => c.type === "sortie").length === 0 && (
                                                            <p className="text-sm text-slate-400 text-center py-4">{t("empty.noCustomCategories")}</p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </ProtectedRoute>
        <ConfirmDialog
            isOpen={confirmDialog.open}
            onClose={closeConfirm}
            onConfirm={confirmDialog.onConfirm}
            title={confirmDialog.title}
            description={confirmDialog.description}
            confirmLabel={t("actions.delete")}
        />

        {/* Entry details modal. */}
        {detailEntree && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{t("details.entryTitle")}</h3>
                        <button onClick={() => setDetailEntree(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 text-xl">&times;</button>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("table.date")}</span><span className="font-medium">{toDate(detailEntree.date).toLocaleDateString(dateLocale)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("table.description")}</span><span className="font-medium text-right max-w-[60%]">{detailEntree.description}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("table.type")}</span><span className="font-medium">{getEntryTypeLabel(detailEntree.type)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("table.amount")}</span><span className="font-bold text-emerald-600">{formatAmount(detailEntree.montant)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t("table.createdAt")}</span><span className="font-medium">{toDate(detailEntree.created_at).toLocaleDateString(dateLocale)}</span></div>
                    </div>
                    <div className="mt-5 flex gap-2">
                        <Button size="sm" onClick={() => handlePrintEntree(detailEntree)} className="bg-emerald-600 hover:bg-emerald-700">{t("actions.printReceipt")}</Button>
                        <Button variant="outline" size="sm" onClick={() => setDetailEntree(null)}>{t("actions.close")}</Button>
                    </div>
                </div>
            </div>
        )}

        {/* Expense details modal. */}
        {detailSortie && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-rose-700">{t("details.expenseTitle")}</h3>
                        <button onClick={() => setDetailSortie(null)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 text-xl">&times;</button>
                    </div>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("table.date")}</span><span className="font-medium">{toDate(detailSortie.date).toLocaleDateString(dateLocale)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("table.description")}</span><span className="font-medium text-right max-w-[60%]">{detailSortie.description}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("table.category")}</span><span className="font-medium">{getCategoryLabel(detailSortie.categorie)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("table.amount")}</span><span className="font-bold text-rose-600">{formatAmount(detailSortie.montant)}</span></div>
                        <div className="flex justify-between border-b pb-2"><span className="text-slate-500 dark:text-slate-400">{t("table.status")}</span><span className="font-medium">{detailSortie.validated_by ? t("status.validated") : t("status.pending")}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">{t("table.createdAt")}</span><span className="font-medium">{toDate(detailSortie.created_at).toLocaleDateString(dateLocale)}</span></div>
                    </div>
                    <div className="mt-5">
                        <Button variant="outline" size="sm" onClick={() => setDetailSortie(null)}>{t("actions.close")}</Button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
