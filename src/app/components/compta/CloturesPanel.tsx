"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, LockOpen, X } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { useNotificationContext } from "../../context/NotificationContext";
import { ENTREES_KEY, SORTIES_KEY } from "../../lib/hooks/use-accounting";
import { ANOMALIES_KEY, CLOTURES_KEY, isoDay, moisKey, useClotures, type ClotureMois } from "../../lib/hooks/use-controle-compta";
import { logActivity } from "../../utils/activityLogger";
import { fmtDateTime, fmtMois, fmtMoney, MIGRATION_MANQUANTE } from "./format";

type Action = { kind: "cloturer" | "rouvrir"; mois: Date; texte: string };

export default function CloturesPanel() {
    const supabase = createClient();
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const { showNotification } = useNotificationContext();
    const queryClient = useQueryClient();
    const { data: clotures, isLoading } = useClotures();

    // Miroir de compta_cloturer_mois / compta_rouvrir_mois.
    const canClose = hasPermission("accounting.close");
    const canReopen = user?.role === "super_admin";

    const [action, setAction] = useState<Action | null>(null);
    const [busy, setBusy] = useState(false);

    const now = new Date();
    // Mois en cours puis les 11 précédents.
    const mois = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - i, 1));
    const parMois = new Map((clotures ?? []).map((c) => [moisKey(c.mois), c]));

    const run = async () => {
        if (!action || !user) return;
        setBusy(true);
        try {
            const p_mois = isoDay(action.mois);
            const { error } =
                action.kind === "cloturer"
                    ? await supabase.rpc("compta_cloturer_mois", { p_mois, p_commentaire: action.texte.trim() || null })
                    : await supabase.rpc("compta_rouvrir_mois", { p_mois, p_motif: action.texte.trim() });
            if (error) {
                showNotification(error.message || "Action impossible", "error");
                return;
            }
            await logActivity(
                user.id, user.name, user.role,
                "config_update", "compta_clotures", null,
                `${action.kind === "cloturer" ? "Clôture" : "Réouverture"} de ${fmtMois(action.mois)}${action.texte.trim() ? ` — ${action.texte.trim()}` : ""}`,
                { mois: p_mois }
            );
            showNotification(
                action.kind === "cloturer" ? `${fmtMois(action.mois)} clôturé : ses écritures sont figées` : `${fmtMois(action.mois)} rouvert`,
                "success"
            );
            setAction(null);
            queryClient.invalidateQueries({ queryKey: CLOTURES_KEY });
            queryClient.invalidateQueries({ queryKey: ANOMALIES_KEY });
            queryClient.invalidateQueries({ queryKey: ENTREES_KEY });
            queryClient.invalidateQueries({ queryKey: SORTIES_KEY });
        } finally {
            setBusy(false);
        }
    };

    if (isLoading) return <p className="py-16 text-center text-sm text-gray-400">Chargement…</p>;
    if (clotures === null) return <p className="py-16 text-center text-sm text-gray-500">{MIGRATION_MANQUANTE}</p>;

    return (
        <div className="px-6 py-4">
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Clôturer un mois terminé fige ses écritures : plus aucune saisie, modification, suppression ni annulation
                datée de ce mois. Une erreur découverte ensuite se corrige par une écriture de régularisation dans le mois
                en cours. La clôture est refusée tant qu&apos;une sortie du mois attend sa validation. Seul un super
                administrateur peut rouvrir un mois, avec un motif.
            </p>

            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700">
                        {["Mois", "État", "Entrées", "Sorties", "Net", ""].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 first:pl-0">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {mois.map((m, i) => {
                        const c = parMois.get(moisKey(isoDay(m)));
                        const courant = i === 0;
                        const clos = c?.status === "cloture";
                        return (
                            <tr key={m.toISOString()} className="border-b border-gray-100 dark:border-slate-700/60">
                                <td className="py-3 pl-0 pr-3 font-medium capitalize text-gray-900 dark:text-gray-100">{fmtMois(m)}</td>
                                <td className="px-3 py-3">
                                    <Etat c={c} courant={courant} />
                                </td>
                                <td className="px-3 py-3 text-gray-600 dark:text-gray-300"><Totaux c={c} champ="entrees" /></td>
                                <td className="px-3 py-3 text-gray-600 dark:text-gray-300"><Totaux c={c} champ="sorties" /></td>
                                <td className="px-3 py-3 font-semibold text-gray-900 dark:text-gray-100"><Totaux c={c} champ="net" /></td>
                                <td className="py-3 pl-3 pr-0 text-right">
                                    {!courant && !clos && canClose && (
                                        <button
                                            onClick={() => setAction({ kind: "cloturer", mois: m, texte: "" })}
                                            className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-gray-800"
                                        >
                                            <Lock className="h-3 w-3" />
                                            Clôturer
                                        </button>
                                    )}
                                    {clos && canReopen && (
                                        <button
                                            onClick={() => setAction({ kind: "rouvrir", mois: m, texte: "" })}
                                            className="inline-flex items-center gap-1 rounded-full border border-rose-300 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                        >
                                            <LockOpen className="h-3 w-3" />
                                            Rouvrir
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {action && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className={`text-lg font-semibold ${action.kind === "rouvrir" ? "text-rose-600" : "text-gray-900 dark:text-gray-100"}`}>
                                {action.kind === "cloturer" ? "Clôturer" : "Rouvrir"} <span className="capitalize">{fmtMois(action.mois)}</span>
                            </h2>
                            <button onClick={() => setAction(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                            {action.kind === "cloturer"
                                ? "Les totaux du mois sont enregistrés et ses écritures deviennent intouchables. Vérifiez d'abord le livre du mois et le dernier arrêté de caisse."
                                : "Le mois redevient modifiable. La réouverture et son motif restent dans le journal d'audit."}
                        </p>
                        <textarea
                            rows={3}
                            placeholder={action.kind === "cloturer" ? "Commentaire (facultatif)" : "Motif de la réouverture (obligatoire)"}
                            value={action.texte}
                            onChange={(e) => setAction((a) => (a ? { ...a, texte: e.target.value } : a))}
                            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setAction(null)}
                                disabled={busy}
                                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50"
                            >
                                Retour
                            </button>
                            <button
                                onClick={run}
                                disabled={busy || (action.kind === "rouvrir" && action.texte.trim().length < 10)}
                                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                                    action.kind === "rouvrir" ? "bg-rose-600 hover:bg-rose-700" : "bg-gray-900 hover:bg-gray-800"
                                }`}
                            >
                                {busy ? "Envoi…" : action.kind === "cloturer" ? "Clôturer le mois" : "Rouvrir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Etat({ c, courant }: { c: ClotureMois | undefined; courant: boolean }) {
    if (courant) return <span className="text-[11px] text-gray-400">En cours</span>;
    if (!c) return <span className="rounded-full border border-amber-300 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">Ouvert</span>;
    if (c.status === "cloture") {
        return (
            <div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <Lock className="h-3 w-3" />
                    Clôturé
                </span>
                <p className="mt-1 text-[11px] text-gray-400">
                    {fmtDateTime(c.cloture_at)}{c.cloture_par_nom && ` · ${c.cloture_par_nom}`}
                    {c.commentaire && ` — ${c.commentaire}`}
                </p>
            </div>
        );
    }
    return (
        <div>
            <span className="rounded-full border border-rose-300 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600">Rouvert</span>
            <p className="mt-1 text-[11px] text-gray-400">
                {c.rouvert_at && fmtDateTime(c.rouvert_at)}{c.rouvert_par_nom && ` · ${c.rouvert_par_nom}`}
                {c.motif_reouverture && ` — ${c.motif_reouverture}`}
            </p>
        </div>
    );
}

/** Totaux figés à la clôture (FCFA, et USD s'il y a eu des opérations). */
function Totaux({ c, champ }: { c: ClotureMois | undefined; champ: "entrees" | "sorties" | "net" }) {
    if (!c || c.status !== "cloture") return <span className="text-gray-300 dark:text-gray-600">—</span>;
    const lignes = (["FCFA", "USD"] as const)
        .map((d) => [d, c.totaux[d]] as const)
        .filter(([d, t]) => t && (d === "FCFA" || t.nb_entrees + t.nb_sorties > 0));
    return (
        <>
            {lignes.map(([d, t]) => {
                const entrees = Number(t!.entrees), sorties = Number(t!.sorties);
                const v = champ === "entrees" ? entrees : champ === "sorties" ? sorties : entrees - sorties;
                return <p key={d}>{fmtMoney(v, d, champ === "net")}</p>;
            })}
        </>
    );
}
