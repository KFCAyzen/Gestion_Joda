// Port de `src/app/lib/student-auth.ts` (web).
// Les étudiants se connectent avec un identifiant (username) converti en email
// d'auth synthétique ; le staff se connecte avec son email réel.
const STUDENT_AUTH_DOMAIN = 'students.joda.app';

function slugifyPart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les diacritiques
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

export function buildStudentAuthEmail(username: string): string {
  return `${slugifyPart(username)}@${STUDENT_AUTH_DOMAIN}`;
}

/** Identifiant étudiant `prenom.nom` (+ suffixe si homonyme) — miroir web. */
export function buildStudentUsername(prenom: string, nom: string, suffix = 0): string {
  const base = [slugifyPart(prenom), slugifyPart(nom)].filter(Boolean).join('.');
  if (!base) return suffix > 0 ? `etudiant.${suffix + 1}` : 'etudiant';
  return suffix > 0 ? `${base}.${suffix + 1}` : base;
}

/**
 * Mot de passe temporaire `Joda@XXXXXXXX9`.
 * Sécurité : utilise un CSPRNG (`crypto.getRandomValues`, polyfillé en RN par
 * supabase-js) plutôt que `Math.random()` (non cryptographique, ~20 bits). Repli
 * best-effort sur `Math.random` uniquement si aucun CSPRNG n'est disponible.
 * Alphabet sans caractères ambigus (0/O, 1/I/L).
 */
export function generateTemporaryPassword(): string {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 symboles
  const LEN = 8;
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  const bytes = new Uint8Array(LEN);
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < LEN; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let block = '';
  for (let i = 0; i < LEN; i++) block += ALPHABET[bytes[i] % ALPHABET.length];
  return `Joda@${block}9`;
}

/** Même règle que `LoginPage.resolveEmail` côté web. */
export function resolveLoginEmail(identifier: string): string {
  const v = identifier.trim();
  return v.includes('@') ? v : buildStudentAuthEmail(v);
}
