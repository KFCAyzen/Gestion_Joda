/**
 * Classification des erreurs d'authentification, partagée entre le middleware
 * (`src/proxy.ts`) et le contexte client (`AuthContext`).
 *
 * `supabase.auth.getUser()` renvoie un unique `authError` qui recouvre en réalité
 * trois situations à traiter différemment :
 *
 *   1. le serveur d'auth est injoignable (réseau, timeout, 429, 5xx) — la session
 *      de l'utilisateur est probablement valide, il ne faut RIEN invalider ;
 *   2. il n'y a simplement pas de session (visiteur anonyme) — rien à nettoyer ;
 *   3. le token est réellement rejeté (expiré, malformé, révoqué) — c'est le seul
 *      cas où purger les cookies de session est légitime.
 *
 * Confondre 1 avec 3 déconnecte des utilisateurs authentifiés au moindre incident
 * réseau ou dès que les quotas d'auth Supabase sont atteints (bureau derrière une
 * seule IP NAT → déconnexions groupées).
 */

function errorMessage(err: unknown): string {
    if (err && typeof err === "object" && "message" in err) {
        return String((err as { message: unknown }).message);
    }
    return String(err);
}

function errorName(err: unknown): string {
    if (err && typeof err === "object" && "name" in err) {
        return String((err as { name: unknown }).name);
    }
    return "";
}

function errorStatus(err: unknown): number {
    if (err && typeof err === "object") {
        const candidate = err as { status?: unknown; statusCode?: unknown };
        const raw = candidate.status ?? candidate.statusCode;
        if (typeof raw === "number") return raw;
    }
    return 0;
}

/** Panne de transport (vs un vrai rejet d'auth) : ne jamais déconnecter là-dessus. */
export function isNetworkError(err: unknown): boolean {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
    return /failed to fetch|networkerror|fetch failed|enotfound|etimedout|econnrefused|timeout|err_internet|err_network|load failed|network request failed/i.test(
        errorMessage(err),
    );
}

/**
 * Indisponibilité passagère du serveur d'auth : rate-limit (429) ou 5xx.
 * Distinct de `isNetworkError` : la requête a abouti, c'est la réponse qui refuse.
 */
export function isTransientAuthError(err: unknown): boolean {
    const status = errorStatus(err);
    if (status === 429 || (status >= 500 && status <= 599)) return true;
    return /rate limit|too many requests|service unavailable|bad gateway|gateway timeout|internal server error/i.test(
        errorMessage(err),
    );
}

/**
 * Le serveur d'auth n'a pas pu se prononcer : transport en échec ou indisponibilité
 * passagère. La session est peut-être parfaitement valide — il ne faut ni purger les
 * cookies, ni renvoyer l'utilisateur au login.
 */
export function isAuthUnverifiable(err: unknown): boolean {
    return isNetworkError(err) || isTransientAuthError(err);
}

/** Aucune session en cours : cas normal d'un visiteur anonyme, pas une anomalie. */
export function isAuthSessionMissing(err: unknown): boolean {
    if (errorName(err) === "AuthSessionMissingError") return true;
    return /auth session missing/i.test(errorMessage(err));
}

/**
 * Le token a-t-il été explicitement rejeté ? Seul cas où purger les cookies de
 * session est justifié.
 *
 * Volontairement affirmatif : on ne purge que sur un motif de rejet reconnu. Une
 * erreur inconnue laisse la session en place — se tromper dans ce sens affiche au
 * pire une coquille vide (la donnée reste protégée par RLS côté Postgres et par
 * `ProtectedRoute` côté client), alors que l'inverse déconnecte à tort.
 */
export function isSessionRejected(err: unknown): boolean {
    if (isNetworkError(err) || isTransientAuthError(err) || isAuthSessionMissing(err)) {
        return false;
    }
    const status = errorStatus(err);
    if (status === 401 || status === 403) return true;
    return /invalid|expired|jwt|refresh token|unauthorized|not authenticated|bad_jwt|malformed/i.test(
        errorMessage(err),
    );
}
