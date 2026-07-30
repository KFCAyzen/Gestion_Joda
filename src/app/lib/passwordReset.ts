import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Tokens de réinitialisation de mot de passe (usage serveur uniquement).
 *
 * Le token brut ne circule que dans le lien envoyé à l'utilisateur ; la base ne
 * contient que son SHA-256. Une fuite de `password_reset_tokens` ne permet donc pas
 * de reconstituer les liens encore valides.
 */

/** Durée de validité d'un lien. Assez court pour limiter la fenêtre d'abus. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

/** SHA-256 hexadécimal. Pas de sel : le token est déjà 256 bits d'aléa. */
export function hashResetToken(rawToken: string): string {
    return createHash("sha256").update(rawToken).digest("hex");
}

export function createResetToken(): { rawToken: string; tokenHash: string; expiresAt: string } {
    // 32 octets = 256 bits, encodés en base64url pour passer en paramètre d'URL.
    const rawToken = randomBytes(32).toString("base64url");
    return {
        rawToken,
        tokenHash: hashResetToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
    };
}

/**
 * Comparaison à temps constant de deux hachages.
 *
 * La recherche en base se fait déjà par égalité sur `token_hash`, mais cette fonction
 * sert aux vérifications faites en mémoire, pour ne pas exposer de canal temporel.
 */
export function safeCompareHash(a: string, b: string): boolean {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}
