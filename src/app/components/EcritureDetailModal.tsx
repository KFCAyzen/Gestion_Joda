"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, History, Lock, Paperclip, X } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useComptaAudit, type ComptaAuditEntry } from "../lib/hooks/use-accounting";
import { getJustificatifUrl, isPdfJustificatif, JUSTIFICATIF_ACCEPT } from "../lib/justificatifs";
import { parseDbDate } from "../lib/dates";

/** Ce que la fiche affiche d'une écriture du Livre comptable. */
export interface EcritureDetail {
    kind: "entree" | "sortie";
    id: string;
    montant: number;
    date: string;
    created_at: string;
    description: string;
    categorieLabel: string;
    /** null pour une entrée (pas de circuit de validation). */
    status: string | null;
    created_by: string | null;
    beneficiaire_id?: string | null;
    beneficiaire_nom?: string | null;
    justificatif_path?: string | null;
    validated_by?: string | null;
    validated_at?: string | null;
    rejected_by?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
    cancelled_by?: string | null;
    cancelled_at?: string | null;
    cancellation_reason?: string | null;
    linkedToPayslip: boolean;
}

interface Props {
    detail: EcritureDetail;
    onClose: () => void;
    money: (n: number) => string;
    /** Nom complet d'un compte (ou repli lisible si inconnu). */
    userName: (id: string | null | undefined) => string;
    /** Le compte connecté peut-il joindre une pièce à cette sortie ? */
    canAttach: boolean;
    onAttach: (file: File) => Promise<void>;
}

const STATUS_LABEL: Record<string, string> = {
    pending: "En attente",
    validated: "Validée",
    rejected: "Rejetée",
    cancelled: "Annulée",
};

const STATUS_CLASS: Record<string, string> = {
    pending: "border-amber-300 text-amber-700 dark:text-amber-400",
    validated: "border-emerald-300 text-emerald-700 dark:text-emerald-400",
    rejected: "border-rose-300 text-rose-600 dark:text-rose-400",
    cancelled: "border-gray-300 text-gray-500 dark:text-gray-400",
};

// Champs de contenu dont l'historique montre l'ancienne et la nouvelle valeur.
const FIELD_LABEL: Record<string, string> = {
    montant: "Montant",
    description: "Désignation",
    date: "Date",
    categorie: "Catégorie",
    type: "Type",
    devise: "Devise",
    beneficiaire_nom: "Bénéficiaire",
};

function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

function fmtValue(v: unknown): string {
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
}

/** Traduit une ligne d'audit en phrases lisibles. */
function describeAudit(e: ComptaAuditEntry, money: (n: number) => string): string[] {
    const oldD = e.old_data ?? {};
    const newD = e.new_data ?? {};
    if (e.operation === "INSERT") return [`Saisie — ${money(Number(newD.montant ?? 0))}`];
    if (e.operation === "DELETE") return [`Suppression — ${money(Number(oldD.montant ?? 0))} (${fmtValue(oldD.description)})`];

    const lines: string[] = [];
    const fields = e.changed_fields ?? [];
    if (fields.includes("status")) {
        const to = String(newD.status ?? "");
        let line = `Statut : ${STATUS_LABEL[String(oldD.status)] ?? fmtValue(oldD.status)} → ${STATUS_LABEL[to] ?? to}`;
        if (to === "rejected" && newD.rejection_reason) line += ` — motif : ${newD.rejection_reason}`;
        if (to === "cancelled" && newD.cancellation_reason) line += ` — motif : ${newD.cancellation_reason}`;
        lines.push(line);
    }
    for (const f of fields) {
        if (FIELD_LABEL[f]) {
            const fmt = f === "montant" ? (v: unknown) => money(Number(v ?? 0)) : fmtValue;
            lines.push(`${FIELD_LABEL[f]} : ${fmt(oldD[f])} → ${fmt(newD[f])}`);
        }
    }
    if (fields.includes("justificatif_path")) lines.push(oldD.justificatif_path ? "Justificatif remplacé" : "Justificatif joint");
    return lines.length ? lines : [`Mise à jour (${fields.join(", ")})`];
}

