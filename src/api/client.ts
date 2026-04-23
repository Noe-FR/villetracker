import type {
  CommuneFinances,
  CommuneComparison,
  ComptesData,
  FiscaliteData,
  MarchesData,
  EnergieData,
  TerritoireData,
  FiscaliteProData,
  ElusData,
  HistoriqueElections,
  ImmobilierData,
  DvfEvolutionData,
  DvfTransactionsData,
  DvfMapData,
  EauData,
} from "../types";

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
}

export const api = {
  // Géo
  searchCommunes: (q: string, limit = 10) =>
    fetchJson<{ results: SearchResult[]; total: number }>(
      `${BASE}/geo/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),

  getCommuneGeo: (codeInsee: string) =>
    fetchJson<{
      code_insee: string;
      nom: string;
      population?: number;
      departement_code?: string;
      departement_nom?: string;
      geometry?: unknown;
    }>(`${BASE}/geo/commune/${codeInsee}?geometry=true`),

  getCommunesByDept: (deptCode: string) =>
    fetchJson<GeoJSON.FeatureCollection>(`${BASE}/geo/communes/departement/${deptCode}`),

  // Finances (also used as commune summary)
  getCommuneFinances: (codeInsee: string, year = 2023) =>
    fetchJson<CommuneFinances>(`${BASE}/finances/commune/${codeInsee}?year=${year}`),

  getCommuneComparison: (codeInsee: string, year = 2023) =>
    fetchJson<CommuneComparison>(`${BASE}/finances/commune/${codeInsee}/comparison?year=${year}`),

  // Données comptables
  getComptes: (codeInsee: string, year = 2023) =>
    fetchJson<ComptesData>(`${BASE}/comptable/commune/${codeInsee}/comptes?year=${year}`),

  getFiscalite: (codeInsee: string, year = 2023) =>
    fetchJson<FiscaliteData>(`${BASE}/comptable/commune/${codeInsee}/fiscalite?year=${year}`),

  // Marchés publics
  getMarches: (codeInsee: string, year = 2023) =>
    fetchJson<MarchesData>(`${BASE}/marches/commune/${codeInsee}?year=${year}`),

  // Énergie
  getEnergie: (codeInsee: string, year = 2022) =>
    fetchJson<EnergieData>(`${BASE}/energie/commune/${codeInsee}?year=${year}`),

  // Territoire
  getTerritoire: (codeInsee: string) =>
    fetchJson<TerritoireData>(`${BASE}/territoire/commune/${codeInsee}`),

  // Fiscalité pro
  getFiscalitePro: (codeInsee: string, year = 2022) =>
    fetchJson<FiscaliteProData>(`${BASE}/fiscalite-pro/commune/${codeInsee}?year=${year}`),

  // Élus
  getElus: (codeInsee: string) =>
    fetchJson<ElusData>(`${BASE}/elus/commune/${codeInsee}`),

  getHistoriqueElections: (codeInsee: string) =>
    fetchJson<HistoriqueElections>(`${BASE}/elus/commune/${codeInsee}/historique`),

  // Immobilier
  getImmobilier: (codeInsee: string, year = 2024) =>
    fetchJson<ImmobilierData>(`${BASE}/immobilier/commune/${codeInsee}?year=${year}`),

  getDvfEvolution: (codeInsee: string) =>
    fetchJson<DvfEvolutionData>(`${BASE}/immobilier/commune/${codeInsee}/dvf/evolution`),

  getDvfTransactions: (codeInsee: string, year: number) =>
    fetchJson<DvfTransactionsData>(`${BASE}/immobilier/commune/${codeInsee}/dvf/transactions?year=${year}`),

  getDvfMap: (codeInsee: string) =>
    fetchJson<DvfMapData>(`${BASE}/immobilier/commune/${codeInsee}/dvf/map`),

  // Eau
  getEau: (codeInsee: string) =>
    fetchJson<EauData>(`${BASE}/eau/commune/${codeInsee}`),

  // Available years — fetches from national endpoint; falls back to static list
  getAvailableYears: () =>
    fetchJson<{ years: number[]; latest: number }>(`${BASE}/finances/available-years`)
      .catch(() => ({ years: [2020, 2021, 2022, 2023], latest: 2023 })),
};
