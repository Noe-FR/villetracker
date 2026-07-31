'use client';
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { api } from "@/src/api/client";
import { SourceBadge } from "@/src/components/stats/SourceBadge";
import { KpiCard } from "@/src/components/stats/KpiCard";

interface Indicator {
  id: string;
  label: string;
  source: string;
  unite: string;
}

interface Group {
  label: string;
  indicators: Indicator[];
}

export function CartesClient() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState("score");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getNationalCartesIndicators().then((d) => {
      setGroups(d.groups ?? []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setData(null);
    api.getNationalCartes(selectedId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const allIndicators: Indicator[] = groups.flatMap((g) => g.indicators);
  const currentIndicator = allIndicators.find((i) => i.id === selectedId);

  // Build regional stats from raw commune data
  const topCommunes: any[] = [];
  const bottomCommunes: any[] = [];

  if (data?.data && data.data.length > 0) {
    const sorted = [...data.data].sort((a: any[], b: any[]) => (b[1] as number) - (a[1] as number));
    topCommunes.push(...sorted.slice(0, 20));
    bottomCommunes.push(...sorted.slice(-10).reverse());
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-white mb-1">Cartes thématiques</h1>
        <p className="text-slate-400 text-sm">Indicateurs communaux — données par commune</p>
      </section>

      {/* Indicator selector */}
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.indicators.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setSelectedId(ind.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedId === ind.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32 text-slate-500">
          Chargement…
        </div>
      )}

      {!loading && data && (
        <div className="space-y-6">
          {/* Stats summary */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">
              {data.label}
            </h2>
            <SourceBadge label={data.source} annee={data.annee} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="Communes avec données"
              value={data.nb_communes?.toLocaleString("fr-FR") ?? "—"}
              accent="blue"
              size="sm"
            />
            <KpiCard
              label="Minimum"
              value={data.min != null ? `${data.min.toLocaleString("fr-FR")}` : "—"}
              unit={data.unite}
              accent="rose"
              size="sm"
            />
            <KpiCard
              label="Médiane"
              value={data.median != null ? `${data.median.toLocaleString("fr-FR")}` : "—"}
              unit={data.unite}
              accent="amber"
              size="sm"
            />
            <KpiCard
              label="Maximum"
              value={data.max != null ? `${data.max.toLocaleString("fr-FR")}` : "—"}
              unit={data.unite}
              accent="emerald"
              size="sm"
            />
          </div>

          {/* Top communes */}
          {topCommunes.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Top 20 — valeurs les plus élevées
                </p>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={topCommunes.map((r: any[]) => ({ code: r[0], valeur: r[1] }))}
                    layout="vertical"
                    margin={{ left: 55, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      tickFormatter={(v) => v.toLocaleString("fr-FR")}
                    />
                    <YAxis
                      type="category"
                      dataKey="code"
                      tick={{ fill: "#94a3b8", fontSize: 9 }}
                      width={52}
                    />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                      formatter={(v: any) => [`${v?.toLocaleString("fr-FR")} ${data.unite}`, data.label]}
                    />
                    <Bar dataKey="valeur" fill="#22c55e" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Distribution des valeurs (histogramme)
                </p>
                <DistributionChart data={data.data} unite={data.unite} />
              </div>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Note : la visualisation cartographique interactive est en cours de développement.
            Les données sont disponibles via l'API pour {data.nb_communes?.toLocaleString("fr-FR")} communes.
          </p>
        </div>
      )}
    </div>
  );
}

function DistributionChart({ data, unite }: { data: [string, number][]; unite: string }) {
  if (!data || data.length === 0) return null;

  const values = data.map((r) => r[1]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const numBins = 20;
  const binSize = range / numBins;

  if (binSize === 0) return <p className="text-slate-500 text-sm">Pas de distribution à afficher.</p>;

  const bins: { bin: number; nb: number }[] = Array.from({ length: numBins }, (_, i) => ({
    bin: min + i * binSize,
    nb: 0,
  }));

  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binSize), numBins - 1);
    bins[idx].nb++;
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={bins}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="bin"
          tick={{ fill: "#94a3b8", fontSize: 9 }}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
        />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v) => v.toLocaleString("fr-FR")} />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
          formatter={(v: any) => [v.toLocaleString("fr-FR"), "communes"]}
          labelFormatter={(v: any) => `≥ ${Number(v).toLocaleString("fr-FR")} ${unite}`}
        />
        <Bar dataKey="nb" fill="#3b82f6" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
