// Config plate ESLint (eslint 10 + eslint-config-next 16).
// Next 16 a supprimé `next lint` : le script npm appelle désormais eslint
// directement, et cette config remplace la configuration implicite que
// `next lint` fournissait auparavant.
import next from "eslint-config-next";

// dist/ est un reliquat de build Vite (gitignoré) : la config plate ne lit
// pas .gitignore, il faut donc l'exclure explicitement.
const config = [
  {
    ignores: [
      ".next/**",
      "dist/**",
      "node_modules/**",
      "src/api/schema.d.ts",
    ],
  },
  ...next,
];

export default config;
