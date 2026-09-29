import type { Devise } from "../../lib/schemas/accounting.schema";

/** 12 500 F ou $12,500 ; `signed` ajoute + / −. */
export function fmtMoney(n: number, devise: Devise | string | null = "FCFA", signed = false): string {
    const usd = devise === "USD";
    const abs = new Intl.NumberFormat(usd ? "en-US" : "fr-FR").format(Math.abs(n));
    const body = usd ? `$${abs}` : `${abs} F`;
    if (!signed) return body;
    return n > 0 ? `+${body}` : n < 0 ? `−${body}` : body;
}

export function fmtDateTime(iso: string): string {
    return new Date(iso).toLocaleString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
}

/** « septembre 2026 » à partir de « 2026-09-01 » (ou d'une date locale). */
export function fmtMois(mois: string | Date): string {
    const d = typeof mois === "string" ? new Date(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)) - 1, 1) : mois;
    return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/** Catégories de sorties du livre comptable (miroir de LivreComptable). */
export const CATEGORIES_SORTIES = [
    "loyer", "salaires", "fonctionnement", "materiels",
    "fournitures", "transports", "communication", "partenaires", "divers",
];

const CATEGORIE_LABEL: Record<string, string> = {
    loyer: "Loyer",
    salaires: "Salaires",
    fonctionnement: "Fonctionnement",
    materiels: "Matériels",
    fournitures: "Fournitures",
    transports: "Transports",
    communication: "Communication",
    partenaires: "Partenaires",
    divers: "Divers",
};

export function categorieLabel(c: string): string {
    return CATEGORIE_LABEL[c] ?? c;
}

/** Message d'erreur Supabase/Postgres lisible (le trigger parle déjà français). */
export function errMessage(e: unknown, fallback = "Action impossible"): string {
    if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
        return (e as { message: string }).message || fallback;
    }
    return fallback;
}

export const MIGRATION_MANQUANTE =
    "Fonction indisponible : la migration add_controle_tresorerie_phase3.sql n'est pas encore appliquée.";
