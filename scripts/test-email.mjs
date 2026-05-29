// Test direct de l'envoi Resend — exécuter : node scripts/test-email.mjs <email-destinataire>
import { readFileSync } from 'node:fs';
import { Resend } from 'resend';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const apiKey = env.RESEND_API_KEY;
const to = process.argv[2] || 'kepseufrankc@gmail.com';

console.log('— Test Resend ——————————————');
console.log('API key      :', apiKey ? `${apiKey.slice(0, 6)}…${apiKey.slice(-4)}` : '(absente)');
console.log('Destinataire :', to);
console.log('');

if (!apiKey) { console.error('❌ RESEND_API_KEY manquante dans .env.local'); process.exit(1); }

const resend = new Resend(apiKey);

// Test 1 — FROM de production (domaine perso)
console.log('▶ Test 1 : FROM = Joda Company <contact@portal-joda.company>');
try {
  const r = await resend.emails.send({
    from: 'Joda Company <contact@portal-joda.company>',
    to: [to],
    subject: '[TEST] Diagnostic envoi email — domaine perso',
    html: '<p>Test 1 — domaine portal-joda.company</p>',
  });
  console.log('  Résultat:', JSON.stringify(r, null, 2));
} catch (e) {
  console.log('  Erreur capturée:', e?.message || e);
}

console.log('');

// Test 2 — FROM par défaut Resend (toujours actif si la clé est valide)
console.log('▶ Test 2 : FROM = Joda <onboarding@resend.dev>');
try {
  const r = await resend.emails.send({
    from: 'Joda <onboarding@resend.dev>',
    to: [to],
    subject: '[TEST] Diagnostic envoi email — domaine Resend',
    html: '<p>Test 2 — domaine onboarding@resend.dev (toujours autorisé)</p>',
  });
  console.log('  Résultat:', JSON.stringify(r, null, 2));
} catch (e) {
  console.log('  Erreur capturée:', e?.message || e);
}

console.log('');
console.log('— Fin ——————————————');
