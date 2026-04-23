export interface CommuneSummary {
  code_insee: string;
  nom: string;
  population: number;
  tranche_population: number;
  rural: string;
  montagne: string;
  touristique: string;
  departement: string;
  departement_code: string;
  region: string;
  annee: number;
  agregats: Record<string, { montant: number; euros_par_habitant: number }>;
}

export interface CommuneFinances {
  meta: {
    code_insee: string;
    nom: string;
    population: number;
    tranche_population: number;
    rural: string;
    montagne: string;
    touristique: string;
    departement: string;
    departement_code: string;
    region: string;
    annee: number;
  };
  agregats: Record<string, { montant: number | null; euros_par_habitant: number | null }>;
  agregats_n1: Record<string, { montant: number | null; euros_par_habitant: number | null }>;
  evolution_yoy: Record<string, { montant_pct: number | null; eph_pct: number | null }>;
  evolution: Record<
    string,
    Array<{
      annee: number;
      montant: number | null;
      euros_par_habitant: number | null;
      population: number | null;
    }>
  >;
}

export interface ComparisonItem {
  agregat: string;
  commune_eph: number;
  moyenne_tranche: number;
  min_tranche: number;
  max_tranche: number;
  diff_pct: number | null;
  nb_communes: number;
  rang: number;
}

export interface CommuneComparison {
  code_insee: string;
  annee: number;
  tranche_population: number;
  tranche_label: string;
  tranche_nom: string;
  pop_min: number;
  pop_max: number;
  comparison: ComparisonItem[];
}

export interface CompteLigne {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
  solde_debiteur: number;
  solde_crediteur: number;
}

export interface CompteClasse {
  classe: string;
  libelle: string;
  total_debit: number;
  total_credit: number;
  lignes: CompteLigne[];
}

export interface ComptesData {
  code_insee: string;
  annee: number;
  nb_lignes: number;
  nomen: string;
  classes: CompteClasse[];
}

export interface FiscaliteData {
  code_insee: string;
  nom: string;
  annee: number;
  population: number;
  tfb: { label: string; taux_commune: number; taux_global: number; base: number; taux_intercommunal: number };
  tfnb: { label: string; taux_commune: number; taux_global: number; taux_intercommunal: number };
  th: { label: string; taux_commune: number; taux_global: number; base: number; taux_intercommunal: number; majoration_rs: number };
  teom: { label: string; taux: number };
  intercommunalite: string;
}

export interface MarcheTitulaire {
  siret: string;
  nom: string;
}

export interface Marche {
  id: string;
  nature: string | null;
  objet: string | null;
  montant: number | null;
  date_notification: string | null;
  date_publication: string | null;
  procedure: string | null;
  cpv: string | null;
  duree_mois: number | null;
  offres_recues: string | null;
  lieu_execution: string | null;
  titulaires: MarcheTitulaire[];
  acheteur_id: string | null;
  acheteur_nom: string | null;
  forme_prix: string | null;
  types_prix: string | null;
  ccag: string | null;
  sous_traitance: string | null;
  modalites_execution: string | null;
  techniques: string | null;
  marche_innovant: string | null;
  considerations_sociales: string | null;
  considerations_env: string | null;
  groupement: string | null;
  avance: string | null;
  taux_avance: string | null;
  source: string | null;
}

export interface MarchesData {
  code_insee: string;
  siren: string;
  annee: number;
  total: number;
  scope: "acheteur" | "lieu";
  marches: Marche[];
}

export interface GeoCommune {
  type: string;
  features: Array<{
    type: string;
    geometry: GeoJSON.Geometry;
    properties: {
      nom: string;
      code: string;
      population?: number;
      codesPostaux?: string[];
    };
  }>;
}

export interface EnergieData {
  code_insee: string;
  annee: number;
  electricite: {
    total_mwh: number;
    par_secteur: Record<string, { mwh: number; nb_sites: number }>;
  };
  gaz: {
    total_mwh: number;
    par_secteur: Record<string, { mwh: number; nb_sites: number }>;
  };
}

export interface TerritoireData {
  code_insee: string;
  ges: {
    disponible: boolean;
    par_secteur?: Array<{
      secteur: string;
      annees: Array<{ annee: number; valeur: number }>;
    }>;
    derniere_annee?: number;
    erreur?: string;
  };
  mobilite: {
    disponible: boolean;
    annee?: number;
    modes?: Array<{ mode: string; valeur: number; pct: number }>;
    total?: number;
    erreur?: string;
  };
}

export interface Elu {
  nom: string;
  prenom: string;
  sexe: string;
  date_naissance: string;
  fonction: string;
  date_mandat: string;
  date_fonction: string;
  csp: string;
}

export interface ElusData {
  code_insee: string;
  maire: Elu | null;
  conseillers: Elu[];
  nb_conseillers: number;
  source: string;
  cm_disponible: boolean;
}

export interface NuanceElection {
  nuance: string;
  libelle: string;
  couleur: string;
  nb_candidats: number;
  nb_voix?: number;
  pct_voix: number | null;
  tete_liste?: string;
}

export interface ElectionAnnee {
  id_election: string;
  annee: number;
  label: string;
  has_t2?: boolean;
  nb_candidats: number;
  nb_candidats_t1?: number;
  nb_candidats_t2?: number;
  nuances: NuanceElection[];
  nuances_t1?: NuanceElection[];
  nuances_t2?: NuanceElection[];
  nuance_gagnante: NuanceElection | null;
}

export interface HistoriqueElections {
  code_insee: string;
  disponible: boolean;
  elections: ElectionAnnee[];
}

export interface ImmobilierData {
  prix_m2?: number;
  prix_moyen?: number;
  surface_moy?: number;
  nb_mutations?: number;
  annee_dvf?: number;
  loyer_app_m2?: number;
  loyer_mai_m2?: number;
  annee_loyer?: number;
}

export interface DvfTransaction {
  date: string | null;
  annee: number;
  type: string;
  codtypbien: string;
  surface_bati: number;
  surface_terrain: number;
  prix: number;
  prix_m2: number;
  vefa: boolean;
  nb_locaux: number | null;
}

export interface DvfYearStats {
  annee: number;
  nb: number;
  prix_m2_median: number;
  prix_m2_moy: number;
  surface_moy: number;
}

export interface DvfEvolutionData {
  code_insee: string;
  evolution: {
    maisons: DvfYearStats[];
    appartements: DvfYearStats[];
  };
}

export interface DvfTransactionsData {
  code_insee: string;
  annee: number;
  total: number;
  transactions: DvfTransaction[];
}

export interface DvfMapFeature {
  type: "Feature";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry: any; // Point | Polygon | MultiPolygon
  properties: {
    date: string | null;
    annee: number;
    type: string;
    codtypbien: string;
    surface: number;
    prix: number;
    prix_m2: number;
    vefa: boolean;
    has_polygon: boolean;
  };
}

export interface DvfMapData {
  type: "FeatureCollection";
  count: number;
  features: DvfMapFeature[];
}

export interface EauData {
  code_insee: string;
  nb_prelevements: number;
  derniere_analyse: string | null;
  distributeur: string | null;
  taux_conformite_bact: number | null;
  taux_conformite_pc: number | null;
  nb_non_conformes_bact: number;
  nb_non_conformes_pc: number;
}

export interface FiscaliteProData {
  disponible: boolean;
  code_insee?: string;
  annee?: number;
  commune?: string;
  intercommunalite?: string;
  taux?: Record<string, number>;
  erreur?: string;
}
