'use client';
import { useState, useEffect, useRef } from "react";

/* ─── DUMMY DATA ──────────────────────────────────────────────────────────── */

const DERBIES = [
  {
    id: "lyon_ste", emoji: "🔥", titre: "Le Derby du Rhône", intensite: 5,
    a: { nom: "Lyon", color: "blue" }, b: { nom: "Saint-Étienne", color: "emerald" },
    criteres: [
      { label: "Prix m²",         emoji: "🏠", va: 4280,  vb: 1650,  unit: "€/m²",  lowWins: true  },
      { label: "Dette/hab.",       emoji: "💸", va: 890,   vb: 1240,  unit: "€/hab", lowWins: true  },
      { label: "Participation",    emoji: "🗳️", va: 47,    vb: 52,    unit: "%",     lowWins: false },
      { label: "Santé financière", emoji: "💳", va: 68,    vb: 54,    unit: "pts",   lowWins: false },
      { label: "Eau conforme",     emoji: "💧", va: 100,   vb: 98,    unit: "%",     lowWins: false },
      { label: "Dép. voiture",     emoji: "🚗", va: 38,    vb: 71,    unit: "%",     lowWins: true  },
      { label: "Listes candidates",emoji: "📋", va: 12,    vb: 8,     unit: "",      lowWins: false },
    ],
    verdict: "Lyon domine sur la richesse, Saint-Étienne prend sa revanche sur la mobilité.",
  },
  {
    id: "lille_lens", emoji: "⚽", titre: "Derby du Nord", intensite: 4,
    a: { nom: "Lille", color: "red" }, b: { nom: "Lens", color: "yellow" },
    criteres: [
      { label: "Prix m²",         emoji: "🏠", va: 3100,  vb: 1420,  unit: "€/m²",  lowWins: true  },
      { label: "Dette/hab.",       emoji: "💸", va: 760,   vb: 980,   unit: "€/hab", lowWins: true  },
      { label: "Participation",    emoji: "🗳️", va: 44,    vb: 56,    unit: "%",     lowWins: false },
      { label: "Santé financière", emoji: "💳", va: 61,    vb: 58,    unit: "pts",   lowWins: false },
      { label: "Eau conforme",     emoji: "💧", va: 99,    vb: 100,   unit: "%",     lowWins: false },
      { label: "Dép. voiture",     emoji: "🚗", va: 41,    vb: 68,    unit: "%",     lowWins: true  },
      { label: "Listes candidates",emoji: "📋", va: 9,     vb: 6,     unit: "",      lowWins: false },
    ],
    verdict: "Lens surprend sur la participation. Lille garde l'avantage financier.",
  },
  {
    id: "metz_nancy", emoji: "⚔️", titre: "La Guerre de Lorraine", intensite: 4,
    a: { nom: "Metz", color: "purple" }, b: { nom: "Nancy", color: "orange" },
    criteres: [
      { label: "Prix m²",         emoji: "🏠", va: 1980,  vb: 2140,  unit: "€/m²",  lowWins: true  },
      { label: "Dette/hab.",       emoji: "💸", va: 1120,  vb: 840,   unit: "€/hab", lowWins: true  },
      { label: "Participation",    emoji: "🗳️", va: 51,    vb: 48,    unit: "%",     lowWins: false },
      { label: "Santé financière", emoji: "💳", va: 57,    vb: 64,    unit: "pts",   lowWins: false },
      { label: "Eau conforme",     emoji: "💧", va: 100,   vb: 97,    unit: "%",     lowWins: false },
      { label: "Dép. voiture",     emoji: "🚗", va: 58,    vb: 62,    unit: "%",     lowWins: true  },
      { label: "Listes candidates",emoji: "📋", va: 7,     vb: 8,     unit: "",      lowWins: false },
    ],
    verdict: "Match serré en Lorraine. Nancy tient sur les finances, Metz sur la participation.",
  },
  {
    id: "nantes_rennes", emoji: "🐦", titre: "Qui est la vraie capitale ?", intensite: 4,
    a: { nom: "Nantes", color: "green" }, b: { nom: "Rennes", color: "red" },
    criteres: [
      { label: "Prix m²",         emoji: "🏠", va: 3650,  vb: 3420,  unit: "€/m²",  lowWins: true  },
      { label: "Dette/hab.",       emoji: "💸", va: 980,   vb: 720,   unit: "€/hab", lowWins: true  },
      { label: "Participation",    emoji: "🗳️", va: 53,    vb: 58,    unit: "%",     lowWins: false },
      { label: "Santé financière", emoji: "💳", va: 63,    vb: 71,    unit: "pts",   lowWins: false },
      { label: "Eau conforme",     emoji: "💧", va: 100,   vb: 99,    unit: "%",     lowWins: false },
      { label: "Dép. voiture",     emoji: "🚗", va: 44,    vb: 39,    unit: "%",     lowWins: true  },
      { label: "Listes candidates",emoji: "📋", va: 10,    vb: 11,    unit: "",      lowWins: false },
    ],
    verdict: "Rennes gagne 4-3. La capitale bretonne de facto défend son titre statistique.",
  },
  {
    id: "montpellier_nimes", emoji: "🏟️", titre: "Derby du Languedoc", intensite: 3,
    a: { nom: "Montpellier", color: "blue" }, b: { nom: "Nîmes", color: "red" },
    criteres: [
      { label: "Prix m²",         emoji: "🏠", va: 3280,  vb: 2190,  unit: "€/m²",  lowWins: true  },
      { label: "Dette/hab.",       emoji: "💸", va: 1340,  vb: 890,   unit: "€/hab", lowWins: true  },
      { label: "Participation",    emoji: "🗳️", va: 42,    vb: 48,    unit: "%",     lowWins: false },
      { label: "Santé financière", emoji: "💳", va: 54,    vb: 61,    unit: "pts",   lowWins: false },
      { label: "Eau conforme",     emoji: "💧", va: 98,    vb: 100,   unit: "%",     lowWins: false },
      { label: "Dép. voiture",     emoji: "🚗", va: 52,    vb: 67,    unit: "%",     lowWins: true  },
      { label: "Listes candidates",emoji: "📋", va: 11,    vb: 7,     unit: "",      lowWins: false },
    ],
    verdict: "Nîmes surprend : meilleure gestion et eau irréprochable. Montpellier garde le dynamisme.",
  },
  {
    id: "nice_cannes", emoji: "🎬", titre: "Duel de la Côte d'Azur", intensite: 3,
    a: { nom: "Nice", color: "cyan" }, b: { nom: "Cannes", color: "amber" },
    criteres: [
      { label: "Prix m²",         emoji: "🏠", va: 4890,  vb: 5320,  unit: "€/m²",  lowWins: true  },
      { label: "Dette/hab.",       emoji: "💸", va: 1560,  vb: 1120,  unit: "€/hab", lowWins: true  },
      { label: "Participation",    emoji: "🗳️", va: 46,    vb: 51,    unit: "%",     lowWins: false },
      { label: "Santé financière", emoji: "💳", va: 59,    vb: 66,    unit: "pts",   lowWins: false },
      { label: "Eau conforme",     emoji: "💧", va: 99,    vb: 100,   unit: "%",     lowWins: false },
      { label: "Dép. voiture",     emoji: "🚗", va: 43,    vb: 54,    unit: "%",     lowWins: true  },
      { label: "Listes candidates",emoji: "📋", va: 8,     vb: 6,     unit: "",      lowWins: false },
    ],
    verdict: "Cannes écrase sur l'immobilier. Nice riposte sur la dette et les listes.",
  },
  {
    id: "bastia_ajaccio", emoji: "🏔️", titre: "Derby Corse", intensite: 4,
    a: { nom: "Bastia", color: "blue" }, b: { nom: "Ajaccio", color: "red" },
    criteres: [
      { label: "Prix m²",         emoji: "🏠", va: 2860,  vb: 3140,  unit: "€/m²",  lowWins: true  },
      { label: "Dette/hab.",       emoji: "💸", va: 780,   vb: 1040,  unit: "€/hab", lowWins: true  },
      { label: "Participation",    emoji: "🗳️", va: 57,    vb: 52,    unit: "%",     lowWins: false },
      { label: "Santé financière", emoji: "💳", va: 64,    vb: 58,    unit: "pts",   lowWins: false },
      { label: "Eau conforme",     emoji: "💧", va: 97,    vb: 99,    unit: "%",     lowWins: false },
      { label: "Dép. voiture",     emoji: "🚗", va: 62,    vb: 71,    unit: "%",     lowWins: true  },
      { label: "Listes candidates",emoji: "📋", va: 9,     vb: 7,     unit: "",      lowWins: false },
    ],
    verdict: "Bastia remporte le derby des données 5-2. Ajaccio garde le titre de capitale.",
  },
  {
    id: "marseille_paris", emoji: "🔵🔴", titre: "La Rivalité Nationale", intensite: 5,
    a: { nom: "Marseille", color: "blue" }, b: { nom: "Paris", color: "red" },
    criteres: [
      { label: "Prix m²",         emoji: "🏠", va: 3450,  vb: 9800,  unit: "€/m²",  lowWins: true  },
      { label: "Dette/hab.",       emoji: "💸", va: 1680,  vb: 4240,  unit: "€/hab", lowWins: true  },
      { label: "Participation",    emoji: "🗳️", va: 38,    vb: 44,    unit: "%",     lowWins: false },
      { label: "Santé financière", emoji: "💳", va: 48,    vb: 52,    unit: "pts",   lowWins: false },
      { label: "Eau conforme",     emoji: "💧", va: 99,    vb: 100,   unit: "%",     lowWins: false },
      { label: "Dép. voiture",     emoji: "🚗", va: 58,    vb: 19,    unit: "%",     lowWins: true  },
      { label: "Listes candidates",emoji: "📋", va: 14,    vb: 22,    unit: "",      lowWins: false },
    ],
    verdict: "Paris gagne 4-3 mais Marseille garde la palme du caractère et de l'accessibilité.",
  },
];

