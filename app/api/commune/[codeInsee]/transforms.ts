/* eslint-disable @typescript-eslint/no-explicit-any */

const TRANCHE_LABELS: Record<string, string> = {
  "1":  "Moins de 250 hab.",
  "2":  "250 – 499 hab.",
  "3":  "500 – 1 999 hab.",
  "4":  "2 000 – 4 999 hab.",
  "5":  "5 000 – 9 999 hab.",
  "6":  "10 000 – 19 999 hab.",
  "7":  "20 000 – 49 999 hab.",
  "8":  "50 000 – 99 999 hab.",
  "9":  "100 000 – 299 999 hab.",
  "10": "300 000 hab. et plus",
};

export function transformFinances(raw: any, geo: any) {
  const list: any[] = raw?.agregats ?? [];
  const agregats:     Record<string, { montant: number | null; euros_par_habitant: number | null }> = {};
  const agregats_n1:  Record<string, { montant: number | null; euros_par_habitant: number | null }> = {};
  const evolution_yoy: Record<string, { montant_pct: number | null; eph_pct: number | null }> = {};
  const evolution: Record<string, Array<{ annee: number; montant: number | null; euros_par_habitant: number | null; population: number | null }>> = {};

  for (const ag of list) {
    if (ag.type_budget !== "Budget principal") continue;
    const k: string = ag.agregat;
    agregats[k]      = { montant: ag.montant ?? null,    euros_par_habitant: ag.euros_par_habitant ?? null };
    agregats_n1[k]   = { montant: ag.montant_n1 ?? null, euros_par_habitant: ag.eph_n1 ?? null };
    evolution_yoy[k] = { montant_pct: ag.evolution_yoy ?? null, eph_pct: ag.evolution_yoy ?? null };
    if (ag.historique) {
      const histM: Record<string, number> = ag.historique_montant ?? {};
      evolution[k] = Object.entries(ag.historique as Record<string, number>)
        .map(([yr, eph]) => ({ annee: Number(yr), montant: histM[yr] ?? null, euros_par_habitant: eph, population: null }))
        .sort((a, b) => a.annee - b.annee);
    }
  }

  return {
    meta: {
      code_insee:         raw?.code_insee ?? "",
      nom:                raw?.nom ?? "",
      population:         raw?.population ?? 0,
      tranche_population: Number(raw?.tranche ?? 0),
      rural:       geo?.rural       === true ? "Oui" : geo?.rural       === false ? "Non" : (geo?.rural       ?? ""),
      montagne:    geo?.montagne    === true ? "Oui" : geo?.montagne    === false ? "Non" : (geo?.montagne    ?? ""),
      touristique: geo?.touristique === true ? "Oui" : geo?.touristique === false ? "Non" : (geo?.touristique ?? ""),
      departement:      geo?.departement_nom  ?? "",
      departement_code: geo?.departement_code ?? "",
      region:           geo?.region_nom       ?? "",
      annee:            raw?.annee ?? 0,
    },
    agregats,
    agregats_n1,
    evolution_yoy,
    evolution,
  };
}

export function transformComparison(raw: any) {
  if (!raw) return null;
  const tranche = String(raw.tranche ?? "");
  const items = (raw.comparaisons ?? []).map((c: any) => ({
    agregat:         c.agregat,
    commune_eph:     c.commune_eph,
    moyenne_tranche: c.tranche?.avg ?? 0,
    p10_tranche:     c.tranche?.p10 ?? null,
    p90_tranche:     c.tranche?.p90 ?? null,
    diff_pct:        c.pct_vs_avg ?? null,
    nb_communes:     c.tranche?.nb_communes ?? 0,
    rang:            c.rang ?? 0,
  }));
  return {
    code_insee:       raw.code_insee ?? "",
    annee:            raw.annee ?? 0,
    tranche_population: Number(tranche),
    tranche_nom:      `Tranche ${tranche}`,
    tranche_label:    TRANCHE_LABELS[tranche] ?? `Tranche ${tranche}`,
    pop_min:          0,
    pop_max:          0,
    comparison:       items,
  };
}

