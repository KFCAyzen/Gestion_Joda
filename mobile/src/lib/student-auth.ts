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

/** Mot de passe temporaire `Joda@XXXX9` — miroir web. */
export function generateTemporaryPassword(): string {
  const randomBlock = Math.random().toString(36).slice(-4).toUpperCase();
  return `Joda@${randomBlock}9`;
}

/** Même règle que `LoginPage.resolveEmail` côté web. */
export function resolveLoginEmail(identifier: string): string {
  const v = identifier.trim();
  return v.includes('@') ? v : buildStudentAuthEmail(v);
}
