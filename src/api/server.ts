import type {
  CommuneFinances, CommuneComparison, ComptesData, FiscaliteData,
  MarchesData, EnergieData, TerritoireData, FiscaliteProData,
  ElusData, HistoriqueElections, ImmobilierData, DvfEvolutionData,
  DvfTransactionsData, DvfMapData, EauData,
} from "../types";
import type { SearchResult } from "./client";

// En Docker, l'API est accessible directement sur le réseau interne.
// En dev local sans Docker, on passe par le proxy nginx (:80).
const BASE = process.env.API_INTERNAL_URL
  ? `${process.env.API_INTERNAL_URL}/api`
  : "http://api:8000/api";

const API_TOKEN = process.env.API_TOKEN ?? "";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {},
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (err as { detail?: string }).detail || `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const serverApi = {
  searchCommunes: (q: string, limit = 10) =>
    fetchJson<{ results: SearchResult[]; total: number }>(
      `/geo/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),

  getCommuneInfo: (codeInsee: string) =>
    fetchJson<{
      code_insee: string; nom: string; population?: number;
      departement_code?: string; departement_nom?: string;
    }>(`/geo/commune/${codeInsee}`),

  getCommuneGeo: (codeInsee: string) =>
    fetchJson<{
      code_insee: string; nom: string; population?: number;
      departement_code?: string; departement_nom?: string; geometry?: unknown;
    }>(`/geo/commune/${codeInsee}?geometry=true`),

  getCommunesByDept: (deptCode: string) =>
    fetchJson<GeoJSON.FeatureCollection>(`/geo/communes/departement/${deptCode}`),

  getCommuneFinances: (codeInsee: string, year = 2023) =>
    fetchJson<CommuneFinances>(`/finances/commune/${codeInsee}?annee=${year}`),

  getCommuneComparison: (codeInsee: string, year = 2023) =>
    fetchJson<CommuneComparison>(`/finances/commune/${codeInsee}/comparison?annee=${year}`),

  getCommuneScore: (codeInsee: string, year = 2023) =>
    fetchJson<unknown>(`/finances/commune/${codeInsee}/score?annee=${year}`),

  getScoreHistorique: (codeInsee: string) =>
    fetchJson<any>(`/finances/commune/${codeInsee}/score/historique`),

  getComptes: (codeInsee: string, year = 2023) =>
    fetchJson<ComptesData>(`/comptable/commune/${codeInsee}/comptes?annee=${year}`),

  getFiscalite: (codeInsee: string, year = 2023) =>
    fetchJson<FiscaliteData>(`/comptable/commune/${codeInsee}/fiscalite?annee=${year}`),

  getMarches: (codeInsee: string, year = 2023, page = 1, limit = 50) =>
    fetchJson<MarchesData>(`/marches/commune/${codeInsee}?annee=${year}&page=${page}&limit=${limit}`),

  getEnergie: (codeInsee: string, year = 2022) =>
    fetchJson<EnergieData>(`/energie/commune/${codeInsee}?annee=${year}`),

  getTerritoire: (codeInsee: string) =>
    fetchJson<TerritoireData>(`/territoire/commune/${codeInsee}`),

  getFiscalitePro: (codeInsee: string, year = 2022) =>
    fetchJson<FiscaliteProData>(`/fiscalite-pro/commune/${codeInsee}?annee=${year}`),

  getElus: (codeInsee: string) =>
    fetchJson<ElusData>(`/elus/commune/${codeInsee}`),

  getHistoriqueElections: (codeInsee: string) =>
    fetchJson<HistoriqueElections>(`/elus/commune/${codeInsee}/historique`),

  getImmobilier: (codeInsee: string, year = 2024) =>
    fetchJson<ImmobilierData>(`/immobilier/commune/${codeInsee}?annee=${year}`),

  getDvfEvolution: (codeInsee: string) =>
    fetchJson<DvfEvolutionData>(`/immobilier/commune/${codeInsee}/dvf/evolution`),

  getDvfTransactions: (codeInsee: string, year: number, page = 1, pageSize = 25, sortBy = "date", sortDir = "desc") =>
    fetchJson<DvfTransactionsData>(`/immobilier/commune/${codeInsee}/dvf/transactions?annee=${year}&page=${page}&page_size=${pageSize}&sort_by=${sortBy}&sort_dir=${sortDir}`),

  getDvfMap: (codeInsee: string) =>
    fetchJson<DvfMapData>(`/immobilier/commune/${codeInsee}/dvf/map`),

  getDvfPoints: (codeInsee: string) =>
    fetchJson<any>(`/immobilier/commune/${codeInsee}/dvf/points`),

  getDvfTransactionDetail: (idMutation: string) =>
    fetchJson<any>(`/immobilier/transaction/${idMutation}`),

  getEau: (codeInsee: string) =>
    fetchJson<EauData>(`/eau/commune/${codeInsee}`),
  getEauMensuel: (codeInsee: string) =>
    fetchJson<any>(`/eau/commune/${codeInsee}/mensuel`),

  getAvailableYears: () =>
    fetchJson<{ years: number[]; latest: number }>(`/finances/available-years`)
      .catch(() => ({ years: [2020, 2021, 2022, 2023], latest: 2023 })),
};