const MOIS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function transformEauMensuel(raw: any) {
  if (!raw?.points?.length) return null;
  return {
    code_insee: raw.code_insee ?? "",
    points: raw.points.map((p: any) => ({
      annee:            p.annee,
      mois:             p.mois,
      label:            `${MOIS_FR[p.mois - 1]} ${p.annee}`,
      th_avg:           p.th_avg          ?? null,
      nitrates_avg:     p.nitrates_avg    ?? null,
      ph_avg:           p.ph_avg          ?? null,
      conductivite_avg: p.conductivite_avg ?? null,
      turbidite_avg:    p.turbidite_avg   ?? null,
      calcium_avg:      p.calcium_avg     ?? null,
      sulfates_avg:     p.sulfates_avg    ?? null,
      nb_mesures:       p.nb_mesures      ?? 0,
    })),
  };
}

export function transformEau(raw: any) {
  if (!raw) return null;
  const rawSeries: any[] = raw.series ?? [];
  const latest = rawSeries[0] ?? null;
  if (!latest) return {
    code_insee: raw.code_insee ?? "", nb_prelevements: 0,
    derniere_analyse: null, distributeur: null,
    taux_conformite_bact: null, taux_conformite_pc: null,
    nb_non_conformes_bact: 0, nb_non_conformes_pc: 0,
    th_avg: null, nitrates_avg: null, ph_avg: null,
    conductivite_avg: null, turbidite_avg: null, calcium_avg: null, sulfates_avg: null,
    series: [],
  };
  const nb      = latest.nb_prelevements ?? 0;
  const nb_bact = latest.nb_conformes_bact ?? nb;
  const nb_chim = latest.nb_conformes_chim ?? nb;
  // Pour les params physico-chimiques : valeur la plus récente non-nulle (pas forcément la dernière année)
  const latestVal = (field: string) => {
    for (const s of rawSeries) { if (s[field] != null) return s[field]; }
    return null;
  };
  const latestAnnee = (field: string): number | null => {
    for (const s of rawSeries) { if (s[field] != null) return s.annee; }
    return null;
  };
  const latestAnneeData = latest?.annee ?? null;
  const series = rawSeries.map((s: any) => ({
    annee:                s.annee,
    nb_prelevements:      s.nb_prelevements ?? 0,
    taux_conformite_bact: s.taux_conformite_bact ?? null,
    taux_conformite_pc:   s.taux_conformite_chim ?? null,
    th_avg:           s.th_avg           ?? null,
    nitrates_avg:     s.nitrates_avg     ?? null,
    ph_avg:           s.ph_avg           ?? null,
    conductivite_avg: s.conductivite_avg ?? null,
    turbidite_avg:    s.turbidite_avg    ?? null,
    calcium_avg:      s.calcium_avg      ?? null,
    sulfates_avg:     s.sulfates_avg     ?? null,
  }));
  return {
    code_insee:           raw.code_insee ?? "",
    nb_prelevements:      nb,
    derniere_analyse:     latest.derniere_analyse ?? null,
    distributeur:         latest.distributeur ?? null,
    taux_conformite_bact: latest.taux_conformite_bact ?? null,
    taux_conformite_pc:   latest.taux_conformite_chim ?? null,
    nb_non_conformes_bact: nb - nb_bact,
    nb_non_conformes_pc:   nb - nb_chim,
    th_avg:           latestVal("th_avg"),
    nitrates_avg:     latestVal("nitrates_avg"),
    ph_avg:           latestVal("ph_avg"),
    conductivite_avg: latestVal("conductivite_avg"),
    turbidite_avg:    latestVal("turbidite_avg"),
    calcium_avg:      latestVal("calcium_avg"),
    sulfates_avg:     latestVal("sulfates_avg"),
    physico_annee: {
      th_avg:           latestAnnee("th_avg"),
      nitrates_avg:     latestAnnee("nitrates_avg"),
      ph_avg:           latestAnnee("ph_avg"),
      conductivite_avg: latestAnnee("conductivite_avg"),
      turbidite_avg:    latestAnnee("turbidite_avg"),
      calcium_avg:      latestAnnee("calcium_avg"),
      sulfates_avg:     latestAnnee("sulfates_avg"),
    },
    derniere_annee: latestAnneeData,
    series,
  };
}