const QUIZZES = [
  {
    reponse: "Courchevel",
    clues: [
      { emoji: "🏠", texte: "Le m² y dépasse les 15 000 €" },
      { emoji: "⛷️", texte: "Célèbre destination hivernale française" },
      { emoji: "🍾", texte: "Les palaces font leur CA annuel en 3 mois" },
      { emoji: "📍", texte: "Département 73 — Savoie" },
    ],
    options: ["Courchevel", "Megève", "Val d'Isère", "Chamonix"],
    explication: "Courchevel détient le record du m² en France. Ici, même les remontées mécaniques ont l'air de coûter cher.",
  },
  {
    reponse: "L'Île-d'Yeu",
    clues: [
      { emoji: "🏝️", texte: "On ne peut y accéder qu'en bateau" },
      { emoji: "🚗", texte: "96 % des déplacements se font sans voiture" },
      { emoji: "🌊", texte: "8 km² d'île au large de la côte atlantique" },
      { emoji: "📍", texte: "Département 85 — Vendée" },
    ],
    options: ["L'Île-d'Yeu", "Noirmoutier", "Belle-Île", "Île de Ré"],
    explication: "L'Île-d'Yeu : sans voiture possible, les habitants marchent, pédalent, et respirent. Score mobilité douce record.",
  },
  {
    reponse: "Sainte-Marie-du-Mont",
    clues: [
      { emoji: "💧", texte: "Un seul habitant recensé officiellement" },
      { emoji: "👻", texte: "Pourtant classée commune depuis 1793" },
      { emoji: "📮", texte: "Un code postal dédié, un maire, une mairie" },
      { emoji: "📍", texte: "Normandie, département 50 — Manche" },
    ],
    options: ["Sainte-Marie-du-Mont", "Saint-Pierre-Église", "Bricquebec", "Montebourg"],
    explication: "Certifiée INSEE : 1 habitant. Il y a probablement plus d'élus que d'administrés.",
  },
];

/* ─── BATTLE DATA ─────────────────────────────────────────────────────────── */

type BCity = {
  nom: string; tranche: "grande" | "moyenne" | "petite";
  emoji: string;
  prix_m2: number; dette: number; participation: number;
  voiture: number; eau: number;
};

const BCITIES: BCity[] = [
  { nom: "Bordeaux",     tranche: "grande",  emoji: "🍷", prix_m2: 4200, dette: 1240, participation: 43, voiture: 52, eau: 99  },
  { nom: "Toulouse",     tranche: "grande",  emoji: "🌹", prix_m2: 3800, dette: 980,  participation: 45, voiture: 56, eau: 98  },
  { nom: "Lyon",         tranche: "grande",  emoji: "🦁", prix_m2: 4500, dette: 890,  participation: 47, voiture: 38, eau: 100 },
  { nom: "Marseille",    tranche: "grande",  emoji: "🌊", prix_m2: 3200, dette: 1680, participation: 38, voiture: 58, eau: 99  },
  { nom: "Lille",        tranche: "grande",  emoji: "🍺", prix_m2: 3100, dette: 760,  participation: 44, voiture: 41, eau: 99  },
  { nom: "Nantes",       tranche: "grande",  emoji: "🐘", prix_m2: 3650, dette: 980,  participation: 53, voiture: 44, eau: 100 },
  { nom: "Rennes",       tranche: "grande",  emoji: "🏰", prix_m2: 3420, dette: 720,  participation: 58, voiture: 39, eau: 99  },
  { nom: "Strasbourg",   tranche: "grande",  emoji: "🥨", prix_m2: 3550, dette: 1100, participation: 51, voiture: 31, eau: 100 },
  { nom: "Nice",         tranche: "grande",  emoji: "🌴", prix_m2: 4890, dette: 1560, participation: 46, voiture: 43, eau: 99  },
  { nom: "Montpellier",  tranche: "grande",  emoji: "☀️", prix_m2: 3280, dette: 1340, participation: 42, voiture: 52, eau: 98  },
  { nom: "Angers",       tranche: "moyenne", emoji: "🏯", prix_m2: 2800, dette: 680,  participation: 55, voiture: 58, eau: 100 },
  { nom: "Dijon",        tranche: "moyenne", emoji: "🍯", prix_m2: 2600, dette: 720,  participation: 52, voiture: 54, eau: 99  },
  { nom: "Reims",        tranche: "moyenne", emoji: "🍾", prix_m2: 2100, dette: 890,  participation: 48, voiture: 61, eau: 98  },
  { nom: "Le Mans",      tranche: "moyenne", emoji: "🏎️", prix_m2: 1950, dette: 780,  participation: 46, voiture: 67, eau: 99  },
  { nom: "Caen",         tranche: "moyenne", emoji: "⚔️", prix_m2: 2250, dette: 840,  participation: 49, voiture: 59, eau: 100 },
  { nom: "Amiens",       tranche: "moyenne", emoji: "🏛️", prix_m2: 1800, dette: 920,  participation: 43, voiture: 63, eau: 97  },
  { nom: "Clermont-Fd",  tranche: "moyenne", emoji: "🌋", prix_m2: 1750, dette: 760,  participation: 50, voiture: 64, eau: 100 },
  { nom: "Tours",        tranche: "moyenne", emoji: "🎭", prix_m2: 2400, dette: 700,  participation: 54, voiture: 56, eau: 99  },
  { nom: "Sarlat",       tranche: "petite",  emoji: "🦆", prix_m2: 2100, dette: 420,  participation: 68, voiture: 79, eau: 100 },
  { nom: "Honfleur",     tranche: "petite",  emoji: "⛵", prix_m2: 3200, dette: 380,  participation: 62, voiture: 71, eau: 99  },
  { nom: "Kaysersberg",  tranche: "petite",  emoji: "🍷", prix_m2: 2800, dette: 290,  participation: 71, voiture: 68, eau: 100 },
  { nom: "Rochefort-en-T",tranche:"petite",  emoji: "🌸", prix_m2: 1900, dette: 260,  participation: 74, voiture: 82, eau: 100 },
  { nom: "Cordes/Ciel",  tranche: "petite",  emoji: "🏔️", prix_m2: 1600, dette: 180,  participation: 77, voiture: 85, eau: 99  },
  { nom: "Collioure",    tranche: "petite",  emoji: "🎨", prix_m2: 3400, dette: 310,  participation: 65, voiture: 72, eau: 100 },
];

