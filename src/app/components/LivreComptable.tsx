"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Ban,
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    Paperclip,
    Plus,
    Printer,
    X,
    CheckCircle2,
    AlertTriangle,
    Pencil,
    Trash2,
    Lock,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useEntreesComptables, useSortiesComptables, useSoldeCourant, useSoldeCourantFallback, ENTREES_KEY, SORTIES_KEY, SOLDE_KEY, COMPTA_AUDIT_KEY } from "../lib/hooks/use-accounting";
import { checkJustificatif, JUSTIFICATIF_ACCEPT, uploadJustificatif } from "../lib/justificatifs";
import EcritureDetailModal, { type EcritureDetail } from "./EcritureDetailModal";
import { isEnCours, useBonsCaisse } from "../lib/hooks/use-bons-caisse";
import type { Devise } from "../lib/schemas/accounting.schema";
import { useUsers } from "../lib/hooks/use-users";
import { useStudents } from "../lib/hooks/use-students";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useNotificationContext } from "../context/NotificationContext";
import { logActivity } from "../utils/activityLogger";
import { printAccountingHtmlReport } from "../utils/accountingReportPrinter";
import { parseDbDate } from "../lib/dates";
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
    payslip_id: string | null;
    bon_caisse_id?: string | null;
    status?: string | null;
    rejected_by?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
    cancelled_by?: string | null;
    cancelled_at?: string | null;
    cancellation_reason?: string | null;
    beneficiaire_id?: string | null;
    beneficiaire_nom?: string | null;
    justificatif_path?: string | null;
}

/**
 * Statut effectif d'une sortie : la colonne `status` fait foi ; repli sur
 * validated_by pour d'éventuelles lignes antérieures à la migration du statut.
 */
function sortieStatus(s: SortieComptable): string {
    return s.status ?? (s.validated_by ? "validated" : "pending");
}

interface LedgerRow {
    id: string;
    kind: "entree" | "sortie";
    /** Instant d'enregistrement (created_at) : sert UNIQUEMENT à afficher l'heure. */
    time: string;
    /**
     * Date d'opération (colonne `date`, type DATE) : la seule que l'utilisateur
     * modifie et la seule qui fasse foi en comptabilité. C'est elle qu'il faut
     * imprimer — `time` reste figé à la saisie et ne suit pas les corrections.
     */
    date: string;
    description: string;
    student_id: string | null;
    categorie: string;
    montant: number;
    validatedBy: string | null;
    validatedAt: string | null;
    needsValidation: boolean;
    rejected: boolean;
    cancelled: boolean;
    /** Sortie générée ailleurs (bulletin de paie, bon de caisse) : verrouillée ici. */
    linkedTo: "bulletin" | "bon" | null;
    /** Sortie : pièce justificative déposée. Toujours faux pour une entrée. */
    hasJustificatif: boolean;
    raw: EntreeComptable | SortieComptable;
}

interface AppUser {
    id: string;
    name: string;
    role?: string;
    is_active?: boolean | null;
}

// Valeur du sélecteur de bénéficiaire quand l'argent va à une personne sans
// compte (fournisseur, bailleur, chauffeur…) : on saisit alors son nom.
const BENEFICIAIRE_EXTERNE = "__externe";
// Longueur minimale du motif d'une sortie : « Transport » seul ne dit rien de
// la course ; on attend le trajet et l'objet, ou l'article et le fournisseur.
const MOTIF_MIN = 10;

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