export function transformFiscalite(raw: any, geo: any) {
  if (!raw?.disponible) return { ...raw, disponible: false, erreur: "Données non disponibles" };
  const s = (raw.series ?? [])[0] ?? {};
  return {
    code_insee:      raw.code_insee ?? "",
    nom:             geo?.nom ?? "",
    annee:           s.annee ?? raw.annee ?? 0,
    population:      geo?.population ?? 0,
    intercommunalite: s.siren_epci ?? "",
    tfb:  { label: "TFB",  taux_commune: s.taux_commune_tfb  ?? 0, taux_global: s.taux_global_tfb  ?? 0, base: s.base_tfb  ?? 0, taux_intercommunal: s.taux_intercoms_tfb  ?? 0 },
    tfnb: { label: "TFNB", taux_commune: s.taux_commune_tfnb ?? 0, taux_global: s.taux_global_tfnb ?? 0, taux_intercommunal: s.taux_intercoms_tfnb ?? 0 },
    th:   { label: "TH",   taux_commune: s.taux_commune_th   ?? 0, taux_global: s.taux_global_th   ?? 0, base: s.base_th   ?? 0, taux_intercommunal: s.taux_intercoms_th   ?? 0, majoration_rs: s.majoration_rs_th ?? 0 },
    teom: { label: "TEOM", taux: s.taux_teom ?? 0 },
  };
}

export function transformFiscalitePro(raw: any) {
  if (!raw?.disponible) return { disponible: false, erreur: raw?.erreur ?? "Données non disponibles" };
  const s = (raw.series ?? [])[0] ?? {};
  const taux: Record<string, number> = {};
  if (s.taux_cfe_hz  != null) taux["CFE (hors ZAE)"] = s.taux_cfe_hz;
  if (s.taux_cfe_zae != null) taux["CFE (ZAE)"]      = s.taux_cfe_zae;
  if (s.taux_cfe_eol != null) taux["CFE (éolien)"]   = s.taux_cfe_eol;
  if (s.taux_tfnb    != null) taux["TFNB"]            = s.taux_tfnb;
  if (s.taux_tfb     != null) taux["TFB"]             = s.taux_tfb;
  if (s.taux_teom    != null) taux["TEOM"]            = s.taux_teom;
  return {
    disponible:      true,
    code_insee:      raw.code_insee ?? "",
    annee:           s.annee ?? 0,
    intercommunalite: s.siren_epci ?? "",
    taux,
  };
}

export function transformEnergie(raw: any) {
  if (!raw) return null;
  const toRecord = (arr: any[]): Record<string, { mwh: number; nb_sites: number }> => {
    const out: Record<string, { mwh: number; nb_sites: number }> = {};
    for (const item of arr ?? []) out[item.categorie] = { mwh: item.conso_mwh ?? 0, nb_sites: item.nb_sites ?? 0 };
    return out;
  };
  // La clé backend contient des accents — on cherche dynamiquement plutôt que de risquer un mismatch d'encodage
  const elecKey = Object.keys(raw).find(k => k.toLowerCase().includes("lectricit"));
  const elec = (elecKey ? raw[elecKey] : null) ?? raw["electricite"] ?? {};
  const gaz  = raw["gaz"] ?? {};
  return {
    code_insee:  raw.code_insee ?? "",
    annee:       raw.annee ?? 0,
    electricite: { total_mwh: elec.total_mwh ?? 0, par_secteur: toRecord(elec.par_secteur ?? []) },
    gaz:         { total_mwh: gaz.total_mwh  ?? 0, par_secteur: toRecord(gaz.par_secteur  ?? []) },
  };
}

export function transformTerritoire(raw: any) {
  if (!raw) return null;

  // GES : backend = [{annee, total_tonnes_co2, secteurs:[{secteur, tonnes_co2}]}]
  // frontend = { disponible, par_secteur:[{secteur, annees:[{annee, valeur}]}], derniere_annee }
  const gesList: any[] = Array.isArray(raw.ges) ? raw.ges : [];
  let ges: any;
  if (gesList.length === 0) {
    ges = { disponible: false, erreur: "Données GES non disponibles" };
  } else {
    const secteurMap: Record<string, Array<{ annee: number; valeur: number }>> = {};
    for (const entry of gesList) {
      for (const s of entry.secteurs ?? []) {
        if (!secteurMap[s.secteur]) secteurMap[s.secteur] = [];
        secteurMap[s.secteur].push({ annee: entry.annee, valeur: s.tonnes_co2 ?? 0 });
      }
    }
    const par_secteur = Object.entries(secteurMap).map(([secteur, annees]) => ({
      secteur,
      annees: annees.sort((a, b) => a.annee - b.annee),
    }));
    const annees = gesList.map((e: any) => e.annee).sort((a: number, b: number) => b - a);
    ges = { disponible: true, par_secteur, derniere_annee: annees[0] ?? 0 };
  }

  // Mobilite : backend = [{annee, modes:[{mode, nb_personnes, pct}]}]
  // frontend = { disponible, annee, modes:[{mode, valeur, pct}], total }
  const mobiList: any[] = Array.isArray(raw.mobilite) ? raw.mobilite : [];
  let mobilite: any;
  if (mobiList.length === 0) {
    mobilite = { disponible: false, erreur: "Données mobilité non disponibles" };
  } else {
    const latest = mobiList.sort((a: any, b: any) => b.annee - a.annee)[0];
    const modes = (latest.modes ?? []).map((m: any) => ({
      mode:   m.mode,
      valeur: m.nb_personnes ?? 0,
      pct:    m.pct ?? 0,
    }));
    const total = modes.reduce((s: number, m: any) => s + m.valeur, 0);
    mobilite = { disponible: true, annee: latest.annee, modes, total };
  }

  return { code_insee: raw.code_insee ?? "", ges, mobilite };
}

