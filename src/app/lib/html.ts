/**
 * Échappement HTML pour toute donnée interpolée dans un template (emails, documents
 * imprimables).
 *
 * Indispensable côté email : `name`, `username` ou un nom d'université proviennent de
 * saisies utilisateur. Interpolés bruts, ils permettent d'injecter du balisage — un
 * faux lien de connexion par exemple — dans un message expédié depuis un domaine aux
 * SPF/DKIM/DMARC valides. Le hameçonnage devient alors indiscernable d'un vrai envoi.
 */
export function escapeHtml(input: string): string {
    return input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