export default function EcritureDetailModal({ detail, onClose, money, userName, canAttach, onAttach }: Props) {
    const isSortie = detail.kind === "sortie";
    const table = isSortie ? "sorties_comptables" : "entrees_comptables";
    const { data: audit, isLoading: auditLoading } = useComptaAudit(table, detail.id);

    const [pieceUrl, setPieceUrl] = useState<string | null>(null);
    const [pieceError, setPieceError] = useState(false);
    const [attaching, setAttaching] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Lien signé de la pièce, régénéré si la pièce change (dépôt depuis cette fiche).
    useEffect(() => {
        let cancelled = false;
        setPieceUrl(null);
        setPieceError(false);
        if (!detail.justificatif_path) return;
        getJustificatifUrl(createClient(), detail.justificatif_path).then((url) => {
            if (cancelled) return;
            if (url) setPieceUrl(url);
            else setPieceError(true);
        });
        return () => {
            cancelled = true;
        };
    }, [detail.justificatif_path]);

    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        setAttaching(true);
        try {
            await onAttach(file);
        } finally {
            setAttaching(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const beneficiaire = detail.beneficiaire_nom || (detail.beneficiaire_id ? userName(detail.beneficiaire_id) : null);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                            {isSortie ? "Sortie" : "Entrée"} · {detail.categorieLabel}
                        </p>
                        <p className={`mt-1 text-2xl font-bold ${isSortie ? "text-red-500" : "text-green-600"} ${
                            detail.status === "cancelled" || detail.status === "rejected" ? "line-through opacity-60" : ""
                        }`}>
                            {isSortie ? "−" : "+"}{money(detail.montant)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {detail.status && (
                            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[detail.status] ?? ""}`}>
                                {STATUS_LABEL[detail.status] ?? detail.status}
                            </span>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-400" aria-label="Fermer">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                    <dt className="text-gray-500 dark:text-gray-400">Désignation</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">{detail.description}</dd>
                    <dt className="text-gray-500 dark:text-gray-400">Date</dt>
                    <dd className="text-gray-900 dark:text-gray-100">{parseDbDate(detail.date).toLocaleDateString("fr-FR")}</dd>
                    {isSortie && (
                        <>
                            <dt className="text-gray-500 dark:text-gray-400">Bénéficiaire</dt>
                            <dd className={beneficiaire ? "text-gray-900 dark:text-gray-100" : "font-medium text-amber-600"}>
                                {beneficiaire ?? "Non renseigné"}
                            </dd>
                        </>
                    )}
                    <dt className="text-gray-500 dark:text-gray-400">Saisie par</dt>
                    <dd className="text-gray-900 dark:text-gray-100">
                        {detail.linkedToPayslip ? "Bulletin de paie" : userName(detail.created_by)}
                        <span className="ml-1 text-xs text-gray-400">le {fmtDateTime(detail.created_at)}</span>
                    </dd>
                    {detail.validated_at && (
                        <>
                            <dt className="text-gray-500 dark:text-gray-400">Validée par</dt>
                            <dd className="text-gray-900 dark:text-gray-100">
                                {userName(detail.validated_by)}
                                <span className="ml-1 text-xs text-gray-400">le {fmtDateTime(detail.validated_at)}</span>
                            </dd>
                        </>
                    )}
                    {detail.status === "rejected" && (
                        <>
                            <dt className="text-gray-500 dark:text-gray-400">Rejetée par</dt>
                            <dd className="text-gray-900 dark:text-gray-100">
                                {userName(detail.rejected_by)}
                                {detail.rejected_at && <span className="ml-1 text-xs text-gray-400">le {fmtDateTime(detail.rejected_at)}</span>}
                                {detail.rejection_reason && <span className="block text-xs text-rose-600">Motif : {detail.rejection_reason}</span>}
                            </dd>
                        </>
                    )}
                    {detail.status === "cancelled" && (
                        <>
                            <dt className="text-gray-500 dark:text-gray-400">Annulée par</dt>
                            <dd className="text-gray-900 dark:text-gray-100">
                                {userName(detail.cancelled_by)}
                                {detail.cancelled_at && <span className="ml-1 text-xs text-gray-400">le {fmtDateTime(detail.cancelled_at)}</span>}
                                {detail.cancellation_reason && <span className="block text-xs text-gray-500">Motif : {detail.cancellation_reason}</span>}
                            </dd>
                        </>
                    )}
                </dl>

                {isSortie && (
                    <section className="mt-5">
                        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
                            <Paperclip className="h-3.5 w-3.5" />
                            Justificatif
                        </h3>
                        {detail.linkedToPayslip ? (
                            <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                                <Lock className="h-3.5 w-3.5" />
                                Sortie générée par un bulletin de paie : la pièce est le bulletin lui-même.
                            </p>
                        ) : detail.justificatif_path ? (
                            pieceError ? (
                                <p className="text-sm text-rose-600">Pièce inaccessible (droits de lecture ou fichier absent).</p>
                            ) : !pieceUrl ? (
                                <p className="text-sm text-gray-400">Chargement de la pièce…</p>
                            ) : isPdfJustificatif(detail.justificatif_path) ? (
                                <a
                                    href={pieceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    <FileText className="h-4 w-4" />
                                    Ouvrir le PDF
                                </a>
                            ) : (
                                <a href={pieceUrl} target="_blank" rel="noopener noreferrer" title="Ouvrir en grand">
                                    <img
                                        src={pieceUrl}
                                        alt="Justificatif de la sortie"
                                        className="max-h-72 w-full rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                                    />
                                </a>
                            )
                        ) : (
                            <div className="flex flex-wrap items-center gap-3">
                                <p className="text-sm font-medium text-amber-600">
                                    Aucun justificatif : cette sortie ne peut pas être validée.
                                </p>
                                {canAttach && (
                                    <>
                                        <input
                                            ref={fileRef}
                                            type="file"
                                            accept={JUSTIFICATIF_ACCEPT}
                                            className="hidden"
                                            onChange={(e) => handleFile(e.target.files?.[0])}
                                        />
                                        <button
                                            onClick={() => fileRef.current?.click()}
                                            disabled={attaching}
                                            className="rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                                        >
                                            {attaching ? "Dépôt…" : "Joindre un justificatif"}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </section>
                )}

                <section className="mt-5">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400">
                        <History className="h-3.5 w-3.5" />
                        Historique
                    </h3>
                    {auditLoading ? (
                        <p className="text-sm text-gray-400">Chargement…</p>
                    ) : audit === null || audit === undefined ? (
                        <p className="text-sm text-gray-400">Historique indisponible (journal d&apos;audit non activé en base).</p>
                    ) : audit.length === 0 ? (
                        <p className="text-sm text-gray-400">Aucun événement enregistré : écriture antérieure au journal d&apos;audit.</p>
                    ) : (
                        <ol className="space-y-2 border-l border-gray-200 pl-3 dark:border-gray-700">
                            {audit.map((e) => (
                                <li key={e.id} className="text-sm">
                                    <p className="text-xs text-gray-400">
                                        {fmtDateTime(e.created_at)} ·{" "}
                                        <span className="font-medium text-gray-600 dark:text-gray-300">
                                            {e.actor_name ?? (e.db_role === "service_role" ? "Serveur" : "Système")}
                                        </span>
                                    </p>
                                    {describeAudit(e, money).map((line, i) => (
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
