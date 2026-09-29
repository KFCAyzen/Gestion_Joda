"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Ban, CheckCircle2, FileText, History, Paperclip, X } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useNotificationContext } from "../context/NotificationContext";
import { useUsers } from "../lib/hooks/use-users";
import { COMPTA_AUDIT_KEY, SOLDE_KEY, SORTIES_KEY, useComptaAudit, type ComptaAuditEntry } from "../lib/hooks/use-accounting";
import {
    BONS_CAISSE_KEY,
    DEFAULT_COMPTA_PARAMETRES,
    bonNumero,
    isEnCours,
    isEnRetard,
    positionGrille,
    useBonsCaisse,
    useComptaParametres,
    type BonCaisse,
    type BonStatus,
    type PositionGrille,
} from "../lib/hooks/use-bons-caisse";
import { useGrilleTransport } from "../lib/hooks/use-controle-compta";
import { getJustificatifUrl, isPdfJustificatif } from "../lib/justificatifs";
import { logActivity } from "../utils/activityLogger";
import ConfirmDialog from "./ConfirmDialog";
import ProtectedRoute from "./ProtectedRoute";

const STATUS_LABEL: Record<BonStatus, string> = {
    demande: "À approuver",
    approuve: "À remettre",
    refuse: "Refusé",
    remis: "À justifier",
    justifie: "À contrôler",
    cloture: "Clôturé",
    annule: "Annulé",
};

const STATUS_CLASS: Record<BonStatus, string> = {
    demande: "border-amber-300 text-amber-700 dark:text-amber-400",
    approuve: "border-sky-300 text-sky-700 dark:text-sky-400",
    refuse: "border-rose-300 text-rose-600 dark:text-rose-400",
    remis: "border-orange-300 text-orange-700 dark:text-orange-400",
    justifie: "border-violet-300 text-violet-700 dark:text-violet-400",
    cloture: "border-emerald-300 text-emerald-700 dark:text-emerald-400",
    annule: "border-gray-300 text-gray-500 dark:text-gray-400",
};

const CATEGORIE_LABEL: Record<string, string> = {
    transports: "Transports",
    fournitures: "Fournitures",
    materiels: "Matériels",
    communication: "Communication",
    fonctionnement: "Fonctionnement",
    divers: "Divers",
};

type Vue = "a_traiter" | "en_cours" | "en_retard" | "clotures" | "tous";

const VUES: { id: Vue; label: string }[] = [
    { id: "a_traiter", label: "À traiter" },
    { id: "en_cours", label: "Avances en cours" },
    { id: "en_retard", label: "En retard" },
    { id: "clotures", label: "Clôturés" },
    { id: "tous", label: "Tous" },
];

function fmtF(n: number): string {
    return `${new Intl.NumberFormat("fr-FR").format(n)} F`;
}

function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

/** « à justifier sous 31 h » ou « en retard de 2 j ». */
function echeanceLabel(b: BonCaisse, now: number): string | null {
    if (b.status !== "remis" || !b.echeance_justification) return null;
    const diffH = Math.round((new Date(b.echeance_justification).getTime() - now) / 3_600_000);
    const span = (h: number) => (h >= 48 ? `${Math.round(h / 24)} j` : `${Math.max(h, 1)} h`);
    return diffH >= 0 ? `à justifier sous ${span(diffH)}` : `en retard de ${span(-diffH)}`;
}

function describeBonAudit(e: ComptaAuditEntry): string[] {
    const o = e.old_data ?? {};
    const n = e.new_data ?? {};
    if (e.operation === "INSERT") return [`Demande de ${fmtF(Number(n.montant ?? 0))}`];
    if (e.operation === "DELETE") return ["Suppression"];
    const fields = e.changed_fields ?? [];
    const lines: string[] = [];
    if (fields.includes("status")) {
        const to = String(n.status) as BonStatus;
        let line = `${STATUS_LABEL[String(o.status) as BonStatus] ?? o.status} → ${STATUS_LABEL[to] ?? to}`;
        if (to === "refuse" && n.refus_motif) line += ` — motif : ${n.refus_motif}`;
        if (to === "annule" && n.annulation_motif) line += ` — motif : ${n.annulation_motif}`;
        if (to === "remis" && o.status === "justifie" && n.rejet_justification_motif) {
            line = `Justification rejetée — motif : ${n.rejet_justification_motif}`;
        }
        if (to === "justifie") line += ` — dépensé ${fmtF(Number(n.montant_depense ?? 0))}`;
        lines.push(line);
    } else {
        if (fields.includes("reception_confirmee_at")) lines.push("Réception de l'argent confirmée");
        if (fields.includes("montant")) lines.push(`Montant : ${fmtF(Number(o.montant))} → ${fmtF(Number(n.montant))}`);
        if (fields.includes("motif")) lines.push(`Motif : ${o.motif} → ${n.motif}`);
    }
    return lines.length ? lines : [`Mise à jour (${fields.join(", ")})`];
}

