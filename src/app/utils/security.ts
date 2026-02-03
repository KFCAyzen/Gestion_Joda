/**
 * Utilitaires de sécurité pour prévenir les attaques XSS
 */

/**
 * Échappe les caractères HTML dangereux
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sanitise une chaîne pour l'utilisation dans du HTML
 */
export function sanitizeForHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return escapeHtml(input.trim());
}

/**
 * Sanitise une chaîne pour l'utilisation dans des attributs HTML
 */
export function sanitizeForAttribute(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[<>"'&]/g, '');
}

/**
 * Valide et sanitise un email
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleaned = email.trim().toLowerCase();
  return emailRegex.test(cleaned) ? cleaned : '';
}

/**
 * Valide et sanitise un numéro de téléphone
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^\d+\-\s()]/g, '').trim();
}

/**
 * Sanitise du contenu pour l'export PDF/Word
 */
export function sanitizeForExport(content: string): string {
  if (!content || typeof content !== 'string') return '';
  return escapeHtml(content)
    .replace(/\n/g, '<br>')
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
}