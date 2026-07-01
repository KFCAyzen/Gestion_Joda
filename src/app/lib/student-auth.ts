const STUDENT_AUTH_DOMAIN = "students.joda.app";

function slugifyPart(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "");
}

export function buildStudentUsername(prenom: string, nom: string, suffix = 0) {
    const firstName = slugifyPart(prenom);
    const lastName = slugifyPart(nom);
    const base = [firstName, lastName].filter(Boolean).join(".");

    if (!base) {
        return suffix > 0 ? `etudiant.${suffix + 1}` : "etudiant";
    }

    return suffix > 0 ? `${base}.${suffix + 1}` : base;
}

export function buildStudentAuthEmail(username: string) {
    return `${slugifyPart(username)}@${STUDENT_AUTH_DOMAIN}`;
}

/**
 * Mot de passe temporaire `Joda@XXXXXXXX9`.
 * Sécurité : CSPRNG via `crypto.getRandomValues` — disponible nativement dans le
 * navigateur et dans Node 18+ (Web Crypto global). Repli sur `Math.random`
 * seulement si aucun CSPRNG n'est présent. Alphabet sans caractères ambigus.
 */
export function generateTemporaryPassword() {
    const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 symboles
    const LEN = 8;
    const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
    const bytes = new Uint8Array(LEN);
    if (g.crypto?.getRandomValues) {
        g.crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < LEN; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    let block = "";
    for (let i = 0; i < LEN; i++) block += ALPHABET[bytes[i] % ALPHABET.length];
    return `Joda@${block}9`;
}
