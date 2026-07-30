import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * `eslint-config-next` 16 expose directement des configs plates : passer par
 * `FlatCompat` faisait échouer ESLint 9 avec `Converting circular structure to JSON`,
 * levé par le formateur d'erreurs de la couche eslintrc — ce qui masquait la cause
 * réelle. Résultat : aucun lint ne tournait sur le projet.
 *
 * `core-web-vitals` inclut déjà `next/typescript`, inutile de l'ajouter.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "dist-electron/**", "release/**", "node_modules/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];

export default eslintConfig;
