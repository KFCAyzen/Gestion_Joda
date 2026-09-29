"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { isoDay, useAnomalies, type Anomalie, type Gravite } from "../../lib/hooks/use-controle-compta";
import { fmtDateTime, fmtMois, fmtMoney, MIGRATION_MANQUANTE } from "./format";

const GRAVITE_LABEL: Record<Gravite, string> = { haute: "À vérifier en priorité", moyenne: "À examiner", basse: "Pour information" };
const GRAVITE_CLASS: Record<Gravite, string> = {
    haute: "border-l-rose-500",
    moyenne: "border-l-amber-400",
    basse: "border-l-gray-300 dark:border-l-gray-600",
};
const GRAVITE_TONE: Record<Gravite, string> = {
    haute: "text-rose-600",
    moyenne: "text-amber-600",
    basse: "text-gray-500",
};

// Ce qu'il faut regarder pour chaque signal.
const CONSEIL: Record<string, string> = {
    fractionnement: "Vérifier qu'il ne s'agit pas d'une seule dépense découpée pour éviter l'approbation d'un administrateur.",
    avance_en_retard: "Relancer la personne : ses nouvelles demandes sont bloquées tant que l'avance n'est pas justifiée.",
    encaissement_non_comptabilise: "Un paiement a été validé mais le montant n'est pas (entièrement) entré dans le livre : retrouver l'argent et régulariser.",
    entree_supprimee: "De l'argent reçu a disparu du livre : demander à l'auteur pourquoi, pièce à l'appui.",
    entree_modifiee: "Le montant ou la date d'une recette a changé après coup : vérifier avec le reçu remis à l'étudiant.",
    sortie_annulee: "Une dépense validée a été annulée : vérifier le motif et que l'argent est bien revenu.",
    sortie_en_attente: "Valider ou rejeter : une sortie qui traîne empêche aussi la clôture du mois.",
    ecart_caisse: "La caisse comptée ne correspond pas aux livres : lire l'explication et, si besoin, recompter à l'improviste.",
    arrete_manquant: "Faire compter la caisse (onglet « Arrêtés de caisse ») par le caissier, contrôlé par un tiers.",
    depassement_budget: "Revoir les dépenses de la catégorie ou ajuster le budget dans les réglages.",
    transport_hors_grille: "Comparer le trajet et le tarif demandés à la grille des transports.",
    justification_rejetee: "Des pièces refusées à répétition méritent un entretien avec la personne.",
    saisie_hors_heures: "Saisie la nuit ou le dimanche : vérifier qu'elle correspond à une activité réelle.",
    solde_divergent: "Le solde affiché ne correspond plus aux écritures : un administrateur doit le réconcilier.",
};

const REF_LABEL: Record<string, string> = {
    bons_caisse: "Bon de caisse",
    sorties_comptables: "Sortie",
    entrees_comptables: "Entrée",
    payments: "Paiement",
    compta_arretes: "Arrêté de caisse",
    compta_budgets: "Budget",
};

export default function AnomaliesPanel() {
    const [mois, setMois] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [filtre, setFiltre] = useState<Gravite | "toutes">("toutes");

    const now = new Date();
    const courant = mois.getFullYear() === now.getFullYear() && mois.getMonth() === now.getMonth();
    const debut = isoDay(mois);
    const fin = isoDay(courant ? now : new Date(mois.getFullYear(), mois.getMonth() + 1, 0));
    const { data, isLoading, isFetching, error, refetch } = useAnomalies(debut, fin);

    const anomalies = data ?? [];
    const parGravite = (g: Gravite) => anomalies.filter((a) => a.gravite === g);
    const visibles = filtre === "toutes" ? anomalies : parGravite(filtre);
    const ordre: Gravite[] = ["haute", "moyenne", "basse"];
    const tries = [...visibles].sort(
        (a, b) => ordre.indexOf(a.gravite) - ordre.indexOf(b.gravite)
            || new Date(b.survenu_at).getTime() - new Date(a.survenu_at).getTime()
    );

    return (
        <div className="px-6 py-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setMois((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                        className="rounded-full border border-gray-200 p-1 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
                        aria-label="Mois précédent"
                    >
                        <ChevronLeft className="h-4 w-4 text-gray-500" />
                    </button>
                    <span className="min-w-36 text-center text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">
                        {fmtMois(mois)}
                    </span>
                    <button
                        onClick={() => setMois((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                        disabled={courant}
                        className="rounded-full border border-gray-200 p-1 hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:hover:bg-gray-800/50"
                        aria-label="Mois suivant"
                    >
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                        onClick={() => refetch()}
                        title="Relancer l'analyse"
                        className="ml-1 rounded-full p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 dark:hover:bg-gray-800"
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {(["toutes", ...ordre] as const).map((g) => (
                        <button
                            key={g}
                            onClick={() => setFiltre(g)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                                filtre === g
                                    ? "bg-gray-900 text-white"
                                    : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                            }`}
                        >
                            {g === "toutes" ? `Toutes (${anomalies.length})` : `${GRAVITE_LABEL[g]} (${parGravite(g).length})`}
                        </button>
                    ))}
                </div>
            </div>

            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Signaux calculés par la base sur la période, plus les situations encore en cours (avances en retard,
                sorties qui traînent, caisse non comptée). Ce sont des points à vérifier, pas des accusations.
            </p>

            {isLoading ? (
                <p className="py-16 text-center text-sm text-gray-400">Analyse en cours…</p>
            ) : error ? (
                <p className="py-16 text-center text-sm text-rose-600">{(error as Error).message}</p>
            ) : data === null ? (
                <p className="py-16 text-center text-sm text-gray-500">{MIGRATION_MANQUANTE}</p>
            ) : tries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400">
                    <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-300" />
                    Aucune anomalie {filtre === "toutes" ? "" : "de ce niveau "}sur la période
                </div>
            ) : (
                <ul className="space-y-2">
                    {tries.map((a, i) => (
                        <AnomalieItem key={`${a.code}-${a.ref_id ?? i}-${a.survenu_at}`} a={a} />
                    ))}
                </ul>
            )}
        </div>
    );
}

function AnomalieItem({ a }: { a: Anomalie }) {
    return (
        <li className={`rounded-xl border border-l-4 border-gray-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-800 ${GRAVITE_CLASS[a.gravite]}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className={`flex items-center gap-1.5 text-sm font-semibold ${GRAVITE_TONE[a.gravite]}`}>
                        {a.gravite === "haute" && <AlertTriangle className="h-4 w-4" />}
                        {a.titre}
                    </p>
                    <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{a.detail}</p>
                </div>
                {a.montant !== null && (
                    <p className="whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">
                        {fmtMoney(a.montant, a.devise ?? "FCFA")}
                    </p>
                )}
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
                {fmtDateTime(a.survenu_at)}
                {a.personne && <> · {a.personne}</>}
                {a.ref_table && REF_LABEL[a.ref_table] && <> · {REF_LABEL[a.ref_table]}</>}
            </p>
            {CONSEIL[a.code] && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{CONSEIL[a.code]}</p>}
        </li>
    );
}
