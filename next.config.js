/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
  // Mode standalone : Next.js produit `.next/standalone/` autonome avec un serveur
  // Node.js minimal et toutes les dépendances tracées. C'est ce que l'app Electron
  // embarque pour fonctionner sans installation Node.js sur la machine cible.
  // Activé uniquement pour le build desktop via NEXT_BUILD_STANDALONE=1.
  ...(process.env.NEXT_BUILD_STANDALONE === '1' ? { output: 'standalone' } : {}),

  serverExternalPackages: ['nodemailer'],
  images: {
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizePackageImports: ['@tailwindcss/forms']
  },
  allowedDevOrigins: ['192.168.0.145'],
  typescript: {
    ignoreBuildErrors: true
  }
}

module.exports = withNextIntl(nextConfig);