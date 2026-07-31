'use client';
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { KpiCard } from "@/src/components/stats/KpiCard";
import { SourceBadge } from "@/src/components/stats/SourceBadge";
import { formatNumber } from "@/src/utils/format";

interface Props {
  hub: any;
  evolutionFinances: any;
  notesDistribution: any;
}

const NOTE_COLORS: Record<string, string> = {
  A: "#22c55e", B: "#86efac", C: "#fbbf24", D: "#f97316", E: "#ef4444",
};

const AGREGAT_KEYS: Record<string, string> = {
  "Dépenses de fonctionnement": "depenses",
  "Recettes de fonctionnement": "recettes",
  "Epargne brute": "epargne",
  "Dépenses d'équipement": "equipement",
};

const AGREGAT_COLORS: Record<string, string> = {
  "Dépenses de fonctionnement": "#f97316",
  "Recettes de fonctionnement": "#22c55e",
  "Epargne brute": "#60a5fa",
  "Dépenses d'équipement": "#a78bfa",
};

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} k`;
  return String(v);
}

export function HubClient({ hub, evolutionFinances, notesDistribution }: Props) {
  const k = hub?.kpis ?? {};
  const sources = hub?.source_info?.sources ?? [];

  // Préparer données évolution finances
  const evoSerie: any[] = (evolutionFinances?.serie ?? []).map((row: any) => ({
    annee: row.annee,
    depenses: row["Dépenses de fonctionnement"],
    recettes: row["Recettes de fonctionnement"],
    epargne: row["Epargne brute"],
    equipement: row["Dépenses d'équipement"],
  }));

  // Préparer données notes distribution
  const notesSerie: any[] = notesDistribution?.notes ?? [];

  return (
    <div className="space-y-10">
      {/* KPIs grid */}
      <section>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Chiffres clés</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Communes"
            value={k.k1_nb_communes?.toLocaleString("fr-FR") ?? "—"}
            accent="blue"
          />
          <KpiCard
            label="Population totale"
            value={fmt(k.k2_population_totale)}
            accent="emerald"
          />
          <KpiCard
            label="Communes avec finances"
            value={k.k3_communes_avec_finances?.toLocaleString("fr-FR") ?? "—"}
            sub={k.k3_annee ? `Année ${k.k3_annee}` : undefined}
            accent="blue"
          />
          <KpiCard
            label="Élus actifs"
            value={k.k8_nb_elus_actifs?.toLocaleString("fr-FR") ?? "—"}
            accent="violet"
          />
          <KpiCard
            label="Communes rurales"
            value={k.k5_pct_rural != null ? `${k.k5_pct_rural} %` : "—"}
            accent="emerald"
          />
          <KpiCard
            label="Médiane dépenses fonct."
            value={k.k6_median_depenses_fonct_eph != null ? `${k.k6_median_depenses_fonct_eph.toLocaleString("fr-FR")}` : "—"}
            unit="€/hab"
            accent="amber"
          />
          <KpiCard
            label="Médiane épargne brute"
            value={k.k7_median_epargne_brute_eph != null ? `${k.k7_median_epargne_brute_eph.toLocaleString("fr-FR")}` : "—"}
            unit="€/hab"
            accent="emerald"
          />
          <KpiCard
            label="Communes sans dette"
            value={k.k11_communes_sans_dette?.toLocaleString("fr-FR") ?? "—"}
            accent="emerald"
          />
          <KpiCard
            label="Prix m² médian"
            value={k.k13_prix_m2_median != null ? `${k.k13_prix_m2_median.toLocaleString("fr-FR")}` : "—"}
            unit="€/m²"
            sub={k.k13_annee ? `DVF ${k.k13_annee}` : undefined}
            accent="rose"
          />
          <KpiCard
            label="Transactions DVF"
            value={fmt(k.k14_nb_transactions)}
            accent="rose"
          />
          <KpiCard
            label="Abstention 2020 T1"
            value={k.k15_abstention_2020 != null ? `${k.k15_abstention_2020} %` : "—"}
            accent="amber"
          />
          <KpiCard
            label="Conformité bactério. eau"
            value={k.k9_conformite_bact_avg != null ? `${k.k9_conformite_bact_avg} %` : "—"}
            sub={k.k9_annee ? `Année ${k.k9_annee}` : undefined}
            accent="blue"
          />
          {k.k10_meilleure_commune && (
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                Meilleure commune
              </span>
              <span className="font-bold text-white text-lg leading-tight">
                {k.k10_meilleure_commune.nom}
              </span>
              <span className="text-xs text-slate-400">
                {k.k10_meilleure_commune.departement_nom} · Score {k.k10_meilleure_commune.score}
                {" "}
                <span className="font-bold text-amber-400">{k.k10_meilleure_commune.note}</span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Notes distribution */}
      {notesSerie.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">
              Répartition des notes de santé financière
            </h2>
            <SourceBadge label="VilleTracker / OFGL" annee={notesDistribution?.annee} />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex gap-3 flex-wrap mb-4">
              {notesSerie.map((n: any) => (
                <div key={n.note} className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white"
                    style={{ backgroundColor: NOTE_COLORS[n.note] ?? "#64748b" }}
                  >
                    {n.note}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {n.nb?.toLocaleString("fr-FR")}
                    </div>
                    <div className="text-xs text-slate-500">{n.pct} %</div>
                  </div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={notesSerie} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="note" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => v.toLocaleString("fr-FR")} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(v: any) => [v.toLocaleString("fr-FR"), "communes"]}
                />
                <Bar dataKey="nb" radius={[4, 4, 0, 0]}>
                  {notesSerie.map((n: any) => (
                    <Cell key={n.note} fill={NOTE_COLORS[n.note] ?? "#64748b"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Évolution finances */}
      {evoSerie.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200">
              Évolution des indicateurs financiers (médiane €/hab)
            </h2>
            <SourceBadge label="OFGL" annee={evolutionFinances?.source_info?.annee_max} />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evoSerie}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v} €`} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(v: any, name: string) => [`${v?.toLocaleString("fr-FR")} €`, name]}
                />
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                <Line type="monotone" dataKey="depenses" name="Dépenses fonct." stroke="#f97316" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="recettes" name="Recettes fonct." stroke="#22c55e" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="epargne"  name="Épargne brute"   stroke="#60a5fa" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="equipement" name="Équipement"    stroke="#a78bfa" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">Sources</h3>
          <div className="flex flex-wrap gap-2">
            {sources.map((s: any, i: number) => (
              <SourceBadge key={i} label={s.label} annee={s.annee} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
