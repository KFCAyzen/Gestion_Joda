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

/** Même règle que `LoginPage.resolveEmail` côté web. */
export function resolveLoginEmail(identifier: string): string {
  const v = identifier.trim();
  return v.includes('@') ? v : buildStudentAuthEmail(v);
}
