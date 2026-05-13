"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
    AlertTriangle,
    BookOpenCheck,
    Camera,
    Check,
    ChevronRight,
    FileBarChart,
    FilePenLine,
    Handshake,
    IdCard,
    Loader2,
    Medal,
    Scale,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { logActivity } from "../utils/activityLogger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { compressImage, formatFileSize } from "../utils/imageCompression";
import { FILE_LIMITS, validateFile } from "../utils/fileValidation";

const REQUIRED_DOCS = [
    { key: "passeport", label: "Passeport", description: "Copie des pages d'identité" },
    { key: "casier_judiciaire", label: "Casier judiciaire", description: "Bulletin n°3 de moins de 3 mois" },
    { key: "carte_photo", label: "Photo d'identité", description: "Photo récente fond blanc" },
    { key: "releve_bac", label: "Relevé de notes", description: "Derniers relevés de notes officiels" },
    { key: "diplome_bac", label: "Diplôme", description: "Diplôme le plus élevé obtenu" },
    { key: "lettre_motivation", label: "Lettre de motivation", description: "Rédigée en français ou anglais" },
    { key: "lettre_recommandation", label: "Lettre de recommandation", description: "D'un professeur ou employeur" },
    { key: "certificat_hsk", label: "Certificat HSK", description: "Si disponible (optionnel)" },
] as const;

type DocKey = (typeof REQUIRED_DOCS)[number]["key"];

/** Fitness « Résumé » : icône + anneau de couleur par type de document */
const DOC_CARD_THEME: Record<
    DocKey,
    { Icon: LucideIcon; ring: string; iconClass: string; statClass: string; softGlow?: string }
> = {
    passeport: {
        Icon: IdCard,
        ring: "border-violet-400/40 bg-violet-500/[0.12]",
        iconClass: "text-violet-200",
        statClass: "text-violet-200",
        softGlow: "shadow-[0_0_28px_rgba(167,139,250,0.18)]",
    },
    casier_judiciaire: {
        Icon: Scale,
        ring: "border-cyan-400/38 bg-cyan-500/10",
        iconClass: "text-cyan-200",
        statClass: "text-cyan-200",
        softGlow: "shadow-[0_0_24px_rgba(34,211,238,0.15)]",
    },
    carte_photo: {
        Icon: Camera,
        ring: "border-[rgba(220,38,38,0.45)] bg-[rgba(220,38,38,0.10)]",
        iconClass: "text-[var(--student-neon-lime)]",
        statClass: "text-[var(--student-neon-lime)]",
        softGlow: "shadow-[var(--student-pay-glow-soft)]",
    },
    releve_bac: {
        Icon: FileBarChart,
        ring: "border-sky-400/35 bg-sky-500/10",
        iconClass: "text-sky-200",
        statClass: "text-sky-200",
    },
    diplome_bac: {
        Icon: Medal,
        ring: "border-fuchsia-400/35 bg-fuchsia-500/10",
        iconClass: "text-fuchsia-200",
        statClass: "text-fuchsia-200",
    },
    lettre_motivation: {
        Icon: FilePenLine,
        ring: "border-orange-400/35 bg-orange-500/10",
        iconClass: "text-orange-200",
        statClass: "text-orange-200",
    },
    lettre_recommandation: {
        Icon: Handshake,
        ring: "border-indigo-400/35 bg-indigo-500/12",
        iconClass: "text-indigo-200",
        statClass: "text-indigo-200",
    },
    certificat_hsk: {
        Icon: BookOpenCheck,
        ring: "border-emerald-400/35 bg-emerald-500/10",
        iconClass: "text-emerald-200",
        statClass: "text-emerald-200",
    },
};

interface DocStatus {
    id: string;
    type: string;
    status: string;
    url: string;
    uploaded_at: string;
}

interface Props {
    studentId: string | null;
    onDocumentUploaded: () => void;
}

