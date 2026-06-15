// Déclarations pour les imports CSS du template web (react-native-web).
// Sans cela, `tsc` échoue sur les fichiers `*.web.tsx` du scaffold.
declare module '*.css';
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
