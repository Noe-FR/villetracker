import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

const CustomTooltip = ({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  mode: "montant" | "eph";
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name} :</span>
          <span className="text-white font-semibold">{formatEuro(p.value, mode === "montant")}</span>
        </div>
      ))}
    </div>
  );
};

export function EvolutionChart({ series, mode }: Props) {
  // Fusionner les données par année
  const years = new Set<number>();
  series.forEach((s) => s.data.forEach((d) => years.add(d.annee)));

  const chartData = Array.from(years)
    .sort()
    .map((year) => {
      const point: Record<string, number | string> = { annee: year };
      series.forEach((s) => {
        const d = s.data.find((x) => x.annee === year);
        if (d) {
          point[s.key] = (mode === "eph" ? d.euros_par_habitant : d.montant) ?? 0;
        }
      });
      return point;
    });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="annee"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={{ stroke: "#475569" }}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={{ stroke: "#475569" }}
          tickFormatter={(v) => formatEuro(v, true)}
          width={70}
        />
        <Tooltip content={<CustomTooltip mode={mode} />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 8 }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: s.color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