export default function BonsCaisse({ viewSwitcher }: { viewSwitcher?: ReactNode }) {
    const supabase = createClient();
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const { showNotification } = useNotificationContext();
    const queryClient = useQueryClient();

    const { data: bons = [], isLoading } = useBonsCaisse();
    const { data: params = DEFAULT_COMPTA_PARAMETRES } = useComptaParametres();
    const { data: grille } = useGrilleTransport();
    const { data: _usersData = [] } = useUsers();
    const users = _usersData as unknown as { id: string; name: string }[];

    const userName = useCallback(
        (id: string | null | undefined): string => {
            if (!id) return "—";
            return users.find((u) => u.id === id)?.name ?? "Compte supprimé";
        },
        [users]
    );

    const [vue, setVue] = useState<Vue>("a_traiter");
    const [detailId, setDetailId] = useState<string | null>(null);
    const [motifModal, setMotifModal] = useState<{
        bon: BonCaisse; kind: "refus" | "annulation" | "rejet"; reason: string;
    } | null>(null);
    const [busy, setBusy] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean; title: string; description: string; onConfirm: () => void;
    }>({ isOpen: false, title: "", description: "", onConfirm: () => {} });
    const closeConfirm = () => setConfirmDialog((s) => ({ ...s, isOpen: false }));

    const now = Date.now();
    const isAdminRole = user?.role === "admin" || user?.role === "super_admin";
    const canValidate = hasPermission("accounting.validate");
    const canDisburse = hasPermission("accounting.disburse");
    const canDelete = hasPermission("accounting.delete");

    // Miroir des règles de trg_bons_caisse_controle (la base reste l'arbitre).
    const isMine = (b: BonCaisse) => !!user && b.demandeur_id === user.id;
    // Au-delà du seuil, hors grille ou au-dessus du tarif : décision admin.
    // (Un budget dépassé l'impose aussi ; la base le signale à l'approbation.)
    const grillePos = (b: BonCaisse) => positionGrille(b, grille);
    const needsAdmin = (b: BonCaisse) => {
        const g = grillePos(b);
        return b.montant >= params.seuil_approbation_admin || g?.kind === "hors_grille" || g?.kind === "au_dessus";
    };
    const canDecide = (b: BonCaisse) =>
        b.status === "demande" && !isMine(b) && (needsAdmin(b) ? isAdminRole : canValidate || isAdminRole);
    const canRemettre = (b: BonCaisse) => b.status === "approuve" && !isMine(b) && canDisburse;
    const canControler = (b: BonCaisse) => b.status === "justifie" && !isMine(b) && canValidate;
    const canAnnuler = (b: BonCaisse) => (b.status === "demande" || b.status === "approuve") && (isMine(b) || canDelete);

    const aApprouver = bons.filter((b) => b.status === "demande");
    const aRemettre = bons.filter((b) => b.status === "approuve");
    const aControler = bons.filter((b) => b.status === "justifie");
    const enCours = bons.filter(isEnCours);
    const enRetard = bons.filter((b) => isEnRetard(b, now));
    const sum = (list: BonCaisse[]) => list.reduce((s, b) => s + b.montant, 0);

    const filtered = bons.filter((b) => {
        switch (vue) {
            case "a_traiter": return b.status === "demande" || b.status === "approuve" || b.status === "justifie";
            case "en_cours": return isEnCours(b);
            case "en_retard": return isEnRetard(b, now);
            case "clotures": return b.status === "cloture";
            default: return true;
        }
    });

    // Suivi par employé : ce que chacun doit encore justifier.
    const suivi = Object.values(
        bons.reduce<Record<string, { nom: string; enCours: BonCaisse[]; enRetard: BonCaisse[]; depense: number }>>((acc, b) => {
            const key = b.demandeur_id ?? `nom:${b.demandeur_nom}`;
            acc[key] ??= { nom: b.demandeur_nom, enCours: [], enRetard: [], depense: 0 };
            if (isEnCours(b)) acc[key].enCours.push(b);
            if (isEnRetard(b, now)) acc[key].enRetard.push(b);
            if (b.status === "cloture") acc[key].depense += b.montant_depense ?? 0;
            return acc;
        }, {})
    ).sort((a, b) => sum(b.enRetard) - sum(a.enRetard) || sum(b.enCours) - sum(a.enCours));

    const act = async (b: BonCaisse, patch: Record<string, unknown>, success: string, log: string) => {
        if (!user) return false;
        setBusy(true);
        try {
            const { error } = await supabase.from("bons_caisse").update(patch).eq("id", b.id);
            if (error) {
                showNotification(error.message || "Action impossible", "error");
                return false;
            }
            await logActivity(
                user.id, user.name, user.role,
                "accounting_expense", "bons_caisse", b.id,
                `${bonNumero(b.numero)} — ${log}`,
                { montant: b.montant, demandeur: b.demandeur_nom }
            );
            showNotification(success, "success");
            // La remise et la clôture touchent la trésorerie et le livre.
            queryClient.invalidateQueries({ queryKey: BONS_CAISSE_KEY });
            queryClient.invalidateQueries({ queryKey: SOLDE_KEY });
            queryClient.invalidateQueries({ queryKey: SORTIES_KEY });
            queryClient.invalidateQueries({ queryKey: COMPTA_AUDIT_KEY });
            return true;
        } finally {
            setBusy(false);
        }
    };

    const askApprove = (b: BonCaisse) =>
        setConfirmDialog({
            isOpen: true,
            title: `Approuver ${bonNumero(b.numero)} ?`,
            description: `${fmtF(b.montant)} pour ${b.demandeur_nom} — ${b.motif}`,
            onConfirm: async () => {
                closeConfirm();
                await act(b, { status: "approuve" }, "Bon approuvé", "approuvé");
            },
        });

    const askRemettre = (b: BonCaisse) => {
        const echeance = new Date(Date.now() + params.delai_justification_heures * 3_600_000);
        setConfirmDialog({
            isOpen: true,
            title: `Remettre ${fmtF(b.montant)} à ${b.demandeur_nom} ?`,
            description: `L'argent sort de la caisse maintenant. ${b.demandeur_nom} devra justifier avant le ${fmtDateTime(echeance.toISOString())} et confirmer la réception sur son téléphone.`,
            onConfirm: async () => {
                closeConfirm();
                await act(b, { status: "remis" }, "Argent remis — avance inscrite au nom du bénéficiaire", "argent remis");
            },
        });
    };

    const askCloturer = (b: BonCaisse) => {
        const rendu = b.montant - (b.montant_depense ?? 0);
        setConfirmDialog({
            isOpen: true,
            title: `Clôturer ${bonNumero(b.numero)} ?`,
            description:
                `Dépensé : ${fmtF(b.montant_depense ?? 0)}, inscrit comme sortie validée dans le livre comptable.`
                + (rendu > 0 ? ` Monnaie à récupérer : ${fmtF(rendu)} — clôturez seulement une fois cette somme remise en caisse.` : ""),
            onConfirm: async () => {
                closeConfirm();
                if (await act(b, { status: "cloture" }, "Bon clôturé", `clôturé — dépensé ${fmtF(b.montant_depense ?? 0)}`)) {
                    setDetailId(null);
                }
            },
        });
    };

    const submitMotif = async () => {
        if (!motifModal) return;
        const reason = motifModal.reason.trim();
        const { bon, kind } = motifModal;
        const done =
            kind === "refus"
                ? await act(bon, { status: "refuse", refus_motif: reason }, "Demande refusée", `refusé — ${reason}`)
                : kind === "annulation"
                  ? await act(bon, { status: "annule", annulation_motif: reason }, "Bon annulé", `annulé — ${reason}`)
                  : await act(bon, { status: "remis", rejet_justification_motif: reason }, "Justification rejetée : l'avance redevient due", `justification rejetée — ${reason}`);
        if (done) {
            setMotifModal(null);
            if (kind === "rejet") setDetailId(null);
        }
    };

    const detail = detailId ? bons.find((b) => b.id === detailId) ?? null : null;

    const statCards: { label: string; value: string; sub?: string; vue: Vue; tone: string }[] = [
        { label: "À approuver", value: String(aApprouver.length), sub: fmtF(sum(aApprouver)), vue: "a_traiter", tone: "text-amber-600" },
        { label: "À remettre", value: String(aRemettre.length), sub: fmtF(sum(aRemettre)), vue: "a_traiter", tone: "text-sky-600" },
        { label: "À contrôler", value: String(aControler.length), sub: fmtF(sum(aControler)), vue: "a_traiter", tone: "text-violet-600" },
        { label: "Avances en cours", value: fmtF(sum(enCours)), sub: `${enCours.length} bon(s) hors caisse`, vue: "en_cours", tone: "text-orange-600" },
        { label: "En retard", value: fmtF(sum(enRetard)), sub: `${enRetard.length} bon(s) — demandes bloquées`, vue: "en_retard", tone: enRetard.length ? "text-rose-600" : "text-gray-400" },
    ];

    return (
        <ProtectedRoute requiredRole="agent" requiredPermission="accounting.view">
            <div className="-m-4 sm:-m-5 flex flex-col bg-white dark:bg-slate-900" style={{ minHeight: "calc(100vh - 130px)" }}>
                {/* Header */}
                <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-4">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            Finance &rsaquo; Bons de caisse
                        </p>
                        {viewSwitcher}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bons de caisse</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Avances nominatives, à justifier sous {params.delai_justification_heures} h.
                        Approbation par un administrateur à partir de {fmtF(params.seuil_approbation_admin)}.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 px-6 py-4 md:grid-cols-5">
                    {statCards.map((c) => (
                        <button
                            key={c.label}
                            onClick={() => setVue(c.vue)}
                            className="rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm hover:border-gray-300 dark:border-slate-700 dark:bg-slate-800"
                        >
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{c.label}</p>
                            <p className={`mt-2 text-xl font-bold ${c.tone}`}>{c.value}</p>
                            {c.sub && <p className="mt-0.5 text-[11px] text-gray-400">{c.sub}</p>}
                        </button>
                    ))}
                </div>

                {/* Vues */}
                <div className="flex flex-wrap gap-1.5 px-6">
                    {VUES.map((v) => (
                        <button
                            key={v.id}
                            onClick={() => setVue(v.id)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                vue === v.id
                                    ? "bg-gray-900 text-white"
                                    : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>

                {/* Liste */}
                <div className="overflow-auto px-6 py-3">
                    {isLoading ? (
                        <p className="py-16 text-center text-sm text-gray-400">Chargement…</p>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400">
                            <CheckCircle2 className="mb-3 h-8 w-8 text-gray-200" />
                            Aucun bon dans cette vue
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700">
                                    {["N°", "Demandé le", "Bénéficiaire", "Motif", "Montant", "Statut", ""].map((h) => (
                                        <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 first:pl-0">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((b) => {
                                    const retard = isEnRetard(b, now);
                                    const echeance = echeanceLabel(b, now);
                                    return (
                                        <tr
                                            key={b.id}
                                            className={`border-b border-gray-100 text-sm dark:border-slate-700/60 ${
                                                retard ? "bg-rose-50 dark:bg-rose-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                            }`}
                                        >
                                            <td className="py-3 pl-0 pr-3 font-mono text-xs text-gray-500">
                                                <button onClick={() => setDetailId(b.id)} className="hover:underline">
                                                    {bonNumero(b.numero)}
                                                </button>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-gray-500">{fmtDateTime(b.created_at)}</td>
                                            <td className="px-3 py-3 font-medium text-gray-900 dark:text-gray-100">{b.demandeur_nom}</td>
                                            <td className="max-w-xs px-3 py-3">
                                                <button onClick={() => setDetailId(b.id)} className="text-left text-gray-800 hover:underline dark:text-gray-200">
                                                    {b.motif}
                                                    {b.justificatif_path && (
                                                        <Paperclip className="ml-1.5 inline h-3.5 w-3.5 text-gray-400" aria-label="Justificatif joint" />
                                                    )}
                                                </button>
                                                <p className="text-[11px] text-gray-400">{CATEGORIE_LABEL[b.categorie] ?? b.categorie}</p>
                                                <GrilleBadge pos={grillePos(b)} nb={b.nb_trajets ?? 1} />
                                            </td>
                                            <td className="px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">
                                                {fmtF(b.montant)}
                                                {b.montant_depense !== null && (
                                                    <p className="text-[11px] font-normal text-gray-500">
                                                        dépensé {fmtF(b.montant_depense)}
                                                        {b.montant - b.montant_depense > 0 && ` · à rendre ${fmtF(b.montant - b.montant_depense)}`}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[b.status]}`}>
                                                    {STATUS_LABEL[b.status]}
                                                </span>
                                                {echeance && (
                                                    <p className={`mt-1 text-[11px] ${retard ? "font-semibold text-rose-600" : "text-gray-400"}`}>
                                                        {echeance}
                                                    </p>
                                                )}
                                                {b.status === "remis" && !b.reception_confirmee_at && (
                                                    <p className="text-[11px] text-amber-600">réception non confirmée</p>
                                                )}
                                            </td>
                                            <td className="py-3 pl-3 pr-0 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {canDecide(b) && (
                                                        <>
                                                            <button
                                                                onClick={() => askApprove(b)}
                                                                disabled={busy}
                                                                className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20"
                                                            >
                                                                Approuver
                                                            </button>
                                                            <button
                                                                onClick={() => setMotifModal({ bon: b, kind: "refus", reason: "" })}
                                                                disabled={busy}
                                                                className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20"
                                                            >
                                                                Refuser
                                                            </button>
                                                        </>
                                                    )}
                                                    {b.status === "demande" && !canDecide(b) && !isMine(b) && needsAdmin(b) && !isAdminRole && (
                                                        <span
                                                            className="text-[11px] text-gray-400"
                                                            title={grillePos(b) && grillePos(b)!.kind !== "dans_grille"
                                                                ? "Transport hors grille ou au-dessus du tarif"
                                                                : `Montant ≥ ${fmtF(params.seuil_approbation_admin)}`}
                                                        >
                                                            Décision admin
                                                        </span>
                                                    )}
                                                    {canRemettre(b) && (
                                                        <button
                                                            onClick={() => askRemettre(b)}
                                                            disabled={busy}
                                                            className="rounded-full bg-gray-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-gray-800"
                                                        >
                                                            Remettre l&apos;argent
                                                        </button>
                                                    )}
                                                    {canControler(b) && (
                                                        <button
                                                            onClick={() => setDetailId(b.id)}
                                                            className="rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20"
                                                        >
                                                            Contrôler
                                                        </button>
                                                    )}
                                                    {isMine(b) && ["demande", "justifie"].includes(b.status) && (
                                                        <span className="text-[11px] text-gray-400" title="Un autre compte doit traiter votre propre bon">
                                                            Votre bon
                                                        </span>
                                                    )}
                                                    {canAnnuler(b) && (
                                                        <button
                                                            onClick={() => setMotifModal({ bon: b, kind: "annulation", reason: "" })}
                                                            title="Annuler le bon (avec motif)"
                                                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                                                        >
                                                            <Ban className="h-4 w-4" />
                                                        </button>
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

                {/* Suivi par employé */}
                <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-700">
                    <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Suivi des avances par employé</h2>
                    {suivi.length === 0 ? (
                        <p className="text-sm text-gray-400">Aucune avance enregistrée.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700">
                                    {["Employé", "En cours", "En retard", "Dépensé (clôturé)", "Situation"].map((h) => (
                                        <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 first:pl-0">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {suivi.map((s) => (
                                    <tr key={s.nom} className="border-b border-gray-100 dark:border-slate-700/60">
                                        <td className="py-2 pl-0 pr-3 font-medium text-gray-900 dark:text-gray-100">{s.nom}</td>
                                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                                            {s.enCours.length ? `${s.enCours.length} · ${fmtF(sum(s.enCours))}` : "—"}
                                        </td>
                                        <td className={`px-3 py-2 ${s.enRetard.length ? "font-semibold text-rose-600" : "text-gray-400"}`}>
                                            {s.enRetard.length ? `${s.enRetard.length} · ${fmtF(sum(s.enRetard))}` : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{fmtF(s.depense)}</td>
                                        <td className="px-3 py-2">
                                            {s.enRetard.length ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Bloqué
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-gray-400">À jour</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <p className="mt-3 text-[11px] text-gray-400">
                        Une avance non justifiée bloque les nouvelles demandes de la personne. Une retenue sur salaire est
                        possible par un ajustement de bulletin (RH › Paie), uniquement avec l&apos;accord écrit de l&apos;employé
                        et dans les limites de retenue du Code du travail.
                    </p>
                </div>
            </div>

            {detail && (
                <BonDetailModal
                    bon={detail}
                    now={now}
                    userName={userName}
                    grille={grillePos(detail)}
                    onClose={() => setDetailId(null)}
                    controle={
                        canControler(detail) ? (
                            <>
                                <button
                                    onClick={() => setMotifModal({ bon: detail, kind: "rejet", reason: "" })}
                                    disabled={busy}
                                    className="flex-1 rounded-xl border border-rose-300 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                >
                                    Rejeter la justification
                                </button>
                                <button
                                    onClick={() => askCloturer(detail)}
                                    disabled={busy}
                                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    Clôturer
                                </button>
                            </>
                        ) : null
                    }
                />
            )}

            {motifModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-rose-600">
                                {motifModal.kind === "refus"
                                    ? "Refuser la demande"
                                    : motifModal.kind === "annulation"
                                      ? "Annuler le bon"
                                      : "Rejeter la justification"}
                            </h2>
                            <button onClick={() => setMotifModal(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {bonNumero(motifModal.bon.numero)} — {fmtF(motifModal.bon.montant)} — {motifModal.bon.demandeur_nom}
                        </p>
                        {motifModal.kind === "rejet" && (
                            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                                L&apos;avance redevient due : {motifModal.bon.demandeur_nom} devra fournir une nouvelle pièce.
                            </p>
                        )}
                        <textarea
                            rows={3}
                            placeholder="Motif (obligatoire)"
                            value={motifModal.reason}
                            onChange={(e) => setMotifModal((m) => (m ? { ...m, reason: e.target.value } : m))}
                            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setMotifModal(null)}
                                disabled={busy}
                                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50"
                            >
                                Retour
                            </button>
                            <button
                                onClick={submitMotif}
                                disabled={busy || !motifModal.reason.trim()}
                                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                {busy ? "Envoi…" : "Confirmer"}
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
                variant="default"
            />
        </ProtectedRoute>
    );
}

/** Pièce d'un bon, affichée par lien signé (bucket privé). */
function Piece({ path, label }: { path: string; label: string }) {
    const [url, setUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setUrl(null);
        setFailed(false);
        getJustificatifUrl(createClient(), path).then((u) => {
            if (cancelled) return;
            if (u) setUrl(u);
            else setFailed(true);
        });
        return () => {
            cancelled = true;
        };
    }, [path]);

    return (
        <div>
            <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
            {failed ? (
                <p className="text-sm text-rose-600">Pièce inaccessible.</p>
            ) : !url ? (
                <p className="text-sm text-gray-400">Chargement…</p>
            ) : isPdfJustificatif(path) ? (
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                >
                    <FileText className="h-4 w-4" />
                    Ouvrir le PDF
                </a>
            ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" title="Ouvrir en grand">
                    <img src={url} alt={label} className="max-h-64 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-700" />
                </a>
            )}
        </div>
    );
}

/** Trajet de la grille et position du montant (bons de transport). */
function GrilleBadge({ pos, nb, detail = false }: { pos: PositionGrille | null; nb: number; detail?: boolean }) {
    if (!pos) return null;
    if (pos.kind === "hors_grille") {
        return <p className="text-[11px] font-semibold text-amber-600">Hors grille des transports</p>;
    }
    const trajet = `${pos.trajet}${nb > 1 ? ` × ${nb}` : ""}`;
    return (
        <p className={`text-[11px] ${pos.kind === "au_dessus" ? "font-semibold text-amber-600" : detail ? "" : "text-gray-400"}`}>
            {trajet}
            {pos.kind === "au_dessus" ? ` — au-dessus de la grille (${fmtF(pos.plafond)} max)` : detail ? ` — grille : ${fmtF(pos.plafond)} max` : ""}
        </p>
    );
}

function BonDetailModal({
    bon,
    now,
    userName,
    onClose,
    controle,
    grille,
}: {
    bon: BonCaisse;
    now: number;
    /** Position du bon par rapport à la grille des transports. */
    grille: PositionGrille | null;
    userName: (id: string | null | undefined) => string;
    onClose: () => void;
    /** Boutons de contrôle (clôturer / rejeter), si le compte connecté peut contrôler. */
    controle: ReactNode;
}) {
    const { data: audit, isLoading } = useComptaAudit("bons_caisse", bon.id);
    const echeance = echeanceLabel(bon, now);
    const rows: [string, ReactNode][] = [
        ["Bénéficiaire", bon.demandeur_nom],
        ["Motif", bon.motif],
        ["Catégorie", CATEGORIE_LABEL[bon.categorie] ?? bon.categorie],
        ["Demandé le", fmtDateTime(bon.created_at)],
    ];
    if (grille) rows.splice(3, 0, ["Trajet", <GrilleBadge key="g" pos={grille} nb={bon.nb_trajets ?? 1} detail />]);
    if (bon.decision_at) {
        rows.push([bon.status === "refuse" ? "Refusé par" : "Approuvé par", `${userName(bon.decision_par)} — ${fmtDateTime(bon.decision_at)}`]);
    }
    if (bon.refus_motif) rows.push(["Motif du refus", bon.refus_motif]);
    if (bon.remis_at) rows.push(["Remis par", `${userName(bon.remis_par)} — ${fmtDateTime(bon.remis_at)}`]);
    if (bon.echeance_justification) {
        rows.push(["Échéance", `${fmtDateTime(bon.echeance_justification)}${echeance ? ` (${echeance})` : ""}`]);
    }
    if (bon.remis_at) {
        rows.push(["Réception", bon.reception_confirmee_at ? `confirmée le ${fmtDateTime(bon.reception_confirmee_at)}` : "non confirmée"]);
    }
    if (bon.montant_depense !== null) {
        rows.push(["Dépensé", fmtF(bon.montant_depense)]);
        rows.push(["Monnaie à rendre", fmtF(bon.montant - bon.montant_depense)]);
    }
    if (bon.rejet_justification_motif) rows.push(["Justification rejetée", bon.rejet_justification_motif]);
    if (bon.controle_at && bon.status === "cloture") rows.push(["Clôturé par", `${userName(bon.controle_par)} — ${fmtDateTime(bon.controle_at)}`]);
    if (bon.annule_at) rows.push(["Annulé par", `${userName(bon.annule_par)} — ${fmtDateTime(bon.annule_at)} — ${bon.annulation_motif ?? ""}`]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="font-mono text-xs text-gray-400">{bonNumero(bon.numero)}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{fmtF(bon.montant)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[bon.status]}`}>
                            {STATUS_LABEL[bon.status]}
                        </span>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    {rows.map(([k, v]) => (
                        <div key={k} className="contents">
                            <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
                            <dd className="text-gray-900 dark:text-gray-100">{v}</dd>
                        </div>
                    ))}
                </dl>

                {(bon.justificatif_path || bon.preuve_mission_path) && (
                    <section className="mt-5 space-y-3">
                        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
                            <Paperclip className="h-3.5 w-3.5" />
                            Pièces
                        </h3>
                        {bon.justificatif_path && <Piece path={bon.justificatif_path} label="Justificatif (reçu, facture, fiche de course)" />}
                        {bon.preuve_mission_path && <Piece path={bon.preuve_mission_path} label="Preuve de la mission" />}
                    </section>
                )}

                {controle && <div className="mt-5 flex gap-3">{controle}</div>}

                <section className="mt-5">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
                        <History className="h-3.5 w-3.5" />
                        Historique
                    </h3>
                    {isLoading ? (
                        <p className="text-sm text-gray-400">Chargement…</p>
                    ) : !audit ? (
                        <p className="text-sm text-gray-400">Historique indisponible.</p>
                    ) : (
                        <ol className="space-y-2 border-l border-gray-200 pl-3 dark:border-gray-700">
                            {audit.map((e) => (
                                <li key={e.id} className="text-sm">
                                    <p className="text-xs text-gray-400">
                                        {fmtDateTime(e.created_at)} ·{" "}
                                        <span className="font-medium text-gray-600 dark:text-gray-300">{e.actor_name ?? "Système"}</span>
                                    </p>
                                    {describeBonAudit(e).map((line, i) => (
                                        <p key={i} className="text-gray-800 dark:text-gray-200">{line}</p>
                                    ))}
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
        </div>
    );
}
