import type {
  CommuneFinances, CommuneComparison, ComptesData, FiscaliteData,
  MarchesData, EnergieData, TerritoireData, FiscaliteProData,
  ElusData, HistoriqueElections, ImmobilierData, DvfEvolutionData,
  DvfTransactionsData, DvfMapData, EauData, EconomieData,
} from "../types";

// Tous les appels passent par les Route Handlers Next.js.
// L'API FastAPI n'est jamais appelée directement depuis le navigateur.
const BASE = "/api";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface SearchResult {
  code_insee: string;
  nom: string;
  population?: number;
  departement_code?: string;
  departement_nom?: string;
  codes_postaux?: string[];
}

export interface CommuneGeoResult {
  code_insee: string;
  nom: string;
  population?: number;
  departement_code?: string;
  departement_nom?: string;
  geometry?: unknown;
}

const communeData = (codeInsee: string, tab: string, year?: number, page?: number) =>
  fetchJson<unknown>(
    `${BASE}/commune/${codeInsee}?tab=${tab}${year ? `&year=${year}` : ""}${page && page > 1 ? `&page=${page}` : ""}`
  );

export const api = {
  searchCommunes: (q: string, limit = 10) =>
    fetchJson<{ results: SearchResult[]; total: number }>(
      `${BASE}/geo/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),

  getCommunesByDept: (deptCode: string) =>
    fetchJson<GeoJSON.FeatureCollection>(
      `${BASE}/geo/communes/departement/${deptCode}`
    ),

  getCommuneGeo: (codeInsee: string) =>
    fetchJson<CommuneGeoResult>(
      `${BASE}/geo/commune/${codeInsee}?geometry=true`
    ),

  getFinancesTab: (codeInsee: string, year = 2023) =>
    communeData(codeInsee, "finances", year) as Promise<{
      finances: CommuneFinances;
      comparison: CommuneComparison;
      score: unknown;
      years: { years: number[]; latest: number };
      scoreHistorique?: {
        code_insee: string;
        historique: Array<{
          annee: number; score: number; note: string;
          d1_solvabilite: number; d2_equilibre: number; d3_rigidite: number;
          d4_investissement: number; d5_autonomie: number; d6_dynamique: number;
        }>;
      };
    }>,

  getCommuneFinances: (codeInsee: string, year = 2023) =>
    communeData(codeInsee, "finances", year).then(
      (d) => (d as { finances: CommuneFinances }).finances
    ),

  getCommuneComparison: (codeInsee: string, year = 2023) =>
    communeData(codeInsee, "finances", year).then(
      (d) => (d as { comparison: CommuneComparison }).comparison
    ),

  getCommuneScore: (codeInsee: string, year = 2023) =>
    communeData(codeInsee, "finances", year).then(
      (d) => (d as { score: unknown }).score
    ),

  getComptes: (codeInsee: string, year = 2023) =>
    communeData(codeInsee, "comptes", year) as Promise<ComptesData>,

  getFiscalite: (codeInsee: string, year = 2023) =>
    communeData(codeInsee, "fiscalite", year).then(
      (d) => (d as { fiscalite: FiscaliteData }).fiscalite
    ),

  getPanel: (codeInsee: string, year = 2023) =>
    fetchJson<{ finances: CommuneFinances; score: unknown; immobilier: ImmobilierData; maire: import("../types").Elu | null }>(
      `${BASE}/commune/${codeInsee}?tab=panel&year=${year}`
    ),

  getEconomie: (codeInsee: string, yearMarches = 2023, yearFiscPro = 2022, marchesPage = 1, marchesLimit = 50) =>
    fetchJson<EconomieData>(
      `${BASE}/commune/${codeInsee}?tab=economie&year=${yearMarches}&yearFiscPro=${yearFiscPro}&marchesPage=${marchesPage}&marchesLimit=${marchesLimit}`
    ),

  getMarches: (codeInsee: string, year = 2023) =>
    communeData(codeInsee, "marches", year) as Promise<MarchesData>,

  getEnergie: (codeInsee: string, _year?: number) =>
    communeData(codeInsee, "energie") as Promise<EnergieData>,

  getTerritoire: (codeInsee: string) =>
    communeData(codeInsee, "territoire") as Promise<TerritoireData>,

  getFiscalitePro: (codeInsee: string, year = 2022) =>
    communeData(codeInsee, "fiscalite", year).then(
      (d) => (d as { fiscalitePro: FiscaliteProData }).fiscalitePro
    ),

  getElus: (codeInsee: string) =>
    communeData(codeInsee, "elus").then(
      (d) => (d as { elus: ElusData }).elus
    ),

  getHistoriqueElections: (codeInsee: string) =>
    communeData(codeInsee, "elus").then(
      (d) => (d as { historique: HistoriqueElections }).historique
    ),

  getImmobilier: (codeInsee: string, year = 2024) =>
    communeData(codeInsee, "immobilier", year).then(
      (d) => (d as { immobilier: ImmobilierData }).immobilier
    ),

  getDvfEvolution: (codeInsee: string) =>
    communeData(codeInsee, "immobilier").then(
      (d) => (d as { dvfEvolution: DvfEvolutionData }).dvfEvolution
    ),

  getDvfTransactions: (codeInsee: string, year: number, page = 1, pageSize = 25, sortBy = "date", sortDir = "desc") =>
    fetchJson<unknown>(
      `${BASE}/commune/${codeInsee}?tab=immobilier&year=${year}&page=${page}&txPageSize=${pageSize}&txSortBy=${sortBy}&txSortDir=${sortDir}`
    ).then((d) => (d as { dvfTransactions: DvfTransactionsData }).dvfTransactions),

  getDvfMap: (codeInsee: string) =>
    communeData(codeInsee, "immobilier").then(
      (d) => (d as { dvfMap: DvfMapData }).dvfMap
    ),

  getDvfPoints: (codeInsee: string) =>
    communeData(codeInsee, "immobilier").then(
      (d) => (d as any).dvfPoints
    ),

  getDvfTransactionDetail: (idMutation: string) =>
    fetchJson<any>(`${BASE}/immobilier/transaction/${idMutation}`),

  getEau: (codeInsee: string) =>
    communeData(codeInsee, "eau").then((d: any) => d?.eau) as Promise<EauData>,
  getEauMensuel: (codeInsee: string) =>
    communeData(codeInsee, "eau").then((d: any) => d?.eauMensuel) as Promise<any>,

  getAvailableYears: () =>
    fetchJson<{ years: number[]; latest: number }>(`${BASE}/finances/available-years`)
      .catch(() => ({ years: [2020, 2021, 2022, 2023], latest: 2023 })),
};
