// Tailwind 4 : le plugin PostCSS vit dans son propre paquet,
// et le préfixage vendeur est désormais intégré (plus d'autoprefixer).
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
