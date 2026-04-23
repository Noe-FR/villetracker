// ── Score de santé financière ─────────────────────────────────────────────────
// 6 dimensions · 12 ratios · 100 points
// Sources : OFGL · DGCL · Cour des comptes · DGFiP

export type FinancialNote = "AAA" | "AA" | "A" | "BBB" | "BB" | "B" | "CCC";

export interface ScoreRatio {
  id: string;
  label: string;
  formula: string;
  value: string;
  pts: number;
  max: number;
  source: string;
}

export interface ScoreDimension {
  id: string;
  label: string;
  pts: number;
  max: number;
  color: string;
  ratios: ScoreRatio[];
}

export interface FinancialScore {
  note: FinancialNote;
  score: number;
  dimensions: ScoreDimension[];
}

export type Agregats = Record<string, { montant?: number | null; euros_par_habitant?: number | null }>;
export type YoY      = Record<string, { montant_pct?: number | null; eph_pct?: number | null }>;

function pct(a: number, b: number): number { return (a / b) * 100; }
export function fmt(v: number | null, suffix = "%", dec = 1): string {
  return v != null ? `${v.toFixed(dec)} ${suffix}` : "—";
}

export function computeFinancialScore(agregats: Agregats, yoy: YoY = {}): FinancialScore | null {
  const m = (key: string) => agregats[key]?.montant ?? null;

  const recFonct  = m("Recettes de fonctionnement");
  const depFonct  = m("Dépenses de fonctionnement");
  const epBrute   = m("Epargne brute");
  const epNette   = m("Epargne nette");
  const dette     = m("Encours de dette");
  const personnel = m("Frais de personnel");
  const annuite   = m("Annuité de la dette");
  const chgFin    = m("Charges financières");
  const depEquip  = m("Dépenses d'équipement");
  const depInvest = m("Dépenses d'investissement");
  const depTot    = m("Dépenses totales");
  const impLocaux = m("Impôts locaux");
  const dgf       = m("Dotation globale de fonctionnement");

  if (!recFonct || recFonct === 0) return null;

  // D1 — SOLVABILITÉ (25 pts)
  let r11_pts = 0, cdd: number | null = null;
  if (dette == null || dette === 0) { r11_pts = 15; cdd = 0; }
  else if (epBrute != null && epBrute > 0) {
    cdd = dette / epBrute;
    if      (cdd < 3)  r11_pts = 15;
    else if (cdd < 5)  r11_pts = 13;
    else if (cdd < 8)  r11_pts = 10;
    else if (cdd < 12) r11_pts = 6;
    else if (cdd < 15) r11_pts = 2;
    else               r11_pts = 0;
  }

  let r12_pts = 0;
  const chgFin_pct = chgFin != null ? pct(chgFin, recFonct) : null;
  if (chgFin_pct != null) {
    if      (chgFin_pct < 1) r12_pts = 10;
    else if (chgFin_pct < 2) r12_pts = 8;
    else if (chgFin_pct < 3) r12_pts = 5;
    else if (chgFin_pct < 5) r12_pts = 2;
    else                     r12_pts = 0;
  }

  const d1: ScoreDimension = {
    id: "solvabilite", label: "Solvabilité", max: 25,
    pts: r11_pts + r12_pts, color: "violet",
    ratios: [
      { id: "cdd", label: "Désendettement",     formula: "Encours dette / Épargne brute",          value: cdd === 0 ? "Sans dette" : fmt(cdd, "ans"), pts: r11_pts, max: 15, source: "DGCL — seuil prudentiel < 12 ans" },
      { id: "chf", label: "Charges financières", formula: "Charges financières / Recettes fonct.", value: fmt(chgFin_pct),                            pts: r12_pts, max: 10, source: "OFGL — coût de la dette" },
    ],
  };

  // D2 — ÉQUILIBRE OPÉRATIONNEL (25 pts)
  let r21_pts = 0;
  const eb_pct = epBrute != null ? pct(epBrute, recFonct) : null;
  if (eb_pct != null) {
    if      (eb_pct >= 20) r21_pts = 15;
    else if (eb_pct >= 15) r21_pts = 12;
    else if (eb_pct >= 10) r21_pts = 8;
    else if (eb_pct >= 5)  r21_pts = 4;
    else if (eb_pct >= 0)  r21_pts = 1;
    else                   r21_pts = 0;
  }

  let r22_pts = 0;
  const en_pct = epNette != null ? pct(epNette, recFonct) : null;
  if (en_pct != null) {
    if      (en_pct >= 15) r22_pts = 10;
    else if (en_pct >= 10) r22_pts = 8;
    else if (en_pct >= 5)  r22_pts = 5;
    else if (en_pct >= 0)  r22_pts = 2;
    else                   r22_pts = 0;
  }

  const d2: ScoreDimension = {
    id: "equilibre", label: "Équilibre opérationnel", max: 25,
    pts: r21_pts + r22_pts, color: "emerald",
    ratios: [
      { id: "eb", label: "Épargne brute", formula: "Épargne brute / Recettes fonct.",  value: fmt(eb_pct), pts: r21_pts, max: 15, source: "OFGL — ratio central des communes" },
      { id: "en", label: "Épargne nette", formula: "Épargne nette / Recettes fonct.",  value: fmt(en_pct), pts: r22_pts, max: 10, source: "Cour des comptes — surplus après dette" },
    ],
  };

  // D3 — RIGIDITÉ STRUCTURELLE (20 pts)
  let r31_pts = 0;
  const pers_pct = personnel != null ? pct(personnel, recFonct) : null;
  if (pers_pct != null) {
    if      (pers_pct < 30) r31_pts = 12;
    else if (pers_pct < 40) r31_pts = 10;
    else if (pers_pct < 50) r31_pts = 7;
    else if (pers_pct < 60) r31_pts = 4;
    else if (pers_pct < 70) r31_pts = 1;
    else                    r31_pts = 0;
  }

  let r32_pts = 0;
  const ann_pct = annuite != null ? pct(annuite, recFonct) : null;
  if (ann_pct != null) {
    if      (ann_pct < 5)  r32_pts = 8;
    else if (ann_pct < 8)  r32_pts = 6;
    else if (ann_pct < 12) r32_pts = 4;
    else if (ann_pct < 15) r32_pts = 2;
    else                   r32_pts = 0;
  } else {
    r32_pts = 8;
  }

  const d3: ScoreDimension = {
    id: "rigidite", label: "Rigidité structurelle", max: 20,
    pts: r31_pts + r32_pts, color: "amber",
    ratios: [
      { id: "pers", label: "Charges de personnel", formula: "Frais de personnel / Recettes fonct.",  value: fmt(pers_pct), pts: r31_pts, max: 12, source: "DGCL — alerte > 60 %" },
      { id: "ann",  label: "Annuité de la dette",  formula: "Annuité de la dette / Recettes fonct.", value: fmt(ann_pct),  pts: r32_pts, max: 8,  source: "OFGL — charge de remboursement" },
    ],
  };

  // D4 — INVESTISSEMENT (15 pts)
  let r41_pts = 0;
  const equip_pct = (depEquip != null && depTot != null && depTot > 0) ? pct(depEquip, depTot) : null;
  if (equip_pct != null) {
    if      (equip_pct >= 30) r41_pts = 8;
    else if (equip_pct >= 20) r41_pts = 6;
    else if (equip_pct >= 15) r41_pts = 4;
    else if (equip_pct >= 10) r41_pts = 2;
    else                      r41_pts = 0;
  }

  let r42_pts = 0;
  const autofin_pct = (epBrute != null && depInvest != null && depInvest > 0) ? pct(epBrute, depInvest) : null;
  if (autofin_pct != null) {
    if      (autofin_pct >= 100) r42_pts = 7;
    else if (autofin_pct >= 70)  r42_pts = 5;
    else if (autofin_pct >= 40)  r42_pts = 3;
    else if (autofin_pct >= 20)  r42_pts = 1;
    else                         r42_pts = 0;
  }

  const d4: ScoreDimension = {
    id: "investissement", label: "Investissement", max: 15,
    pts: r41_pts + r42_pts, color: "blue",
    ratios: [
      { id: "eq", label: "Effort d'équipement",    formula: "Dép. d'équipement / Dép. totales",       value: fmt(equip_pct),   pts: r41_pts, max: 8, source: "OFGL — dynamisme d'investissement" },
      { id: "af", label: "Autofinancement invest.", formula: "Épargne brute / Dép. d'investissement", value: fmt(autofin_pct), pts: r42_pts, max: 7, source: "Cour des comptes — indépendance à l'emprunt" },
    ],
  };

  // D5 — AUTONOMIE FISCALE (10 pts)
  let r51_pts = 0;
  const auto_pct = impLocaux != null ? pct(impLocaux, recFonct) : null;
  if (auto_pct != null) {
    if      (auto_pct >= 45) r51_pts = 6;
    else if (auto_pct >= 35) r51_pts = 5;
    else if (auto_pct >= 25) r51_pts = 3;
    else if (auto_pct >= 15) r51_pts = 1;
    else                     r51_pts = 0;
  }

  let r52_pts = 0;
  const dgf_pct = dgf != null ? pct(dgf, recFonct) : null;
  if (dgf_pct != null) {
    if      (dgf_pct < 10) r52_pts = 4;
    else if (dgf_pct < 20) r52_pts = 3;
    else if (dgf_pct < 30) r52_pts = 2;
    else if (dgf_pct < 40) r52_pts = 1;
    else                   r52_pts = 0;
  }

  const d5: ScoreDimension = {
    id: "autonomie", label: "Autonomie fiscale", max: 10,
    pts: r51_pts + r52_pts, color: "teal",
    ratios: [
      { id: "au",  label: "Autonomie fiscale", formula: "Impôts locaux / Recettes fonct.",    value: fmt(auto_pct), pts: r51_pts, max: 6, source: "DGFiP — ressources propres fiscales" },
      { id: "dgf", label: "Dépendance DGF",    formula: "DGF / Recettes fonct. (↓ = mieux)", value: fmt(dgf_pct),  pts: r52_pts, max: 4, source: "DGCL — dépendance aux dotations d'État" },
    ],
  };

  // D6 — DYNAMIQUE (YoY) (5 pts)
  let r61_pts = 0;
  const yoy_eb = yoy["Epargne brute"]?.eph_pct ?? null;
  if (yoy_eb != null) {
    if      (yoy_eb >= 5)  r61_pts = 3;
    else if (yoy_eb >= 0)  r61_pts = 2;
    else if (yoy_eb >= -5) r61_pts = 1;
    else                   r61_pts = 0;
  }

  let r62_pts = 0;
  const yoy_dep = yoy["Dépenses de fonctionnement"]?.eph_pct ?? null;
  if (yoy_dep != null) {
    if      (yoy_dep < 1) r62_pts = 2;
    else if (yoy_dep < 3) r62_pts = 1;
    else                  r62_pts = 0;
  }

  const d6: ScoreDimension = {
    id: "dynamique", label: "Dynamique (N vs N-1)", max: 5,
    pts: r61_pts + r62_pts, color: "pink",
    ratios: [
      { id: "yeb",  label: "Évolution épargne brute",  formula: "Variation €/hab épargne brute N/N-1",   value: yoy_eb  != null ? fmt(yoy_eb,  "%", 1) : "—", pts: r61_pts, max: 3, source: "OFGL — tendance autofinancement" },
      { id: "ydep", label: "Maîtrise dép. fonct.",     formula: "Variation €/hab dép. fonct. N/N-1 (↓)", value: yoy_dep != null ? fmt(yoy_dep, "%", 1) : "—", pts: r62_pts, max: 2, source: "DGCL — discipline budgétaire" },
    ],
  };

  const dimensions = [d1, d2, d3, d4, d5, d6];
  const score = dimensions.reduce((s, d) => s + d.pts, 0);
  const depFonct_pct = depFonct != null ? pct(depFonct, recFonct) : null;
  const finalScore = (depFonct_pct != null && depFonct_pct > 100) ? Math.max(0, score - 10) : score;

  let note: FinancialNote;
  if      (finalScore >= 85) note = "AAA";
  else if (finalScore >= 75) note = "AA";
  else if (finalScore >= 65) note = "A";
  else if (finalScore >= 55) note = "BBB";
  else if (finalScore >= 45) note = "BB";
  else if (finalScore >= 30) note = "B";
  else                       note = "CCC";

  return { note, score: finalScore, dimensions };
}

