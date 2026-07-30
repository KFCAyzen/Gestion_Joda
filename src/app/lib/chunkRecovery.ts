const RELOAD_PARAM = "joda_chunk_reload";

/** Au-delà de ce délai, un marqueur est considéré comme périmé (autre déploiement). */
const RELOAD_WINDOW_MS = 30_000;

/**
 * Un déploiement renomme les chunks JS/CSS : un onglet resté ouvert sur la version
 * précédente demande alors un fichier qui n'existe plus (404) et le rendu casse.
 * Sans error boundary, l'utilisateur ne voit qu'un écran blanc.
 */
export function isChunkLoadError(error: unknown): boolean {
  const err = error as { name?: string; message?: string } | null;
  if (!err) return false;
  if (err.name === "ChunkLoadError") return true;
  return /loading chunk|loading css chunk|dynamically imported module|importing a module script failed/i.test(
    err.message ?? ""
  );
}

/**
 * Recharge la page pour récupérer le manifeste à jour, une seule fois : si l'erreur
 * vient d'ailleurs, recharger en boucle enfermerait l'utilisateur.
 *
 * Le garde-fou est porté par l'URL, pas par `sessionStorage`. Le stockage peut être
 * refusé (cookies bloqués, navigation privée, WebView in-app) — précisément
 * l'environnement que `safeStorage` existe pour absorber. Avec un drapeau en
 * `sessionStorage`, la lecture renvoyait alors toujours `null` et l'écriture ne
 * faisait rien : la garde ne s'armait jamais et la page se rechargeait à l'infini,
 * ce qui est pire que l'écran blanc d'origine. Un paramètre d'URL, lui, traverse le
 * rechargement sans dépendre d'aucune permission.
 *
 * Le marqueur est horodaté : il bloque la boucle immédiate mais se périme, pour
 * qu'un futur déploiement puisse à nouveau tenter la récupération automatique.
 */
export function tryReloadOnce(): boolean {
  const url = new URL(window.location.href);
  const previous = Number(url.searchParams.get(RELOAD_PARAM));

  if (previous && Date.now() - previous < RELOAD_WINDOW_MS) return false;

  url.searchParams.set(RELOAD_PARAM, String(Date.now()));
  // `replace` plutôt que `reload` : n'empile pas la tentative dans l'historique,
  // le bouton Retour reste utilisable.
  window.location.replace(url.toString());
  return true;
}
