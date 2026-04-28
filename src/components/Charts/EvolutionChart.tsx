'use client';
import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { formatEuro } from "../../utils/format";

interface DataPoint {
  annee: number;
  montant: number | null;
  euros_par_habitant: number | null;
}

interface Series {
  key: string;
  label: string;
  color: string;
  data: DataPoint[];
}

interface Props {
  series: Series[];
  mode: "montant" | "eph";
}

// Séries affichées par défaut — les plus lisibles et significatives
const DEFAULT_VISIBLE = new Set([
  "Recettes de fonctionnement",
  "Dépenses de fonctionnement",
  "Epargne brute",
  "Dépenses d'équipement",
]);

const CustomTooltip = ({
  active, payload, label, mode,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  mode: "montant" | "eph";
}) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs max-w-xs">
      <p className="font-bold text-white mb-2">{label}</p>
      {sorted.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-300 truncate">{p.name} :</span>
          <span className="text-white font-semibold ml-auto pl-2 whitespace-nowrap">
            {formatEuro(p.value, mode === "montant")}
          </span>
        </div>
      ))}
    </div>
  );
};

export function EvolutionChart({ series, mode }: Props) {
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(series.filter(s => DEFAULT_VISIBLE.has(s.label)).map(s => s.key))
  );
  const [showAll, setShowAll] = useState(false);

  const toggle = (key: string) =>
    setVisible(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const visibleSeries = series.filter(s => visible.has(s.key));

  const chartData = useMemo(() => {
    const years = new Set<number>();
    visibleSeries.forEach(s => s.data.forEach(d => years.add(d.annee)));
    return Array.from(years).sort().map(year => {
      const point: Record<string, number | string> = { annee: year };
      visibleSeries.forEach(s => {
        const d = s.data.find(x => x.annee === year);
        if (d) point[s.key] = (mode === "eph" ? d.euros_par_habitant : d.montant) ?? 0;
      });
      return point;
    });
  }, [visibleSeries, mode]);

  // Sépare les séries "principales" des "autres"
  const main  = series.filter(s => DEFAULT_VISIBLE.has(s.label));
  const extra = series.filter(s => !DEFAULT_VISIBLE.has(s.label));

  return (
    <div>
      {/* Graphique */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="annee" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#475569" }} />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={{ stroke: "#475569" }}
            tickFormatter={v => formatEuro(v, true)}
            width={70}
          />
          <Tooltip content={<CustomTooltip mode={mode} />} />
          {visibleSeries.map(s => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: s.color }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Légende interactive */}
      <div className="mt-4 space-y-2">
        {/* Séries principales */}
        <div className="flex flex-wrap gap-2">
          {main.map(s => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                visible.has(s.key)
                  ? "border-transparent text-white"
                  : "border-slate-700 text-slate-500 bg-transparent"
              }`}
              style={visible.has(s.key) ? { backgroundColor: s.color + "33", borderColor: s.color } : {}}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
                style={{ background: s.color, opacity: visible.has(s.key) ? 1 : 0.3 }}
              />
              {s.label}
            </button>
          ))}
        </div>

        {/* Séries secondaires (masquées par défaut) */}
        {extra.length > 0 && (
          <div>
            <button
              onClick={() => setShowAll(v => !v)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 mb-2"
            >
              <span className="text-slate-600">{showAll ? "▾" : "▸"}</span>
              {showAll ? "Masquer les autres indicateurs" : `Voir ${extra.length} autres indicateurs`}
            </button>
            {showAll && (
              <div className="flex flex-wrap gap-2">
                {extra.map(s => (
                  <button
                    key={s.key}
                    onClick={() => toggle(s.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border ${
                      visible.has(s.key)
                        ? "border-transparent text-white"
                        : "border-slate-700 text-slate-500 bg-transparent"
                    }`}
                    style={visible.has(s.key) ? { backgroundColor: s.color + "33", borderColor: s.color } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
                      style={{ background: s.color, opacity: visible.has(s.key) ? 1 : 0.3 }}
                    />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
