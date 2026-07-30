/**
 * Caractères de largeur nulle (ZWSP, ZWNJ, ZWJ, BOM) : jamais intentionnels dans un
 * mot de passe. Écrits en séquences d'échappement — les inclure littéralement rendrait
 * la source illisible.
 */
const ZERO_WIDTH = /[\u200B\u200C\u200D\uFEFF]/g;

/**
 * Nettoie un mot de passe saisi avant envoi à Supabase Auth.
 *
 * Les mots de passe temporaires (`Joda@XXXXXXXX9`) sont distribués par email et SMS :
 * un copier-coller depuis une messagerie embarque très souvent une espace finale, un
 * retour à la ligne ou une espace insécable, invisibles à l'écran. Le rejet qui suit
 * est indiscernable d'un mauvais mot de passe pour l'utilisateur.
 *
 * On se limite aux bords et aux caractères de largeur nulle, jamais aux espaces
 * internes qui peuvent être délibérés dans une phrase de passe. `trim()` couvre déjà
 * espaces, tabulations, retours ligne, espaces insécables et BOM.
 */
export function sanitizePasswordInput(value: string): string {
    return value.replace(ZERO_WIDTH, "").trim();
}
