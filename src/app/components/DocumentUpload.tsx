"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useAuth } from "../context/AuthContext";
import { useNotificationContext } from "../context/NotificationContext";
import { logActivity } from "../utils/activityLogger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type DocKey = typeof REQUIRED_DOCS[number]["key"];

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

    useEffect(() => { loadDocs(); }, [loadDocs]);

    // Abonnement temps réel : rafraîchit quand le staff valide/rejette un document
    useEffect(() => {
        if (!studentId) return;
        const channel = supabase
            .channel(`docs-rt-${studentId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'documents',
                filter: `student_id=eq.${studentId}`,
            }, () => { loadDocs(); })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [studentId, loadDocs]);

    const getDoc = (key: string) => docs.find(d => d.type === key);

    const handleUpload = async (key: DocKey, file: File) => {
        if (!studentId) return;

        // Bloquer si le document a déjà été validé par le staff
        const existing = getDoc(key);
        if (existing?.status === "valide") {
            showNotification("Ce document a été validé et ne peut plus être remplacé.", "error");
            return;
        }

        // Validation initiale du fichier
        const validation = validateFile(file);
        if (!validation.valid) {
            showNotification(validation.error || "Fichier invalide", "error");
            return;
        }

        setUploading(key);
        try {
            // Compresser si c'est une image
            let fileToUpload = file;
            if (file.type.startsWith('image/')) {
                try {
                    fileToUpload = await compressImage(file, FILE_LIMITS.TARGET_COMPRESSED_SIZE_MB);
                    console.log(`Image compressée: ${formatFileSize(file.size)} → ${formatFileSize(fileToUpload.size)}`);
                } catch (err) {
                    console.error('Erreur compression:', err);
                    // Continuer avec le fichier original si la compression échoue
                }
            }

            // Validation finale après compression
            const finalValidation = validateFile(fileToUpload);
            if (!finalValidation.valid) {
                showNotification(finalValidation.error || "Fichier invalide", "error");
                return;
            }

            const ext = fileToUpload.name.split(".").pop();
            const path = `documents/${studentId}/${key}_${Date.now()}.${ext}`;

            // Upload dans Supabase Storage
            const { error: storageError } = await supabase.storage
                .from("student-documents")
                .upload(path, fileToUpload, { upsert: true });

            if (storageError) throw storageError;

            const { data: urlData } = supabase.storage
                .from("student-documents")
                .getPublicUrl(path);

            const existing = getDoc(key);
            if (existing) {
                await supabase.from("documents").update({
                    url: urlData.publicUrl,
                    status: "en_attente",
                    uploaded_at: new Date().toISOString(),
                }).eq("id", existing.id);
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
                    user.id, user.name, user.role,
                    "document_upload", "documents", studentId,
                    `Document uploadé — ${REQUIRED_DOCS.find(d => d.key === key)?.label || key}`,
                    { student_id: studentId, doc_type: key }
                );
            }

            // Vérifier si tous les docs obligatoires sont uploadés → passer le dossier à document_recu
            const updatedDocs = await supabase.from("documents").select("type").eq("student_id", studentId);
            const uploadedTypes = new Set(updatedDocs.data?.map(d => d.type) || []);
            const requiredKeys = REQUIRED_DOCS.filter(d => d.key !== "certificat_hsk").map(d => d.key);
            const allUploaded = requiredKeys.every(k => uploadedTypes.has(k));

            if (allUploaded) {
                await supabase.from("dossier_bourses")
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

    const completion = REQUIRED_DOCS.filter(d => d.key !== "certificat_hsk").filter(d => getDoc(d.key)).length;
    const total = REQUIRED_DOCS.filter(d => d.key !== "certificat_hsk").length;
    const pct = Math.round((completion / total) * 100);

    if (!studentId) return (
        <div className="py-12 text-center text-slate-400">Profil étudiant introuvable.</div>
    );

    return (
        <div className="space-y-6">
            {/* Info sur la compression */}
            <div className="student-surface-soft px-5 py-4 text-sm text-white/75">
                <p className="font-medium text-white">Informations importantes</p>
                <ul className="mt-2 ml-4 list-disc space-y-1 text-xs text-white/65">
                    <li>Taille maximale par fichier : <strong className="text-white">{FILE_LIMITS.MAX_FILE_SIZE_MB} MB</strong></li>
                    <li>Les images sont automatiquement compressées (cible : <strong className="text-white">{FILE_LIMITS.TARGET_COMPRESSED_SIZE_MB} MB</strong>)</li>
                    <li>Formats acceptés : <strong className="text-white">{FILE_LIMITS.ALLOWED_EXTENSIONS.join(", ")}</strong></li>
                </ul>
            </div>

            {/* Barre de progression */}
            <Card className="student-surface border-0 shadow-none">
                <CardContent className="pt-6">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-white/75">Complétion du dossier</p>
                        <span className="text-sm font-semibold text-white">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-white/10">
                        <div
                            className="h-2.5 rounded-full bg-[linear-gradient(90deg,var(--student-ring-move),var(--student-ring-exercise),var(--student-ring-stand))] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-white/60">{completion}/{total} documents obligatoires uploadés</p>
                    {pct === 100 && (
                        <div className="mt-3 rounded-3xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-[var(--student-ring-exercise)] shadow-[0_16px_54px_rgba(0,0,0,0.35)]">
                            Tous les documents ont été soumis. Votre dossier est en cours de traitement.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bouton d'envoi */}
            {docs.length > 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_16px_54px_rgba(0,0,0,0.35)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-white">
                                {notifSent ? "Dossier envoyé à l'équipe" : "Envoyer mon dossier à l'équipe"}
                            </p>
                            <p className="mt-0.5 text-xs text-white/60">
                                {notifSent
                                    ? "L'équipe a été notifiée et va examiner vos documents."
                                    : hasNewUpload
                                      ? "Notifie les agents et administrateurs que vos documents sont prêts pour examen."
                                      : "Uploadez ou remplacez un document pour pouvoir notifier l'équipe."}
                            </p>
                        </div>
                        <button
                            onClick={handleSendToStaff}
                            disabled={sending || notifSent || !hasNewUpload}
                            className={[
                                "student-focus-ring shrink-0 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                                notifSent
                                    ? "border border-white/10 bg-white/5 text-[var(--student-ring-exercise)]"
                                    : "border border-white/12 bg-[linear-gradient(135deg,rgba(64,156,255,0.18),rgba(48,209,88,0.12))] text-white shadow-[0_16px_44px_rgba(0,0,0,0.35)] hover:bg-[linear-gradient(135deg,rgba(64,156,255,0.22),rgba(48,209,88,0.14))]",
                            ].join(" ")}
                        >
                            {sending ? "Envoi..." : notifSent ? "Envoyé" : "Envoyer"}
                        </button>
                    </div>
                </div>
            )}

            {/* Liste des documents */}
            <div className="grid gap-4 sm:grid-cols-2">
                {REQUIRED_DOCS.map((doc) => {
                    const uploaded = getDoc(doc.key);
                    const isUploading = uploading === doc.key;
                    const isOptional = doc.key === "certificat_hsk";

                    return (
                        <Card key={doc.key} className="student-surface-soft border border-white/10 shadow-none transition-transform duration-200 hover:-translate-y-0.5">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-white">{doc.label}</p>
                                            {isOptional && <span className="text-xs text-white/55">(optionnel)</span>}
                                        </div>
                                        <p className="mt-0.5 text-xs text-white/60">{doc.description}</p>
                                        {uploaded && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <Badge
                                                    className={[
                                                        "rounded-full border border-white/12 bg-white/5 text-xs font-semibold",
                                                        uploaded.status === "valide"
                                                            ? "text-[var(--student-ring-exercise)]"
                                                            : uploaded.status === "non_conforme"
                                                              ? "text-[var(--student-ring-move)]"
                                                              : "text-white/75",
                                                    ].join(" ")}
                                                >
                                                    {uploaded.status === "valide" ? "Validé" :
                                                     uploaded.status === "non_conforme" ? "Non conforme" : "En attente"}
                                                </Badge>
                                                <a href={uploaded.url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-[var(--student-ring-stand)] hover:underline">
                                                    Voir le fichier
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        <input
                                            ref={el => { inputRefs.current[doc.key] = el; }}
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    // Afficher la taille du fichier
                                                    console.log(`Fichier sélectionné: ${file.name} (${formatFileSize(file.size)})`);
                                                    handleUpload(doc.key, file);
                                                }
                                                e.target.value = "";
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                if (uploaded?.status !== "valide") inputRefs.current[doc.key]?.click();
                                            }}
                                            disabled={isUploading || uploaded?.status === "valide"}
                                            title={uploaded?.status === "valide" ? "Document validé — remplacement impossible" : undefined}
                                            className={[
                                                "student-focus-ring rounded-2xl px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50",
                                                uploaded?.status === "valide"
                                                    ? "cursor-not-allowed border border-white/10 bg-white/5 text-[var(--student-ring-exercise)] opacity-80"
                                                    : uploaded
                                                      ? "border border-white/12 bg-white/5 text-white/80 hover:bg-white/10"
                                                      : "border border-white/12 bg-[linear-gradient(135deg,rgba(255,45,85,0.22),rgba(255,69,58,0.12))] text-white shadow-[0_16px_44px_rgba(0,0,0,0.35)] hover:bg-[linear-gradient(135deg,rgba(255,45,85,0.28),rgba(255,69,58,0.14))]",
                                            ].join(" ")}
                                        >
                                            {isUploading ? "..." : uploaded?.status === "valide" ? "Verrouillé" : uploaded ? "Remplacer" : "Uploader"}
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
