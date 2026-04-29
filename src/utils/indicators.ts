/**
 * Pour chaque agrégat, détermine si "plus élevé que la moyenne = bien" (vert)
 * ou "moins élevé que la moyenne = bien" (vert, cas par défaut pour les dépenses).
 */
const HIGHER_IS_BETTER = new Set([
  "Recettes de fonctionnement",
  "Recettes d'investissement",
  "Recettes totales",
  "Recettes totales hors emprunts",
  "Recettes d'investissement hors emprunts",
  "Epargne brute",
  "Epargne nette",
  "Epargne de gestion",
  "Impôts et taxes",
  "Impôts locaux",
  "Ventes de biens et services",
  "Subventions reçues et participations",
  "Autres recettes de fonctionnement",
  "Autres recettes d'investissement",
  "FCTVA",
  // DGF, Fiscalité reversée et Concours de l'Etat volontairement exclus :
  // leur niveau reflète la péréquation et la structure interco, pas la qualité de gestion.
]);

export function higherIsBetter(agregat: string): boolean {
  return HIGHER_IS_BETTER.has(agregat);
}