const BCRITERES: { key: "prix_m2"|"dette"|"participation"|"voiture"|"eau"; label: string; emoji: string; unit: string; lowWins: boolean }[] = [
  { key: "prix_m2",       label: "Prix m²",         emoji: "🏠", unit: "€/m²",  lowWins: true  },
  { key: "dette",         label: "Dette/habitant",   emoji: "💸", unit: "€/hab", lowWins: true  },
  { key: "participation", label: "Participation",    emoji: "🗳️", unit: "%",     lowWins: false },
  { key: "voiture",       label: "Dépendance auto",  emoji: "🚗", unit: "%",     lowWins: true  },
  { key: "eau",           label: "Eau conforme",     emoji: "💧", unit: "%",     lowWins: false },
];

const ROUND_COMMENTS: Record<"a"|"b", string[]> = {
  a: ["Prend l'avantage !", "S'impose !", "Emporte le round !", "Fait la diff !", "Déroule !"],
  b: ["Riposte !", "Contre-attaque !", "Renverse la tendance !", "S'impose !", "Prend le dessus !"],
};

const TEXT_COLOR: Record<string, string> = {
  cyan: "text-cyan-400", amber: "text-amber-400", green: "text-green-400",
  emerald: "text-emerald-400", purple: "text-purple-400", lime: "text-lime-400",
  pink: "text-pink-400", blue: "text-blue-400", red: "text-red-400",
  yellow: "text-yellow-400", orange: "text-orange-400",
};

const HERO_FACTS = [
  { emoji: "⛪", chiffre: "3 247", label: "communes avec «Saint» dans leur nom", detail: "Soit 9 % du territoire — la France bénie" },
  { emoji: "💰", chiffre: "15 840 €/m²", label: "record absolu du prix au m²", detail: "Courchevel (73) — 13 200 baguettes par m²" },
  { emoji: "🛋️", chiffre: "78,4 %", label: "abstention record au 1er tour", detail: "21 inscrits, 16 canapés gagnants" },
  { emoji: "👻", chiffre: "3", label: "communes avec 1 seul habitant recensé", detail: "Certifiées INSEE — pas certifiées seules" },
  { emoji: "💸", chiffre: "8 430 €/hab", label: "dette record par habitant", detail: "Moins de 5 000 habitants — trésorier en PLS" },
  { emoji: "🥖", chiffre: "13 200", label: "baguettes pour 1 m² à Courchevel", detail: "À 1,20 € la baguette — ça fait réfléchir" },
  { emoji: "🧪", chiffre: "89 mg/L", label: "nitrates record dans l'eau", detail: "Limite légale : 50 mg/L — ce robinet fait du hors-piste" },
];

const STATS_MOIS = {
  mois: "Mai 2026",
  picks: [
    {
      badge: "Coup de cœur", emoji: "🚴", couleur: "green",
      titre: "Strasbourg résiste au tout-voiture",
      texte: "Avec 18 % de part modale vélo, Strasbourg reste la ville française la plus cyclable. Pendant ce temps, le reste du pays attend un Vélib' intercommunal.",
    },
    {
      badge: "Record absurde", emoji: "🛋️", couleur: "purple",
      titre: "78 % d'abstention, 21 inscrits",
      texte: "16 personnes ont préféré leur canapé à l'urne. Le candidat unique a été élu avec 5 voix. La démocratie, dans sa forme la plus concentrée.",
    },
    {
      badge: "Chiffre WTF", emoji: "🏗️", couleur: "orange",
      titre: "4 230 €/habitant d'investissement",
      texte: "Dans une commune de 3 000 habitants. Les pelleteuses ont un abonnement annuel. La ligne budgétaire «travaux» occupe plus de place que le reste.",
    },
  ],
};

const WTF_RECORDS = [
  { emoji: "💰", titre: "M² le plus cher",         valeur: "15 840 €",   unite: "par m²",        detail: "Courchevel (73)",             couleur: "amber" },
  { emoji: "🤑", titre: "Plus grosse vente connue", valeur: "8 200 000 €", unite: "en une transaction", detail: "Côte d'Azur — signée avec une main tremblante", couleur: "amber" },
  { emoji: "💸", titre: "Dette record",             valeur: "8 430 €",    unite: "par habitant",  detail: "< 5 000 habitants — trésorier en PLS", couleur: "red" },
  { emoji: "🛋️", titre: "Abstention record",        valeur: "78,4 %",     unite: "au 1er tour",   detail: "21 inscrits, 5 votes exprimés",  couleur: "purple" },
  { emoji: "🧪", titre: "Nitrates record",           valeur: "89 mg/L",    unite: "dans l'eau",    detail: "Limite légale : 50 mg/L",         couleur: "yellow" },
  { emoji: "🏗️", titre: "Investissement record",     valeur: "4 230 €",    unite: "par habitant",  detail: "Commune de 3 000 hab.",           couleur: "orange" },
  { emoji: "⛪", titre: "Communes «Saint»",          valeur: "3 247",      unite: "communes",      detail: "9 % du territoire national",       couleur: "blue" },
  { emoji: "👴", titre: "Doyen des maires",          valeur: "89 ans",     unite: "d'expérience",  detail: "Lozère — il connaît la mairie par prénom", couleur: "slate" },
];

const PODIUMS: Record<string, { nom: string; dept: string; val: string }[]> = {
  "Prix m² ⬆️": [
    { nom: "Courchevel",   dept: "Savoie",             val: "15 840 €/m²" },
    { nom: "Megève",       dept: "Haute-Savoie",        val: "14 200 €/m²" },
    { nom: "Cannes",       dept: "Alpes-Maritimes",     val: "11 800 €/m²" },
    { nom: "Paris 6e",     dept: "Paris",               val: "11 200 €/m²" },
    { nom: "Saint-Tropez", dept: "Var",                 val: "10 900 €/m²" },
  ],
  "Plus endettées 💸": [
    { nom: "Commune A", dept: "Var",               val: "8 430 €/hab" },
    { nom: "Commune B", dept: "Alpes-Maritimes",   val: "7 890 €/hab" },
    { nom: "Commune C", dept: "Gironde",           val: "6 340 €/hab" },
    { nom: "Commune D", dept: "Bouches-du-Rhône",  val: "5 910 €/hab" },
    { nom: "Commune E", dept: "Hérault",           val: "5 460 €/hab" },
  ],
  "Participation 🗳️": [
    { nom: "Saint-Pierre-d'Autils", dept: "Eure",         val: "94,2 %" },
    { nom: "Champdôtre",            dept: "Côte-d'Or",    val: "91,8 %" },
    { nom: "Saulx-les-Chartreux",   dept: "Essonne",      val: "91,1 %" },
    { nom: "Vernoux-en-Vivarais",   dept: "Ardèche",      val: "90,7 %" },
    { nom: "Le Boulou",             dept: "Pyrénées-Or.", val: "90,4 %" },
  ],
  "Maires les + âgés 👴": [
    { nom: "Jean-Louis M.", dept: "Lozère",   val: "89 ans" },
    { nom: "Pierre-Auguste R.", dept: "Corrèze", val: "87 ans" },
    { nom: "Marcel T.",     dept: "Creuse",   val: "86 ans" },
    { nom: "René B.",       dept: "Cantal",   val: "85 ans" },
    { nom: "Gaston L.",     dept: "Ariège",   val: "84 ans" },
  ],
};

