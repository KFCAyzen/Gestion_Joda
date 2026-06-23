/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind scanne les composants RN pour extraire les classes utilisées.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Palette de marque — miroir de src/theme/tokens.ts (couleurs d'accent).
      // L'échelle « verre » / « ink » s'exprime via les utilitaires d'opacité du
      // blanc (text-white/70, bg-white/[0.055], border-white/10…).
      colors: {
        surface: '#100307',
        crimson: { DEFAULT: '#ef4444', vivid: '#ff5a5f', deep: '#d11a2a' },
        mint: '#34d9a8',
        amber: '#fbbf24',
        rose: '#fb7185',
        info: '#60a5fa',
      },
    },
  },
  plugins: [],
};