export function transformHistorique(raw: any) {
  if (!raw) return { code_insee: "", disponible: false, elections: [] };

  const toTourData = (tourRaw: any): any => {
    // tourRaw may be an object { listes: [...], inscrits, ... } (new API)
    // or a plain array (legacy fallback)
    const listes: any[] = Array.isArray(tourRaw)
      ? tourRaw
      : (tourRaw?.listes ?? []);
    const stats = Array.isArray(tourRaw) ? {} : tourRaw;

    return {
      listes: listes.map((n: any) => ({
        nuance:        n.nuance ?? "",
        libelle:       n.libelle_nuance ?? n.libelle ?? "",
        couleur:       n.couleur ?? "",
        libelle_liste: n.libelle_liste ?? undefined,
        nb_candidats:  n.nb_candidats ?? 0,
        nb_voix:       n.nb_voix ?? undefined,
        pct_voix:      n.pct_voix ?? null,
        tete_liste:    n.tete_liste ?? undefined,
        sieges_cm:     n.sieges_cm ?? undefined,
      })),
      inscrits:    stats.inscrits    ?? undefined,
      votants:     stats.votants     ?? undefined,
      abstentions: stats.abstentions ?? undefined,
      blancs:      stats.blancs      ?? undefined,
      nuls:        stats.nuls        ?? undefined,
      exprimes:    stats.exprimes    ?? undefined,
    };
  };

  const elections = (raw.scrutins ?? []).map((s: any) => {
    const t1Raw = s.tours?.t1;
    const t2Raw = s.tours?.t2;
    const t1 = t1Raw ? toTourData(t1Raw) : null;
    const t2 = t2Raw ? toTourData(t2Raw) : null;
    const nuancesMain = (t2?.listes.length ? t2.listes : t1?.listes) ?? [];
    const nuance_gagnante = nuancesMain.length
      ? nuancesMain.reduce((a: any, b: any) => ((a.pct_voix ?? 0) > (b.pct_voix ?? 0) ? a : b))
      : null;
    return {
      id_election:     s.id_election ?? "",
      annee:           s.annee ?? 0,
      label:           `Municipales ${s.annee ?? ""}`,
      has_t2:          (t2?.listes.length ?? 0) > 0,
      nb_candidats:    (t1?.listes.length ?? 0) + (t2?.listes.length ?? 0),
      nb_candidats_t1: t1?.listes.length ?? 0,
      nb_candidats_t2: t2?.listes.length || undefined,
      nuances:         nuancesMain,
      nuances_t1:      t1?.listes.length ? t1.listes : undefined,
      nuances_t2:      t2?.listes.length ? t2.listes : undefined,
      stats_t1:        t1 ? { inscrits: t1.inscrits, votants: t1.votants, abstentions: t1.abstentions, blancs: t1.blancs, nuls: t1.nuls, exprimes: t1.exprimes } : undefined,
      stats_t2:        t2 ? { inscrits: t2.inscrits, votants: t2.votants, abstentions: t2.abstentions, blancs: t2.blancs, nuls: t2.nuls, exprimes: t2.exprimes } : undefined,
      nuance_gagnante,
    };
  });

  return {
    code_insee: raw.code_insee ?? "",
    disponible: elections.length > 0,
    elections,
  };
}

export function transformImmobilier(raw: any) {
  if (!raw || raw.detail) return null;
  return {
    prix_m2:      raw.prix_m2_moyen     ?? undefined,
    prix_moyen:   raw.prix_moyen        ?? undefined,
    surface_moy:  raw.surface_moyenne   ?? undefined,
    nb_mutations: raw.nb_mutations      ?? undefined,
    annee_dvf:    raw.annee_dvf         ?? undefined,
    loyer_app_m2: raw.loyer_appartement_m2 ?? undefined,
    loyer_mai_m2: raw.loyer_maison_m2   ?? undefined,
    annee_loyer:  raw.annee_loyer       ?? undefined,
  };
}

