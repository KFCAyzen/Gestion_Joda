"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import { COMPTA_PARAMETRES_KEY } from "../../lib/hooks/use-bons-caisse";
import {
    ANOMALIES_KEY,
    BUDGETS_SUIVI_KEY,
    GRILLE_TRANSPORT_KEY,
    PARAMETRES_COMPLETS_KEY,
    isoDay,
    useBudgetsSuivi,
    useComptaParametresComplets,
    useGrilleTransport,
    type ComptaParametresComplets,
} from "../../lib/hooks/use-controle-compta";
import type { Devise } from "../../lib/schemas/accounting.schema";
import { logActivity } from "../../utils/activityLogger";
import { CATEGORIES_SORTIES, categorieLabel, fmtMois, fmtMoney, MIGRATION_MANQUANTE } from "./format";

// Ligne unique de compta_parametres (id fixe, cf. add_bons_caisse_phase2.sql).
const PARAMETRES_ID = "00000000-0000-0000-0000-000000000001";

const PARAMS: { key: keyof ComptaParametresComplets; label: string; unit: string; help: string }[] = [
    { key: "seuil_approbation_admin", label: "Seuil d'approbation administrateur", unit: "F", help: "À partir de ce montant, seul un administrateur approuve un bon de caisse." },
    { key: "delai_justification_heures", label: "Délai de justification d'une avance", unit: "h", help: "Passé ce délai après la remise, les nouvelles demandes de la personne sont bloquées." },
    { key: "frequence_arrete_jours", label: "Fréquence des arrêtés de caisse", unit: "jours", help: "Au-delà sans comptage, une anomalie est signalée." },
    { key: "delai_sortie_attente_jours", label: "Délai max. d'une sortie en attente", unit: "jours", help: "Une sortie non traitée plus longtemps est signalée." },
];

const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white";

