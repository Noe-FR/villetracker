'use client';
import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { api } from "@/src/api/client";
import { SourceBadge } from "@/src/components/stats/SourceBadge";

const BLOCS = [
  { id: "scores",    label: "Scores financiers" },
  { id: "immo",      label: "Immobilier" },
  { id: "eau",       label: "Eau potable" },
  { id: "energie",   label: "Énergie & GES" },
  { id: "mobilite",  label: "Mobilité" },
  { id: "elections", label: "Élections" },
  { id: "fiscalite", label: "Fiscalité" },
];

export function GraphiquesClient() {
  const [bloc, setBloc] = useState("scores");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    api.getNationalGraphiques(bloc)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [bloc]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-white mb-1">Graphiques thématiques</h1>
        <p className="text-slate-400 text-sm">Analyses nationales par secteur</p>
      </section>

      {/* Tab selector */}
      <div className="flex gap-2 flex-wrap">
        {BLOCS.map((b) => (
          <button
            key={b.id}
            onClick={() => setBloc(b.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              bloc === b.id
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40 text-slate-500">
          Chargement…
        </div>
      )}

      {!loading && data && <BlocContent bloc={bloc} data={data} />}
    </div>
  );
}

function BlocContent({ bloc, data }: { bloc: string; data: any }) {
  switch (bloc) {
    case "scores":    return <ScoresBloc data={data} />;
    case "immo":      return <ImmoBloc data={data} />;
    case "eau":       return <EauBloc data={data} />;
    case "energie":   return <EnergieBloc data={data} />;
    case "mobilite":  return <MobiliteBloc data={data} />;
    case "elections": return <ElectionsBloc data={data} />;
    case "fiscalite": return <FiscaliteBloc data={data} />;
    default:          return null;
  }
}

const chartContainer = "bg-slate-900 border border-slate-800 rounded-xl p-4";
const chartTitle = "text-sm font-medium text-slate-300 mb-3";
const tooltipStyle = { contentStyle: { background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }, labelStyle: { color: "#e2e8f0" } };

const ENERGIE_CATEGORIE: Record<string, string> = {
  RES: "Résidentiel",
  PRO: "Professionnel / Tertiaire",
  ENT: "Industrie / Entreprises",
  ENT_PRO: "Industrie + Professionnel",
};

const TRANCHE_POPULATION: Record<string, string> = {
  "0":  "< 100 hab.",
  "1":  "100–200",
  "2":  "200–500",
  "3":  "500–2 000",
  "4":  "2 000–5 000",
  "5":  "5 000–10 000",
  "6":  "10 000–20 000",
  "7":  "20 000–50 000",
  "8":  "50 000–100 000",
  "9":  "100 000–500 000",
  "10": "> 500 000",
};

function labelCategorie(c: string) { return ENERGIE_CATEGORIE[c] ?? c; }
function labelTranche(t: string) { return TRANCHE_POPULATION[t] ?? t; }

function BlocInfo({ title, description, pills }: {
  title: string;
  description: string;
  pills?: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 px-4 py-3 flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      {pills && pills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {pills.map((p) => (
            <span key={p} className="text-[10px] bg-slate-700/60 text-slate-400 rounded px-2 py-0.5">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoresBloc({ data }: { data: any }) {
  const g7 = data?.g7_score_par_tranche ?? [];
  const g8 = data?.g8_top_regions ?? [];
  const g9 = data?.g9_top_departements ?? [];
  const g10 = data?.g10_notes_par_region ?? [];
  const g11 = data?.g11_correlation_pop_score ?? [];

  const regionsMap: Record<string, any> = {};
  for (const r of g10) {
    if (!regionsMap[r.region_nom]) regionsMap[r.region_nom] = { region: r.region_nom };
    regionsMap[r.region_nom][r.note] = r.nb;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <BlocInfo
          title="Score de santé financière VilleTracker (0 → 100 pts)"
          description="Score composite calculé par VilleTracker à partir des données OFGL (budgets communaux). Il agrège 6 dimensions : solvabilité (D1), équilibre budgétaire (D2), rigidité des charges (D3), effort d'investissement (D4), autonomie fiscale (D5) et dynamique financière (D6). Plus le score est élevé, meilleure est la santé financière. Une note de A (excellent) à E (critique) est ensuite attribuée."
          pills={["Note A ≥ 80 pts", "B 65–80", "C 50–65", "D 35–50", "E < 35"]}
        />
        <SourceBadge label="VilleTracker / OFGL" annee={data.annee} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={chartContainer}>
          <p className={chartTitle}>Score de santé financière moyen par région (0–100 pts) · Top 15</p>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={g8} layout="vertical" margin={{ left: 120, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="region_nom" tick={{ fill: "#94a3b8", fontSize: 10 }} width={115} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} / 100`, "Score moyen"]} />
              <Bar dataKey="score_moyen" fill="#60a5fa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Score de santé financière moyen par département (0–100 pts) · Top 15</p>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={g9} layout="vertical" margin={{ left: 130, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="departement_nom" tick={{ fill: "#94a3b8", fontSize: 10 }} width={125} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} / 100`, "Score moyen"]} />
              <Bar dataKey="score_moyen" fill="#a78bfa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {g7.length > 0 && (
        <div className={chartContainer}>
          <p className={chartTitle}>Score de santé financière médian par taille de commune (0–100 pts)</p>
          <p className="text-xs text-slate-500 mb-3">Les communes plus petites ont souvent un score plus variable ; les grandes villes tendent vers la médiane nationale.</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={g7.map((r: any) => ({ ...r, tranche: labelTranche(r.tranche_population) }))}
              margin={{ bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="tranche"
                tick={{ fill: "#94a3b8", fontSize: 9 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v} pts`} />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: any, name: string) => [
                  `${v} pts`,
                  name === "median" ? "Médiane" : name === "q1" ? "1er quartile (Q1)" : name === "q3" ? "3e quartile (Q3)" : name,
                ]}
                labelFormatter={(l) => `Communes ${l}`}
              />
              <Bar dataKey="q1"     name="Q1"      fill="#1e40af" radius={[0,0,0,0]} stackId="a" />
              <Bar dataKey="median" name="Médiane" fill="#3b82f6" radius={[0,0,0,0]} stackId="a" />
              <Bar dataKey="q3"     name="Q3"      fill="#93c5fd" radius={[4,4,0,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {g11.length > 0 && (
        <div className={chartContainer}>
          <p className={chartTitle}>Corrélation population vs score de santé financière (échantillon de communes)</p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="pop"
                type="number"
                name="Population"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                scale="log"
                domain={["auto", "auto"]}
              />
              <YAxis dataKey="score" type="number" name="Score" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip
                {...tooltipStyle}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-300">
                      <div className="font-medium">{p.nom} ({p.dept})</div>
                      <div>Pop: {p.pop?.toLocaleString("fr-FR")}</div>
                      <div>Score: {p.score}</div>
                    </div>
                  );
                }}
              />
              <Scatter data={g11} fill="#3b82f6" opacity={0.5} r={2} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ImmoBloc({ data }: { data: any }) {
  const g14 = data?.g14_evolution_prix ?? [];
  const g16 = data?.g16_top_communes_cheres ?? [];
  const g19 = data?.g19_evolution_volume ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <BlocInfo
          title="Marché immobilier — Transactions DVF & loyers CLAMEUR"
          description="Données issues des Demandes de Valeurs Foncières (DVF, Cerema/DGFiP) qui recensent toutes les transactions immobilières enregistrées par les notaires, et de CLAMEUR pour les loyers de marché. Le prix m² est calculé sur les mutations avec au moins 5 transactions pour fiabilité statistique."
          pills={["Prix m² = ventes de biens bâtis", "Loyer = €/m²/mois", "Transactions = actes notariés"]}
        />
        <div className="flex gap-2 shrink-0">
          {(data?.source_info?.sources ?? []).map((s: any, i: number) => (
            <SourceBadge key={i} label={s.label} annee={s.annee} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={chartContainer}>
          <p className={chartTitle}>Évolution du prix m² médian national (toutes communes · ≥5 transactions)</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={g14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v} €`} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v?.toLocaleString("fr-FR")} €`, "Prix m²"]} />
              <Line type="monotone" dataKey="median_m2" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Évolution volume de transactions</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={g19}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v?.toLocaleString("fr-FR"), "Transactions"]} />
              <Bar dataKey="total" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {g16.length > 0 && (
        <div className={chartContainer}>
          <p className={chartTitle}>Top 20 communes les plus chères (prix m²)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Commune</th>
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Département</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Prix m²</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {g16.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/20">
                    <td className="py-2 px-3 text-white font-medium">{r.nom}</td>
                    <td className="py-2 px-3 text-slate-400">{r.departement_nom}</td>
                    <td className="py-2 px-3 text-right font-mono text-amber-400">{r.prix_m2?.toLocaleString("fr-FR")} €</td>
                    <td className="py-2 px-3 text-right text-slate-400">{r.nb_mutations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EauBloc({ data }: { data: any }) {
  const g20 = data?.g20_evolution_conformite ?? [];
  const g21 = data?.g21_distribution_bact ?? [];
  const g23 = data?.g23_conformite_par_region ?? [];
  const g22 = data?.g22_top_nitrates ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <BlocInfo
          title="Qualité de l'eau potable — Programme NAQUA (Ministère de la Santé)"
          description="Données du réseau national de contrôle sanitaire de l'eau potable. La conformité bactériologique mesure l'absence de bactéries pathogènes (E. coli, entérocoques…). Les nitrates proviennent principalement des engrais agricoles. Un taux de conformité de 100 % signifie que toutes les analyses de l'année sont conformes aux normes sanitaires."
          pills={["Conformité bact. : norme ≤ 0 UFC/100mL", "Nitrates : norme ≤ 50 mg/L", "Taux 100 % = conforme toute l'année"]}
        />
        <SourceBadge label="Ministère de la Santé (NAQUA)" annee={data.annee} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={chartContainer}>
          <p className={chartTitle}>Évolution % communes conformes bactério. (≥ 99%)</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={g20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v} %`} domain={[0, 100]} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} %`, "% conformes"]} />
              <Line type="monotone" dataKey="pct_conformes" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Distribution du taux de conformité bactériologique (nombre de communes)</p>
          <p className="text-xs text-slate-500 mb-3">Chaque barre = communes dont le taux est dans la tranche. La grande majorité est à 100 %.</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={g21}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="bin_min" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} label={{ value: "Taux conformité →", position: "insideBottomRight", offset: -5, fill: "#64748b", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => v.toLocaleString("fr-FR")} label={{ value: "Nb communes", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 10 }} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v.toLocaleString("fr-FR"), "communes"]} labelFormatter={(v) => `Taux ≥ ${v}%`} />
              <Bar dataKey="nb" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={chartContainer}>
        <p className={chartTitle}>Taux de conformité bactériologique moyen par région (%)</p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={g23} layout="vertical" margin={{ left: 130, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="region_nom" tick={{ fill: "#94a3b8", fontSize: 10 }} width={125} />
            <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v} %`, "Conformité bact."]} />
            <Bar dataKey="conformite_bact_moy" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EnergieBloc({ data }: { data: any }) {
  const g25 = data?.g25_elec_par_secteur ?? [];
  const g26 = data?.g26_gaz_par_secteur ?? [];
  const g28 = data?.g28_co2_par_secteur ?? [];
  const g29 = data?.g29_co2_par_region ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <BlocInfo
          title="Consommation énergétique & émissions de gaz à effet de serre"
          description="Consommations électricité (ENEDIS) et gaz naturel (GRDF) agrégées par commune et secteur d'activité. Les émissions CO₂ (CITEPA) couvrent tous les secteurs : résidentiel, transport, industrie, agriculture. Les données sont en MWh pour l'énergie et en tonnes équivalent CO₂ pour les GES."
          pills={["Électricité : réseau ENEDIS", "Gaz : réseau GRDF", "CO₂ : tous secteurs confondus"]}
        />
        <div className="flex gap-2 shrink-0">
          {(data?.source_info?.sources ?? []).map((s: any, i: number) => (
            <SourceBadge key={i} label={s.label} annee={s.annee} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={chartContainer}>
          <p className={chartTitle}>Consommation électricité par secteur — réseau ENEDIS (TWh)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={g25.map((r: any) => ({ ...r, categorie: labelCategorie(r.categorie) }))}
              layout="vertical"
              margin={{ left: 175, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)} TWh`} />
              <YAxis type="category" dataKey="categorie" tick={{ fill: "#94a3b8", fontSize: 11 }} width={170} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${(v / 1e6).toFixed(2)} TWh`, "Consommation"]} />
              <Bar dataKey="total_mwh" fill="#fbbf24" radius={[0, 4, 4, 0]} label={{ position: "right", formatter: (v: any) => `${(v / 1e6).toFixed(1)} TWh`, fill: "#94a3b8", fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Consommation gaz naturel par secteur — réseau GRDF (TWh)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={g26.map((r: any) => ({ ...r, categorie: labelCategorie(r.categorie) }))}
              layout="vertical"
              margin={{ left: 175, right: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)} TWh`} />
              <YAxis type="category" dataKey="categorie" tick={{ fill: "#94a3b8", fontSize: 11 }} width={170} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${(v / 1e6).toFixed(2)} TWh`, "Consommation"]} />
              <Bar dataKey="total_mwh" fill="#f97316" radius={[0, 4, 4, 0]} label={{ position: "right", formatter: (v: any) => `${(v / 1e6).toFixed(1)} TWh`, fill: "#94a3b8", fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Émissions de CO₂ par secteur d'activité (Mt CO₂ eq.)</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={g28} layout="vertical" margin={{ left: 155, right: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)} Mt`} />
              <YAxis type="category" dataKey="secteur" tick={{ fill: "#94a3b8", fontSize: 10 }} width={150} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${(v / 1e6).toFixed(3)} Mt CO₂`, "Émissions"]} />
              <Bar dataKey="total" fill="#a78bfa" radius={[0, 4, 4, 0]} label={{ position: "right", formatter: (v: any) => `${(v / 1e6).toFixed(2)} Mt`, fill: "#94a3b8", fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Top 15 régions par CO₂ total</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={g29} layout="vertical" margin={{ left: 130, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}Mt`} />
              <YAxis type="category" dataKey="region" tick={{ fill: "#94a3b8", fontSize: 10 }} width={125} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${(v / 1e6).toFixed(2)} Mt CO₂`, "CO₂"]} />
              <Bar dataKey="total" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MobiliteBloc({ data }: { data: any }) {
  const g31 = data?.g31_modes_national ?? [];
  const g32 = data?.g32_voiture_tc_par_region ?? [];

  const g32pivot: Record<string, any> = {};
  for (const r of g32) {
    if (!g32pivot[r.region_nom]) g32pivot[r.region_nom] = { region: r.region_nom };
    if (r.mode_transport === "Voiture") g32pivot[r.region_nom].voiture = r.pct_moyen;
    if (r.mode_transport === "Transports en commun") g32pivot[r.region_nom].tc = r.pct_moyen;
  }
  const g32data = Object.values(g32pivot);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <BlocInfo
          title="Mobilité domicile-travail — Recensement INSEE 2019"
          description="Mode de transport principal utilisé pour les trajets domicile-travail, issu du Recensement de la Population 2019 (INSEE). Les pourcentages représentent la part de chaque mode parmi les actifs occupés se déplaçant pour travailler. La dépendance à la voiture est particulièrement élevée dans les zones rurales et périurbaines."
          pills={["Source : RP2019 INSEE", "Actifs occupés hors télétravail", "% = part du mode parmi les déplacements domicile-travail"]}
        />
        <SourceBadge label="INSEE (RP2019)" annee={data.annee} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={chartContainer}>
          <p className={chartTitle}>Répartition nationale des modes de transport</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={g31} layout="vertical" margin={{ left: 150, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
              <YAxis type="category" dataKey="mode_transport" tick={{ fill: "#94a3b8", fontSize: 10 }} width={145} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v?.toLocaleString("fr-FR"), "personnes"]} />
              <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Voiture vs Transports en commun par région (%)</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={g32data} layout="vertical" margin={{ left: 130, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="region" tick={{ fill: "#94a3b8", fontSize: 10 }} width={125} />
              <Tooltip {...tooltipStyle} formatter={(v: any, name: string) => [`${v} %`, name]} />
              <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
              <Bar dataKey="voiture" name="Voiture" fill="#f97316" radius={[0, 0, 0, 0]} stackId="a" />
              <Bar dataKey="tc" name="TC" fill="#3b82f6" radius={[0, 4, 4, 0]} stackId="b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ElectionsBloc({ data }: { data: any }) {
  const g34 = data?.g34_evolution_abstention ?? [];
  const g35 = data?.g35_abstention_par_tranche ?? [];
  const g36 = data?.g36_nuances_2026 ?? [];
  const g37 = data?.g37_top_participation ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <BlocInfo
          title="Élections municipales — résultats 2008, 2014, 2020, 2026"
          description="Résultats des élections municipales issus du Ministère de l'Intérieur. L'abstention est calculée comme le rapport inscrits - votants / inscrits au 1er tour. Les nuances politiques sont les codes officiels attribués par la préfecture à chaque liste (ex : LDVG = Divers gauche, LDVD = Divers droite, INCO = sans étiquette)."
          pills={["Abstention = (inscrits − votants) / inscrits × 100", "T1 = premier tour", "Nuances = codes Ministère de l'Intérieur"]}
        />
        <SourceBadge label="Ministère de l'Intérieur" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={chartContainer}>
          <p className={chartTitle}>Évolution de l'abstention T1 aux municipales</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={g34}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}%`, "Abstention moy."]} />
              <Line type="monotone" dataKey="abstention_moy" stroke="#f43f5e" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Nuances 2026 les plus représentées</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={g36.slice(0, 12)} layout="vertical" margin={{ left: 70, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis type="category" dataKey="nuance" tick={{ fill: "#94a3b8", fontSize: 10 }} width={65} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v.toLocaleString("fr-FR"), "communes"]} />
              <Bar dataKey="nb_communes" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Abstention T1 2020 par taille de commune — médiane (%)</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={g35.map((r: any) => ({ ...r, tranche: labelTranche(r.tranche_population) }))}
              margin={{ bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="tranche"
                tick={{ fill: "#94a3b8", fontSize: 9 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} unit="%" />
              <Tooltip
                {...tooltipStyle}
                formatter={(v: any, name: string) => [`${v} %`, name === "median" ? "Médiane abstention" : name]}
                labelFormatter={(l) => `Communes ${l}`}
              />
              <Bar dataKey="median" name="Médiane abstention" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Top communes — Taux de participation 2020</p>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-1.5 px-2 text-slate-400">Commune</th>
                  <th className="text-left py-1.5 px-2 text-slate-400">Département</th>
                  <th className="text-right py-1.5 px-2 text-slate-400">Participation</th>
                </tr>
              </thead>
              <tbody>
                {g37.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-800/40">
                    <td className="py-1.5 px-2 text-white">{r.nom}</td>
                    <td className="py-1.5 px-2 text-slate-400">{r.departement_nom}</td>
                    <td className="py-1.5 px-2 text-right text-emerald-400 font-mono">{r.taux_participation} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function FiscaliteBloc({ data }: { data: any }) {
  const g38 = data?.g38_distribution_tfb ?? [];
  const g39 = data?.g39_evolution_tfb ?? [];
  const g40 = data?.g40_tfb_par_region ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <BlocInfo
          title="Fiscalité locale — Taxe foncière bâtie (TFB) & TEOM"
          description="Taux communaux de fiscalité directe locale issus de la DGFiP. La TFB (Taxe sur le Foncier Bâti) est votée chaque année par le conseil municipal et s'applique à la valeur locative cadastrale des propriétés bâties. La TEOM (Taxe d'Enlèvement des Ordures Ménagères) finance le service de collecte des déchets. Ces taux varient énormément d'une commune à l'autre."
          pills={["TFB = Taxe foncière bâtie (propriétaires)", "TEOM = Taxe ordures ménagères", "Taux = % de la valeur locative cadastrale"]}
        />
        <SourceBadge label="DGFiP" annee={data.annee} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={chartContainer}>
          <p className={chartTitle}>Distribution des taux TFB communaux</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={g38}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="bin_min" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => v.toLocaleString("fr-FR")} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [v.toLocaleString("fr-FR"), "communes"]} />
              <Bar dataKey="nb" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={chartContainer}>
          <p className={chartTitle}>Évolution taux TFB moyen national</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={g39}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}%`, "Taux moyen"]} />
              <Line type="monotone" dataKey="taux_moyen" stroke="#22c55e" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={chartContainer}>
        <p className={chartTitle}>Taux TFB moyen par région</p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={g40} layout="vertical" margin={{ left: 130, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="region_nom" tick={{ fill: "#94a3b8", fontSize: 10 }} width={125} />
            <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}%`, "Taux TFB"]} />
            <Bar dataKey="taux_moyen" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
