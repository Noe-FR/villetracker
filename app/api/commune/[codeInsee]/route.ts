import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/src/api/server";
import {
  transformFinances, transformComparison, transformEau, transformEauMensuel,
  transformFiscalite, transformFiscalitePro, transformEnergie,
  transformTerritoire, transformHistorique, transformImmobilier,
  transformDvfEvolution, transformDvfTransactions,
  transformElus, transformMarches,
} from "./transforms";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ codeInsee: string }> }
) {
  const { codeInsee } = await params;
  const tab           = req.nextUrl.searchParams.get("tab") ?? "finances";
  const year          = Number(req.nextUrl.searchParams.get("year") ?? 2023);
  const yearFiscPro   = Number(req.nextUrl.searchParams.get("yearFiscPro") ?? year);
  const page          = Number(req.nextUrl.searchParams.get("page") ?? 1);
  const marchesPage   = Number(req.nextUrl.searchParams.get("marchesPage") ?? 1);
  const marchesLimit  = Number(req.nextUrl.searchParams.get("marchesLimit") ?? 50);
  const txPageSize    = Number(req.nextUrl.searchParams.get("txPageSize") ?? 25);
  const txSortBy      = req.nextUrl.searchParams.get("txSortBy") ?? "date";
  const txSortDir     = req.nextUrl.searchParams.get("txSortDir") ?? "desc";

  try {
    let data: unknown;
    switch (tab) {
      case "finances": {
        const [rawFin, cmp, score, years, geo, scoreHisto] = await Promise.allSettled([
          serverApi.getCommuneFinances(codeInsee, year),
          serverApi.getCommuneComparison(codeInsee, year),
          serverApi.getCommuneScore(codeInsee, year),
          serverApi.getAvailableYears(),
          serverApi.getCommuneGeo(codeInsee),
          serverApi.getScoreHistorique(codeInsee),
        ]);
        data = {
          finances:       transformFinances(
            rawFin.status === "fulfilled" ? rawFin.value : null,
            geo.status    === "fulfilled" ? geo.value    : null,
          ),
          comparison:     transformComparison(cmp.status === "fulfilled" ? cmp.value : null),
          score:          score.status      === "fulfilled" ? score.value      : null,
          years:          years.status      === "fulfilled" ? years.value      : { years: [], latest: year },
          scoreHistorique: scoreHisto.status === "fulfilled" ? scoreHisto.value : null,
        };
        break;
      }
      case "comptes":
        data = await serverApi.getComptes(codeInsee, year);
        break;
      case "fiscalite": {
        const [rawFisc, rawFiscPro, geo] = await Promise.allSettled([
          serverApi.getFiscalite(codeInsee, year),
          serverApi.getFiscalitePro(codeInsee, year),
          serverApi.getCommuneGeo(codeInsee),
        ]);
        data = {
          fiscalite:    transformFiscalite(
            rawFisc.status    === "fulfilled" ? rawFisc.value    : null,
            geo.status        === "fulfilled" ? geo.value        : null,
          ),
          fiscalitePro: transformFiscalitePro(rawFiscPro.status === "fulfilled" ? rawFiscPro.value : null),
        };
        break;
      }
      case "panel": {
        const { latest: panelYear } = await serverApi.getAvailableYears();
        const [rawFin, rawScoreHisto, rawImmo, rawGeo, rawElus] = await Promise.allSettled([
          serverApi.getCommuneFinances(codeInsee, panelYear),
          serverApi.getScoreHistorique(codeInsee),
          serverApi.getImmobilier(codeInsee, year),
          serverApi.getCommuneGeo(codeInsee),
          serverApi.getElus(codeInsee),
        ]);
        const histo = rawScoreHisto.status === "fulfilled" ? rawScoreHisto.value?.historique : null;
        const latestScore = Array.isArray(histo) && histo.length > 0 ? histo[histo.length - 1] : null;
        data = {
          finances:   transformFinances(
            rawFin.status  === "fulfilled" ? rawFin.value  : null,
            rawGeo.status  === "fulfilled" ? rawGeo.value  : null,
          ),
          score:      latestScore,
          immobilier: transformImmobilier(rawImmo.status === "fulfilled" ? rawImmo.value : null),
          maire:      rawElus.status  === "fulfilled" ? rawElus.value.maire : null,
        };
        break;
      }
      case "economie": {
        const [rawMarches, rawFiscPro] = await Promise.allSettled([
          serverApi.getMarches(codeInsee, year, marchesPage, marchesLimit),
          serverApi.getFiscalitePro(codeInsee, yearFiscPro),
        ]);
        data = {
          marches:      rawMarches.status === "fulfilled" ? transformMarches(rawMarches.value) : null,
          fiscalitePro: rawFiscPro.status === "fulfilled" ? transformFiscalitePro(rawFiscPro.value) : null,
        };
        break;
      }
      case "marches":
        data = await serverApi.getMarches(codeInsee, year).then(transformMarches);
        break;
      case "energie":
        data = await serverApi.getEnergie(codeInsee).then(transformEnergie);
        break;
      case "territoire":
        data = await serverApi.getTerritoire(codeInsee).then(transformTerritoire);
        break;
      case "elus": {
        const [rawElus, rawHisto] = await Promise.allSettled([
          serverApi.getElus(codeInsee),
          serverApi.getHistoriqueElections(codeInsee),
        ]);
        data = {
          elus:      transformElus(rawElus.status === "fulfilled" ? rawElus.value : null),
          historique: transformHistorique(rawHisto.status === "fulfilled" ? rawHisto.value : null),
        };
        break;
      }
      case "immobilier": {
        const [rawImmo, rawEvo, rawTx, rawPoints] = await Promise.allSettled([
          serverApi.getImmobilier(codeInsee, year),
          serverApi.getDvfEvolution(codeInsee),
          serverApi.getDvfTransactions(codeInsee, year, page, txPageSize, txSortBy, txSortDir),
          serverApi.getDvfPoints(codeInsee),
        ]);
        data = {
          immobilier:      transformImmobilier(rawImmo.status === "fulfilled" ? rawImmo.value : null),
          dvfEvolution:    transformDvfEvolution(rawEvo.status === "fulfilled" ? rawEvo.value : null),
          dvfTransactions: transformDvfTransactions(rawTx.status === "fulfilled" ? rawTx.value : null, year),
          dvfPoints:       rawPoints.status === "fulfilled" ? rawPoints.value : null,
        };
        break;
      }
      case "eau": {
        const [rawEau, rawEauM] = await Promise.allSettled([
          serverApi.getEau(codeInsee),
          serverApi.getEauMensuel(codeInsee),
        ]);
        data = {
          eau:        rawEau.status        === "fulfilled" ? transformEau(rawEau.value)               : null,
          eauMensuel: rawEauM.status       === "fulfilled" ? transformEauMensuel(rawEauM.value)        : null,
        };
        break;
      }
      default:
        return NextResponse.json({ error: "tab inconnu" }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