export const NOTE_META: Record<FinancialNote, { bg: string; border: string; text: string; bar: string; label: string }> = {
  AAA: { bg: "from-emerald-900/40 to-slate-800", border: "border-emerald-700/50", text: "text-emerald-400", bar: "bg-emerald-500", label: "Excellente" },
  AA:  { bg: "from-emerald-900/30 to-slate-800", border: "border-emerald-800/40", text: "text-emerald-400", bar: "bg-emerald-600", label: "Très bonne" },
  A:   { bg: "from-teal-900/30 to-slate-800",    border: "border-teal-800/40",    text: "text-teal-400",   bar: "bg-teal-600",   label: "Bonne"       },
  BBB: { bg: "from-blue-900/30 to-slate-800",    border: "border-blue-800/40",    text: "text-blue-400",   bar: "bg-blue-600",   label: "Correcte"    },
  BB:  { bg: "from-amber-900/30 to-slate-800",   border: "border-amber-800/40",   text: "text-amber-400",  bar: "bg-amber-500",  label: "Fragile"     },
  B:   { bg: "from-orange-900/30 to-slate-800",  border: "border-orange-800/40",  text: "text-orange-400", bar: "bg-orange-500", label: "Dégradée"    },
  CCC: { bg: "from-red-900/40 to-slate-800",     border: "border-red-800/40",     text: "text-red-400",    bar: "bg-red-500",    label: "Critique"    },
};

export const DIM_ACCENT: Record<string, string> = {
  solvabilite:    "text-violet-400",
  equilibre:      "text-emerald-400",
  rigidite:       "text-amber-400",
  investissement: "text-blue-400",
  autonomie:      "text-teal-400",
  dynamique:      "text-pink-400",
};