export function transformDvfEvolution(raw: any) {
  if (!raw || raw.detail) return null;
  const toStats = (arr: any[]) =>
    (arr ?? []).map((d: any) => ({
      annee:        d.annee,
      nb:           d.nb_mutations ?? 0,
      prix_m2_median: d.prix_m2_median ?? 0,
      prix_m2_moy:  d.prix_m2_moyen ?? 0,
      surface_moy:  d.surface_moy ?? d.surface_moyenne ?? 0,
    }));
  const evo = raw.evolution ?? {};
  return {
    code_insee: raw.code_insee ?? "",
    evolution: {
      maisons:      toStats(evo["Maison"]      ?? evo["maisons"]      ?? []),
      appartements: toStats(evo["Appartement"] ?? evo["appartements"] ?? []),
    },
  };
}

export function transformElus(raw: any) {
  if (!raw) return null;
  return {
    code_insee:    raw.code_insee ?? "",
    maire:         raw.maire ?? null,
    conseillers:   raw.conseillers ?? [],
    nb_conseillers: raw.nb_conseillers ?? 0,
    source:        "Répertoire National des Élus (RNE)",
    cm_disponible: Array.isArray(raw.conseillers) && raw.conseillers.length > 0,
  };
}

export function transformMarches(raw: any) {
  if (!raw) return null;
  const marches = (raw.marches ?? []).map((m: any) => ({
    id:                  m.id_marche ?? m.id ?? null,
    nature:              m.nature ?? null,
    objet:               m.objet ?? null,
    montant:             m.montant ?? null,
    date_notification:   m.date_notification ?? null,
    date_publication:    m.date_publication ?? null,
    procedure:           m.procedure ?? null,
    cpv:                 m.cpv ?? null,
    duree_mois:          m.duree_mois ?? null,
    offres_recues:       m.offres_recues ?? null,
    lieu_execution:      m.lieu_execution ?? null,
    titulaires:          m.titulaires ?? [],
    acheteur_id:         m.acheteur_id ?? null,
    acheteur_nom:        m.acheteur_nom ?? null,
    forme_prix:          m.forme_prix ?? null,
    types_prix:          m.types_prix ?? null,
    ccag:                m.ccag ?? null,
    sous_traitance:      m.sous_traitance ?? null,
    modalites_execution: m.modalites_execution ?? null,
    techniques:          m.techniques ?? null,
    marche_innovant:     m.marche_innovant ?? null,
    considerations_sociales: m.considerations_sociales ?? null,
    considerations_env:  m.considerations_env ?? null,
    groupement:          m.groupement ?? null,
    avance:              m.avance ?? null,
    taux_avance:         m.taux_avance ?? null,
    source:              m.source ?? null,
  }));
  return {
    code_insee: raw.code_insee ?? "",
    siren:      raw.siren ?? "",
    annee:      raw.annee ?? 0,
    total:      raw.total ?? 0,
    page:       raw.page ?? 1,
    page_size:  raw.page_size ?? 50,
    pages:      raw.pages ?? 1,
    scope:      (raw.scope ?? "lieu") as "acheteur" | "lieu",
    marches,
  };
}

export function transformDvfTransactions(raw: any, year: number) {
  if (!raw || raw.detail) return null;
  const transactions = (raw.transactions ?? []).map((t: any) => ({
    date:           t.date_mutation ?? null,
    annee:          t.date_mutation ? Number(t.date_mutation.slice(0, 4)) : year,
    type:           t.type_bien ?? "",
    codtypbien:     t.code_type_local ?? "",
    surface_bati:   t.surface_bati ?? 0,
    surface_terrain: t.surface_terrain ?? 0,
    prix:           t.valeur_fonciere ?? 0,
    prix_m2:        t.prix_m2 ?? 0,
    vefa:           t.vefa ?? false,
    nb_locaux:      t.nb_locaux ?? null,
    lat:            t.latitude  ?? null,
    lon:            t.longitude ?? null,
  }));
  return {
    code_insee: raw.code_insee ?? "",
    annee:      raw.annee ?? year,
    total:      raw.total ?? transactions.length,
    page:       raw.page ?? 1,
    page_size:  raw.page_size ?? transactions.length,
    pages:      raw.pages ?? 1,
    transactions,
  };
}