export default function DocumentUpload({ studentId, onDocumentUploaded }: Props) {
    const supabase = createClient();
    const { user } = useAuth();
    const { showNotification } = useNotificationContext();
    const [docs, setDocs] = useState<DocStatus[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [notifSent, setNotifSent] = useState(false);
    const [hasNewUpload, setHasNewUpload] = useState(false);
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const loadDocs = useCallback(async () => {
        if (!studentId) return;
        const { data } = await supabase.from("documents").select("*").eq("student_id", studentId);
        setDocs(data || []);
    }, [studentId]);

    useEffect(() => {
        loadDocs();
    }, [loadDocs]);

    useEffect(() => {
        if (!studentId) return;
        const channel = supabase
            .channel(`docs-rt-${studentId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "documents",
                    filter: `student_id=eq.${studentId}`,
                },
                () => {
                    loadDocs();
                },
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [studentId, loadDocs]);

    const getDoc = (key: string) => docs.find((d) => d.type === key);

    const handleUpload = async (key: DocKey, file: File) => {
        if (!studentId) return;

        const existing = getDoc(key);
        if (existing?.status === "valide") {
            showNotification("Ce document a été validé et ne peut plus être remplacé.", "error");
            return;
        }

        const validation = validateFile(file);
        if (!validation.valid) {
            showNotification(validation.error || "Fichier invalide", "error");
            return;
        }

        setUploading(key);
        try {
            let fileToUpload = file;
            if (file.type.startsWith("image/")) {
                try {
                    fileToUpload = await compressImage(file, FILE_LIMITS.TARGET_COMPRESSED_SIZE_MB);
                } catch {
                    /* fichier original */
                }
            }

            const finalValidation = validateFile(fileToUpload);
            if (!finalValidation.valid) {
                showNotification(finalValidation.error || "Fichier invalide", "error");
                return;
            }

            const ext = fileToUpload.name.split(".").pop();
            const path = `documents/${studentId}/${key}_${Date.now()}.${ext}`;

            const { error: storageError } = await supabase.storage
                .from("student-documents")
                .upload(path, fileToUpload, { upsert: true });

            if (storageError) throw storageError;

            const { data: urlData } = supabase.storage.from("student-documents").getPublicUrl(path);

            const ex = getDoc(key);
            if (ex) {
                await supabase
                    .from("documents")
                    .update({
                        url: urlData.publicUrl,
                        status: "en_attente",
                        uploaded_at: new Date().toISOString(),
                    })
                    .eq("id", ex.id);
            } else {
                await supabase.from("documents").insert({
                    student_id: studentId,
                    type: key,
                    status: "en_attente",
                    url: urlData.publicUrl,
                    uploaded_at: new Date().toISOString(),
                });
            }

            await loadDocs();
            onDocumentUploaded();
            setNotifSent(false);
            setHasNewUpload(true);

            if (user) {
                await logActivity(
                    user.id,
                    user.name,
                    user.role,
                    "document_upload",
                    "documents",
                    studentId,
                    `Document uploadé — ${REQUIRED_DOCS.find((d) => d.key === key)?.label || key}`,
                    { student_id: studentId, doc_type: key },
                );
            }

            const updatedDocs = await supabase.from("documents").select("type").eq("student_id", studentId);
            const uploadedTypes = new Set(updatedDocs.data?.map((d) => d.type) || []);
            const requiredKeys = REQUIRED_DOCS.filter((d) => d.key !== "certificat_hsk").map((d) => d.key);
            const allUploaded = requiredKeys.every((k) => uploadedTypes.has(k));

            if (allUploaded) {
                await supabase
                    .from("dossier_bourses")
                    .update({ status: "document_recu" })
                    .eq("student_id", studentId)
                    .eq("status", "document_manquant");
            }
        } catch (err) {
            console.error("Erreur upload:", err);
            showNotification("Erreur lors de l'upload du fichier. Veuillez réessayer.", "error");
        } finally {
            setUploading(null);
        }
    };

    const handleSendToStaff = async () => {
        if (!studentId) return;
        setSending(true);
        try {
            const res = await fetch("/api/notify-staff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId }),
            });
            if (!res.ok) throw new Error("Erreur serveur");
            setNotifSent(true);
            setHasNewUpload(false);
            showNotification("Dossier envoyé à l'équipe avec succès.", "success");
        } catch {
            showNotification("Impossible d'envoyer le dossier. Réessayez.", "error");
        } finally {
            setSending(false);
        }
    };

    const completion = REQUIRED_DOCS.filter((d) => d.key !== "certificat_hsk").filter((d) => getDoc(d.key)).length;
    const total = REQUIRED_DOCS.filter((d) => d.key !== "certificat_hsk").length;
    const pct = Math.round((completion / total) * 100);

    if (!studentId) {
        return (
            <div className="student-pay-surface-soft rounded-[1.75rem] py-14 text-center text-sm text-white/55">
                Profil étudiant introuvable.
            </div>
        );
    }

    const statLabelFor = (uploaded: DocStatus | undefined) => {
        if (!uploaded) return "À fournir";
        if (uploaded.status === "valide") return "Validé";
        if (uploaded.status === "non_conforme") return "Non conforme";
        return "En examen";
    };

    return (
        <div className="space-y-5">
            <div className="student-pay-surface-soft px-5 py-4 text-sm">
                <p className="font-semibold tracking-tight text-white">Informations importantes</p>
                <ul className="mt-2 ml-4 list-disc space-y-1 text-xs text-white/55">
                    <li>
                        Taille max. :{" "}
                        <strong className="text-[var(--student-neon-lime)]">{FILE_LIMITS.MAX_FILE_SIZE_MB} MB</strong>
                    </li>
                    <li>
                        Compression auto des images (cible ~{" "}
                        <strong className="text-white/80">{FILE_LIMITS.TARGET_COMPRESSED_SIZE_MB} MB</strong>)
                    </li>
                    <li>
                        Formats :{" "}
                        <strong className="text-white/85">{FILE_LIMITS.ALLOWED_EXTENSIONS.join(", ")}</strong>
                    </li>
                </ul>
            </div>

            <Card className="student-pay-surface-soft border-0 shadow-none ring-1 ring-white/10">
                <CardContent className="pt-6">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-white/70">Complétion du dossier</p>
                        <span className="text-sm font-semibold tabular-nums text-[var(--student-neon-lime)]">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/45 ring-1 ring-white/[0.06]">
                        <div
                            className="h-full rounded-full bg-[var(--student-neon-lime)] transition-all duration-500"
                            style={{ width: `${pct}%`, boxShadow: "var(--student-pay-glow-soft)" }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-white/50">
                        {completion}/{total} documents obligatoires fournis
                    </p>
                    {pct === 100 && (
                        <div className="student-pay-pill mt-3 flex items-start gap-2 px-4 py-3 text-sm text-[var(--student-neon-lime)]">
                            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            <span>Tous les documents ont été soumis. Ton dossier est en traitement.</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {docs.length > 0 && (
                <div className="student-pay-pill flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">
                            {notifSent ? "Dossier envoyé à l'équipe" : "Envoyer mon dossier à l'équipe"}
                        </p>
                        <p className="mt-0.5 text-xs text-white/55">
                            {notifSent
                                ? "L'équipe a été notifiée et va examiner tes documents."
                                : hasNewUpload
                                  ? "Notifie les agents que tes documents sont prêts pour examen."
                                  : "Uploade ou remplace un document pour pouvoir notifier l'équipe."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleSendToStaff}
                        disabled={sending || notifSent || !hasNewUpload}
                        className={[
                            "student-focus-ring shrink-0 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-45",
                            notifSent
                                ? "border border-white/12 bg-black/35 text-[var(--student-neon-lime)]"
                                : "border border-[rgba(220,38,38,0.45)] bg-[var(--student-neon-lime)] text-[var(--student-neon-ink)] shadow-[var(--student-pay-glow)] hover:brightness-110",
                        ].join(" ")}
                    >
                        {sending ? "Envoi…" : notifSent ? "Envoyé" : "Envoyer"}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {REQUIRED_DOCS.map((doc) => {
                    const uploaded = getDoc(doc.key);
                    const isUploading = uploading === doc.key;
                    const isOptional = doc.key === "certificat_hsk";
                    const theme = DOC_CARD_THEME[doc.key];
                    const { Icon } = theme;
                    const statMain = statLabelFor(uploaded);

                    return (
                        <div
                            key={doc.key}
                            className="student-pay-surface-soft flex min-h-0 flex-col rounded-[1.35rem] p-3.5 ring-1 ring-white/[0.07] transition-transform duration-200 hover:-translate-y-0.5 sm:p-4"
                        >
                            <div className="flex gap-2.5">
                                <div
                                    className={[
                                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-inner",
                                        theme.ring,
                                        theme.softGlow ?? "",
                                    ].join(" ")}
                                    aria-hidden
                                >
                                    {uploaded?.status === "valide" ? (
                                        <Check className="h-[1.15rem] w-[1.15rem] text-[var(--student-neon-lime)]" strokeWidth={2.5} />
                                    ) : uploaded?.status === "non_conforme" ? (
                                        <AlertTriangle className="h-[1.15rem] w-[1.15rem] text-[var(--student-ring-move)]" strokeWidth={2.25} />
                                    ) : (
                                        <Icon className={`h-[1.15rem] w-[1.15rem] ${theme.iconClass}`} strokeWidth={2} />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-left text-[13px] font-semibold leading-snug tracking-tight text-white sm:text-sm">
                                                {doc.label}
                                            </h3>
                                            {isOptional ? (
                                                <p className="mt-0.5 text-left text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
                                                    Facultatif
                                                </p>
                                            ) : null}
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={`Choisir un fichier pour ${doc.label}`}
                                            disabled={uploaded?.status === "valide" || isUploading}
                                            onClick={() => {
                                                if (uploaded?.status !== "valide") inputRefs.current[doc.key]?.click();
                                            }}
                                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-35"
                                        >
                                            {isUploading ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                            ) : (
                                                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-left text-[10px] leading-relaxed text-white/50 sm:text-[11px]">
                                        {doc.description}
                                    </p>
                                </div>
                            </div>

                            <p
                                className={[
                                    "mt-3 text-left text-sm font-semibold tabular-nums tracking-tight",
                                    uploaded?.status === "non_conforme" ? "text-[var(--student-ring-move)]" : theme.statClass,
                                ].join(" ")}
                            >
                                {statMain}
                            </p>

                            {uploaded ? (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <Badge
                                        className={[
                                            "rounded-full border text-[10px] font-semibold",
                                            uploaded.status === "valide"
                                                ? "border-[rgba(220,38,38,0.28)] bg-black/35 text-[var(--student-neon-lime)]"
                                                : uploaded.status === "non_conforme"
                                                  ? "border-[rgba(255,65,85,0.25)] bg-black/35 text-[var(--student-ring-move)]"
                                                  : "border-white/12 bg-black/35 text-white/70",
                                        ].join(" ")}
                                    >
                                        {uploaded.status === "valide"
                                            ? t("badgeLabels.validated")
                                            : uploaded.status === "non_conforme"
                                              ? t("badgeLabels.nonCompliant")
                                              : t("badgeLabels.pending")}
                                    </Badge>
                                    <a
                                        href={uploaded.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-semibold text-cyan-300/90 underline-offset-2 hover:underline"
                                    >
                                        {t("view")}
                                    </a>
                                </div>
                            ) : (
                                <div className="mt-2 min-h-[1.25rem]" aria-hidden />
                            )}

                            <input
                                ref={(el) => {
                                    inputRefs.current[doc.key] = el;
                                }}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleUpload(doc.key, file);
                                    e.target.value = "";
                                }}
                            />

                            <button
                                type="button"
                                onClick={() => {
                                    if (uploaded?.status !== "valide") inputRefs.current[doc.key]?.click();
                                }}
                                disabled={isUploading || uploaded?.status === "valide"}
                                title={
                                    uploaded?.status === "valide" ? t("lockedTitle") : undefined
                                }
                                className={[
                                    "student-focus-ring mt-auto w-full rounded-2xl py-2.5 text-center text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                                    uploaded?.status === "valide"
                                        ? "border border-white/10 bg-black/35 text-[var(--student-neon-lime)]"
                                        : uploaded
                                          ? "border border-white/12 bg-black/40 text-white/85 hover:bg-white/[0.07]"
                                          : "border border-[rgba(220,38,38,0.45)] bg-[var(--student-neon-lime)] text-[var(--student-neon-ink)] shadow-[var(--student-pay-glow)] hover:brightness-110",
                                ].join(" ")}
                            >
                                {isUploading ? t("uploading") : uploaded?.status === "valide" ? t("locked") : uploaded ? t("replace") : t("upload")}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
