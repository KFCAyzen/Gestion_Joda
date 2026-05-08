# Email Automatique - Rappels de Paiement

## Vue d'ensemble

Système automatisé d'envoi d'emails de rappel pour les paiements en retard.

## Architecture

### 1. Service Email (`src/app/lib/emailService.ts`)

Deux fonctions principales :

**`sendPaymentReminder()`** - Envoie un rappel de paiement
- Email HTML responsive avec design Joda
- Niveaux d'urgence (modérée, importante, critique)
- Détails du paiement et pénalités
- Bouton d'action vers l'espace étudiant

**`sendWelcomeEmail()`** - Email de bienvenue
- Informations de connexion
- Mot de passe temporaire
- Lien vers la plateforme

### 2. Route Cron (`src/app/api/cron/check-late-payments/route.ts`)

Vérifie quotidiennement les paiements en retard :
- Récupère tous les paiements en attente/retard
- Calcule les jours de retard
- Met à jour le statut si nécessaire
- Envoie des rappels aux jours clés : **1, 3, 7, 14, 30 jours**
- Enregistre les envois dans `email_logs`

### 3. Configuration Vercel (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/check-late-payments",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Exécution** : Tous les jours à 9h00 (heure UTC)

## Configuration

### Variables d'environnement

Ajouter dans `.env.local` et Vercel :

```env
# Gmail (déjà configuré)
GMAIL_USER=votre-email@gmail.com
GMAIL_APP_PASSWORD=votre-app-password

# Clé secrète pour le cron (générer une clé aléatoire)
CRON_SECRET=votre-cle-secrete-aleatoire
```

### Générer CRON_SECRET

```bash
# Générer une clé aléatoire
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Migration SQL

Exécuter `migrations/email_logs.sql` dans Supabase SQL Editor :

```sql
-- Crée la table email_logs
-- Index pour performances
-- RLS policies
```

## Déploiement sur Vercel

### 1. Ajouter les variables d'environnement

Dans Vercel Dashboard → Settings → Environment Variables :
- `CRON_SECRET` (généré ci-dessus)
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`

### 2. Déployer

```bash
git push origin main
```

Vercel détectera automatiquement `vercel.json` et configurera le cron.

### 3. Vérifier le cron

Dans Vercel Dashboard → Deployments → Cron Jobs :
- Voir les exécutions
- Logs de chaque run
- Statut (success/error)

## Test manuel

### Tester localement

```bash
# Démarrer le serveur
npm run dev

# Appeler la route avec la clé API
curl -H "x-api-key: votre-cle-secrete" http://localhost:3000/api/cron/check-late-payments
```

### Tester en production

```bash
curl -H "x-api-key: votre-cle-secrete" https://gestion-joda.vercel.app/api/cron/check-late-payments
```

## Réponse de l'API

```json
{
  "message": "Vérification terminée",
  "results": {
    "checked": 45,
    "late": 12,
    "emailsSent": 5,
    "errors": 0
  },
  "timestamp": "2024-01-15T09:00:00.000Z"
}
```

## Logs des emails

Consulter les emails envoyés :

```sql
SELECT 
  recipient,
  type,
  days_late,
  sent_at
FROM email_logs
ORDER BY sent_at DESC
LIMIT 50;
```

## Personnalisation

### Modifier la fréquence des rappels

Dans `src/app/api/cron/check-late-payments/route.ts` :

```typescript
// Ligne 67
const reminderDays = [1, 3, 7, 14, 30]; // Modifier ces valeurs
```

### Modifier l'heure d'exécution

Dans `vercel.json` :

```json
{
  "schedule": "0 9 * * *"  // Format cron: minute heure jour mois jour-semaine
}
```

Exemples :
- `0 9 * * *` - Tous les jours à 9h00
- `0 */6 * * *` - Toutes les 6 heures
- `0 9 * * 1` - Tous les lundis à 9h00

### Modifier le template email

Dans `src/app/lib/emailService.ts`, fonction `sendPaymentReminder()` :
- Modifier le HTML
- Changer les couleurs
- Ajouter des sections

## Monitoring

### Vérifier les envois

```sql
-- Emails envoyés aujourd'hui
SELECT COUNT(*) 
FROM email_logs 
WHERE sent_at::date = CURRENT_DATE;

-- Emails par type
SELECT type, COUNT(*) 
FROM email_logs 
GROUP BY type;

-- Derniers rappels de paiement
SELECT 
  el.recipient,
  el.days_late,
  el.sent_at,
  p.montant,
  p.type
FROM email_logs el
JOIN payments p ON p.id = el.payment_id
WHERE el.type = 'payment_reminder'
ORDER BY el.sent_at DESC
LIMIT 10;
```

### Alertes

Créer une alerte si trop d'erreurs :

```sql
-- Vérifier le taux d'erreur (à implémenter dans le cron)
SELECT 
  COUNT(*) FILTER (WHERE success = false) * 100.0 / COUNT(*) as error_rate
FROM cron_executions
WHERE executed_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### Les emails ne partent pas

1. Vérifier `GMAIL_APP_PASSWORD` (pas le mot de passe Gmail normal)
2. Vérifier que le compte Gmail a activé l'authentification à 2 facteurs
3. Vérifier les logs Vercel

### Le cron ne s'exécute pas

1. Vérifier que `vercel.json` est à la racine du projet
2. Vérifier les logs dans Vercel Dashboard → Cron Jobs
3. Vérifier que `CRON_SECRET` est défini dans Vercel

### Erreur 401 sur la route cron

1. Vérifier que le header `x-api-key` est envoyé
2. Vérifier que la valeur correspond à `CRON_SECRET`

## Sécurité

- ✅ Route protégée par clé API (`CRON_SECRET`)
- ✅ Utilisation du service role Supabase (pas de RLS bypass)
- ✅ Logs de tous les envois
- ✅ Pas de données sensibles dans les emails
- ✅ Rate limiting via Vercel (max 1 exécution/minute)

## Améliorations futures

1. **Dashboard de monitoring** : Voir les stats d'envoi en temps réel
2. **Templates personnalisables** : Permettre aux admins de modifier les emails
3. **Multi-langue** : Emails en français/anglais selon la préférence
4. **SMS** : Ajouter des rappels par SMS pour les retards critiques
5. **Webhooks** : Notifier un système externe des paiements en retard