/* ─── UTILITIES ───────────────────────────────────────────────────────────── */

function winner(va: number, vb: number, lowWins: boolean): "a" | "b" | "draw" {
  if (va === vb) return "draw";
  return (lowWins ? va < vb : va > vb) ? "a" : "b";
}

function fmtVal(v: number, unit: string): string {
  const n = v >= 1000 ? v.toLocaleString("fr-FR") : String(v);
  return unit ? `${n} ${unit}` : n;
}

/* ─── SECTION HEADER ──────────────────────────────────────────────────────── */

function SectionHead({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <div className="flex items-end gap-3 mb-6">
      <span className="text-4xl leading-none">{emoji}</span>
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/* ─── HERO SECTION ────────────────────────────────────────────────────────── */

function HeroSection() {
  const [idx, setIdx] = useState(0);
  const fact = HERO_FACTS[idx];

  function next() {
    setIdx((i) => (i + 1) % HERO_FACTS.length);
  }

  return (
    <section id="hero" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 border border-slate-800 p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.08),_transparent_70%)] pointer-events-none" />

      <div className="relative z-10">
        <p className="text-xs font-semibold text-blue-400 tracking-widest uppercase mb-2">Statistiques nationales</p>
        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">
          La France en chiffres<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">absurdes mais vrais</span>
        </h1>
        <p className="text-slate-400 text-sm mb-8 max-w-lg">
          Tout ce que vous n'aviez pas pensé à chercher — données publiques, mauvaise foi contrôlée, comparaisons improbables.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { emoji: "🏠", val: "15 840 €/m²", label: "Record immobilier", color: "amber" },
            { emoji: "🛋️", val: "78,4 %",       label: "Abstention record", color: "purple" },
            { emoji: "💸", val: "8 430 €/hab",  label: "Dette record",      color: "red" },
            { emoji: "⛪", val: "3 247",         label: 'Communes "Saint"', color: "blue" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5">
              <div className="text-xl mb-1">{s.emoji}</div>
              <div className={`text-lg font-black ${TEXT_COLOR[s.color]}`}>{s.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center gap-4 flex-wrap">
          <span className="text-2xl shrink-0">{fact.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">
              <span className="text-blue-300 font-black">{fact.chiffre}</span> — {fact.label}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">{fact.detail}</p>
          </div>
          <button
            onClick={next}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            🎲 Suivant
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── STATS DU MOIS ───────────────────────────────────────────────────────── */

function StatsduMoisSection() {
  const BADGE_STYLES: Record<string, string> = {

    green:  "bg-green-500/15 text-green-400 border border-green-500/30",
    purple: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    orange: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  };
  const CARD_BORDER: Record<string, string> = {
    green:  "border-green-800/50 hover:border-green-600/60",
    purple: "border-purple-800/50 hover:border-purple-600/60",
    orange: "border-orange-800/50 hover:border-orange-600/60",
  };

  return (
    <section id="stats-mois">
      <div className="flex items-center justify-between mb-6">
        <SectionHead emoji="📅" title="Stats du mois" sub={`Sélection éditoriale — ${STATS_MOIS.mois}`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATS_MOIS.picks.map((p) => (
          <div key={p.titre} className={`bg-slate-900 border rounded-xl p-5 transition-colors ${CARD_BORDER[p.couleur]}`}>
            <div className="flex items-start justify-between mb-3 gap-2">
              <span className="text-2xl">{p.emoji}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BADGE_STYLES[p.couleur]}`}>
                {p.badge}
              </span>
            </div>
            <p className="text-white font-bold text-sm mb-2 leading-tight">{p.titre}</p>
            <p className="text-slate-400 text-xs leading-relaxed">{p.texte}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── DERBY DES CHIFFRES ──────────────────────────────────────────────────── */

function DerbySection() {
  const [idx, setIdx] = useState(0);
  const d = DERBIES[idx];

  const scores = d.criteres.map((c) => winner(c.va, c.vb, c.lowWins));
  const aWins = scores.filter((s) => s === "a").length;
  const bWins = scores.filter((s) => s === "b").length;

  const A_TEXT = TEXT_COLOR[d.a.color] ?? "text-blue-400";
  const B_TEXT = TEXT_COLOR[d.b.color] ?? "text-red-400";

  return (
    <section id="derby">
      <SectionHead emoji="⚔️" title="Derby des chiffres" sub="8 rivalités historiques — qui gagne sur les données publiques ?" />

      {/* Navigation */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setIdx((i) => (i - 1 + DERBIES.length) % DERBIES.length)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm"
        >←</button>
        <div className="flex gap-1.5">
          {DERBIES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all cursor-pointer ${i === idx ? "bg-blue-400 w-4" : "bg-slate-700 hover:bg-slate-500"}`}
            />
          ))}
        </div>
        <button
          onClick={() => setIdx((i) => (i + 1) % DERBIES.length)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer text-sm"
        >→</button>
        <span className="text-xs text-slate-600 ml-1">{idx + 1}/{DERBIES.length}</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Header villes */}
        <div className="relative bg-gradient-to-r from-slate-800/80 via-slate-900 to-slate-800/80 px-6 py-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-right">
              <p className={`text-2xl font-black ${A_TEXT}`}>{d.a.nom}</p>
              <p className="text-xs text-slate-500">{aWins} critère{aWins > 1 ? "s" : ""} gagnés</p>
            </div>
            <div className="text-center px-2">
              <p className="text-3xl leading-none mb-1">{d.emoji}</p>
              <p className="text-xs text-slate-500 font-medium">{d.titre}</p>
              <p className="text-xs text-slate-600 mt-1">{"🔥".repeat(d.intensite)}</p>
            </div>
            <div className="text-left">
              <p className={`text-2xl font-black ${B_TEXT}`}>{d.b.nom}</p>
              <p className="text-xs text-slate-500">{bWins} critère{bWins > 1 ? "s" : ""} gagnés</p>
            </div>
          </div>
        </div>

        {/* Critères */}
        <div className="divide-y divide-slate-800/60 px-4 sm:px-6">
          {d.criteres.map((c, i) => {
            const w = scores[i];
            const total = c.va + c.vb || 1;
            const aPct = Math.round((c.va / total) * 100);
            return (
              <div key={c.label} className="py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                {/* Valeur A */}
                <div className="text-right">
                  <span className={`text-sm font-bold transition-colors ${w === "a" ? A_TEXT : "text-slate-500"}`}>
                    {w === "a" && <span className="mr-1 text-xs">✓</span>}
                    {fmtVal(c.va, c.unit)}
                  </span>
                </div>

                {/* Centre: label + barre */}
                <div className="flex flex-col items-center gap-1.5 min-w-[90px] sm:min-w-[120px]">
                  <span className="text-xs text-slate-500 whitespace-nowrap">{c.emoji} {c.label}</span>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-800 flex">
                    <div
                      className={`h-full rounded-l-full transition-all duration-500 ${w === "a" ? (d.a.color === "blue" ? "bg-blue-500" : d.a.color === "green" ? "bg-green-500" : d.a.color === "red" ? "bg-red-500" : d.a.color === "purple" ? "bg-purple-500" : d.a.color === "cyan" ? "bg-cyan-500" : "bg-blue-500") : "bg-slate-700"}`}
                      style={{ width: `${aPct}%` }}
                    />
                    <div
                      className={`h-full rounded-r-full flex-1 transition-all duration-500 ${w === "b" ? (d.b.color === "red" ? "bg-red-500" : d.b.color === "yellow" ? "bg-yellow-500" : d.b.color === "orange" ? "bg-orange-500" : d.b.color === "green" ? "bg-green-500" : d.b.color === "amber" ? "bg-amber-500" : "bg-red-500") : "bg-slate-700"}`}
                    />
                  </div>
                </div>

                {/* Valeur B */}
                <div className="text-left">
                  <span className={`text-sm font-bold transition-colors ${w === "b" ? B_TEXT : "text-slate-500"}`}>
                    {fmtVal(c.vb, c.unit)}
                    {w === "b" && <span className="ml-1 text-xs">✓</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Score final */}
        <div className="bg-slate-800/40 px-6 py-4 border-t border-slate-800">
          <div className="grid grid-cols-3 items-center mb-2">
            <span className={`text-4xl font-black text-right ${aWins >= bWins ? A_TEXT : "text-slate-600"}`}>{aWins}</span>
            <span className="text-slate-600 text-xs text-center">— 7 critères —</span>
            <span className={`text-4xl font-black text-left ${bWins > aWins ? B_TEXT : "text-slate-600"}`}>{bWins}</span>
          </div>
          <p className="text-slate-400 text-xs text-center italic">{d.verdict}</p>
        </div>
      </div>
    </section>
  );
}

/* ─── MINI-JEU ────────────────────────────────────────────────────────────── */

function QuizSection() {
  const [qIdx, setQIdx] = useState(0);
  const [cluesRevealed, setCluRevealed] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [shuffled, setShuffled] = useState<{ opts: string[]; correct: number } | null>(null);

  function initQuiz(qi: number) {
    const q = QUIZZES[qi];
    const opts = [...q.options];
    const correctLabel = opts[0];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setShuffled({ opts, correct: opts.indexOf(correctLabel) });
  }

  useEffect(() => { initQuiz(0); }, []);

  if (!shuffled) return null;

  const q = QUIZZES[qIdx];
  const answered = selected !== null;
  const isCorrect = selected === shuffled.correct;
  const pts = answered && isCorrect ? [100, 75, 50, 25][cluesRevealed - 1] : 0;

  function pick(i: number) {
    if (answered) return;
    setSelected(i);
    if (i === shuffled!.correct) setScore((s) => s + [100, 75, 50, 25][cluesRevealed - 1]);
  }

  function next() {
    if (qIdx + 1 >= QUIZZES.length) { setDone(true); return; }
    const ni = qIdx + 1;
    setQIdx(ni); setSelected(null); setCluRevealed(1);
    initQuiz(ni);
  }

  function restart() {
    setQIdx(0); setSelected(null); setCluRevealed(1); setScore(0); setDone(false);
    initQuiz(0);
  }

  const maxScore = QUIZZES.length * 100;

  return (
    <section id="quiz">
      <SectionHead emoji="🎮" title="Devine la commune" sub="Indices progressifs — plus vous utilisez d'indices, moins vous gagnez de points" />

      <div className="max-w-2xl">
        {done ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <p className="text-6xl font-black text-white mb-1">{score}<span className="text-slate-600 text-3xl">/{maxScore}</span></p>
            <p className="text-slate-400 text-sm mb-6">
              {score >= maxScore * 0.8 ? "Incollable sur les communes françaises 🏆"
               : score >= maxScore * 0.5 ? "Solide — les données n'ont plus de secrets 👍"
               : "La France garde quelques mystères pour vous 🫣"}
            </p>
            <button onClick={restart} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer">
              Rejouer
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-slate-800">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${((qIdx) / QUIZZES.length) * 100}%` }} />
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs text-slate-500">Question {qIdx + 1}/{QUIZZES.length}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Score : <span className="text-white font-bold">{score}</span></span>
                  <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                    {[100, 75, 50, 25][cluesRevealed - 1]} pts si correct
                  </span>
                </div>
              </div>

              <p className="text-white font-bold text-base mb-4">Quelle commune se cache derrière ces indices ?</p>

              {/* Clues */}
              <div className="space-y-2 mb-5">
                {q.clues.slice(0, cluesRevealed).map((clue, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-slate-800/60 rounded-lg px-3 py-2.5 text-sm text-slate-300">
                    <span className="text-base shrink-0 mt-0.5">{clue.emoji}</span>
                    <span>{clue.texte}</span>
                  </div>
                ))}
              </div>

              {/* Reveal more / answer */}
              {!answered && (
                <div className="flex gap-2 mb-5">
                  {cluesRevealed < q.clues.length && (
                    <button
                      onClick={() => setCluRevealed((n) => n + 1)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      ➕ Indice suivant ({[75, 50, 25, 25][cluesRevealed - 1]} pts max)
                    </button>
                  )}
                </div>
              )}

              {/* Options */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {shuffled.opts.map((opt, i) => {
                  let cls = "px-3 py-3 rounded-lg text-sm font-semibold border transition-all text-left ";
                  if (!answered) {
                    cls += "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-blue-500/60 hover:bg-blue-500/10 hover:text-white cursor-pointer";
                  } else if (i === shuffled.correct) {
                    cls += "border-emerald-500 bg-emerald-500/15 text-emerald-300";
                  } else if (i === selected) {
                    cls += "border-red-500 bg-red-500/15 text-red-300";
                  } else {
                    cls += "border-slate-800 bg-slate-800/20 text-slate-600";
                  }
                  return (
                    <button key={i} className={cls} onClick={() => pick(i)} disabled={answered}>
                      {answered && i === shuffled.correct && <span className="mr-1">✓ </span>}
                      {answered && i === selected && i !== shuffled.correct && <span className="mr-1">✗ </span>}
                      {opt}
                    </button>
                  );
                })}
              </div>

              {answered && (
                <div className={`rounded-lg px-4 py-3 mb-4 text-sm ${isCorrect ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                  <p className={`font-bold mb-1 ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                    {isCorrect ? `✓ Correct ! +${pts} points` : "✗ Raté !"}
                  </p>
                  <p className="text-slate-400 text-xs">{q.explication}</p>
                </div>
              )}

              {answered && (
                <button onClick={next} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                  {qIdx + 1 < QUIZZES.length ? "Question suivante →" : "Voir mon score"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── BATTLE RAPIDE (Street Fighter Edition) ─────────────────────────────── */

const BATTLE_CSS = `
@keyframes sf-atk-r { 0%,100%{transform:translateX(0) scale(1)} 35%{transform:translateX(36px) scale(1.25)} 65%{transform:translateX(20px) scale(1.1)} }
@keyframes sf-atk-l { 0%,100%{transform:translateX(0) scale(1)} 35%{transform:translateX(-36px) scale(1.25)} 65%{transform:translateX(-20px) scale(1.1)} }
@keyframes sf-hit-l { 0%,100%{transform:translateX(0) rotate(0deg)} 20%{transform:translateX(-14px) rotate(-8deg)} 50%{transform:translateX(8px) rotate(4deg)} 75%{transform:translateX(-5px) rotate(-3deg)} }
@keyframes sf-hit-r { 0%,100%{transform:translateX(0) rotate(0deg)} 20%{transform:translateX(14px) rotate(8deg)} 50%{transform:translateX(-8px) rotate(-4deg)} 75%{transform:translateX(5px) rotate(3deg)} }
@keyframes sf-ann { 0%{opacity:0;transform:scale(0.4) skewX(-10deg)} 18%{opacity:1;transform:scale(1.18) skewX(-10deg)} 75%{opacity:1;transform:scale(1.05) skewX(-10deg)} 100%{opacity:0;transform:scale(0.95) skewX(-10deg)} }
@keyframes sf-ko { 0%{opacity:0;transform:scale(0.2) rotate(-15deg)} 25%{opacity:1;transform:scale(1.4) rotate(-8deg)} 55%{transform:scale(0.92) rotate(-12deg)} 100%{opacity:1;transform:scale(1) rotate(-10deg)} }
@keyframes hp-flash { 0%,100%{filter:brightness(1)} 40%{filter:brightness(3) saturate(2)} }
@keyframes shake { 0%,100%{transform:translate(0,0)} 12%{transform:translate(-7px,2px)} 25%{transform:translate(7px,-3px)} 37%{transform:translate(-5px,2px)} 50%{transform:translate(5px,-2px)} 62%{transform:translate(-3px,1px)} 75%{transform:translate(3px,-1px)} 87%{transform:translate(-1px,1px)} }
@keyframes fw-p { 0%{opacity:1;transform:translate(0,0) scale(1.2)} 100%{opacity:0;transform:translate(var(--tx),var(--ty)) scale(0)} }
@keyframes vglow { 0%,100%{text-shadow:0 0 20px #60a5fa} 50%{text-shadow:0 0 50px #60a5fa,0 0 100px #60a5fa} }
@keyframes ko-pop { 0%{opacity:0;transform:scale(0.1) rotate(-20deg)} 30%{opacity:1;transform:scale(1.5) rotate(-8deg)} 55%{transform:scale(0.85) rotate(-12deg)} 80%{transform:scale(1.1) rotate(-10deg)} 100%{opacity:1;transform:scale(1) rotate(-10deg)} }
`;

function FireworksBurst() {
  const COLORS = ["#60a5fa","#f87171","#fbbf24","#34d399","#a78bfa","#fb923c","#f472b6","#38bdf8"];
  const bursts = [
    { cx: 18, cy: 25 }, { cx: 50, cy: 15 }, { cx: 82, cy: 25 },
    { cx: 30, cy: 55 }, { cx: 70, cy: 50 }, { cx: 50, cy: 70 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {bursts.map((b, bi) =>
        Array.from({ length: 18 }, (_, i) => {
          const angle = (i / 18) * 360 + bi * 7;
          const dist  = 45 + Math.random() * 70;
          const tx    = Math.cos((angle * Math.PI) / 180) * dist;
          const ty    = Math.sin((angle * Math.PI) / 180) * dist;
          const color = COLORS[(bi * 3 + i) % COLORS.length];
          const delay = bi * 120 + Math.random() * 100;
          const size  = 3 + Math.random() * 5;
          return (
            <div key={`${bi}-${i}`} className="absolute rounded-full"
              style={{
                left: `${b.cx}%`, top: `${b.cy}%`,
                width: `${size}px`, height: `${size}px`,
                background: color,
                "--tx": `${tx}px`, "--ty": `${ty}px`,
                animation: `fw-p 1.4s ease-out ${delay}ms forwards`,
              } as React.CSSProperties}
            />
          );
        })
      )}
    </div>
  );
}

function hpGradient(hp: number) {
  if (hp > 55) return "from-green-500 to-emerald-400";
  if (hp > 25) return "from-yellow-500 to-amber-400";
  return "from-red-600 to-red-400";
}

function BattleRapideSection() {
  const [phase, setPhase]         = useState<"idle"|"fighting"|"ko"|"result">("idle");
  const [cityA, setCityA]         = useState<BCity | null>(null);
  const [cityB, setCityB]         = useState<BCity | null>(null);
  const [hpA, setHpA]             = useState(100);
  const [hpB, setHpB]             = useState(100);
  const [round, setRound]         = useState(0);
  const [announce, setAnnounce]   = useState<string | null>(null);
  const [animA, setAnimA]         = useState("");
  const [animB, setAnimB]         = useState("");
  const [dmgA, setDmgA]           = useState(false);
  const [dmgB, setDmgB]           = useState(false);
  const [shakeOn, setShakeOn]     = useState(false);
  const [fireworks, setFireworks] = useState(false);
  const [results, setResults]     = useState<Array<{ crit: typeof BCRITERES[0]; w: "a"|"b"; va: number; vb: number; dmg: number }>>([]);
  const [matchWinner, setMatchWinner] = useState<"a"|"b"|"draw"|null>(null);

  // Refs hold live HP/results values — never put in effect deps to avoid re-triggers
  const hpARef      = useRef(100);
  const hpBRef      = useRef(100);
  const resultsRef  = useRef<typeof results>([]);

  function drawCities(): [BCity, BCity] {
    const t = (["grande","moyenne","petite"] as const)[Math.floor(Math.random() * 3)];
    const pool = BCITIES.filter(c => c.tranche === t);
    const s = [...pool].sort(() => Math.random() - 0.5);
    return [s[0], s[1]];
  }

  function startBattle() {
    const [a, b] = drawCities();
    setCityA(a); setCityB(b);
    hpARef.current = 100; hpBRef.current = 100;
    setHpA(100); setHpB(100);
    resultsRef.current = [];
    setRound(0); setResults([]);
    setAnimA(""); setAnimB("");
    setDmgA(false); setDmgB(false);
    setShakeOn(false); setFireworks(false);
    setAnnounce(null); setMatchWinner(null);
    setPhase("fighting");
    setTimeout(() => setRound(1), 400);
  }

  // Round state machine — hpA/hpB NOT in deps; use refs to avoid re-triggering on HP change
  useEffect(() => {
    if (phase !== "fighting" || round === 0 || !cityA || !cityB) return;
    const c = BCRITERES[round - 1];
    const va = cityA[c.key];
    const vb = cityB[c.key];
    const w: "a"|"b" = c.lowWins ? (va < vb ? "a" : "b") : (va > vb ? "a" : "b");

    // Damage proportional to gap: 10–45 HP, read current HP from ref
    const gapPct = Math.abs(va - vb) / Math.max(va, vb, 1) * 100;
    const dmg = Math.max(10, Math.min(45, Math.round(10 + gapPct * 0.35)));
    const newHpA = w === "b" ? Math.max(0, hpARef.current - dmg) : hpARef.current;
    const newHpB = w === "a" ? Math.max(0, hpBRef.current - dmg) : hpBRef.current;
    const willKO = newHpA === 0 || newHpB === 0;

    const ts: ReturnType<typeof setTimeout>[] = [];

    setAnnounce(`ROUND ${round}`);
    ts.push(setTimeout(() => setAnnounce(null), 950));

    ts.push(setTimeout(() => {
      if (w === "a") {
        setAnimA("sf-atk-r"); setAnimB("sf-hit-r");
        hpBRef.current = newHpB; setHpB(newHpB); setDmgB(true);
      } else {
        setAnimB("sf-atk-l"); setAnimA("sf-hit-l");
        hpARef.current = newHpA; setHpA(newHpA); setDmgA(true);
      }
      setShakeOn(true);
      const entry = { crit: c, w, va, vb, dmg };
      resultsRef.current = [...resultsRef.current, entry];
      setResults(r => [...r, entry]);
    }, 1150));

    ts.push(setTimeout(() => {
      setAnimA(""); setAnimB(""); setDmgA(false); setDmgB(false); setShakeOn(false);
    }, 1800));

    ts.push(setTimeout(() => {
      if (round >= BCRITERES.length || willKO) setPhase("ko");
      else setRound(r => r + 1);
    }, 3200));

    return () => ts.forEach(clearTimeout);
  }, [round, phase, cityA, cityB]);

  // K.O. sequence — read HP/results from refs to avoid stale closures
  useEffect(() => {
    if (phase !== "ko") return;
    const curHpA = hpARef.current;
    const curHpB = hpBRef.current;
    const res = resultsRef.current;
    const isHPKO = curHpA === 0 || curHpB === 0;
    const aw = res.filter(r => r.w === "a").length;
    const bw = res.filter(r => r.w === "b").length;
    const computed: "a"|"b"|"draw" = isHPKO
      ? (curHpB === 0 && curHpA > 0 ? "a" : curHpA === 0 && curHpB > 0 ? "b" : "draw")
      : (aw > bw ? "a" : bw > aw ? "b" : "draw");
    setMatchWinner(computed);

    const isEarlyKO = res.length < BCRITERES.length;
    const ts: ReturnType<typeof setTimeout>[] = [];
    if (isEarlyKO) {
      ts.push(setTimeout(() => setAnnounce("K.O. !"), 300));
      ts.push(setTimeout(() => { setAnnounce(null); setFireworks(true); }, 2000));
      ts.push(setTimeout(() => { setFireworks(false); setPhase("result"); }, 4200));
    } else {
      ts.push(setTimeout(() => setAnnounce("VICTOIRE !"), 300));
      ts.push(setTimeout(() => { setAnnounce(null); setFireworks(true); }, 1800));
      ts.push(setTimeout(() => { setFireworks(false); setPhase("result"); }, 3800));
    }
    return () => ts.forEach(clearTimeout);
  }, [phase]);

  const aWins = results.filter(r => r.w === "a").length;
  const bWins = results.filter(r => r.w === "b").length;
  const earlyKO = (phase === "ko" || phase === "result") && results.length < BCRITERES.length;

  return (
    <section id="battle">
      <style>{BATTLE_CSS}</style>
      <SectionHead emoji="⚡" title="Battle Rapide" sub="Street Fighter Edition — deux communes, même tranche, 5 rounds, K.O. assuré" />

      {phase === "idle" && (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-slate-800 rounded-2xl gap-4">
          <p className="text-7xl select-none" style={{ animation: "vglow 2s ease-in-out infinite" }}>⚡</p>
          <p className="text-lg font-black text-white">Prêt pour le combat ?</p>
          <p className="text-slate-500 text-sm text-center max-w-xs">
            Deux communes tirées au hasard dans la même catégorie. 5 rounds. Un seul gagnant.
          </p>
          <button onClick={startBattle}
            className="mt-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-blue-500/30">
            ⚔️ Lancer le combat
          </button>
        </div>
      )}

      {phase !== "idle" && cityA && cityB && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative"
          style={{ animation: shakeOn ? "shake 0.45s ease-out" : "none" }}>

          {/* Scanlines */}
          <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.025]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,1) 3px,rgba(255,255,255,1) 4px)" }} />

          {fireworks && <FireworksBurst />}

          {/* Announcement overlay */}
          {announce && (() => {
            // VICTOIRE → gagnant ; K.O. → perdant ; ROUND → jaune
            const isKO       = announce === "K.O. !";
            const isVictoire = announce === "VICTOIRE !";
            // blue = A, red = B
            const useBlue = isVictoire ? matchWinner === "a" : matchWinner === "b";
            const useRed  = isVictoire ? matchWinner === "b" : matchWinner === "a";
            const col    = useBlue ? "#60a5fa" : useRed ? "#f87171" : "#fde047";
            const shadow = useBlue
              ? "0 0 30px #60a5fa,0 0 70px #3b82f6"
              : useRed
                ? "0 0 40px #f87171,0 0 80px #ef4444"
                : "0 0 30px #fbbf24,0 0 60px #f59e0b";
            const bg     = useBlue ? "rgba(96,165,250,0.07)" : useRed ? "rgba(239,68,68,0.08)" : "rgba(251,191,36,0.06)";
            const border = useBlue ? "rgba(96,165,250,0.35)" : useRed ? "rgba(239,68,68,0.35)" : "rgba(251,191,36,0.35)";
            return (
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <div style={{
                  animation: isKO ? "ko-pop 0.6s ease-out forwards" : "sf-ann 1.5s ease-out forwards",
                  padding: "16px 36px",
                  fontWeight: 900,
                  fontSize: isKO ? "clamp(2.5rem,8vw,4.5rem)" : "clamp(1.8rem,6vw,3rem)",
                  letterSpacing: "0.1em",
                  color: col, textShadow: shadow, background: bg,
                  border: `2px solid ${border}`,
                  borderRadius: "10px",
                  backdropFilter: "blur(6px)",
                }}>
                  {announce}
                </div>
              </div>
            );
          })()}

          {/* HP bars */}
          <div className="bg-slate-950 px-5 pt-5 pb-3 border-b border-slate-800/60">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-black text-blue-400 truncate mr-2 tracking-wide">{cityA.nom.toUpperCase()}</span>
                  <span className="text-xs font-bold text-slate-500 shrink-0 tabular-nums">{hpA} HP</span>
                </div>
                <div className="h-5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50"
                  style={{ animation: dmgA ? "hp-flash 0.35s ease-out" : "none" }}>
                  <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out ${hpGradient(hpA)}`}
                    style={{ width: `${hpA}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-slate-500 shrink-0 tabular-nums">{hpB} HP</span>
                  <span className="text-xs font-black text-red-400 truncate ml-2 text-right tracking-wide">{cityB.nom.toUpperCase()}</span>
                </div>
                <div className="h-5 bg-slate-800 rounded-full overflow-hidden flex justify-end border border-slate-700/50"
                  style={{ animation: dmgB ? "hp-flash 0.35s ease-out" : "none" }}>
                  <div className={`h-full rounded-full bg-gradient-to-l transition-all duration-500 ease-out ${hpGradient(hpB)}`}
                    style={{ width: `${hpB}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Fighter arena */}
          <div className="relative overflow-hidden min-h-[180px] bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,_rgba(59,130,246,0.05),_transparent_70%)] pointer-events-none" />
            <div className="absolute bottom-5 left-8 right-8 h-px bg-slate-800/60" />
            <div className="relative flex justify-between items-end px-8 sm:px-16 pb-6 pt-6">

              {/* Fighter A */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-[5.5rem] leading-none select-none"
                  style={{ animation: animA ? `${animA} 0.55s ease-out` : "none" }}>
                  {cityA.emoji}
                </div>
                <span className="text-[9px] font-black text-blue-500/80 tracking-widest">{cityA.nom.slice(0,9).toUpperCase()}</span>
              </div>

              {/* Round pips */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-7 flex flex-col items-center gap-1.5">
                <div className="flex gap-1.5">
                  {BCRITERES.map((_, i) => {
                    const r = results[i];
                    return (
                      <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                        !r ? "border-slate-700 bg-transparent"
                        : r.w === "a" ? "border-blue-500 bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]"
                        : "border-red-500 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
                      }`} />
                    );
                  })}
                </div>
                <span className="text-[8px] text-slate-700 font-black tracking-[0.2em]">ROUNDS</span>
              </div>

              {/* Fighter B — emoji mirrored, label normal */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-[5.5rem] leading-none select-none"
                  style={{ animation: animB ? `${animB} 0.55s ease-out` : "none", transform: "scaleX(-1)" }}>
                  {cityB.emoji}
                </div>
                <span className="text-[9px] font-black text-red-500/80 tracking-widest">{cityB.nom.slice(0,9).toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Rounds log — grayed-out for rounds not fought (early KO) */}
          {(results.length > 0 || earlyKO) && (
            <div className="border-t border-slate-800/60 divide-y divide-slate-800/40">
              {BCRITERES.map((c, i) => {
                const r = results[i];
                const isGrayed = !r && earlyKO;
                if (!r && !isGrayed) return null;
                return (
                  <div key={i} className={`px-4 sm:px-6 py-2.5 grid grid-cols-[1fr_auto_1fr] gap-3 items-center text-xs ${isGrayed ? "opacity-30" : ""}`}>
                    <span className={`text-right font-bold ${isGrayed ? "text-slate-600" : r!.w === "a" ? "text-blue-400" : "text-slate-600"}`}>
                      {isGrayed ? "—" : `${r!.w === "a" ? "✓ " : ""}${r!.va.toLocaleString("fr-FR")} ${c.unit}`}
                    </span>
                    <span className={`text-center font-medium shrink-0 whitespace-nowrap ${isGrayed ? "text-slate-700" : "text-slate-600"}`}>
                      {c.emoji} {c.label}
                    </span>
                    <span className={`text-left font-bold ${isGrayed ? "text-slate-600" : r!.w === "b" ? "text-red-400" : "text-slate-600"}`}>
                      {isGrayed ? "—" : `${r!.vb.toLocaleString("fr-FR")} ${c.unit}${r!.w === "b" ? " ✓" : ""}`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Result */}
          {phase === "result" && matchWinner !== null && (
            <div className={`border-t border-slate-800 px-6 py-8 text-center bg-gradient-to-b ${
              matchWinner === "a" ? "from-blue-950/40" : matchWinner === "b" ? "from-red-950/40" : "from-slate-800/30"
            } to-transparent`}>
              {matchWinner !== "draw" ? (
                <>
                  <p className="text-5xl mb-3">🏆</p>
                  <p className={`text-3xl font-black mb-1 ${matchWinner === "a" ? "text-blue-400" : "text-red-400"}`}>
                    {(matchWinner === "a" ? cityA : cityB).emoji} {(matchWinner === "a" ? cityA : cityB).nom}
                  </p>
                  <p className="text-slate-400 text-sm mb-1">
                    {earlyKO
                      ? <>K.O. au round <span className="font-black text-white">{results.length}</span> — combat terminé avant la fin</>
                      : <>remporte le combat <span className="font-black text-white">{Math.max(aWins,bWins)}–{Math.min(aWins,bWins)}</span></>
                    }
                  </p>
                  <p className="text-slate-600 text-xs mb-6">
                    {(matchWinner === "a" ? cityB : cityA).nom} s'incline.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-5xl mb-3">🤝</p>
                  <p className="text-2xl font-black text-slate-300 mb-1">Match nul {aWins}–{bWins}</p>
                  <p className="text-slate-500 text-sm mb-6">Égalité parfaite. La statistique ne tranche pas.</p>
                </>
              )}
              <button onClick={startBattle}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-black text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer">
                ⚔️ Nouveau combat
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ─── RECORDS ─────────────────────────────────────────────────────────────── */

function RecordsSection() {
  const podiumKeys = Object.keys(PODIUMS);
  const [tab, setTab] = useState(podiumKeys[0]);
  const medals = ["🥇", "🥈", "🥉"];

  const WTF_TEXT: Record<string, string> = {
    amber: "text-amber-400", red: "text-red-400", purple: "text-purple-400",
    yellow: "text-yellow-400", orange: "text-orange-400", blue: "text-blue-400",
    slate: "text-slate-400",
  };
  const WTF_BORDER: Record<string, string> = {
    amber: "border-amber-800/40", red: "border-red-800/40", purple: "border-purple-800/40",
    yellow: "border-yellow-800/40", orange: "border-orange-800/40", blue: "border-blue-800/40",
    slate: "border-slate-700",
  };

  return (
    <section id="records">
      <SectionHead emoji="🔥" title="Records absurdes mais vrais" sub="Les extrêmes de la France — données publiques, aucune exagération nécessaire" />

      {/* WTF records — horizontal scroll on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {WTF_RECORDS.map((r) => (
          <div key={r.titre} className={`bg-slate-900 border rounded-xl p-4 ${WTF_BORDER[r.couleur]}`}>
            <div className="text-xl mb-2">{r.emoji}</div>
            <p className={`text-2xl font-black leading-tight ${WTF_TEXT[r.couleur]}`}>{r.valeur}</p>
            <p className="text-slate-500 text-xs mt-0.5">{r.unite}</p>
            <p className="text-xs text-slate-400 mt-2 leading-tight">{r.titre}</p>
            <p className="text-xs text-slate-600 mt-0.5 leading-tight">{r.detail}</p>
          </div>
        ))}
      </div>

      {/* Podiums avec tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex border-b border-slate-800 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
          {podiumKeys.map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                tab === k ? "text-white border-b-2 border-blue-500 -mb-px bg-slate-800/40" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="p-5">
          <ol className="space-y-2">
            {PODIUMS[tab].map((item, i) => (
              <li key={i} className="flex items-center gap-3 py-2 border-b border-slate-800/60 last:border-0">
                <span className="shrink-0 w-6 text-center text-lg leading-none">
                  {medals[i] ?? <span className="text-slate-600 text-sm font-bold">{i + 1}</span>}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{item.nom}</p>
                  <p className="text-xs text-slate-500">{item.dept}</p>
                </div>
                <span className={`text-sm font-black shrink-0 ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-600" : "text-slate-500"}`}>
                  {item.val}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ─── SIDE NAV ────────────────────────────────────────────────────────────── */

const SECTIONS = [
  { id: "hero",       label: "Accueil"   },
  { id: "stats-mois", label: "Ce mois"   },
  { id: "battle",     label: "Battle"    },
  { id: "derby",      label: "Derby"     },
  { id: "quiz",       label: "Quiz"      },
  { id: "records",    label: "Records"   },
];

const DOT_SPACING = 52;
const DOT_NORMAL  = 14;  // px — dot inactif
const DOT_ACTIVE  = 20;  // px — dot actif

function SideNav({ active }: { active: string }) {
  const activeIdx = Math.max(0, SECTIONS.findIndex((s) => s.id === active));
  const step      = DOT_SPACING + DOT_NORMAL;           // gap + hauteur bouton
  const totalLine = (SECTIONS.length - 1) * step;
  const fillLine  = activeIdx * step;
  const lineRight = Math.floor(DOT_NORMAL / 2) - 1; // centre du dot normal

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="fixed right-8 top-1/2 -translate-y-1/2 z-40 hidden xl:block select-none">
      <div className="relative flex flex-col" style={{ gap: `${DOT_SPACING}px` }}>

        {/* Ligne de fond */}
        <div
          className="absolute w-0.5 bg-slate-800 rounded-full"
          style={{ right: `${lineRight}px`, top: `${DOT_NORMAL / 2}px`, height: `${totalLine}px` }}
        />

        {/* Ligne remplie */}
        <div
          className="absolute w-0.5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out"
          style={{ right: `${lineRight}px`, top: `${DOT_NORMAL / 2}px`, height: `${fillLine}px` }}
        />

        {SECTIONS.map((s, i) => {
          const isActive = active === s.id;
          const isPast   = i < activeIdx;
          const size     = isActive ? DOT_ACTIVE : DOT_NORMAL;
          return (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className="relative z-10 flex items-center group cursor-pointer"
              style={{ height: `${DOT_NORMAL}px` }}
            >
              {/* Label à gauche */}
              <span
                className={`text-xs font-semibold whitespace-nowrap absolute right-full mr-4 transition-all duration-200 ${
                  isActive
                    ? "text-slate-200 opacity-100"
                    : "text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-slate-400"
                }`}
              >
                {s.label}
              </span>

              {/* Dot */}
              <div
                className={`rounded-full flex-shrink-0 transition-all duration-300 absolute ${
                  isActive
                    ? "bg-blue-400 shadow-[0_0_14px_rgba(96,165,250,0.8)]"
                    : isPast
                      ? "bg-blue-700"
                      : "bg-slate-700 group-hover:bg-slate-500"
                }`}
                style={{
                  width:  `${size}px`,
                  height: `${size}px`,
                  right:  `${(DOT_NORMAL - size) / 2}px`,
                  top:    `${(DOT_NORMAL - size) / 2}px`,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── MAIN ────────────────────────────────────────────────────────────────── */

export function FunClient({ data: _ }: { data: any }) {
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="space-y-16 pb-16">
      <SideNav active={active} />
      <HeroSection />
      <StatsduMoisSection />
      <BattleRapideSection />
      <DerbySection />
      <QuizSection />
      <RecordsSection />
      <p className="text-xs text-slate-700 text-center pt-4 border-t border-slate-800/50">
        Statistiques calculées à partir de données publiques (DVF, ANCT, SISPEA, RNE, OFGL). Ordres de grandeur et comparaisons — pas un jugement définitif.
      </p>
    </div>
  );
}
