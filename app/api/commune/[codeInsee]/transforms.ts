/* eslint-disable @typescript-eslint/no-explicit-any */

const TRANCHE_LABELS: Record<string, string> = {
  "0":  "Moins de 100 hab.",
  "1":  "100 – 499 hab.",
  "2":  "500 – 999 hab.",
  "3":  "1 000 – 1 999 hab.",
  "4":  "2 000 – 3 499 hab.",
  "5":  "3 500 – 4 999 hab.",
  "6":  "5 000 – 9 999 hab.",
  "7":  "10 000 – 19 999 hab.",
  "8":  "20 000 – 49 999 hab.",
  "9":  "50 000 – 99 999 hab.",
  "10": "100 000 hab. et plus",
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

// Maires historiques pour Paris/Lyon/Marseille — données import incomplet pour 2008/2014
// (pas de pattern "avec X" dans libelle_liste, tete_liste = chef de secteur sans utilité)
const PLM_WINNERS: Record<string, Record<number, string>> = {
  "69123": { 2001: "Gérard Collomb",    2008: "Gérard Collomb",   2014: "Gérard Collomb"   },
  "75056": { 2001: "Bertrand Delanoë",  2008: "Bertrand Delanoë", 2014: "Anne Hidalgo"      },
  "13055": { 2001: "Jean-Claude Gaudin",2008: "Jean-Claude Gaudin",2014: "Jean-Claude Gaudin"},
};

export function transformHistorique(raw: any) {
  if (!raw) return { code_insee: "", disponible: false, elections: [] };

  const toTourData = (tourRaw: any): any => {
    // tourRaw may be an object { listes: [...], inscrits, ... } (new API)
    // or a plain array (legacy fallback)
    const listes: any[] = Array.isArray(tourRaw)
      ? tourRaw
      : (tourRaw?.listes ?? []);
    const stats = Array.isArray(tourRaw) ? {} : tourRaw;

    // Dédupliquer les listes par (no_panneau + libelle_liste) — nécessaire pour
    // Paris/Lyon/Marseille où chaque secteur d'arrondissement génère une ligne
    // distincte pour la même liste avec un tête de liste sectoriel différent.
    // Clé composite pour éviter de fusionner deux listes différentes qui
    // partageraient accidentellement le même no_panneau.
    const dedupMap = new Map<string, any>();
    for (const n of listes) {
      const key = n.no_panneau != null && n.libelle_liste
        ? `p${n.no_panneau}|${n.libelle_liste}`
        : `${n.nuance ?? ""}|${n.libelle_liste ?? n.libelle_nuance ?? ""}`;

      if (!dedupMap.has(key)) {
        // Extraire le candidat citywide depuis "avec Prénom NOM" dans le libelle
        // (format PLM : "Liste X avec Grégory DOUCET" → "Grégory DOUCET")
        const avecMatch = (n.libelle_liste ?? "").match(
          /\bavec\s+([A-ZÉÈÊËÀÂÙÛÎa-zéèêëàâùûî][A-Za-zéèêëàâùûî\-']+(?:\s+[A-Za-zéèêëàâùûî\-']+){0,2})\s*$/i
        );
        dedupMap.set(key, {
          nuance:        n.nuance ?? "",
          libelle:       n.libelle_nuance ?? n.libelle ?? "",
          couleur:       n.couleur ?? "",
          libelle_liste: n.libelle_liste ?? undefined,
          nb_candidats:  n.nb_candidats ?? 0,
          nb_voix:       n.nb_voix ?? undefined,
          pct_voix:      n.pct_voix ?? null,
          // PLM : préférer le candidat extrait du libelle ; sinon tete_liste sectoriel
          tete_liste:    avecMatch ? avecMatch[1].trim() : (n.tete_liste ?? undefined),
          sieges_cm:     n.sieges_cm ?? undefined,
          _tete_from_avec: !!avecMatch,  // flag interne : vrai = nom citywide extrait du libellé
        });
      } else {
        // Même liste, autre secteur → cumuler voix et sièges
        const ex = dedupMap.get(key)!;
        if (n.nb_voix   != null) ex.nb_voix   = (ex.nb_voix   ?? 0) + n.nb_voix;
        if (n.sieges_cm != null) ex.sieges_cm = (ex.sieges_cm ?? 0) + n.sieges_cm;
        // Si le nom vient d'un chef de secteur (pas "avec X"), on l'efface :
        // c'est une ville PLM et le tete_liste est sectoriel, pas le candidat citywide
        if (!ex._tete_from_avec) ex.tete_liste = undefined;
      }
    }

    const mergedListes = [...dedupMap.values()].map(({ _tete_from_avec: _f, ...rest }) => rest);

    // Recalculer pct_voix après fusion (les % sectoriels ne s'additionnent pas)
    const exprimes = stats.exprimes
      ?? mergedListes.reduce((s: number, l: any) => s + (l.nb_voix ?? 0), 0);
    if (exprimes > 0) {
      for (const l of mergedListes) {
        if (l.nb_voix != null) l.pct_voix = Math.round(l.nb_voix / exprimes * 10000) / 100;
      }
    }

    return {
      listes:      mergedListes,
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
    let nuance_gagnante: any = nuancesMain.length
      ? nuancesMain.reduce((a: any, b: any) => ((a.pct_voix ?? 0) > (b.pct_voix ?? 0) ? a : b))
      : null;
    // Override PLM : pour les années historiques des villes PLM (2001/2008/2014),
    // les données sont incomplètes (pas de "avec X", ou tete_liste = chef de secteur).
    // On injecte toujours le maire connu — sans condition sur tete_liste.
    const plmFallback = PLM_WINNERS[raw.code_insee]?.[s.annee];
    if (nuance_gagnante && plmFallback) {
      nuance_gagnante = { ...nuance_gagnante, tete_liste: plmFallback };
    }
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
