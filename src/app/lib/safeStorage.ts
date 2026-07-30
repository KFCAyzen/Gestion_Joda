/**
 * Accès au stockage navigateur tolérant aux environnements qui le refusent.
 *
 * `localStorage` / `sessionStorage` lèvent une SecurityError quand le stockage du
 * site est bloqué (blocage des cookies, navigation privée, WebView in-app comme
 * celle de WhatsApp ou Facebook, politique d'entreprise) et une QuotaExceededError
 * quand il est plein. Non gardés, ces accès font planter le rendu React : les
 * providers racine se trouvant au-dessus de toute error boundary, c'est l'app
 * entière qui disparaît — écran blanc, sans message.
 */

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : on continue sans persister */
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* stockage indisponible : rien à nettoyer */
  }
}

export function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : on continue sans persister */
  }
}
