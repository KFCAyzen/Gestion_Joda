"use client";

import { Fragment, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";
import { useNotificationContext } from "../../context/NotificationContext";
import { useSoldeCourant } from "../../lib/hooks/use-accounting";
import { ANOMALIES_KEY, ARRETES_KEY, useArretes, type ArreteCaisse } from "../../lib/hooks/use-controle-compta";
import type { Devise } from "../../lib/schemas/accounting.schema";
import { logActivity } from "../../utils/activityLogger";
import { fmtDateTime, fmtMoney, MIGRATION_MANQUANTE } from "./format";

// Coupures comptées une à une. En FCFA, billets et pièces de 500 sont
// regroupés sur une même ligne (même valeur faciale).
const COUPURES: Record<Devise, number[]> = {
    FCFA: [10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1],
    USD: [100, 50, 20, 10, 5, 2, 1],
};

const STATUS_LABEL: Record<ArreteCaisse["status"], string> = { soumis: "À contrôler", valide: "Validé", conteste: "Contesté" };
const STATUS_CLASS: Record<ArreteCaisse["status"], string> = {
    soumis: "border-violet-300 text-violet-700 dark:text-violet-400",
    valide: "border-emerald-300 text-emerald-700 dark:text-emerald-400",
    conteste: "border-rose-300 text-rose-600 dark:text-rose-400",
};

function ecartClass(ecart: number): string {
    if (ecart < 0) return "font-semibold text-rose-600";
    if (ecart > 0) return "font-semibold text-amber-600";
    return "text-emerald-600";
}

export default function ArretesPanel() {
    const supabase = createClient();
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const { showNotification } = useNotificationContext();
    const queryClient = useQueryClient();

    const [devise, setDevise] = useState<Devise>("FCFA");
    const { data: arretes, isLoading } = useArretes(devise);
    const { data: soldeCache } = useSoldeCourant(devise);

    const isAdminRole = user?.role === "admin" || user?.role === "super_admin";
    // Miroir de trg_compta_arretes_controle (la base reste l'arbitre).
    const canCount = hasPermission("accounting.disburse") || hasPermission("accounting.validate") || isAdminRole;
    const canControl = hasPermission("accounting.validate") || isAdminRole;

    const [form, setForm] = useState<{ open: boolean; comptes: Record<string, string>; momo: string; banque: string; explication: string }>({
        open: false, comptes: {}, momo: "", banque: "", explication: "",
    });
    const [contest, setContest] = useState<{ arrete: ArreteCaisse; commentaire: string } | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const especes = COUPURES[devise].reduce((s, c) => s + c * (Number(form.comptes[String(c)]) || 0), 0);
    const reel = especes + (Number(form.momo) || 0) + (Number(form.banque) || 0);
    const ecartIndicatif = soldeCache === null || soldeCache === undefined ? null : reel - soldeCache;

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ARRETES_KEY });
        queryClient.invalidateQueries({ queryKey: ANOMALIES_KEY });
    };

    const submit = async () => {
        if (!user) return;
        setBusy(true);
        try {
            const billetage = Object.fromEntries(
                COUPURES[devise]
                    .map((c) => [String(c), Math.trunc(Number(form.comptes[String(c)]) || 0)] as const)
                    .filter(([, n]) => n > 0)
            );
            const { data, error } = await supabase
                .from("compta_arretes")
                .insert({
                    devise,
                    billetage,
                    especes,
                    mobile_money: Number(form.momo) || 0,
                    banque: Number(form.banque) || 0,
                    explication: form.explication.trim() || null,
                })
                .select("id, numero, ecart")
                .single();
            if (error) {
                showNotification(error.message || "Arrêté refusé", "error");
                return;
            }
            await logActivity(
                user.id, user.name, user.role,
                "accounting_entry", "compta_arretes", data.id,
                `Arrêté de caisse n° ${data.numero} — écart ${fmtMoney(Number(data.ecart), devise, true)}`,
                { devise, especes }
            );
            showNotification(
                Number(data.ecart) === 0 ? "Arrêté enregistré : la caisse correspond aux livres" : "Arrêté enregistré avec un écart : un tiers doit le contrôler",
                Number(data.ecart) === 0 ? "success" : "warning"
            );
            setForm({ open: false, comptes: {}, momo: "", banque: "", explication: "" });
            invalidate();
        } finally {
            setBusy(false);
        }
    };

    const controler = async (a: ArreteCaisse, status: "valide" | "conteste", commentaire?: string) => {
        if (!user) return false;
        setBusy(true);
        try {
            const { error } = await supabase
                .from("compta_arretes")
                .update({ status, controle_commentaire: commentaire?.trim() || null })
                .eq("id", a.id);
            if (error) {
                showNotification(error.message || "Contrôle impossible", "error");
                return false;
            }
            await logActivity(
                user.id, user.name, user.role,
                "accounting_entry", "compta_arretes", a.id,
                `Arrêté de caisse n° ${a.numero} ${status === "valide" ? "validé" : `contesté — ${commentaire}`}`,
                { ecart: a.ecart }
            );
            showNotification(status === "valide" ? "Arrêté validé" : "Arrêté contesté : faites recompter la caisse", "success");
            invalidate();
            return true;
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="px-6 py-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex overflow-hidden rounded-full border border-gray-200 dark:border-gray-700">
                        {(["FCFA", "USD"] as const).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDevise(d)}
                                className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
                                    devise === d ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                }`}
                            >
                                {d === "USD" ? "$ USD" : "F CFA"}
                            </button>
                        ))}
                    </div>
                    {soldeCache !== null && soldeCache !== undefined && (
                        <p className="text-sm text-gray-500">
                            Solde des livres : <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtMoney(soldeCache, devise)}</span>
                        </p>
                    )}
                </div>
                {canCount && (
                    <button
                        onClick={() => setForm((f) => ({ ...f, open: true }))}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                        <Plus className="h-4 w-4" />
                        Compter la caisse
                    </button>
                )}
            </div>

            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                Le caissier compte les espèces billet par billet et relève les soldes Mobile Money et banque. La base compare
                au solde théorique (entrées − sorties validées − avances en cours) au moment de l&apos;enregistrement. Tout écart
                doit être expliqué ; un autre compte valide ou conteste. Un arrêté ne se modifie ni ne se supprime.
            </p>

            {isLoading ? (
                <p className="py-16 text-center text-sm text-gray-400">Chargement…</p>
            ) : arretes === null ? (
                <p className="py-16 text-center text-sm text-gray-500">{MIGRATION_MANQUANTE}</p>
            ) : !arretes || arretes.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-400">Aucun arrêté en {devise}.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-700">
                            {["N°", "Compté le", "Par", "Réel", "Théorique", "Écart", "Statut", ""].map((h) => (
                                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-gray-400 first:pl-0">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {arretes.map((a) => {
                            const total = a.especes + a.mobile_money + a.banque;
                            const mine = !!user && a.compte_par === user.id;
                            const expanded = openId === a.id;
                            return (
                                <Fragment key={a.id}>
                                    <tr className="border-b border-gray-100 dark:border-slate-700/60">
                                        <td className="py-3 pl-0 pr-3 font-mono text-xs text-gray-500">
                                            <button onClick={() => setOpenId(expanded ? null : a.id)} className="inline-flex items-center gap-1 hover:underline">
                                                {a.numero}
                                                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                            </button>
                                        </td>
                                        <td className="px-3 py-3 text-xs text-gray-500">{fmtDateTime(a.created_at)}</td>
                                        <td className="px-3 py-3 text-gray-900 dark:text-gray-100">{a.compte_par_nom ?? "—"}</td>
                                        <td className="px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">{fmtMoney(total, a.devise)}</td>
                                        <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{fmtMoney(a.solde_theorique, a.devise)}</td>
                                        <td className={`px-3 py-3 ${ecartClass(a.ecart)}`}>
                                            {a.ecart === 0 ? "Aucun" : fmtMoney(a.ecart, a.devise, true)}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[a.status]}`}>
                                                {STATUS_LABEL[a.status]}
                                            </span>
                                        </td>
                                        <td className="py-3 pl-3 pr-0 text-right">
                                            {a.status === "soumis" && canControl && !mine && (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => controler(a, "valide")}
                                                        disabled={busy}
                                                        className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20"
                                                    >
                                                        Valider
                                                    </button>
                                                    <button
                                                        onClick={() => setContest({ arrete: a, commentaire: "" })}
                                                        disabled={busy}
                                                        className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20"
                                                    >
                                                        Contester
                                                    </button>
                                                </div>
                                            )}
                                            {a.status === "soumis" && mine && (
                                                <span className="text-[11px] text-gray-400" title="Un autre compte doit contrôler votre comptage">
                                                    Votre comptage
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    {expanded && (
                                        <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-slate-700/60 dark:bg-slate-800/40">
                                            <td colSpan={8} className="px-3 py-3">
                                                <ArreteDetail a={a} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            )}

            {form.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Arrêté de caisse — {devise}</h2>
                            <button onClick={() => setForm((f) => ({ ...f, open: false }))} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">Espèces</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                            {COUPURES[devise].map((c) => (
                                <label key={c} className="flex items-center gap-2 text-sm">
                                    <span className="w-16 text-right text-gray-600 dark:text-gray-300">{fmtMoney(c, devise)}</span>
                                    <span className="text-gray-400">×</span>
                                    <input
                                        inputMode="numeric"
                                        value={form.comptes[String(c)] ?? ""}
                                        onChange={(e) => {
                                            const v = e.target.value.replace(/[^0-9]/g, "");
                                            setForm((f) => ({ ...f, comptes: { ...f.comptes, [String(c)]: v } }));
                                        }}
                                        placeholder="0"
                                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                                    />
                                </label>
                            ))}
                        </div>
                        <p className="mt-2 text-right text-sm text-gray-600 dark:text-gray-300">
                            Total espèces : <span className="font-semibold text-gray-900 dark:text-gray-100">{fmtMoney(especes, devise)}</span>
                        </p>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {([
                                ["momo", "Solde Mobile Money"],
                                ["banque", "Solde bancaire"],
                            ] as const).map(([k, label]) => (
                                <label key={k} className="text-sm">
                                    <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
                                    <input
                                        inputMode="decimal"
                                        value={form[k]}
                                        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value.replace(/[^0-9.]/g, "") }))}
                                        placeholder="0"
                                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="mt-4 rounded-xl bg-gray-50 p-3 text-sm dark:bg-slate-800">
                            <div className="flex justify-between"><span className="text-gray-500">Total compté</span><span className="font-semibold">{fmtMoney(reel, devise)}</span></div>
                            {ecartIndicatif !== null && (
                                <>
                                    <div className="flex justify-between"><span className="text-gray-500">Solde des livres</span><span>{fmtMoney(soldeCache ?? 0, devise)}</span></div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Écart indicatif</span>
                                        <span className={ecartClass(ecartIndicatif)}>
                                            {ecartIndicatif === 0 ? "Aucun" : fmtMoney(ecartIndicatif, devise, true)}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-gray-400">La base recalcule le solde théorique à l&apos;enregistrement.</p>
                                </>
                            )}
                        </div>

                        <textarea
                            rows={3}
                            placeholder="Explication de l'écart (obligatoire s'il y en a un)"
                            value={form.explication}
                            onChange={(e) => setForm((f) => ({ ...f, explication: e.target.value }))}
                            className="mt-4 w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        />

                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={() => setForm((f) => ({ ...f, open: false }))}
                                disabled={busy}
                                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={submit}
                                disabled={busy}
                                className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                                {busy ? "Enregistrement…" : "Enregistrer l'arrêté"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {contest && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-rose-600">Contester l&apos;arrêté n° {contest.arrete.numero}</h2>
                            <button onClick={() => setContest(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                            Le comptage reste enregistré et tracé ; la caisse devra être recomptée par un nouvel arrêté.
                        </p>
                        <textarea
                            rows={3}
                            placeholder="Pourquoi ? (obligatoire)"
                            value={contest.commentaire}
                            onChange={(e) => setContest((c) => (c ? { ...c, commentaire: e.target.value } : c))}
                            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
                        />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setContest(null)}
                                disabled={busy}
                                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/50"
                            >
                                Retour
                            </button>
                            <button
                                onClick={async () => {
                                    if (await controler(contest.arrete, "conteste", contest.commentaire)) setContest(null);
                                }}
                                disabled={busy || contest.commentaire.trim().length < 5}
                                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                {busy ? "Envoi…" : "Contester"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ArreteDetail({ a }: { a: ArreteCaisse }) {
    const coupures = Object.entries(a.billetage ?? {}).sort((x, y) => Number(y[0]) - Number(x[0]));
    return (
        <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Détail</p>
                <p>Espèces : {fmtMoney(a.especes, a.devise)}</p>
                <p>Mobile Money : {fmtMoney(a.mobile_money, a.devise)}</p>
                <p>Banque : {fmtMoney(a.banque, a.devise)}</p>
                {a.avances_en_cours > 0 && (
                    <p className="mt-1 text-xs text-gray-500">Avances hors caisse à ce moment : {fmtMoney(a.avances_en_cours, a.devise)}</p>
                )}
            </div>
            <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Billetage</p>
                {coupures.length === 0 ? (
                    <p className="text-gray-400">Non détaillé</p>
                ) : (
                    coupures.map(([c, n]) => (
                        <p key={c}>{n} × {fmtMoney(Number(c), a.devise)}</p>
                    ))
                )}
            </div>
            <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Explication et contrôle</p>
                <p>{a.explication ?? "—"}</p>
                {a.controle_at && (
                    <p className="mt-1 text-xs text-gray-500">
                        {a.status === "valide" ? "Validé" : "Contesté"} le {fmtDateTime(a.controle_at)}
                        {a.controle_commentaire && ` — ${a.controle_commentaire}`}
                    </p>
                )}
            </div>
        </div>
    );
}
