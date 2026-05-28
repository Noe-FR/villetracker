import clsx from "clsx";

interface Props {
  label: string;
  value: string | number | null;
  unit?: string;
  sub?: string;
  accent?: "blue" | "emerald" | "amber" | "rose" | "violet";
  size?: "sm" | "md" | "lg";
}

const accents = {
  blue:    "border-blue-700/40 bg-blue-900/10",
  emerald: "border-emerald-700/40 bg-emerald-900/10",
  amber:   "border-amber-700/40 bg-amber-900/10",
  rose:    "border-rose-700/40 bg-rose-900/10",
  violet:  "border-violet-700/40 bg-violet-900/10",
};

export function KpiCard({ label, value, unit, sub, accent = "blue", size = "md" }: Props) {
  return (
    <div className={clsx(
      "rounded-xl border p-4 flex flex-col gap-1",
      accents[accent],
    )}>
      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide leading-tight">
        {label}
      </span>
      <div className="flex items-end gap-1.5 mt-1">
        <span className={clsx(
          "font-bold text-white tabular-nums",
          size === "lg" ? "text-3xl" : size === "md" ? "text-2xl" : "text-lg",
        )}>
          {value ?? "—"}
        </span>
        {unit && <span className="text-xs text-slate-400 mb-0.5">{unit}</span>}
      </div>
      {sub && <p className="text-[11px] text-slate-500 leading-tight">{sub}</p>}
    </div>
  );
}
