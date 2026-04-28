'use client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatEuro } from "../../utils/format";

interface AgregatsData {
  name: string;
  eph: number;
  montant: number;
}

interface Props {
  data: AgregatsData[];
  mode: "eph" | "montant";
}

const CustomTooltip = ({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  mode: "eph" | "montant";
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-white mb-1">{label}</p>
      <p className="text-slate-300">
        {mode === "eph" ? "€/habitant" : "Total"} :{" "}
        <span className="text-blue-300 font-semibold">
          {formatEuro(payload[0].value, mode === "montant")}
        </span>
      </p>
    </div>
  );
};

export function AgregatsChart({ data, mode }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={{ stroke: "#475569" }}
          tickFormatter={(v) => formatEuro(v, true)}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: "#cbd5e1", fontSize: 11 }}
          axisLine={false}
          width={200}
        />
        <Tooltip content={<CustomTooltip mode={mode} />} />
        <Bar dataKey={mode} fill="#3b82f6" fillOpacity={0.8} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
