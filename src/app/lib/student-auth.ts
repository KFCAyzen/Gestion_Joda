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

export function generateTemporaryPassword() {
    const randomBlock = Math.random().toString(36).slice(-4).toUpperCase();
    return `Joda@${randomBlock}9`;
}
