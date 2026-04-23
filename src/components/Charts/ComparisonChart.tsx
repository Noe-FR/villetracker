import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ComparisonItem } from "../../types";
import { formatEuro } from "../../utils/format";
import { higherIsBetter } from "../../utils/indicators";

interface Props {
  data: ComparisonItem[];
  trancheLabel: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const diff = payload[0].value;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs max-w-xs">
      <p className="font-bold text-white mb-1.5 text-sm">{label}</p>
      <p className="text-slate-400">
        Écart vs moyenne :{" "}
        <span
          className={`font-bold ${diff > 0 ? "text-red-400" : diff < 0 ? "text-emerald-400" : "text-slate-300"}`}
        >
          {diff > 0 ? "+" : ""}
          {diff.toFixed(1)}%
        </span>
      </p>
    </div>
  );
};

export function ComparisonChart({ data, trancheLabel }: Props) {
  const chartData = data
    .filter((d) => d.diff_pct !== null)
    .sort((a, b) => (b.diff_pct ?? 0) - (a.diff_pct ?? 0));

  return (
    <div>
      <p className="text-xs text-slate-400 mb-4">
        Écart en % par rapport à la moyenne des communes de{" "}
        <span className="text-blue-400 font-semibold">{trancheLabel}</span>
        <br />
        <span className="text-emerald-400">Vert</span> = dépense moins que la moyenne ·{" "}
        <span className="text-red-400">Rouge</span> = dépense plus
      </p>
      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={{ stroke: "#475569" }}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
            domain={["auto", "auto"]}
          />
          <YAxis
            type="category"
            dataKey="agregat"
            tick={{ fill: "#cbd5e1", fontSize: 11 }}
            axisLine={false}
            width={180}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={0} stroke="#64748b" strokeWidth={1.5} />
          <Bar dataKey="diff_pct" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, idx) => {
              const diff = entry.diff_pct ?? 0;
              const good = higherIsBetter(entry.agregat) ? diff > 0 : diff < 0;
              return (
                <Cell
                  key={idx}
                  fill={good ? "#10b981" : "#ef4444"}
                  fillOpacity={0.8}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
