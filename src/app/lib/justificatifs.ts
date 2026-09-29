import type { SupabaseClient } from "@supabase/supabase-js";
import { compressImage } from "../utils/imageCompression";

/**
 * Justificatifs des sorties comptables (reçu, facture, fiche de course…).
 *
 * Bucket PRIVÉ (migration add_sorties_tracabilite_phase1.sql) : on stocke le
 * chemin dans `sorties_comptables.justificatif_path` et on n'affiche la pièce
 * que via un lien signé de courte durée. Aucune policy de mise à jour ni de
 * suppression : une pièce déposée ne peut plus être remplacée par un client.
 */
export const JUSTIFICATIFS_BUCKET = "justificatifs-comptables";

export const JUSTIFICATIF_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

const ALLOWED_TYPES = JUSTIFICATIF_ACCEPT.split(",");
const EXT_BY_TYPE: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
};
const MAX_BYTES = 10 * 1024 * 1024;

/** Message d'erreur si le fichier n'est pas une pièce acceptable, sinon null. */
export function checkJustificatif(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) return "Format accepté : photo (JPG, PNG, WEBP, HEIC) ou PDF.";
    if (file.size > MAX_BYTES) return "Fichier trop volumineux (10 Mo maximum).";
    return null;
}

/** Dépose la pièce et retourne son chemin dans le bucket. */
export async function uploadJustificatif(supabase: SupabaseClient, file: File): Promise<string> {
    const invalid = checkJustificatif(file);
    if (invalid) throw new Error(invalid);

    // Les photos de téléphone font souvent plusieurs Mo : on les réduit. Le HEIC
    // n'est pas décodable par le navigateur, il part tel quel.
    let toUpload = file;
    if (file.type.startsWith("image/") && !file.type.includes("hei")) {
        try {
            toUpload = await compressImage(file, 2);
        } catch {
            /* fichier original */
        }
    }

    // compressImage produit du JPEG en gardant le nom d'origine : l'extension
    // suit le type réel, pas le nom.
    const ext = EXT_BY_TYPE[toUpload.type] ?? "bin";
    // Rangement par mois de dépôt ; le nom aléatoire évite toute collision.
    const path = `sorties/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
        .from(JUSTIFICATIFS_BUCKET)
        .upload(path, toUpload, { upsert: false, contentType: toUpload.type });
    if (error) throw new Error(`Dépôt du justificatif impossible : ${error.message}`);
    return path;
}

/** Lien signé (5 min) pour afficher la pièce, ou null si inaccessible. */
export async function getJustificatifUrl(supabase: SupabaseClient, path: string): Promise<string | null> {
    const { data, error } = await supabase.storage.from(JUSTIFICATIFS_BUCKET).createSignedUrl(path, 300);
    if (error || !data) return null;
    return data.signedUrl;
}

export function isPdfJustificatif(path: string): boolean {
    return path.toLowerCase().endsWith(".pdf");
}
