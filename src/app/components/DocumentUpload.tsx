"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    const [docs, setDocs] = useState<DocStatus[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const loadDocs = useCallback(async () => {
        if (!studentId) return;
        const { data } = await supabase.from("documents").select("*").eq("student_id", studentId);
        setDocs(data || []);
    }, [studentId]);

    useEffect(() => { loadDocs(); }, [loadDocs]);

    const getDoc = (key: string) => docs.find(d => d.type === key);

    const handleUpload = async (key: DocKey, file: File) => {
        if (!studentId) return;
        setUploading(key);
        try {
            const ext = file.name.split(".").pop();
            const path = `documents/${studentId}/${key}_${Date.now()}.${ext}`;

            // Upload dans Supabase Storage
            const { error: storageError } = await supabase.storage
                .from("student-documents")
                .upload(path, file, { upsert: true });

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
        } finally {
            setUploading(null);
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
            {/* Barre de progression */}
            <Card className="joda-surface border-0 shadow-none">
                <CardContent className="pt-6">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-700">Complétion du dossier</p>
                        <span className="text-sm font-bold text-slate-900">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200">
                        <div
                            className="h-2.5 rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{completion}/{total} documents obligatoires uploadés</p>
                    {pct === 100 && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                            ✅ Tous les documents ont été soumis. Votre dossier est en cours de traitement.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Liste des documents */}
            <div className="grid gap-4 sm:grid-cols-2">
                {REQUIRED_DOCS.map((doc) => {
                    const uploaded = getDoc(doc.key);
                    const isUploading = uploading === doc.key;
                    const isOptional = doc.key === "certificat_hsk";

                    return (
                        <Card key={doc.key} className={`border transition-all ${uploaded ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"}`}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-900">{doc.label}</p>
                                            {isOptional && <span className="text-xs text-slate-400">(optionnel)</span>}
                                        </div>
                                        <p className="mt-0.5 text-xs text-slate-500">{doc.description}</p>
                                        {uploaded && (
                                            <div className="mt-2 flex items-center gap-2">
                                                <Badge className={
                                                    uploaded.status === "valide" ? "bg-emerald-100 text-emerald-700" :
                                                    uploaded.status === "non_conforme" ? "bg-red-100 text-red-700" :
                                                    "bg-yellow-100 text-yellow-700"
                                                }>
                                                    {uploaded.status === "valide" ? "Validé" :
                                                     uploaded.status === "non_conforme" ? "Non conforme" : "En attente"}
                                                </Badge>
                                                <a href={uploaded.url} target="_blank" rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:underline">
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
                                                if (file) handleUpload(doc.key, file);
                                                e.target.value = "";
                                            }}
                                        />
                                        <button
                                            onClick={() => inputRefs.current[doc.key]?.click()}
                                            disabled={isUploading}
                                            className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                                                uploaded
                                                    ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                                    : "bg-red-600 text-white hover:bg-red-700"
                                            } disabled:opacity-50`}
                                        >
                                            {isUploading ? "..." : uploaded ? "Remplacer" : "Uploader"}
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
