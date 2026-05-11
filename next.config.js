/** @type {import('next').NextConfig} */
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig = {
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