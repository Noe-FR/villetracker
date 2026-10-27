import { serverApi } from "@/src/api/server";
import { transformFinances, transformComparison } from "./transforms";

/**
 * Compose le payload de l'onglet « finances ».
 *
 * Partagé entre la route BFF (appelée par le client) et la page serveur
 * `app/commune/[codeInsee]/page.tsx`, qui s'en sert pour que le HTML envoyé
 * contienne déjà les données — sans quoi les pages commune ne servent qu'un
 * squelette, invisible pour les crawlers qui n'exécutent pas le JavaScript.
 *
 * Chaque source est en allSettled : une source indisponible dégrade la page
 * au lieu de la faire échouer.
 */
export async function buildFinancesTab(codeInsee: string, year: number) {
  const [rawFin, cmp, score, years, geo, scoreHisto] = await Promise.allSettled([
    serverApi.getCommuneFinances(codeInsee, year),
    serverApi.getCommuneComparison(codeInsee, year),
    serverApi.getCommuneScore(codeInsee, year),
    serverApi.getAvailableYears(),
    serverApi.getCommuneGeo(codeInsee),
    serverApi.getScoreHistorique(codeInsee),
  ]);

  return {
    finances: transformFinances(
      rawFin.status === "fulfilled" ? rawFin.value : null,
      geo.status === "fulfilled" ? geo.value : null,
    ),
    comparison: transformComparison(cmp.status === "fulfilled" ? cmp.value : null),
    score: score.status === "fulfilled" ? score.value : null,
    years: years.status === "fulfilled" ? years.value : { years: [], latest: year },
    scoreHistorique: scoreHisto.status === "fulfilled" ? scoreHisto.value : null,
  };
}