export default function ReglagesPanel() {
    const supabase = createClient();
    const { user } = useAuth();
    const { showNotification } = useNotificationContext();
    const queryClient = useQueryClient();
    // Écriture réservée aux administrateurs (RLS des tables de paramètres).
    const canEdit = user?.role === "admin" || user?.role === "super_admin";

    const now = new Date();
    const moisCourant = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data: params, isLoading: loadingParams } = useComptaParametresComplets();
    const { data: budgets } = useBudgetsSuivi(isoDay(moisCourant));
    const { data: grille } = useGrilleTransport();

    const [paramForm, setParamForm] = useState<Record<string, string>>({});
    useEffect(() => {
        if (params) setParamForm(Object.fromEntries(PARAMS.map((p) => [p.key, String(params[p.key])])));
    }, [params]);

    const [budgetForm, setBudgetForm] = useState<{ categorie: string; devise: Devise; montant: string }>({
        categorie: "fournitures", devise: "FCFA", montant: "",
    });
    const [trajetForm, setTrajetForm] = useState({ trajet: "", montant: "" });
    const [busy, setBusy] = useState(false);

    const write = async (
        run: () => PromiseLike<{ error: { message: string } | null }>,
        success: string,
        log: string,
        keys: unknown[][]
    ) => {
        if (!user) return false;
        setBusy(true);
        try {
            const { error } = await run();
            if (error) {
                showNotification(error.message || "Enregistrement impossible", "error");
                return false;
            }
            await logActivity(user.id, user.name, user.role, "config_update", "comptabilite", null, log);
            showNotification(success, "success");
            keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
            return true;
        } finally {
            setBusy(false);
        }
    };

    const saveParams = () => {
        const patch = Object.fromEntries(PARAMS.map((p) => [p.key, Number(paramForm[p.key])]));
        if (Object.values(patch).some((v) => !Number.isFinite(v) || v <= 0)) {
            showNotification("Chaque paramètre doit être un nombre positif", "error");
            return;
        }
        write(
            () => supabase.from("compta_parametres").update(patch).eq("id", PARAMETRES_ID),
            "Paramètres enregistrés",
            `Paramètres comptables : ${PARAMS.map((p) => `${p.key}=${patch[p.key]}`).join(", ")}`,
            [PARAMETRES_COMPLETS_KEY, COMPTA_PARAMETRES_KEY, ANOMALIES_KEY]
        );
    };

    const addBudget = async () => {
        const montant = Number(budgetForm.montant);
        if (!montant || montant <= 0) {
            showNotification("Indiquez le budget mensuel", "error");
            return;
        }
        const exists = budgets?.some((b) => b.categorie === budgetForm.categorie && b.devise === budgetForm.devise);
        const ok = await write(
            () =>
                exists
                    ? supabase.from("compta_budgets").update({ montant_mensuel: montant, actif: true, updated_at: new Date().toISOString() })
                        .eq("categorie", budgetForm.categorie).eq("devise", budgetForm.devise)
                    : supabase.from("compta_budgets").insert({ categorie: budgetForm.categorie, devise: budgetForm.devise, montant_mensuel: montant }),
            "Budget enregistré",
            `Budget ${categorieLabel(budgetForm.categorie)} (${budgetForm.devise}) : ${montant} par mois`,
            [BUDGETS_SUIVI_KEY, ANOMALIES_KEY]
        );
        if (ok) setBudgetForm((f) => ({ ...f, montant: "" }));
    };

    const toggleBudget = (categorie: string, devise: Devise, actif: boolean) =>
        write(
            () => supabase.from("compta_budgets").update({ actif, updated_at: new Date().toISOString() }).eq("categorie", categorie).eq("devise", devise),
            actif ? "Budget réactivé" : "Budget désactivé",
            `Budget ${categorieLabel(categorie)} (${devise}) ${actif ? "réactivé" : "désactivé"}`,
            [BUDGETS_SUIVI_KEY, ANOMALIES_KEY]
        );

    const addTrajet = async () => {
        const montant = Number(trajetForm.montant);
        if (trajetForm.trajet.trim().length < 3 || !montant || montant <= 0) {
            showNotification("Indiquez le trajet et son tarif maximal", "error");
            return;
        }
        const ok = await write(
            () => supabase.from("compta_grille_transport").insert({ trajet: trajetForm.trajet.trim(), montant_max: montant }),
            "Trajet ajouté à la grille",
            `Grille des transports : ${trajetForm.trajet.trim()} = ${montant} F`,
            [GRILLE_TRANSPORT_KEY, ANOMALIES_KEY]
        );
        if (ok) setTrajetForm({ trajet: "", montant: "" });
    };

    const updateTrajet = (id: string, trajet: string, patch: { montant_max?: number; actif?: boolean }) =>
        write(
            () => supabase.from("compta_grille_transport").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id),
            "Grille mise à jour",
            `Grille des transports : ${trajet} — ${JSON.stringify(patch)}`,
            [GRILLE_TRANSPORT_KEY, ANOMALIES_KEY]
        );

    if (loadingParams) return <p className="py-16 text-center text-sm text-gray-400">Chargement…</p>;
    if (params === null) return <p className="py-16 text-center text-sm text-gray-500">{MIGRATION_MANQUANTE}</p>;

    return (
        <div className="space-y-8 px-6 py-4">
            {!canEdit && (
                <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                    Lecture seule : seuls les administrateurs modifient ces réglages. Chaque changement est tracé.
                </p>
            )}

            <section>
                <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Circuit des dépenses</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {PARAMS.map((p) => (
                        <label key={p.key} className="text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">{p.label}</span>
                            <div className="flex items-center gap-2">
                                <input
                                    inputMode="numeric"
                                    value={paramForm[p.key] ?? ""}
                                    disabled={!canEdit}
                                    onChange={(e) => setParamForm((f) => ({ ...f, [p.key]: e.target.value.replace(/[^0-9]/g, "") }))}
                                    className={inputClass}
                                />
                                <span className="w-10 text-xs text-gray-400">{p.unit}</span>
                            </div>
                            <span className="mt-1 block text-[11px] text-gray-400">{p.help}</span>
                        </label>
                    ))}
                </div>
                {canEdit && (
                    <button
                        onClick={saveParams}
                        disabled={busy}
                        className="mt-4 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                        Enregistrer les paramètres
                    </button>
                )}
            </section>

            <section>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Budgets mensuels</h2>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                    Consommé en <span className="capitalize">{fmtMois(moisCourant)}</span> : sorties validées + avances approuvées
                    non clôturées. Au-delà du budget, seul un administrateur valide une sortie ou approuve un bon.
                </p>
                {budgets && budgets.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-700">
                                {["Catégorie", "Budget", "Consommé", "", ""].map((h, i) => (
                                    <th key={i} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 first:pl-0">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {budgets.map((b) => {
                                const ratio = b.montant_mensuel > 0 ? b.consomme / b.montant_mensuel : 0;
                                return (
                                    <tr key={`${b.categorie}-${b.devise}`} className={`border-b border-gray-100 dark:border-slate-700/60 ${b.actif ? "" : "opacity-50"}`}>
                                        <td className="py-2.5 pl-0 pr-3 font-medium text-gray-900 dark:text-gray-100">
                                            {categorieLabel(b.categorie)} <span className="text-xs text-gray-400">{b.devise}</span>
                                        </td>
                                        <td className="px-3 py-2.5">{fmtMoney(b.montant_mensuel, b.devise)}</td>
                                        <td className={`px-3 py-2.5 ${ratio > 1 ? "font-semibold text-rose-600" : "text-gray-600 dark:text-gray-300"}`}>
                                            {fmtMoney(b.consomme, b.devise)}
                                        </td>
                                        <td className="w-40 px-3 py-2.5">
                                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-700">
                                                <div
                                                    className={`h-full rounded-full ${ratio > 1 ? "bg-rose-500" : ratio > 0.8 ? "bg-amber-400" : "bg-emerald-500"}`}
                                                    style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-2.5 pl-3 pr-0 text-right">
                                            {canEdit && (
                                                <button
                                                    onClick={() => toggleBudget(b.categorie, b.devise, !b.actif)}
                                                    disabled={busy}
                                                    className="text-[11px] font-medium text-gray-500 hover:underline"
                                                >
                                                    {b.actif ? "Désactiver" : "Réactiver"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-sm text-gray-400">Aucun budget défini.</p>
                )}
                {canEdit && (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                        <select
                            value={budgetForm.categorie}
                            onChange={(e) => setBudgetForm((f) => ({ ...f, categorie: e.target.value }))}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        >
                            {CATEGORIES_SORTIES.map((c) => (
                                <option key={c} value={c}>{categorieLabel(c)}</option>
                            ))}
                        </select>
                        <select
                            value={budgetForm.devise}
                            onChange={(e) => setBudgetForm((f) => ({ ...f, devise: e.target.value as Devise }))}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        >
                            <option value="FCFA">FCFA</option>
                            <option value="USD">USD</option>
                        </select>
                        <input
                            inputMode="numeric"
                            placeholder="Montant par mois"
                            value={budgetForm.montant}
                            onChange={(e) => setBudgetForm((f) => ({ ...f, montant: e.target.value.replace(/[^0-9]/g, "") }))}
                            className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        />
                        <button
                            onClick={addBudget}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <Plus className="h-4 w-4" />
                            Définir
                        </button>
                    </div>
                )}
            </section>

            <section>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Grille des transports</h2>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                    Tarif maximal d&apos;un trajet simple. Dès qu&apos;un trajet est actif, un bon de transport hors grille ou
                    au-dessus du tarif (× nombre de trajets) ne peut être approuvé que par un administrateur.
                </p>
                {grille && grille.length > 0 ? (
                    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                        {grille.map((t) => (
                            <TrajetRow
                                key={t.id}
                                trajet={t.trajet}
                                montant={t.montant_max}
                                actif={t.actif}
                                canEdit={canEdit}
                                busy={busy}
                                onSave={(m) => updateTrajet(t.id, t.trajet, { montant_max: m })}
                                onToggle={() => updateTrajet(t.id, t.trajet, { actif: !t.actif })}
                            />
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-400">Aucun trajet : les bons de transport suivent seulement le seuil général.</p>
                )}
                {canEdit && (
                    <div className="mt-3 flex flex-wrap items-end gap-2">
                        <input
                            placeholder="Trajet (ex. Bureau → Ambassade de Chine)"
                            value={trajetForm.trajet}
                            onChange={(e) => setTrajetForm((f) => ({ ...f, trajet: e.target.value }))}
                            className="min-w-64 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        />
                        <input
                            inputMode="numeric"
                            placeholder="Tarif max (F)"
                            value={trajetForm.montant}
                            onChange={(e) => setTrajetForm((f) => ({ ...f, montant: e.target.value.replace(/[^0-9]/g, "") }))}
                            className="w-36 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        />
                        <button
                            onClick={addTrajet}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            <Plus className="h-4 w-4" />
                            Ajouter
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

function TrajetRow({
    trajet, montant, actif, canEdit, busy, onSave, onToggle,
}: {
    trajet: string;
    montant: number;
    actif: boolean;
    canEdit: boolean;
    busy: boolean;
    onSave: (montant: number) => void;
    onToggle: () => void;
}) {
    const [value, setValue] = useState(String(montant));
    useEffect(() => setValue(String(montant)), [montant]);
    const changed = Number(value) > 0 && Number(value) !== montant;
    return (
        <li className={`flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm ${actif ? "" : "opacity-50"}`}>
            <span className="font-medium text-gray-900 dark:text-gray-100">{trajet}</span>
            <div className="flex items-center gap-2">
                {canEdit ? (
                    <>
                        <input
                            inputMode="numeric"
                            value={value}
                            onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-28 rounded-lg border border-gray-200 bg-white px-2 py-1 text-right text-sm dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        />
                        <span className="text-xs text-gray-400">F</span>
                        {changed && (
                            <button onClick={() => onSave(Number(value))} disabled={busy} className="text-[11px] font-semibold text-emerald-700 hover:underline">
                                Enregistrer
                            </button>
                        )}
                        <button onClick={onToggle} disabled={busy} className="text-[11px] font-medium text-gray-500 hover:underline">
                            {actif ? "Désactiver" : "Réactiver"}
                        </button>
                    </>
                ) : (
                    <span className="text-gray-600 dark:text-gray-300">{fmtMoney(montant, "FCFA")}</span>
                )}
            </div>
        </li>
    );
}
