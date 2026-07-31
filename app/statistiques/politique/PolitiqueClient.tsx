'use client';
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, Cell, ReferenceLine,
} from "recharts";
import { SourceBadge } from "@/src/components/stats/SourceBadge";
import { KpiCard } from "@/src/components/stats/KpiCard";

interface Props {
  resume:      any;
  statsFamille: any;
  evolution:   any;
  fun:         any;
  records:     any;
  elus:        any;
}

// ── Couleurs & helpers ────────────────────────────────────────────────────────

const COULEUR_FAMILLE: Record<string, string> = {
  "Extrême gauche": "#7c3aed",
  "Gauche":         "#dc2626",
  "Centre-gauche":  "#fb923c",
  "Centre":         "#f59e0b",
  "Centre-droite":  "#60a5fa",
  "Droite":         "#2563eb",
  "Extrême droite": "#1e3a5f",
  "Divers/SE":      "#9ca3af",
};

const FAMILLES_ORDRE = [
  "Extrême gauche","Gauche","Centre-gauche","Centre",
  "Centre-droite","Droite","Extrême droite","Divers/SE",
];

function fmt(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("fr-FR");
}
function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toLocaleString("fr-FR")} %`;
}
function couleur(famille: string): string {
  return COULEUR_FAMILLE[famille] ?? "#9ca3af";
}

// ── Badge nuance ──────────────────────────────────────────────────────────────

function NuanceBadge({ famille, nuance }: { famille: string; nuance?: string }) {
  return (
    <span
      className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded text-white shrink-0"
      style={{ backgroundColor: couleur(famille) }}
      title={famille}
    >
      {nuance ?? famille.substring(0, 3).toUpperCase()}
    </span>
  );
}

// ── Onglets ───────────────────────────────────────────────────────────────────

type Tab = "general" | "orientation" | "records" | "elus" | "croisements";
const TABS: { id: Tab; label: string }[] = [
  { id: "general",      label: "Vue générale" },
  { id: "orientation",  label: "Évolution" },
  { id: "records",      label: "Records" },
  { id: "elus",         label: "Les élus" },
  { id: "croisements",  label: "Politique & données" },
];

// ── Composant principal ───────────────────────────────────────────────────────

export function PolitiqueClient({ resume, statsFamille, evolution, fun, records, elus }: Props) {
  const [tab, setTab] = useState<Tab>("general");

  const p = resume?.kpis ?? {};

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <section>
        <h1 className="text-2xl font-bold text-white mb-1">Politique municipale</h1>
        <p className="text-slate-400 text-sm">
          Résultats des élections municipales · {p.annee_derniere_election ?? "—"} · données Ministère de l'Intérieur &amp; RNE
        </p>
      </section>

      {/* Onglets */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB : Vue générale ─────────────────────────────────────────────── */}
      {tab === "general" && (
        <div className="space-y-10">
          {/* KPIs */}
          <section>
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Chiffres clés {p.annee_derniere_election ?? ""}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <KpiCard label="Communes avec résultats" value={fmt(p.nb_communes_avec_elections)} accent="blue" />
              <KpiCard label="Élus dès le 1er tour" value={fmt(p.nb_communes_1er_tour)} sub="communes" accent="emerald" />
              <KpiCard label="Ballottage (2e tour)" value={fmt(p.nb_communes_2eme_tour)} sub="communes" accent="amber" />
              <KpiCard label="Abstention moy. T1" value={fmtPct(p.abstention_moy_t1)} accent="rose" />
              <KpiCard label="Total inscrits" value={fmt(p.total_inscrits)} accent="blue" />
              <KpiCard label="Total votants T1" value={fmt(p.total_votants_t1)} accent="blue" />
              {p.p5_pct_changement_2020_2026 != null && (
                <KpiCard
                  label={`Changements ${p.p5_annee_ref ?? ""}→${p.p5_annee_actuelle ?? ""}`}
                  value={fmtPct(p.p5_pct_changement_2020_2026)}
                  sub="communes ayant changé de camp"
                  accent="amber"
                />
              )}
              {resume?.p6_famille_grandes_villes && (
                <KpiCard
                  label="Grandes villes (+100k)"
                  value={resume.p6_famille_grandes_villes}
                  sub="famille dominante"
                  accent="violet"
                />
              )}
            </div>
          </section>

          {/* Répartition blocs */}
          {resume?.p1_communes_par_famille?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Répartition des communes par orientation politique</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Basé sur la nuance de la liste arrivée en tête dans chaque commune</p>
                </div>
                <SourceBadge label="Ministère de l'Intérieur" annee={p.annee_derniere_election} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                {(resume.p1_communes_par_famille as any[])
                  .filter((f) => f.nb > 0)
                  .sort((a: any, b: any) => b.nb - a.nb)
                  .map((f: any) => {
                    const total = (resume.p1_communes_par_famille as any[]).reduce((s: number, x: any) => s + x.nb, 0);
                    const pct = total > 0 ? ((f.nb / total) * 100).toFixed(1) : "0";
                    return (
                      <div key={f.famille} className="flex items-center gap-3">
                        <div className="w-36 shrink-0 text-xs text-right text-slate-400 truncate">{f.famille}</div>
                        <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: couleur(f.famille) }}
                          />
                        </div>
                        <div className="w-24 shrink-0 flex gap-2 text-xs tabular-nums">
                          <span className="text-white font-medium">{f.nb.toLocaleString("fr-FR")}</span>
                          <span className="text-slate-500">{pct} %</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Taux participation par famille */}
          {resume?.p4_participation_par_famille?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Taux de participation T1 par orientation politique</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Participation moyenne dans les communes remportées par chaque famille</p>
                </div>
                <SourceBadge label="Ministère de l'Intérieur" annee={p.annee_derniere_election} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={(resume.p4_participation_par_famille as any[]).filter((f: any) => f.taux_participation != null)}
                    layout="vertical" margin={{ left: 110, right: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v} %`} />
                    <YAxis type="category" dataKey="famille" tick={{ fill: "#94a3b8", fontSize: 11 }} width={105} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                      formatter={(v: any) => [`${v} %`, "Taux de participation"]}
                    />
                    <Bar dataKey="taux_participation" radius={[0, 4, 4, 0]}>
                      {(resume.p4_participation_par_famille as any[]).map((f: any) => (
                        <Cell key={f.famille} fill={couleur(f.famille)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Nuances les plus représentées */}
          {statsFamille?.top_nuances?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-200">Nuances politiques les plus représentées</h2>
                <SourceBadge label="Ministère de l'Intérieur" annee={statsFamille?.annee_elec ?? p.annee_derniere_election} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Code</th>
                      <th className="text-left px-4 py-3 text-slate-400 font-medium">Libellé</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium">Communes</th>
                      <th className="text-right px-4 py-3 text-slate-400 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(statsFamille.top_nuances as any[]).slice(0, 15).map((n: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-mono text-xs text-slate-300">{n.nuance}</td>
                        <td className="px-4 py-2 text-slate-300">{n.libelle_nuance || n.nuance}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-white">{n.nb_communes?.toLocaleString("fr-FR")}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-400">{n.pct_communes} %</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── TAB : Orientation politique ───────────────────────────────────── */}
      {tab === "orientation" && (
        <div className="space-y-10">
          {evolution?.familles?.length > 0 && (() => {
            // Exclure les années avec trop peu de communes (ex: 2008 = ~2600 vs 35000+)
            const annees: number[] = (evolution.annees ?? []).filter((a: number) =>
              (evolution.total_par_annee?.[a] ?? 0) >= 5000
            );
            const famillesFiltered = (evolution.familles as any[]).filter(
              (f: any) => f.famille !== "Divers/SE"
            );
            // Reshaper pour Recharts en % de communes par famille
            const trajectoireData = annees.map((a: number) => {
              const row: Record<string, any> = { annee: a };
              famillesFiltered.forEach((f: any) => {
                const point = (f.serie as any[]).find((s: any) => s.annee === a);
                row[f.famille] = point?.pct ?? 0;
              });
              return row;
            });
            return (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-200">Trajectoire politique {annees[0]}–{annees[annees.length - 1]}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Part des communes remportées par chaque famille politique (% des communes avec résultats disponibles)
                    </p>
                  </div>
                  <SourceBadge label="Ministère de l'Intérieur" annee={annees.length > 1 ? `${annees[0]}–${annees[annees.length - 1]}` : annees[0]} />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={trajectoireData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v} %`} domain={[0, "auto"]} />
                      <Tooltip
                        contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                        formatter={(v: any, name: string) => [`${v} %`, name]}
                      />
                      <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                      {famillesFiltered.map((f: any) => (
                        <Line
                          key={f.famille}
                          type="monotone"
                          dataKey={f.famille}
                          stroke={couleur(f.famille)}
                          dot={{ r: 3, fill: couleur(f.famille) }}
                          strokeWidth={2}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            );
          })()}

          {/* Évolution taux de participation */}
          {evolution?.participation_serie?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Évolution du taux de participation T1</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Moyenne nationale du taux de participation au 1er tour des élections municipales</p>
                </div>
                <SourceBadge label="Ministère de l'Intérieur" annee={(() => { const s = evolution.participation_serie; return s?.length > 1 ? `${s[0].annee}–${s[s.length-1].annee}` : s?.[0]?.annee; })()} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={evolution.participation_serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v} %`} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                      formatter={(v: any, name: string) => [`${v} %`, name]}
                    />
                    <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                    <Line type="monotone" dataKey="taux_participation" name="Participation" stroke="#22c55e" dot={{ r: 4 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="taux_abstention"    name="Abstention"   stroke="#f43f5e" dot={{ r: 4 }} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Communes fidèles & swing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {fun?.fp2_top_fideles?.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-slate-200">Communes les plus fidèles</h2>
                  <SourceBadge label="Ministère de l'Intérieur" annee={(() => { const a = fun.source_info?.annees ?? []; return a.length > 1 ? `${a[0]}–${a[a.length-1]}` : a[0]; })()} />
                </div>
                <p className="text-xs text-slate-500 mb-3">Même famille politique à tous les scrutins ({(fun.source_info?.annees ?? []).join(", ")})</p>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Commune</th>
                        <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Camp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(fun.fp2_top_fideles as any[]).map((c: any, i: number) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-2 text-slate-300">{c.nom} <span className="text-slate-500 text-xs">({c.dept})</span></td>
                          <td className="px-4 py-2">
                            <NuanceBadge famille={c.couleur_politique} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {fun?.fp1_top_changeantes?.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-slate-200">Communes les plus instables</h2>
                  <SourceBadge label="Ministère de l'Intérieur" annee={(() => { const a = fun.source_info?.annees ?? []; return a.length > 1 ? `${a[0]}–${a[a.length-1]}` : a[0]; })()} />
                </div>
                <p className="text-xs text-slate-500 mb-3">Changements d'orientation politique entre chaque scrutin</p>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Commune</th>
                        <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Changements</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(fun.fp1_top_changeantes as any[]).map((c: any, i: number) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-2 text-slate-300">{c.nom} <span className="text-slate-500 text-xs">({c.dept})</span></td>
                          <td className="px-4 py-2 text-right tabular-nums text-amber-400 font-semibold">{c.nb_changements} /3</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

        </div>
      )}

      {/* ── TAB : Records ─────────────────────────────────────────────────── */}
      {tab === "records" && records && (
        <div className="space-y-10">
          {/* Top scores */}
          {records.top_scores?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Scores les plus élevés</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Pourcentage des exprimés obtenu par la liste arrivée en tête dans chaque commune</p>
                </div>
                <SourceBadge label="Ministère de l'Intérieur" annee={records.source_info?.sources?.[0]?.annee} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium w-6">#</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Commune</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium hidden sm:table-cell">Tête de liste</th>
                      <th className="text-right px-4 py-2.5 text-slate-400 font-medium">
                        Score <span className="font-normal text-xs">% des exprimés</span>
                      </th>
                      <th className="text-center px-4 py-2.5 text-slate-400 font-medium hidden md:table-cell">Tour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(records.top_scores as any[]).map((r: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 text-slate-500 tabular-nums">{i + 1}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <NuanceBadge famille={r.famille} nuance={r.nuance} />
                            <span className="text-white font-medium">{r.nom}</span>
                            <span className="text-slate-500 text-xs">({r.departement_code})</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 hidden sm:table-cell text-slate-200">{r.tete_liste || "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          <div className="font-bold text-emerald-400">{r.pct != null ? `${r.pct} %` : "—"}</div>
                          {r.nb_voix != null && r.exprimes != null && (
                            <div className="text-xs text-slate-500">
                              {r.nb_voix.toLocaleString("fr-FR")} / {r.exprimes.toLocaleString("fr-FR")} voix
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center hidden md:table-cell">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${r.tour === "t2" ? "bg-amber-900/30 text-amber-400" : "bg-slate-800 text-slate-400"}`}>
                            {r.tour === "t2" ? "T2" : "T1"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Écarts les plus serrés */}
          {records.ecarts_serres?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Victoires les plus serrées</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Communes où l'écart en voix entre le 1er et le 2ème est le plus faible (communes ≥ 500 habitants)
                  </p>
                </div>
                <SourceBadge label="Ministère de l'Intérieur" annee={records.source_info?.sources?.[0]?.annee} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Commune</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium hidden sm:table-cell">Vainqueur</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium hidden sm:table-cell">2ème</th>
                      <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Écart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(records.ecarts_serres as any[]).map((r: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2">
                          <div className="font-medium text-white">{r.nom}</div>
                          <div className="text-xs text-slate-500">{r.departement} · {r.population?.toLocaleString("fr-FR")} hab.</div>
                        </td>
                        <td className="px-4 py-2 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <NuanceBadge famille={r.famille_1er} nuance={r.nuance_1er} />
                            <span className="text-slate-300 text-xs">{r.nom_1er || "—"}</span>
                            <span className="text-slate-500 text-xs tabular-nums">({r.voix_1er?.toLocaleString("fr-FR")} v.)</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <NuanceBadge famille={r.famille_2eme} nuance={r.nuance_2eme} />
                            <span className="text-slate-300 text-xs">{r.nom_2eme || "—"}</span>
                            <span className="text-slate-500 text-xs tabular-nums">({r.voix_2eme?.toLocaleString("fr-FR")} v.)</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          <span className="font-bold text-rose-400">{r.ecart == 0 ? "égalité" : `${r.ecart?.toLocaleString("fr-FR")} v.`}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Participation extrêmes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {records.top_participation?.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-slate-200">Communes les plus mobilisées</h2>
                  <SourceBadge label="Ministère de l'Intérieur" annee={records.source_info?.sources?.[0]?.annee} />
                </div>
                <p className="text-xs text-slate-500 mb-3">Taux de participation T1 {records.source_info?.sources?.[0]?.annee ?? ""} — communes ≥ 100 inscrits</p>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left px-3 py-2.5 text-slate-400 font-medium">#</th>
                        <th className="text-left px-3 py-2.5 text-slate-400 font-medium">Commune</th>
                        <th className="text-right px-3 py-2.5 text-slate-400 font-medium">Participation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(records.top_participation as any[]).map((r: any, i: number) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-3 py-1.5 text-slate-500 tabular-nums">{i + 1}</td>
                          <td className="px-3 py-1.5 text-slate-300">
                            {r.nom} <span className="text-slate-500 text-xs">({r.departement_code})</span>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-bold text-emerald-400">
                            {r.taux != null ? `${r.taux} %` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {records.bottom_participation?.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-slate-200">Communes les moins mobilisées</h2>
                  <SourceBadge label="Ministère de l'Intérieur" annee={records.source_info?.sources?.[0]?.annee} />
                </div>
                <p className="text-xs text-slate-500 mb-3">Taux de participation T1 {records.source_info?.sources?.[0]?.annee ?? ""} — communes ≥ 100 inscrits</p>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left px-3 py-2.5 text-slate-400 font-medium">#</th>
                        <th className="text-left px-3 py-2.5 text-slate-400 font-medium">Commune</th>
                        <th className="text-right px-3 py-2.5 text-slate-400 font-medium">Participation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(records.bottom_participation as any[]).map((r: any, i: number) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-3 py-1.5 text-slate-500 tabular-nums">{i + 1}</td>
                          <td className="px-3 py-1.5 text-slate-300">
                            {r.nom} <span className="text-slate-500 text-xs">({r.departement_code})</span>
                          </td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-bold text-rose-400">
                            {r.taux != null ? `${r.taux} %` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          {/* Plus grand nombre de listes */}
          {records.plus_listes?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Communes avec le plus de listes</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Nombre de listes déposées au 1er tour</p>
                </div>
                <SourceBadge label="Ministère de l'Intérieur" annee={records.source_info?.sources?.[0]?.annee} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(records.plus_listes as any[]).slice(0, 10).map((r: any, i: number) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">{r.nom}</span>
                      <span className="text-slate-500 text-xs ml-2">{r.departement_nom} · {r.population?.toLocaleString("fr-FR")} hab.</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-400 tabular-nums">{r.nb_listes}</span>
                  </div>
                ))}
              </div>
              {records.nb_communes_sans_liste != null && records.nb_communes_sans_liste > 0 && (
                <p className="text-xs text-slate-500 mt-3">
                  ℹ {records.nb_communes_sans_liste.toLocaleString("fr-FR")} communes sans aucune liste enregistrée en {records.source_info?.sources?.[0]?.annee ?? ""}.
                </p>
              )}
            </section>
          )}
        </div>
      )}

      {/* ── TAB : Les élus ────────────────────────────────────────────────── */}
      {tab === "elus" && elus && (
        <div className="space-y-10">
          {/* Note données partielles */}
          {elus.source_info?.note && (
            <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-800/30 rounded-xl px-4 py-3 text-sm text-amber-300">
              <span className="shrink-0">⚠</span>
              <span>{elus.source_info.note} — statistiques sur l'échantillon disponible uniquement.</span>
            </div>
          )}

          {/* KPIs maires */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">Les maires</h2>
              <SourceBadge label="RNE" annee={elus.source_info?.sources?.[0]?.annee} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {elus.maires?.age_moyen != null && (
                <KpiCard label="Âge moyen des maires" value={`${elus.maires.age_moyen}`} unit="ans" accent="blue" />
              )}
              {elus.maires?.pct_femmes != null && (
                <KpiCard
                  label="Maires femmes"
                  value={`${elus.maires.pct_femmes} %`}
                  sub={`${elus.maires.nb_femmes} / ${elus.maires.total}`}
                  accent="rose"
                />
              )}
            </div>
          </section>

          {/* KPIs conseil municipal global */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">Conseil municipal (tous élus)</h2>
              <SourceBadge label="RNE" annee={elus.source_info?.sources?.[0]?.annee} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {elus.conseil_global?.pct_femmes != null && (
                <KpiCard
                  label="Élues femmes"
                  value={`${elus.conseil_global.pct_femmes} %`}
                  sub={`${elus.conseil_global.nb_femmes?.toLocaleString("fr-FR")} / ${elus.conseil_global.total?.toLocaleString("fr-FR")}`}
                  accent="rose"
                />
              )}
              {elus.conseil_global?.age_moyen != null && (
                <KpiCard label="Âge moyen" value={`${elus.conseil_global.age_moyen}`} unit="ans" accent="blue" />
              )}
              <KpiCard label="Total élus (RNE)" value={fmt(elus.conseil_global?.total)} accent="blue" />
            </div>
          </section>

          {/* Parité visuelle */}
          {elus.maires?.total > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-200">Parité des maires</h2>
                <SourceBadge label="RNE" annee={elus.source_info?.sources?.[0]?.annee} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Hommes — {elus.maires.nb_hommes} ({(100 - (elus.maires.pct_femmes ?? 0)).toFixed(1)} %)</span>
                    <span>Femmes — {elus.maires.nb_femmes} ({elus.maires.pct_femmes} %)</span>
                  </div>
                  <div className="h-6 rounded-full overflow-hidden flex">
                    <div className="h-full bg-blue-600" style={{ width: `${100 - (elus.maires.pct_femmes ?? 0)}%` }} />
                    <div className="h-full bg-rose-500" style={{ width: `${elus.maires.pct_femmes ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Légalement, les communes de plus de 1 000 habitants doivent respecter la parité sur les listes.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Évolution parité dans le temps */}
          {elus.parite_evolution?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Évolution de la parité des maires</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    % de femmes têtes de liste élues — années avec couverture nationale complète
                  </p>
                </div>
                <SourceBadge label="Ministère de l'Intérieur" annee={(() => { const a = elus.parite_annees ?? []; return a.length > 1 ? `${a[0]}–${a[a.length-1]}` : a[0]; })()} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={elus.parite_evolution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v} %`} domain={[0, 50]} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                      formatter={(v: any, name: string) => [`${v} %`, name]}
                    />
                    <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                    <ReferenceLine y={50} stroke="#475569" strokeDasharray="4 4" label={{ value: "Parité 50 %", fill: "#64748b", fontSize: 10 }} />
                    <Line type="monotone" dataKey="pct_femmes" name="Femmes" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4, fill: "#f43f5e" }} />
                    <Line type="monotone" dataKey="pct_hommes" name="Hommes" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Parité par famille politique et par année */}
          {elus.parite_par_famille?.length > 0 && (() => {
            const annees: number[] = elus.parite_annees ?? [];
            const barColors = ["#818cf8", "#f43f5e", "#34d399", "#fbbf24"];
            return (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-200">Parité des maires par famille politique</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      % de femmes têtes de liste gagnantes par scrutin municipal
                    </p>
                  </div>
                  <SourceBadge label="Ministère de l'Intérieur" annee={(() => { const a = elus.parite_annees ?? []; return a.length > 1 ? `${a[0]}–${a[a.length-1]}` : a[0]; })()} />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={elus.parite_par_famille} margin={{ top: 5, right: 20, bottom: 60, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="famille"
                        tick={{ fill: "#94a3b8", fontSize: 10 }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `${v} %`} domain={[0, 50]} />
                      <Tooltip
                        contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                        formatter={(v: any, name: string) => [v != null ? `${v} %` : "—", name]}
                      />
                      <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11, paddingTop: 8 }} />
                      <ReferenceLine y={50} stroke="#475569" strokeDasharray="4 4" />
                      {annees.map((a, i) => (
                        <Bar key={a} dataKey={String(a)} name={String(a)} fill={barColors[i % barColors.length]} radius={[3, 3, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            );
          })()}

          {/* Part de mairesses par famille politique */}
          {statsFamille?.familles && (statsFamille.familles as any[]).some((f: any) => f.pct_mairesses != null) && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Part de mairesses par famille politique</h2>
                  <p className="text-xs text-slate-500 mt-0.5">% de femmes maires parmi les maires des communes de chaque famille (données RNE partielles)</p>
                </div>
                <SourceBadge label="RNE" annee={elus?.source_info?.sources?.[0]?.annee} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                {(statsFamille.familles as any[])
                  .filter((f: any) => f.pct_mairesses != null && (f.nb_maires_h + f.nb_maires_f) > 0)
                  .sort((a: any, b: any) => (b.pct_mairesses ?? 0) - (a.pct_mairesses ?? 0))
                  .map((f: any) => (
                    <div key={f.famille} className="flex items-center gap-3">
                      <div className="w-36 shrink-0 text-xs text-right text-slate-400 truncate">{f.famille}</div>
                      <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-600/70" style={{ width: `${100 - (f.pct_mairesses ?? 0)}%` }} />
                        <div className="h-full bg-rose-500/80" style={{ width: `${f.pct_mairesses ?? 0}%` }} />
                      </div>
                      <div className="w-20 shrink-0 text-xs tabular-nums text-rose-400 font-medium">
                        {f.pct_mairesses} % ♀
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* CSP des maires */}
          {elus.csp_grouped?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-slate-200">Professions des maires</h2>
                <SourceBadge label="RNE" annee={elus.source_info?.sources?.[0]?.annee} />
              </div>
              <p className="text-xs text-slate-500 mb-3">Regroupement par catégorie socio-professionnelle</p>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={elus.csp_grouped} layout="vertical" margin={{ left: 130, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis type="category" dataKey="groupe" tick={{ fill: "#94a3b8", fontSize: 11 }} width={125} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                      formatter={(v: any) => [v.toLocaleString("fr-FR"), "maires"]}
                    />
                    <Bar dataKey="nb" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Top anciens maires */}
          {elus.top_anciens_maires?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-slate-200">Maires en poste depuis le plus longtemps</h2>
                <SourceBadge label="Ministère de l'Intérieur" annee={(() => { const a = elus.parite_annees ?? []; return a.length > 1 ? `${a[0]}–${a[a.length-1]}` : a[0]; })()} />
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Basé sur les victoires électorales croisées entre scrutins historiques. Ancienneté estimée = dernière élection − première victoire connue.
              </p>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium">#</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Maire</th>
                      <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Commune</th>
                      <th className="text-center px-4 py-2.5 text-slate-400 font-medium">Scrutins</th>
                      <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Ancienneté min.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(elus.top_anciens_maires as any[]).map((r: any, i: number) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-4 py-2 text-white font-medium">{r.maire}</td>
                        <td className="px-4 py-2 text-slate-400">
                          {r.commune_nom}
                          <span className="text-slate-600 text-xs ml-1">({r.departement_code})</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-xs text-slate-400">
                            {"★".repeat(r.nb_scrutins)}
                            <span className="ml-1 text-slate-600">({r.nb_scrutins})</span>
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          <span className="font-bold text-amber-400">{r.ans_estime} ans+</span>
                          <span className="text-slate-500 text-xs ml-1">depuis {r.premiere_victoire}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-600 mt-2">
                Source : croisement données électorales Ministère de l'Intérieur · dernière élection non incluse (noms partiellement disponibles)
              </p>
            </section>
          )}

          {/* Maires les plus jeunes / plus âgés */}
          {elus.maires_extremes?.length > 0 && (() => {
            const jeunes = (elus.maires_extremes as any[]).filter((r) => r.type === "jeune");
            const ages = (elus.maires_extremes as any[]).filter((r) => r.type === "age");
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {jeunes.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold text-slate-200">Maires les plus jeunes</h2>
                      <SourceBadge label="RNE" annee={elus.source_info?.sources?.[0]?.annee} />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {jeunes.map((r: any, i: number) => (
                            <tr key={i} className="border-b border-slate-800/50">
                              <td className="px-4 py-2 text-white font-medium">
                                {r.maire} {r.sexe === "F" && <span className="text-xs text-rose-400">♀</span>}
                              </td>
                              <td className="px-4 py-2 text-slate-400 text-xs">{r.commune_nom} ({r.departement})</td>
                              <td className="px-4 py-2 text-right tabular-nums font-bold text-emerald-400">{r.age} ans</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                {ages.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold text-slate-200">Maires les plus âgés</h2>
                      <SourceBadge label="RNE" annee={elus.source_info?.sources?.[0]?.annee} />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {ages.map((r: any, i: number) => (
                            <tr key={i} className="border-b border-slate-800/50">
                              <td className="px-4 py-2 text-white font-medium">
                                {r.maire} {r.sexe === "F" && <span className="text-xs text-rose-400">♀</span>}
                              </td>
                              <td className="px-4 py-2 text-slate-400 text-xs">{r.commune_nom} ({r.departement})</td>
                              <td className="px-4 py-2 text-right tabular-nums font-bold text-amber-400">{r.age} ans</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>
            );
          })()}

          {/* Conseils les plus jeunes */}
          {elus.conseils_jeunes?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-slate-200">Conseils municipaux les plus jeunes</h2>
                <SourceBadge label="RNE" annee={elus.source_info?.sources?.[0]?.annee} />
              </div>
              <p className="text-xs text-slate-500 mb-3">Âge moyen des élus actifs par commune (min. 5 élus dans le RNE)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(elus.conseils_jeunes as any[]).map((r: any, i: number) => (
                  <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-white">{r.nom}</span>
                      <div className="text-xs text-slate-500 mt-0.5">{r.departement_nom} · {r.nb_elus} élus</div>
                    </div>
                    <span className="text-2xl font-bold text-emerald-400 tabular-nums">{r.age_moyen} <span className="text-sm font-normal text-slate-400">ans</span></span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <SourceBadge label="RNE (Répertoire National des Élus)" annee={elus.source_info?.sources?.[0]?.annee} />
        </div>
      )}

      {/* ── TAB : Politique & données ────────────────────────────────────── */}
      {tab === "croisements" && statsFamille?.familles?.length > 0 && (
        <div className="space-y-10">
          <p className="text-sm text-slate-400">
            Pour chaque famille politique, indicateurs moyens des communes qu'elle dirige — croisements entre orientation politique, santé financière et marché immobilier.
          </p>

          {/* Score financier par famille */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Score de santé financière par famille</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Score VilleTracker (0–100) — moyenne sur les communes avec données financières. Score élevé = meilleure santé financière.
                </p>
              </div>
              <SourceBadge label="VilleTracker / OFGL" annee={statsFamille.annee_score} />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={(statsFamille.familles as any[]).filter((f: any) => f.score_moyen != null)}
                  layout="vertical"
                  margin={{ left: 110, right: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis type="category" dataKey="famille" tick={{ fill: "#94a3b8", fontSize: 11 }} width={105} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                    formatter={(v: any) => [v, "Score moyen"]}
                  />
                  <Bar dataKey="score_moyen" radius={[0, 4, 4, 0]} label={{ position: "right", fill: "#94a3b8", fontSize: 11 }}>
                    {(statsFamille.familles as any[]).filter((f: any) => f.score_moyen != null).map((f: any) => (
                      <Cell key={f.famille} fill={couleur(f.famille)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Répartition notes A-E par famille */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Répartition des notes financières par famille</h2>
                <p className="text-xs text-slate-500 mt-0.5">AAA = excellent, CCC = difficile. Part de communes dans chaque famille ayant cette note.</p>
              </div>
              <SourceBadge label="VilleTracker / OFGL" annee={statsFamille.annee_score} />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Famille</th>
                    {["AAA","AA","A","BBB","BB","B","CCC"].map((n) => (
                      <th key={n} className="text-center px-2 py-3 text-slate-400 font-medium text-xs">{n}</th>
                    ))}
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Score moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {(statsFamille.familles as any[])
                    .filter((f: any) => f.nb_communes > 0)
                    .map((f: any) => (
                      <tr key={f.famille} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: couleur(f.famille) }} />
                            <span className="text-slate-300 text-xs">{f.famille}</span>
                          </div>
                        </td>
                        {["AAA","AA","A","BBB","BB","B","CCC"].map((note) => (
                          <td key={note} className="px-2 py-2 text-center tabular-nums text-xs text-slate-400">
                            {f.notes?.[note]?.pct != null ? `${f.notes[note].pct} %` : "—"}
                          </td>
                        ))}
                        <td className="px-4 py-2 text-right tabular-nums font-medium text-white">
                          {f.score_moyen ?? "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Indicateurs financiers par famille */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Indicateurs financiers par famille (€/hab.)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Moyenne des communes de chaque famille ayant des données financières disponibles</p>
              </div>
              <SourceBadge label="OFGL" annee={statsFamille.annee_finances} />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Famille</th>
                    <th className="text-right px-3 py-3 text-slate-400 font-medium">Dép. fonct.</th>
                    <th className="text-right px-3 py-3 text-slate-400 font-medium">Épargne brute</th>
                    <th className="text-right px-3 py-3 text-slate-400 font-medium">Investissement</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Encours dette</th>
                  </tr>
                </thead>
                <tbody>
                  {(statsFamille.familles as any[])
                    .filter((f: any) => f.nb_communes > 0)
                    .map((f: any) => (
                      <tr key={f.famille} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: couleur(f.famille) }} />
                            <span className="text-slate-300 text-xs">{f.famille}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs text-slate-300">
                          {f.depenses_fonct_eph != null ? `${Math.round(f.depenses_fonct_eph).toLocaleString("fr-FR")} €` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs text-emerald-400">
                          {f.epargne_brute_eph != null ? `${Math.round(f.epargne_brute_eph).toLocaleString("fr-FR")} €` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs text-blue-400">
                          {f.investissement_eph != null ? `${Math.round(f.investissement_eph).toLocaleString("fr-FR")} €` : "—"}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-xs text-rose-400">
                          {f.dette_eph != null ? `${Math.round(f.dette_eph).toLocaleString("fr-FR")} €` : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Prix immobilier & abstention par famille */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prix m² */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-200">Prix m² médian par famille</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Moyenne des communes avec transactions DVF (≥ 5 mutations)</p>
                </div>
                <SourceBadge label="DVF (Cerema)" annee={statsFamille.annee_dvf} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={(statsFamille.familles as any[]).filter((f: any) => f.prix_m2_moyen != null)}
                    layout="vertical"
                    margin={{ left: 110, right: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="famille" tick={{ fill: "#94a3b8", fontSize: 10 }} width={105} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                      formatter={(v: any) => [`${Math.round(v).toLocaleString("fr-FR")} €/m²`, "Prix m²"]}
                    />
                    <Bar dataKey="prix_m2_moyen" radius={[0, 4, 4, 0]}>
                      {(statsFamille.familles as any[]).filter((f: any) => f.prix_m2_moyen != null).map((f: any) => (
                        <Cell key={f.famille} fill={couleur(f.famille)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Abstention */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-200">Abstention T1 par famille</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Taux d'abstention moyen dans les communes remportées par chaque famille</p>
                </div>
                <SourceBadge label="Ministère de l'Intérieur" annee={statsFamille?.annee_elec ?? p.annee_derniere_election} />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={(statsFamille.familles as any[]).filter((f: any) => f.abstention_pct != null)}
                    layout="vertical"
                    margin={{ left: 110, right: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" domain={[0, 60]} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => `${v} %`} />
                    <YAxis type="category" dataKey="famille" tick={{ fill: "#94a3b8", fontSize: 10 }} width={105} />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                      formatter={(v: any) => [`${v} %`, "Abstention"]}
                    />
                    <Bar dataKey="abstention_pct" radius={[0, 4, 4, 0]}>
                      {(statsFamille.familles as any[]).filter((f: any) => f.abstention_pct != null).map((f: any) => (
                        <Cell key={f.famille} fill={couleur(f.famille)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

        </div>
      )}

      {/* Sources */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-800">
        <SourceBadge label="Ministère de l'Intérieur" annee={p.annee_derniere_election} />
        <SourceBadge label="VilleTracker / OFGL" />
        <SourceBadge label="RNE (Répertoire National des Élus)" />
        {statsFamille?.annee_dvf && <SourceBadge label="DVF (Cerema)" annee={statsFamille.annee_dvf} />}
      </div>
    </div>
  );
}