/** Date d'opération, au même format que celle imprimée sur le rapport. */
function fmtDay(dateStr: string): string {
    return parseDbDate(dateStr).toLocaleDateString("fr-FR");
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

// Bornes [start, end) de la période affichée. Pure (dépend uniquement de ses
// arguments) pour pouvoir être calculée avant l'appel des hooks de données.
function getPeriodBounds(viewDate: Date, viewMode: ViewMode): { start: Date; end: Date } {
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
}

export default function LivreComptable({ viewSwitcher }: { viewSwitcher?: ReactNode }) {
    const supabase = createClient();
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const { showNotification } = useNotificationContext();
    const queryClient = useQueryClient();

    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("jour");
    // Devise active : deux livres indépendants (aucune conversion FCFA↔USD).
    const [devise, setDevise] = useState<Devise>("FCFA");
    const isUsd = devise === "USD";
    // Formate un montant avec le symbole de la devise active (± optionnel).
    const money = useCallback(
        (n: number, signed = false): string => {
            const abs = new Intl.NumberFormat(isUsd ? "en-US" : "fr-FR").format(Math.abs(n));
            const body = isUsd ? `$${abs}` : `${abs} F`;
            if (!signed) return body;
            return n >= 0 ? `+${body}` : `−${body}`;
        },
        [isUsd]
    );
    // Bornes de la période : le chargement des opérations est borné côté serveur.
    const { start: dayStart, end: dayEnd } = getPeriodBounds(viewDate, viewMode);
    const bounds = { start: dayStart.toISOString(), end: dayEnd.toISOString() };

    const { data: _entreesData = [], isLoading: loading } = useEntreesComptables(bounds, devise);
    const entrees = _entreesData as unknown as EntreeComptable[];
    const { data: _sortiesData = [] } = useSortiesComptables(bounds, devise);
    const sorties = _sortiesData as unknown as SortieComptable[];
    const { data: _usersData = [] } = useUsers();
    const users = _usersData as unknown as AppUser[];
    const { data: _studentsData = [] } = useStudents();
    const students = _studentsData as unknown as Student[];
    // Solde global de la devise active : cache O(1) en priorité ; repli léger tant
    // que la migration du cache n'est pas appliquée (soldeCache === null après chargement).
    const { data: soldeCache, isFetched: soldeFetched } = useSoldeCourant(devise);
    const { data: soldeFallback } = useSoldeCourantFallback(soldeFetched && soldeCache === null, devise);

    const [catFilter, setCatFilter] = useState<string>("tout");
    const [page, setPage] = useState(1);
    const [showNewModal, setShowNewModal] = useState(false);
    const [newKind, setNewKind] = useState<"entree" | "sortie">("entree");
    const emptyNewForm = {
        montant: "",
        description: "",
        type: "revenus_divers",
        categorie: "divers",
        beneficiaireId: "",
        beneficiaireNom: "",
    };
    const [newForm, setNewForm] = useState(emptyNewForm);
    const [newJustificatif, setNewJustificatif] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; description: string; onConfirm: () => void;
    }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });
    const closeConfirm = () => setConfirmDialog((s) => ({ ...s, isOpen: false }));

    const canCreateEntry = hasPermission("accounting.create");
    const canValidateEntry = hasPermission("accounting.validate");
    const canEditEntry = hasPermission("accounting.edit");
    const canDeleteEntry = hasPermission("accounting.delete");

    const [editingRow, setEditingRow] = useState<LedgerRow | null>(null);
    const [editForm, setEditForm] = useState({
        montant: "",
        description: "",
        type: "revenus_divers",
        categorie: "divers",
        date: "",
        beneficiaireId: "",
        beneficiaireNom: "",
    });
    const [savingEdit, setSavingEdit] = useState(false);

    const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; reason: string }>({ open: false, id: "", reason: "" });
    const [rejecting, setRejecting] = useState(false);
    const [cancelModal, setCancelModal] = useState<{ row: LedgerRow | null; reason: string }>({ row: null, reason: "" });
    const [cancelling, setCancelling] = useState(false);
    const [detailId, setDetailId] = useState<string | null>(null);

    const getUserName = useCallback(
        (id: string | null): string => {
            if (!id) return "Auto";
            const u = users.find((u) => u.id === id);
            return u ? u.name.split(" ")[0] : "Auto";
        },
        [users]
    );

    const getUserFullName = useCallback(
        (id: string | null | undefined): string => {
            if (!id) return "—";
            return users.find((u) => u.id === id)?.name ?? "Compte supprimé";
        },
        [users]
    );

    // Bénéficiaires possibles : comptes du personnel actifs (pas les étudiants).
    const staffUsers = users
        .filter((u) => u.role !== "student" && u.is_active !== false)
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    const getStudentName = useCallback(
        (id: string | null): string | null => {
            if (!id) return null;
            const s = students.find((s) => s.id === id);
            return s ? `${s.nom.charAt(0)}. ${s.prenom}` : null;
        },
        [students]
    );

    // Les opérations sont déjà bornées à la période côté serveur (cf. bounds).
    const dayEntrees = entrees;
    const daySorties = sorties;

    const rows: LedgerRow[] = [
        ...dayEntrees.map((e): LedgerRow => ({
            id: e.id,
            // `date` est de type DATE (jour seul → l'heure est perdue) : on prend
            // `created_at` (timestamptz réel) pour afficher l'heure exacte.
            kind: "entree",
            time: e.created_at ?? e.date,
            date: e.date ?? e.created_at,
            description: e.description,
            student_id: e.student_id,
            categorie: e.type,
            montant: e.montant,
            validatedBy: e.created_by,
            validatedAt: null,
            needsValidation: false,
            rejected: false,
            cancelled: false,
            linkedTo: null,
            hasJustificatif: false,
            raw: e,
        })),
        ...daySorties.map((s): LedgerRow => {
            const status = sortieStatus(s);
            return {
                id: s.id,
                kind: "sortie",
                time: s.created_at ?? s.date,
                date: s.date ?? s.created_at,
                description: s.description,
                student_id: null,
                categorie: s.categorie,
                montant: s.montant,
                validatedBy: s.validated_by,
                validatedAt: s.validated_at,
                needsValidation: status === "pending",
                rejected: status === "rejected",
                cancelled: status === "cancelled",
                linkedTo: s.payslip_id ? "bulletin" : s.bon_caisse_id ? "bon" : null,
                hasJustificatif: !!s.justificatif_path,
                raw: s,
            };
        }),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Règles d'action par ligne. Elles reflètent le trigger
    // trg_sorties_comptables_controle, qui reste l'arbitre final.
    const isOwnSortie = (row: LedgerRow) =>
        row.kind === "sortie" && !!user && (row.raw as SortieComptable).created_by === user.id;

    // Contrôle par un tiers : ni l'auteur de la sortie ni celui qui a reçu
    // l'argent ne peuvent la valider.
    const isSelfValidation = (row: LedgerRow) => {
        const s = row.raw as SortieComptable;
        return !!user && (s.created_by === user.id || s.beneficiaire_id === user.id);
    };

    const canEditRow = (row: LedgerRow) => {
        if (row.kind === "entree") return canEditEntry;
        // Sortie : modifiable seulement en attente ; validée = verrouillée.
        return row.needsValidation && !row.linkedTo && (canEditEntry || isOwnSortie(row));
    };

    const canCancelRow = (row: LedgerRow) => {
        if (row.kind !== "sortie" || row.linkedTo) return false;
        // L'auteur peut retirer sa demande tant qu'elle n'est pas traitée.
        if (row.needsValidation) return canDeleteEntry || isOwnSortie(row);
        return sortieStatus(row.raw as SortieComptable) === "validated" && canDeleteEntry;
    };

    const canAttachJustificatif = (row: LedgerRow) =>
        row.kind === "sortie" && row.needsValidation && !row.linkedTo && !row.hasJustificatif
        && (canEditEntry || isOwnSortie(row));

    const filtered =
        catFilter === "tout"
            ? rows
            : rows.filter((r) => r.categorie === catFilter || r.kind === catFilter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalEntrees = dayEntrees.reduce((s, e) => s + e.montant, 0);
    // Cohérence avec la trésorerie : seules les sorties VALIDÉES impactent le
    // solde (cf. add_sortie_validation_status.sql + cache trigger). Les sorties
    // 'pending'/'rejected' ne sont pas comptées dans le total « sorties ».
    const validatedSorties = daySorties.filter((s) => s.status === "validated");
    const totalSorties = validatedSorties.reduce((s, e) => s + e.montant, 0);
    // Sorties en attente de validation (affichées à part, non déduites du solde).
    // Les rejetées et annulées ne sont ni dépensées ni en attente.
    const totalSortiesPending = daySorties
        .filter((s) => sortieStatus(s) === "pending")
        .reduce((s, e) => s + e.montant, 0);
    // Net de la période affichée (mouvements validés de la période uniquement)
    const solde = totalEntrees - totalSorties;

    // Solde courant = trésorerie réelle, indépendant de la période affichée.
    // Source de vérité : le cache maintenu par triggers (lecture O(1)). Tant que
    // la migration n'est pas appliquée, on retombe sur le repli global léger.
    const soldeCourant = soldeCache ?? soldeFallback ?? 0;

    // Argent remis sur bons de caisse et pas encore clôturé : déjà déduit du
    // solde (il a quitté la caisse), mais pas encore une dépense du livre.
    const { data: bons = [] } = useBonsCaisse();
    const avancesEnCours = isUsd ? 0 : bons.filter(isEnCours).reduce((s, b) => s + b.montant, 0);

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
            const { start, end } = getPeriodBounds(viewDate, viewMode);
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
        const { start, end } = getPeriodBounds(viewDate, viewMode);
        return now >= start && now < end;
    };

    // Invalide tout ce qu'une action sur une sortie peut changer (liste, solde,
    // historique d'audit affiché dans la fiche détail).
    const refreshSorties = () => {
        queryClient.invalidateQueries({ queryKey: SORTIES_KEY });
        queryClient.invalidateQueries({ queryKey: SOLDE_KEY });
        queryClient.invalidateQueries({ queryKey: COMPTA_AUDIT_KEY });
    };

    const handleValidateSortie = async (id: string) => {
        if (!user || !canValidateEntry) return;
        // status='validated' est indispensable : le trigger de trésorerie ne
        // déduit une sortie que si son status vaut 'validated'. Le trigger de
        // contrôle pose lui-même validated_by/validated_at (compte connecté) et
        // refuse la validation par l'auteur, par le bénéficiaire, ou sans pièce.
        const { error } = await supabase
            .from("sorties_comptables")
            .update({
                status: "validated",
                validated_by: user.id,
                validated_at: new Date().toISOString(),
            })
            .eq("id", id);
        if (error) {
            showNotification(error.message || "Validation impossible", "error");
            return;
        }
        await logActivity(
            user.id, user.name, user.role,
            "accounting_expense", "sorties_comptables", id,
            "Sortie comptable validée",
            {}
        );
        showNotification("Sortie validée", "success");
        refreshSorties();
    };

    const handleRejectSortie = async (id: string, reason: string) => {
        if (!user || !canValidateEntry || !reason) return;
        const { error } = await supabase
            .from("sorties_comptables")
            .update({
                status: "rejected",
                rejected_by: user.id,
                rejected_at: new Date().toISOString(),
                rejection_reason: reason,
            })
            .eq("id", id);
        if (error) {
            showNotification(error.message || "Rejet impossible", "error");
            return;
        }
        await logActivity(
            user.id, user.name, user.role,
            "accounting_expense", "sorties_comptables", id,
            `Sortie comptable rejetée — ${reason}`,
            {}
        );
        showNotification("Sortie rejetée", "success");
        refreshSorties();
    };

    // Annulation (remplace la suppression) : la sortie reste dans le livre, barrée,
    // avec son motif ; si elle était validée, son montant revient à la trésorerie.
    const handleCancelSortie = async (row: LedgerRow, reason: string) => {
        if (!user || !reason) return;
        const { error } = await supabase
            .from("sorties_comptables")
            .update({ status: "cancelled", cancellation_reason: reason })
            .eq("id", row.id);
        if (error) {
            showNotification(error.message || "Annulation impossible", "error");
            return;
        }
        await logActivity(
            user.id, user.name, user.role,
            "accounting_expense", "sorties_comptables", row.id,
            `Sortie comptable annulée — ${row.description} — motif : ${reason}`,
            { montant: row.montant, etait_validee: !row.needsValidation }
        );
        showNotification("Sortie annulée", "success");
        refreshSorties();
    };

    const handleAttachJustificatif = async (row: LedgerRow, file: File) => {
        if (!user) return;
        try {
            const path = await uploadJustificatif(supabase, file);
            const { error } = await supabase
                .from("sorties_comptables")
                .update({ justificatif_path: path })
                .eq("id", row.id);
            if (error) throw new Error(error.message);
            await logActivity(
                user.id, user.name, user.role,
                "accounting_expense", "sorties_comptables", row.id,
                `Justificatif joint — ${row.description}`,
                {}
            );
            showNotification("Justificatif joint", "success");
            refreshSorties();
        } catch (err) {
            showNotification(err instanceof Error ? err.message : "Dépôt du justificatif impossible", "error");
        }
    };

    // Bénéficiaire saisi dans un formulaire → colonnes de la sortie.
    const beneficiairePayload = (form: { beneficiaireId: string; beneficiaireNom: string }) =>
        form.beneficiaireId === BENEFICIAIRE_EXTERNE
            ? { beneficiaire_id: null, beneficiaire_nom: form.beneficiaireNom.trim() }
            : {
                beneficiaire_id: form.beneficiaireId,
                beneficiaire_nom: users.find((u) => u.id === form.beneficiaireId)?.name ?? null,
            };

    const hasBeneficiaire = (form: { beneficiaireId: string; beneficiaireNom: string }) =>
        form.beneficiaireId === BENEFICIAIRE_EXTERNE ? form.beneficiaireNom.trim().length > 1 : !!form.beneficiaireId;

    // Une sortie n'est enregistrable qu'avec un motif précis, un bénéficiaire et
    // une pièce : c'est ce qui la rend traçable a posteriori.
    const newSortieIncomplete =
        newKind === "sortie"
        && (newForm.description.trim().length < MOTIF_MIN || !hasBeneficiaire(newForm) || !newJustificatif);

    const closeNewModal = () => {
        setShowNewModal(false);
        setNewForm(emptyNewForm);
        setNewJustificatif(null);
    };

    const handleAdd = async () => {
        if (!user || !newForm.montant || !newForm.description) return;
        // Création d'écritures comptables manuelles soumise à la permission dédiée
        if (!canCreateEntry) {
            showNotification("Action réservée aux administrateurs", "error");
            return;
        }
        if (Number(newForm.montant) <= 0) {
            showNotification("Le montant doit être supérieur à zéro", "error");
            return;
        }
        if (newSortieIncomplete) return;
        setSaving(true);
        try {
            if (newKind === "entree") {
                const { data, error } = await supabase.from("entrees_comptables").insert({
                    montant: Number(newForm.montant),
                    description: newForm.description,
                    type: newForm.type,
                    devise,
                    date: new Date().toISOString(),
                    created_by: user.id,
                }).select();
                if (error) throw new Error(error.message);
                if (data?.[0]) {
                    await logActivity(user.id, user.name, user.role,
                        "accounting_entry", "entrees_comptables", data[0].id,
                        `Entrée comptable — ${newForm.description}`,
                        { montant: Number(newForm.montant) }
                    );
                }
            } else {
                // La pièce part d'abord : une sortie n'existe jamais sans elle.
                const justificatifPath = await uploadJustificatif(supabase, newJustificatif!);
                const { data, error } = await supabase.from("sorties_comptables").insert({
                    montant: Number(newForm.montant),
                    description: newForm.description.trim(),
                    categorie: newForm.categorie,
                    devise,
                    date: new Date().toISOString(),
                    created_by: user.id,
                    justificatif_path: justificatifPath,
                    ...beneficiairePayload(newForm),
                }).select();
                if (error) throw new Error(error.message);
                if (data?.[0]) {
                    await logActivity(user.id, user.name, user.role,
                        "accounting_expense", "sorties_comptables", data[0].id,
                        `Sortie comptable — ${newForm.description}`,
                        { montant: Number(newForm.montant) }
                    );
                }
            }
            showNotification(
                newKind === "sortie"
                    ? "Sortie enregistrée — en attente de validation par un autre compte"
                    : "Opération enregistrée",
                "success"
            );
            closeNewModal();
            queryClient.invalidateQueries({ queryKey: newKind === "entree" ? ENTREES_KEY : SORTIES_KEY });
            queryClient.invalidateQueries({ queryKey: SOLDE_KEY });
        } catch (err) {
            showNotification(err instanceof Error ? err.message : "Erreur lors de l'enregistrement", "error");
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (row: LedgerRow) => {
        if (row.linkedTo) {
            showNotification(
                row.linkedTo === "bon"
                    ? "Sortie issue d'un bon de caisse : elle se gère depuis le bon"
                    : "Sortie liée à un bulletin de paie : modifiez le bulletin",
                "error"
            );
            return;
        }
        const raw = row.raw;
        const sortie = row.kind === "sortie" ? (raw as SortieComptable) : null;
        setEditingRow(row);
        setEditForm({
            montant: String(raw.montant),
            description: raw.description,
            type: row.kind === "entree" ? (raw as EntreeComptable).type : "revenus_divers",
            categorie: sortie ? sortie.categorie : "divers",
            date: raw.date ? raw.date.slice(0, 10) : "",
            beneficiaireId: sortie?.beneficiaire_id ?? (sortie?.beneficiaire_nom ? BENEFICIAIRE_EXTERNE : ""),
            beneficiaireNom: sortie?.beneficiaire_id ? "" : sortie?.beneficiaire_nom ?? "",
        });
    };

    const handleSaveEdit = async () => {
        if (!user || !editingRow || !canEditRow(editingRow)) return;
        if (!editForm.montant || !editForm.description) return;
        setSavingEdit(true);
        try {
            const table = editingRow.kind === "entree" ? "entrees_comptables" : "sorties_comptables";
            const payload: Record<string, unknown> = {
                montant: Number(editForm.montant),
                description: editForm.description,
                date: editForm.date || editingRow.raw.date,
            };
            if (editingRow.kind === "entree") payload.type = editForm.type;
            else {
                payload.categorie = editForm.categorie;
                // Permet de compléter une ancienne sortie saisie sans bénéficiaire.
                if (hasBeneficiaire(editForm)) Object.assign(payload, beneficiairePayload(editForm));
            }

            const { error } = await supabase.from(table).update(payload).eq("id", editingRow.id);
            if (error) throw new Error(error.message);
            await logActivity(
                user.id, user.name, user.role,
                editingRow.kind === "entree" ? "accounting_entry" : "accounting_expense",
                table, editingRow.id,
                `${editingRow.kind === "entree" ? "Entrée" : "Sortie"} comptable modifiée — ${editForm.description}`,
                { montant: Number(editForm.montant) }
            );
            showNotification("Opération modifiée", "success");
            setEditingRow(null);
            queryClient.invalidateQueries({ queryKey: editingRow.kind === "entree" ? ENTREES_KEY : SORTIES_KEY });
            queryClient.invalidateQueries({ queryKey: SOLDE_KEY });
            queryClient.invalidateQueries({ queryKey: COMPTA_AUDIT_KEY });
        } catch (err) {
            showNotification(err instanceof Error ? err.message : "Erreur lors de la modification", "error");
        } finally {
            setSavingEdit(false);
        }
    };

    // Suppression : entrées uniquement (une sortie s'annule, cf. handleCancelSortie).
    // La base garde la ligne supprimée dans le journal d'audit.
    const handleDelete = (row: LedgerRow) => {
        if (!user || !canDeleteEntry || row.kind !== "entree") return;
        setConfirmDialog({
            isOpen: true,
            title: "Supprimer cette entrée ?",
            description: `Cette entrée de ${money(row.montant)} (${row.description}) sera retirée du livre. La suppression reste tracée dans le journal d'audit.`,
            onConfirm: async () => {
                closeConfirm();
                try {
                    const { error } = await supabase.from("entrees_comptables").delete().eq("id", row.id);
                    if (error) throw new Error(error.message);
                    await logActivity(
                        user.id, user.name, user.role,
                        "accounting_entry", "entrees_comptables", row.id,
                        `Entrée comptable supprimée — ${row.description}`,
                        { montant: row.montant }
                    );
                    showNotification("Opération supprimée", "success");
                    queryClient.invalidateQueries({ queryKey: ENTREES_KEY });
                    queryClient.invalidateQueries({ queryKey: SOLDE_KEY });
                } catch (err) {
                    showNotification(err instanceof Error ? err.message : "Erreur lors de la suppression", "error");
                }
            },
        });
    };

    // Lignes du rapport : on imprime `r.date` (date d'opération, corrigeable) et
    // NON `r.time` (created_at, figé à la saisie). Utiliser `time` faisait que le
    // rapport continuait d'afficher l'ancienne date après une correction.
    // Les sorties rejetées ou annulées ne sont pas des mouvements : exclues.
    const reportOperations = () =>
        rows.filter((r) => !r.rejected && !r.cancelled).map((r) => ({
            date: r.date,
            description: r.description,
            category: catLabel(r.categorie),
            amount: r.montant,
            type: r.kind,
        }));

    const printReport = async () => {
        const ops = reportOperations();
        await printAccountingHtmlReport({
            title: `Rapport comptable ${isUsd ? "USD" : "FCFA"} — ${periodLabel()}`,
            period: { start: dayStart.toISOString(), end: dayEnd.toISOString() },
            entries: ops,
            summary: { totalEntrees, totalSorties, balance: solde },
            scope: "all",
            locale: "fr-FR",
            currency: devise,
        });
    };

    const downloadReport = async () => {
        const ops = reportOperations();
        try {
            const { generateAccountingReport } = await import("../lib/pdfGenerator");
            await generateAccountingReport({
                title: `Rapport comptable ${isUsd ? "USD" : "FCFA"} — ${periodLabel()}`,
                period: { start: dayStart.toISOString(), end: dayEnd.toISOString() },
                entries: ops,
                summary: { totalEntrees, totalSorties, balance: solde },
            }, { currency: devise });
        } catch (err) {
            console.error("Download report error:", err);
            showNotification("Erreur lors de la génération du PDF", "error");
        }
    };

    const exportCSV = () => {
        // La date d'opération manquait : sur une période de plusieurs jours,
        // l'export ne donnait que des heures sans dire de quel jour.
        const headers = ["Date", "Heure", "Type", "Désignation", "Catégorie", "Montant", "Statut", "Bénéficiaire", "Justificatif", "Validé par"];
        const lines = filtered.map((r) => {
            const s = r.kind === "sortie" ? (r.raw as SortieComptable) : null;
            return [
                fmtDay(r.date),
                fmtTime(r.time),
                r.kind === "entree" ? "Entrée" : "Sortie",
                r.description,
                catLabel(r.categorie),
                (r.kind === "entree" ? "+" : "-") + fmt(r.montant),
                r.needsValidation ? "À valider" : r.rejected ? "Rejetée" : r.cancelled ? "Annulée" : "Validée",
                s ? s.beneficiaire_nom ?? (s.beneficiaire_id ? getUserFullName(s.beneficiaire_id) : "") : "",
                s ? (r.linkedTo === "bulletin" ? "Bulletin" : r.hasJustificatif ? "Oui" : "Non") : "",
                r.needsValidation || r.rejected ? "" : getUserName(r.validatedBy),
            ];
        });
        // En CSV, un guillemet dans un champ se double. Sans cela, une
        // désignation contenant `"` refermait le champ en avance et décalait
        // toutes les colonnes suivantes de la ligne.
        const csv = [headers, ...lines]
            .map((row) => row.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
            .join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `livre-comptable-${devise}-${viewMode}-${dayKey(viewDate)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const allCats = Array.from(new Set(rows.map((r) => r.categorie)));

    // L'auteur d'une sortie (permission « créer ») peut la compléter ou la
    // retirer tant qu'elle est en attente : la colonne lui est donc utile aussi.
    const showActions = canEditEntry || canDeleteEntry || canCreateEntry;

    const detailRow = detailId ? rows.find((r) => r.id === detailId) ?? null : null;
    const detail: EcritureDetail | null = detailRow
        ? (() => {
            const s = detailRow.kind === "sortie" ? (detailRow.raw as SortieComptable) : null;
            return {
                kind: detailRow.kind,
                id: detailRow.id,
                montant: detailRow.montant,
                date: detailRow.date,
                created_at: detailRow.time,
                description: detailRow.description,
                categorieLabel: catLabel(detailRow.categorie),
                status: s ? sortieStatus(s) : null,
                created_by: detailRow.raw.created_by,
                beneficiaire_id: s?.beneficiaire_id,
                beneficiaire_nom: s?.beneficiaire_nom,
                justificatif_path: s?.justificatif_path,
                validated_by: s?.validated_by,
                validated_at: s?.validated_at,
                rejected_by: s?.rejected_by,
                rejected_at: s?.rejected_at,
                rejection_reason: s?.rejection_reason,
                cancelled_by: s?.cancelled_by,
                cancelled_at: s?.cancelled_at,
                cancellation_reason: s?.cancellation_reason,
                linkedTo: detailRow.linkedTo,
            };
        })()
        : null;

    return (
        <ProtectedRoute requiredRole="agent" requiredPermission="accounting.view">
            <div className="-m-4 sm:-m-5 flex flex-col bg-white dark:bg-slate-900" style={{ minHeight: "calc(100vh - 130px)" }}>
                {/* Header */}
                <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-4">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            Finance &rsaquo; Livre comptable
                        </p>
                        {viewSwitcher}
                    </div>
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
                            {/* Bascule devise : deux livres indépendants (FCFA / USD) */}
                            <div className="inline-flex overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
                                {(["FCFA", "USD"] as const).map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => { setDevise(d); setPage(1); }}
                                        className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
                                            devise === d
                                                ? "bg-gray-900 text-white"
                                                : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        {d === "USD" ? "$ USD" : "F CFA"}
                                    </button>
                                ))}
                            </div>
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
                                onClick={downloadReport}
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
                            +{money(totalEntrees)}
                        </p>
                    </div>
                    {/* Sorties */}
                    <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            Sorties {viewMode === "jour" ? "jour" : "période"}
                            <span className="ml-1 normal-case tracking-normal text-gray-400">(validées)</span>
                        </p>
                        <p className="mt-2 text-2xl font-bold text-red-500">
                            −{money(totalSorties)}
                        </p>
                        {totalSortiesPending > 0 && (
                            <p className="mt-1 text-[11px] font-medium text-amber-600">
                                dont {money(totalSortiesPending)} en attente de validation
                            </p>
                        )}
                    </div>
                    {/* Solde courant — trésorerie globale, stable quelle que soit la période */}
                    <div className="rounded-xl bg-gray-900 p-4">
                        <div className="flex items-start justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                Solde courant
                            </p>
                            <span className="text-[10px] text-gray-500">Trésorerie globale</span>
                        </div>
                        <p
                            className={`mt-2 text-2xl font-bold ${
                                soldeCourant >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                        >
                            {money(soldeCourant, true)}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-gray-400">
                            Net période&nbsp;: {money(solde, true)}
                        </p>
                        {avancesEnCours > 0 && (
                            <p className="mt-0.5 text-[11px] font-medium text-orange-300">
                                Avances en cours (bons de caisse)&nbsp;: {money(avancesEnCours)}, déjà déduites
                            </p>
                        )}
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
                                    {showActions && (
                                        <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-400 last:pr-0">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map((row) => {
                                    const sortie = row.kind === "sortie" ? (row.raw as SortieComptable) : null;
                                    const beneficiaire = sortie
                                        ? sortie.beneficiaire_nom ?? (sortie.beneficiaire_id ? getUserFullName(sortie.beneficiaire_id) : null)
                                        : null;
                                    const closed = row.rejected || row.cancelled;
                                    return (
                                    <tr
                                        key={row.id}
                                        className={`border-b border-gray-100 dark:border-slate-700/60 text-sm ${
                                            row.needsValidation
                                                ? "bg-amber-50 dark:bg-amber-900/20"
                                                : closed
                                                  ? "opacity-60 hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
                                        <td className="px-3 py-3">
                                            <button
                                                onClick={() => setDetailId(row.id)}
                                                title="Voir le détail, le justificatif et l'historique"
                                                className="text-left font-medium text-gray-900 hover:underline dark:text-gray-100"
                                            >
                                                {row.description}
                                                {row.hasJustificatif && (
                                                    <Paperclip className="ml-1.5 inline h-3.5 w-3.5 text-gray-400" aria-label="Justificatif joint" />
                                                )}
                                            </button>
                                            {sortie && row.linkedTo !== "bulletin" && (
                                                <p className={`text-[11px] ${beneficiaire || !row.needsValidation ? "text-gray-400" : "font-medium text-amber-600"}`}>
                                                    {beneficiaire ? `Remis à ${beneficiaire}` : "Bénéficiaire non renseigné"}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                                            {getStudentName(row.student_id) || "—"}
                                        </td>
                                        <td className="px-3 py-3 text-gray-500 dark:text-gray-400">
                                            {catLabel(row.categorie)}
                                        </td>
                                        <td className="px-3 py-3">
                                            {row.needsValidation && canValidateEntry && (
                                                isSelfValidation(row) ? (
                                                    // Personne ne contrôle sa propre dépense : la base le refuse aussi.
                                                    <span
                                                        title="Vous avez saisi cette sortie ou en êtes le bénéficiaire : un autre compte doit la valider."
                                                        className="text-[11px] font-medium text-gray-400"
                                                    >
                                                        Contrôle par un tiers
                                                    </span>
                                                ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() =>
                                                            setConfirmDialog({
                                                                isOpen: true,
                                                                title: "Valider cette sortie ?",
                                                                description: `Confirmer la sortie de ${money(row.montant)} — ${row.description}${beneficiaire ? `, remise à ${beneficiaire}` : ""}. Vérifiez le justificatif avant de valider : une sortie validée ne peut plus être modifiée.`,
                                                                onConfirm: async () => {
                                                                    closeConfirm();
                                                                    await handleValidateSortie(row.id);
                                                                },
                                                            })
                                                        }
                                                        disabled={!row.hasJustificatif || !beneficiaire}
                                                        title={
                                                            !row.hasJustificatif
                                                                ? "Justificatif manquant : impossible de valider"
                                                                : !beneficiaire
                                                                  ? "Bénéficiaire non renseigné : impossible de valider"
                                                                  : undefined
                                                        }
                                                        className="rounded-full border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        Valider
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectModal({ open: true, id: row.id, reason: "" })}
                                                        className="rounded-full border border-rose-300 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                                                    >
                                                        Rejeter
                                                    </button>
                                                </div>
                                                )
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold">
                                            <span className={`${row.kind === "entree" ? "text-green-600" : "text-red-500"} ${closed ? "line-through" : ""}`}>
                                                {row.kind === "entree" ? "+" : "−"}
                                                {money(row.montant)}
                                            </span>
                                        </td>
                                        <td className="py-3 pl-3 pr-0 text-right text-gray-500 dark:text-gray-400">
                                            {row.needsValidation ? (
                                                <span className="rounded-full border border-amber-300 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                                                    À valider
                                                </span>
                                            ) : row.rejected ? (
                                                <span
                                                    title={sortie?.rejection_reason || "Sortie rejetée"}
                                                    className="rounded-full border border-rose-300 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600"
                                                >
                                                    Rejetée
                                                </span>
                                            ) : row.cancelled ? (
                                                <span
                                                    title={sortie?.cancellation_reason ? `Motif : ${sortie.cancellation_reason}` : "Sortie annulée"}
                                                    className="rounded-full border border-gray-300 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500"
                                                >
                                                    Annulée
                                                </span>
                                            ) : (
                                                getUserName(row.validatedBy)
                                            )}
                                        </td>
                                        {showActions && (
                                            <td className="py-3 pl-3 pr-0 text-right">
                                                {row.linkedTo ? (
                                                    <span
                                                        title={
                                                            row.linkedTo === "bon"
                                                                ? "Sortie issue d'un bon de caisse — gérée depuis le bon"
                                                                : "Sortie générée par un bulletin de paie — gérée via le bulletin"
                                                        }
                                                        className="inline-flex items-center justify-end gap-1 text-[11px] font-medium text-gray-400"
                                                    >
                                                        <Lock className="h-3.5 w-3.5" />
                                                        {row.linkedTo === "bon" ? "Via bon" : "Via bulletin"}
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canEditRow(row) && (
                                                            <button
                                                                onClick={() => openEdit(row)}
                                                                title="Modifier"
                                                                className="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {canCancelRow(row) && (
                                                            <button
                                                                onClick={() => setCancelModal({ row, reason: "" })}
                                                                title="Annuler la sortie (avec motif)"
                                                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"
                                                            >
                                                                <Ban className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {row.kind === "entree" && canDeleteEntry && (
                                                            <button
                                                                onClick={() => handleDelete(row)}
                                                                title="Supprimer"
                                                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {sortie && sortieStatus(sortie) === "validated" && !canCancelRow(row) && (
                                                            <span title="Sortie validée : verrouillée" className="p-1.5 text-gray-300 dark:text-gray-600">
                                                                <Lock className="h-4 w-4" />
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                    );
                                })}
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
                                    Entrées {money(totalEntrees)}
                                </span>
                                <span className="font-medium text-red-500">
                                    Sorties {money(totalSorties)}
                                </span>
                                <span className={`font-bold ${solde >= 0 ? "text-green-700" : "text-red-700 dark:text-red-300"}`}>
                                    Net {money(solde, true)}
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
                            <button onClick={closeNewModal} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
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
                                    Montant ({isUsd ? "USD" : "FCFA"})
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
                                    {newKind === "sortie" ? "Motif précis" : "Désignation"}
                                </label>
                                <input
                                    type="text"
                                    placeholder={
                                        newKind === "sortie"
                                            ? "ex: Taxi Akwa → Bonanjo, dépôt dossier Mballa à l'ambassade"
                                            : "ex: Loyer novembre"
                                    }
                                    value={newForm.description}
                                    onChange={(e) => setNewForm((f) => ({ ...f, description: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400"
                                />
                                {newKind === "sortie" && (
                                    <p className="mt-1 text-[11px] text-gray-400">
                                        Transport : trajet et objet de la course. Achat : article et fournisseur.
                                    </p>
                                )}
                            </div>

                            {newKind === "sortie" && (
                                <BeneficiaireFields
                                    staffUsers={staffUsers}
                                    beneficiaireId={newForm.beneficiaireId}
                                    beneficiaireNom={newForm.beneficiaireNom}
                                    onChange={(patch) => setNewForm((f) => ({ ...f, ...patch }))}
                                />
                            )}

                            {newKind === "sortie" && (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Justificatif (photo du reçu, facture, fiche de course)
                                    </label>
                                    <input
                                        type="file"
                                        accept={JUSTIFICATIF_ACCEPT}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] ?? null;
                                            const invalid = file ? checkJustificatif(file) : null;
                                            if (invalid) {
                                                showNotification(invalid, "error");
                                                e.target.value = "";
                                                setNewJustificatif(null);
                                                return;
                                            }
                                            setNewJustificatif(file);
                                        }}
                                        className="w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-gray-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white dark:text-gray-300"
                                    />
                                    <p className="mt-1 text-[11px] text-gray-400">
                                        Sans reçu (moto-taxi) : photo d&apos;une fiche de course signée, ou preuve de la mission
                                        (accusé de dépôt du document).
                                    </p>
                                </div>
                            )}

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
                                onClick={closeNewModal}
                                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={saving || !newForm.montant || !newForm.description || newSortieIncomplete}
                                title={
                                    newSortieIncomplete
                                        ? `Requis : motif précis (${MOTIF_MIN} caractères min.), bénéficiaire et justificatif`
                                        : undefined
                                }
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

            {/* Edit operation modal */}
            {editingRow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Modifier {editingRow.kind === "entree" ? "l'entrée" : "la sortie"}
                            </h2>
                            <button onClick={() => setEditingRow(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Montant ({isUsd ? "USD" : "FCFA"})
                                </label>
                                <input
                                    type="number"
                                    value={editForm.montant}
                                    onChange={(e) => setEditForm((f) => ({ ...f, montant: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Désignation
                                </label>
                                <input
                                    type="text"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={editForm.date}
                                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400"
                                />
                            </div>

                            {editingRow.kind === "entree" ? (
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Type
                                    </label>
                                    <Select value={editForm.type} onValueChange={(v) => setEditForm((f) => ({ ...f, type: v ?? f.type }))}>
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
                                    <Select value={editForm.categorie} onValueChange={(v) => setEditForm((f) => ({ ...f, categorie: v ?? f.categorie }))}>
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

                            {editingRow.kind === "sortie" && (
                                <BeneficiaireFields
                                    staffUsers={staffUsers}
                                    beneficiaireId={editForm.beneficiaireId}
                                    beneficiaireNom={editForm.beneficiaireNom}
                                    onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
                                />
                            )}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setEditingRow(null)}
                                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit || !editForm.montant || !editForm.description}
                                className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                                {savingEdit ? "Enregistrement…" : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject sortie modal */}
            {rejectModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-rose-600">Rejeter la sortie</h2>
                            <button
                                onClick={() => setRejectModal({ open: false, id: "", reason: "" })}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            Indiquez le motif du rejet. La sortie ne sera pas comptabilisée dans la trésorerie.
                        </p>
                        <textarea
                            rows={4}
                            placeholder="Ex : justificatif manquant, dépense non autorisée…"
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal((s) => ({ ...s, reason: e.target.value }))}
                            className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400"
                        />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setRejectModal({ open: false, id: "", reason: "" })}
                                disabled={rejecting}
                                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={async () => {
                                    const { id, reason } = rejectModal;
                                    setRejecting(true);
                                    try {
                                        await handleRejectSortie(id, reason.trim());
                                    } finally {
                                        setRejecting(false);
                                        setRejectModal({ open: false, id: "", reason: "" });
                                    }
                                }}
                                disabled={rejecting || !rejectModal.reason.trim()}
                                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                {rejecting ? "Rejet…" : "Confirmer le rejet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel sortie modal — remplace la suppression */}
            {cancelModal.row && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-rose-600">Annuler la sortie</h2>
                            <button
                                onClick={() => setCancelModal({ row: null, reason: "" })}
                                className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {money(cancelModal.row.montant)} — {cancelModal.row.description}
                        </p>
                        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                            {cancelModal.row.needsValidation
                                ? "La demande sera retirée. Elle reste visible, barrée, avec son motif."
                                : "La sortie validée sera annulée et son montant rendu à la trésorerie. Elle reste visible, barrée, avec son motif. Pour corriger une erreur, saisissez ensuite une nouvelle sortie."}
                        </p>
                        <textarea
                            rows={3}
                            placeholder="Motif de l'annulation (obligatoire)"
                            value={cancelModal.reason}
                            onChange={(e) => setCancelModal((s) => ({ ...s, reason: e.target.value }))}
                            className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-gray-400"
                        />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setCancelModal({ row: null, reason: "" })}
                                disabled={cancelling}
                                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            >
                                Retour
                            </button>
                            <button
                                onClick={async () => {
                                    const { row, reason } = cancelModal;
                                    if (!row) return;
                                    setCancelling(true);
                                    try {
                                        await handleCancelSortie(row, reason.trim());
                                    } finally {
                                        setCancelling(false);
                                        setCancelModal({ row: null, reason: "" });
                                    }
                                }}
                                disabled={cancelling || !cancelModal.reason.trim()}
                                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                {cancelling ? "Annulation…" : "Confirmer l'annulation"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {detail && detailRow && (
                <EcritureDetailModal
                    detail={detail}
                    onClose={() => setDetailId(null)}
                    money={(n) => money(n)}
                    userName={getUserFullName}
                    canAttach={canAttachJustificatif(detailRow)}
                    onAttach={(file) => handleAttachJustificatif(detailRow, file)}
                />
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

/**
 * Choix de la personne qui a reçu l'argent : un compte du personnel, ou une
 * personne sans compte (fournisseur, bailleur, chauffeur) saisie par son nom.
 */
function BeneficiaireFields({
    staffUsers,
    beneficiaireId,
    beneficiaireNom,
    onChange,
}: {
    staffUsers: AppUser[];
    beneficiaireId: string;
    beneficiaireNom: string;
    onChange: (patch: { beneficiaireId?: string; beneficiaireNom?: string }) => void;
}) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
                Remis à (qui a reçu l&apos;argent)
            </label>
            <Select value={beneficiaireId} onValueChange={(v) => onChange({ beneficiaireId: v ?? "" })}>
                <SelectTrigger className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                    {/* La valeur est un identifiant : on affiche le nom, pas l'UUID. */}
                    <SelectValue placeholder="Choisir le bénéficiaire">
                        {beneficiaireId === BENEFICIAIRE_EXTERNE
                            ? "Personne externe"
                            : staffUsers.find((u) => u.id === beneficiaireId)?.name ?? "Choisir le bénéficiaire"}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {staffUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                    <SelectItem value={BENEFICIAIRE_EXTERNE}>Personne externe (fournisseur, chauffeur…)</SelectItem>
                </SelectContent>
            </Select>
            {beneficiaireId === BENEFICIAIRE_EXTERNE && (
                <input
                    type="text"
                    placeholder="Nom de la personne ou de l'entreprise"
                    value={beneficiaireNom}
                    onChange={(e) => onChange({ beneficiaireNom: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm outline-none focus:border-gray-400"
                />
            )}
        </div>
    );
}
