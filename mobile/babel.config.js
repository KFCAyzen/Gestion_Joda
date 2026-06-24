// Config Babel requise par NativeWind (jsxImportSource) + son preset.
// `babel-preset-expo` ajoute automatiquement le plugin Reanimated/Worklets
// quand le paquet est présent — ne pas le rajouter ici pour éviter un doublon.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
