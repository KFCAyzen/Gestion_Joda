// Config ESLint « flat » propre au projet mobile.
// Sans elle, `expo lint` remonte au dépôt parent (app web) et charge son
// `.eslintrc.json` hérité, incompatible avec ESLint 9 (structure circulaire).
// Cette config auto-suffisante isole le lint mobile du reste du monorepo.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', '.expo-export-check/*', 'node_modules/*'],
  },
]);
