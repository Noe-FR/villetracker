import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import clsx from "clsx";

interface Props {
  label: string;
  value: string;
  unit?: string;
  subValue?: string;
  diff?: number | null;
  higherIsBetter?: boolean;
  rang?: number | null;       // rang depuis le haut (1 = valeur la plus haute)
  nbCommunes?: number | null; // total communes dans la tranche
  size?: "sm" | "md";
}

export function StatCard({
  label,
  value,
  unit,
  subValue,
  diff,
  higherIsBetter = false,
  rang,
  nbCommunes,
  size = "md",
}: Props) {
  const hasDiff = diff !== null && diff !== undefined;

  // "good" = dans le bon sens par rapport à la moyenne
  // dépenses  : diff < 0 (en dessous de la moyenne) = good
  // revenus   : diff > 0 (au dessus de la moyenne)  = good
  const isGood    = hasDiff && (higherIsBetter ? diff! > 5  : diff! < -5);
  const isBad     = hasDiff && (higherIsBetter ? diff! < -5 : diff! > 5);
  const isNeutral = hasDiff && !isGood && !isBad;

  return (
    <div
      className={clsx(
        "bg-slate-800 border border-slate-700 rounded-xl flex flex-col gap-1",
        size === "md" ? "p-4" : "p-3"
      )}
    >
      <span className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-tight">
        {label}
      </span>

      <div className="flex items-end justify-between gap-2 mt-1">
        <div>
          <span className={clsx("font-bold text-white", size === "md" ? "text-xl" : "text-base")}>
            {value}
          </span>
          {unit && (
            <span className="text-xs text-slate-400 ml-1">{unit}</span>
          )}
          {subValue && (
            <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>
          )}
          {rang != null && rang > 0 && nbCommunes != null && nbCommunes > 0 && (
            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
              rang <span className="text-slate-300 font-semibold">{rang}</span>
              <span className="text-slate-600"> / {nbCommunes}</span>
            </p>
          )}
        </div>

        {hasDiff && (
          <div
            className={clsx(
              "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
              isGood    && "bg-emerald-900/40 text-emerald-400",
              isBad     && "bg-red-900/40 text-red-400",
              isNeutral && "bg-slate-700 text-slate-400"
            )}
          >
            {isGood    && <TrendingDown size={11} />}
            {isBad     && <TrendingUp   size={11} />}
            {isNeutral && <Minus        size={11} />}
            {diff! > 0 ? "+" : ""}
            {diff!.toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
